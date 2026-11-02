from django.db import transaction

from planning.models import Plan

from .models import DEFAULT_GROUP_COLOR, Group, Membership


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
