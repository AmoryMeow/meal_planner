import logging
from functools import partial

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string

from .models import Invite

logger = logging.getLogger(__name__)


def schedule_invite_email(invite_id: int) -> None:
    transaction.on_commit(partial(send_invite_email, invite_id))


def send_invite_email(invite_id: int) -> None:
    try:
        invite = Invite.objects.select_related("group", "invited_by").get(pk=invite_id)
        invite_url = f"{settings.FRONTEND_URL}/invite/{invite.token}"
        message = render_to_string(
            "groups/invite_email.txt",
            {
                "group_name": invite.group.name,
                "invite_url": invite_url,
                "invited_by": invite.invited_by.email if invite.invited_by else None,
                "expires_at": invite.expires_at,
            },
        )
        send_mail(
            subject=f"Join {invite.group.name} on Mealendar",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Failed to deliver group invitation %s", invite_id)
