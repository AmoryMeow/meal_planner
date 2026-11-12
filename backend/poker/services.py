from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from typing import Optional

from django.db import transaction
from django.utils import timezone

from groups.models import Group, Membership
from meals.models import Meal, MealShare
from planning.models import PlanItem
from planning.services import create_plan_item

from .models import PokerParticipant, PokerSession, PokerVote


class PokerServiceError(Exception):
    pass


class PokerPermissionError(PokerServiceError):
    pass


class PokerStateError(PokerServiceError):
    pass


class PokerSelectionError(PokerServiceError):
    pass


POINTS_BY_PRIORITY = {
    1: 4,
    2: 3,
    3: 1,
}


@dataclass(frozen=True)
class PokerResult:
    meal: Meal
    score: int
    first_place_votes: int


def _locked_session(session: PokerSession) -> PokerSession:
    return PokerSession.objects.select_for_update().get(pk=session.pk)


def _require_group_member(*, session: PokerSession, user) -> None:
    if not Membership.objects.filter(group=session.group, user=user).exists():
        raise PokerPermissionError("You must be a member of the session group.")


def _require_organizer(*, session: PokerSession, user) -> None:
    if session.organizer_id != user.id:
        raise PokerPermissionError(
            "Only the session organizer can perform this action."
        )


@transaction.atomic
def create_session(
    *,
    group: Group,
    organizer,
    scheduled_date: date,
    meal_type: str,
) -> PokerSession:
    if not Membership.objects.filter(group=group, user=organizer).exists():
        raise PokerPermissionError("You must be a group member to create a session.")
    if scheduled_date < timezone.localdate():
        raise PokerSelectionError("Session date cannot be in the past.")
    if meal_type not in group.plan.enabled_meal_types:
        raise PokerSelectionError("This meal section is disabled for the group plan.")

    session = PokerSession(
        group=group,
        organizer=organizer,
        date=scheduled_date,
        meal_type=meal_type,
    )
    session.full_clean()
    session.save()

    participant = PokerParticipant(session=session, user=organizer)
    participant.full_clean()
    participant.save()
    return session


@transaction.atomic
def join_session(*, session: PokerSession, user) -> PokerParticipant:
    session = _locked_session(session)
    _require_group_member(session=session, user=user)
    if session.status != PokerSession.Status.WAITING:
        raise PokerStateError(
            "Participants can join only while the session is waiting."
        )
    if PokerParticipant.objects.filter(session=session, user=user).exists():
        raise PokerStateError("You have already joined this session.")

    participant = PokerParticipant(session=session, user=user)
    participant.full_clean()
    participant.save()
    return participant


@transaction.atomic
def start_voting(*, session: PokerSession, actor) -> PokerSession:
    session = _locked_session(session)
    _require_organizer(session=session, user=actor)
    if session.status != PokerSession.Status.WAITING:
        raise PokerStateError("Only a waiting session can start voting.")
    if session.participants.count() < 2:
        raise PokerStateError("At least two participants are required to start voting.")

    session.status = PokerSession.Status.VOTING
    session.save(update_fields=("status", "updated_at"))
    return session


@transaction.atomic
def submit_votes(
    *,
    session: PokerSession,
    user,
    ordered_meal_ids: list[int],
) -> PokerParticipant:
    session = _locked_session(session)
    if session.status != PokerSession.Status.VOTING:
        raise PokerStateError("Votes can be changed only while voting is in progress.")
    if not 1 <= len(ordered_meal_ids) <= 3:
        raise PokerSelectionError("Choose between one and three meals.")
    if len(ordered_meal_ids) != len(set(ordered_meal_ids)):
        raise PokerSelectionError("Each selected meal must be unique.")

    try:
        participant = PokerParticipant.objects.select_for_update().get(
            session=session,
            user=user,
        )
    except PokerParticipant.DoesNotExist as error:
        raise PokerPermissionError("Join the session before voting.") from error

    meals = {
        meal.id: meal
        for meal in Meal.objects.filter(
            id__in=ordered_meal_ids,
            shares__group=session.group,
        ).distinct()
    }
    if len(meals) != len(ordered_meal_ids):
        raise PokerSelectionError(
            "Every selected meal must be shared with the session group."
        )

    participant.votes.all().delete()
    votes = [
        PokerVote(
            participant=participant,
            meal=meals[meal_id],
            priority=priority,
        )
        for priority, meal_id in enumerate(ordered_meal_ids, start=1)
    ]
    for vote in votes:
        vote.full_clean()
    PokerVote.objects.bulk_create(votes)

    participant.is_ready = True
    participant.save(update_fields=("is_ready", "updated_at"))
    return participant


