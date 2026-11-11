from django.contrib import admin

from .models import PokerParticipant, PokerSession, PokerVote


class PokerVoteInline(admin.TabularInline):
    model = PokerVote
    extra = 0
    autocomplete_fields = ("meal",)
    readonly_fields = ("created_at", "updated_at")


class PokerParticipantInline(admin.TabularInline):
    model = PokerParticipant
    extra = 0
    autocomplete_fields = ("user",)
    readonly_fields = ("joined_at", "updated_at")


@admin.register(PokerSession)
class PokerSessionAdmin(admin.ModelAdmin):
    list_display = (
        "group",
        "date",
        "meal_type",
        "status",
        "organizer",
        "created_at",
    )
    list_filter = ("status", "meal_type", "date")
    search_fields = ("group__name", "organizer__email")
    list_select_related = ("group", "organizer")
    autocomplete_fields = ("group", "organizer", "winner", "plan_item")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    inlines = (PokerParticipantInline,)


@admin.register(PokerParticipant)
class PokerParticipantAdmin(admin.ModelAdmin):
    list_display = ("user", "session", "is_ready", "joined_at")
    list_filter = ("is_ready", "session__group")
    search_fields = ("user__email", "session__group__name")
    list_select_related = ("user", "session", "session__group")
    autocomplete_fields = ("session", "user")
    readonly_fields = ("joined_at", "updated_at")
    ordering = ("-joined_at",)
    inlines = (PokerVoteInline,)


@admin.register(PokerVote)
class PokerVoteAdmin(admin.ModelAdmin):
    list_display = ("participant", "meal", "priority", "created_at")
    list_filter = ("priority", "participant__session__group")
    search_fields = (
        "participant__user__email",
        "participant__session__group__name",
        "meal__name",
    )
    list_select_related = (
        "participant",
        "participant__user",
        "participant__session",
        "participant__session__group",
        "meal",
    )
    autocomplete_fields = ("participant", "meal")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
