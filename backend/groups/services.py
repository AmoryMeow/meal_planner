from django.db import IntegrityError, transaction
from django.utils import timezone

from planning.models import Plan

from .emails import schedule_invite_email
from .models import DEFAULT_GROUP_COLOR, Group, Invite, Membership


class InviteServiceError(Exception):
    pass


class MembershipServiceError(Exception):
    pass


class GroupOwnerRemovalError(MembershipServiceError):
    pass


class ActiveInviteExistsError(InviteServiceError):
    pass


class InviteeAlreadyMemberError(InviteServiceError):
    pass


class InviteAcceptanceError(InviteServiceError):
    pass


class InviteEmailMismatchError(InviteAcceptanceError):
    pass


class InviteExpiredError(InviteAcceptanceError):
    pass


class InviteUnavailableError(InviteAcceptanceError):
    pass


@transaction.atomic
def create_group(*, owner, name: str, color: str = DEFAULT_GROUP_COLOR) -> Group:
    group = Group(name=name, color=color)
    group.full_clean()
    group.save()

    membership = Membership(
        group=group,
        user=owner,
        role=Membership.Role.OWNER,
    )
    membership.full_clean()
    membership.save()

    plan = Plan(group=group, name=name, color=color)
    plan.full_clean()
    plan.save()
    return group


@transaction.atomic
def update_group(*, group: Group, name: str, color: str) -> Group:
    group.name = name
    group.color = color
    group.full_clean()
    group.save()

    plan = group.plan
    plan.name = name
    plan.color = color
    plan.full_clean()
    plan.save()
    return group


def remove_group_member(*, membership: Membership) -> None:
    if membership.role == Membership.Role.OWNER:
        raise GroupOwnerRemovalError("The group owner cannot be removed.")
    membership.delete()


@transaction.atomic
def create_invite(*, group: Group, invited_by, email: str) -> Invite:
    normalized_email = email.strip().lower()
    if group.members.filter(email__iexact=normalized_email).exists():
        raise InviteeAlreadyMemberError("This user is already a group member.")

    existing_invite = (
        Invite.objects.select_for_update()
        .filter(
            group=group,
            email__iexact=normalized_email,
            status=Invite.Status.PENDING,
        )
        .first()
    )
    if existing_invite and not existing_invite.is_expired:
        raise ActiveInviteExistsError(
            "An active invitation already exists for this email."
        )
    if existing_invite:
        revoke_invite(invite=existing_invite)

    invite = Invite(
        group=group,
        email=normalized_email,
        invited_by=invited_by,
    )
    invite.full_clean()
    try:
        with transaction.atomic():
            invite.save()
    except IntegrityError as error:
        raise ActiveInviteExistsError(
            "An active invitation already exists for this email."
        ) from error
    schedule_invite_email(invite.id)
    return invite


def revoke_invite(*, invite: Invite) -> Invite:
    invite.status = Invite.Status.REVOKED
    invite.save(update_fields=("status", "updated_at"))
    return invite


@transaction.atomic
def accept_invite(*, invite: Invite, user) -> tuple[Invite, Membership]:
    invite = Invite.objects.select_for_update().get(pk=invite.pk)
    if invite.email.casefold() != user.email.casefold():
        raise InviteEmailMismatchError(
            "This invitation was sent to a different email address."
        )

    membership = Membership.objects.filter(group=invite.group, user=user).first()
    if invite.status == Invite.Status.ACCEPTED and membership:
        return invite, membership
    if invite.status != Invite.Status.PENDING:
        raise InviteUnavailableError("This invitation is no longer available.")
    if invite.is_expired:
        raise InviteExpiredError("This invitation has expired.")

    if membership is None:
        membership = Membership(
            group=invite.group,
            user=user,
            role=Membership.Role.MEMBER,
        )
        membership.full_clean()
        try:
            with transaction.atomic():
                membership.save()
        except IntegrityError:
            membership = Membership.objects.get(group=invite.group, user=user)

    invite.status = Invite.Status.ACCEPTED
    invite.accepted_at = timezone.now()
    invite.save(update_fields=("status", "accepted_at", "updated_at"))
    return invite, membership