def calculate_results(session: PokerSession) -> list[PokerResult]:
    totals = defaultdict(int)
    first_place_votes = defaultdict(int)
    meals = {}
    votes = PokerVote.objects.filter(participant__session=session).select_related(
        "meal"
    )
    for vote in votes:
        meals[vote.meal_id] = vote.meal
        totals[vote.meal_id] += POINTS_BY_PRIORITY[vote.priority]
        if vote.priority == 1:
            first_place_votes[vote.meal_id] += 1

    return sorted(
        (
            PokerResult(
                meal=meals[meal_id],
                score=score,
                first_place_votes=first_place_votes[meal_id],
            )
            for meal_id, score in totals.items()
        ),
        key=lambda result: (
            -result.score,
            -result.first_place_votes,
            result.meal.name.casefold(),
            result.meal.id,
        ),
    )


def get_leading_meals(session: PokerSession) -> list[Meal]:
    results = calculate_results(session)
    if not results:
        return []
    leading_result = results[0]
    return [
        result.meal
        for result in results
        if result.score == leading_result.score
        and result.first_place_votes == leading_result.first_place_votes
    ]


@transaction.atomic
def reveal_results(*, session: PokerSession, actor) -> PokerSession:
    session = _locked_session(session)
    _require_organizer(session=session, user=actor)
    if session.status != PokerSession.Status.VOTING:
        raise PokerStateError("Only an active vote can be revealed.")
    participants = session.participants.all()
    if (
        participants.filter(is_ready=False).exists()
        or participants.filter(votes__isnull=True).exists()
    ):
        raise PokerStateError("Every participant must submit a vote before reveal.")

    leaders = get_leading_meals(session)
    if not leaders:
        raise PokerStateError("The session has no votes to reveal.")
    session.winner = leaders[0] if len(leaders) == 1 else None
    session.status = PokerSession.Status.REVEALED
    session.save(update_fields=("winner", "status", "updated_at"))
    return session


@transaction.atomic
def complete_session(
    *,
    session: PokerSession,
    actor,
    winner_id: Optional[int] = None,
) -> PokerSession:
    session = _locked_session(session)
    _require_organizer(session=session, user=actor)
    if session.status != PokerSession.Status.REVEALED:
        raise PokerStateError("Only a revealed session can be completed.")

    leaders = get_leading_meals(session)
    leader_ids = {meal.id for meal in leaders}
    selected_winner_id = winner_id or session.winner_id
    if selected_winner_id is None:
        raise PokerSelectionError("Choose a winner from the tied leading meals.")
    if selected_winner_id not in leader_ids:
        raise PokerSelectionError("The winner must be one of the leading meals.")

    session.winner_id = selected_winner_id
    session.status = PokerSession.Status.COMPLETED
    session.save(update_fields=("winner", "status", "updated_at"))
    return session


@transaction.atomic
def add_winner_to_plan(*, session: PokerSession, actor) -> PlanItem:
    session = _locked_session(session)
    _require_group_member(session=session, user=actor)
    if session.status != PokerSession.Status.COMPLETED or session.winner_id is None:
        raise PokerStateError(
            "Complete the session before adding its winner to the plan."
        )
    if session.plan_item_id is not None:
        return session.plan_item
    if session.meal_type not in session.group.plan.enabled_meal_types:
        raise PokerStateError("This meal section is disabled for the group plan.")
    if not MealShare.objects.filter(
        meal_id=session.winner_id,
        group=session.group,
    ).exists():
        raise PokerSelectionError(
            "The winning meal is no longer shared with the group."
        )

    plan_item = create_plan_item(
        plan=session.group.plan,
        meal=session.winner,
        scheduled_date=session.date,
        meal_type=session.meal_type,
    )
    session.plan_item = plan_item
    session.save(update_fields=("plan_item", "updated_at"))
    return plan_item


@transaction.atomic
def cancel_session(*, session: PokerSession, actor) -> PokerSession:
    session = _locked_session(session)
    _require_organizer(session=session, user=actor)
    if session.status not in (
        PokerSession.Status.WAITING,
        PokerSession.Status.VOTING,
    ):
        raise PokerStateError("This session can no longer be cancelled.")

    session.status = PokerSession.Status.CANCELLED
    session.save(update_fields=("status", "updated_at"))
    return session
