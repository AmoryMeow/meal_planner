from django.contrib import admin

from .models import PokerSession


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
    autocomplete_fields = ("group", "organizer")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
