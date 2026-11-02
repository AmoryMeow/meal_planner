from django.contrib import admin
from django.db.models import Count

from .models import Group, Invite, Membership


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ("user",)
    fields = ("user", "role", "created_at", "updated_at")
    readonly_fields = ("created_at", "updated_at")


class InviteInline(admin.TabularInline):
    model = Invite
    extra = 0
    fields = (
        "email",
        "status",
        "expires_at",
        "accepted_at",
        "invited_by",
        "created_at",
    )
    readonly_fields = ("created_at",)
    autocomplete_fields = ("invited_by",)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "member_count", "created_at", "updated_at")
    search_fields = ("name", "members__email")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("name",)
    inlines = (MembershipInline, InviteInline)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(member_total=Count("members"))

    @admin.display(ordering="member_total", description="Members")
    def member_count(self, obj):
        return obj.member_total


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "role", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("group__name", "user__email")
    list_select_related = ("group", "user")
    autocomplete_fields = ("group", "user")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("group__name", "role", "user__email")


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ("email", "group", "status", "expires_at", "invited_by")
    list_filter = ("status", "created_at", "expires_at")
    search_fields = ("email", "group__name", "invited_by__email")
    list_select_related = ("group", "invited_by")
    autocomplete_fields = ("group", "invited_by")
    readonly_fields = ("token", "created_at", "updated_at")
    ordering = ("-created_at",)
