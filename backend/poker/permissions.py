from .models import PokerSession


def get_accessible_sessions(user):
    if not user.is_authenticated:
        return PokerSession.objects.none()
    return PokerSession.objects.filter(group__memberships__user=user).distinct()
