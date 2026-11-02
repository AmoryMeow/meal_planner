from django.contrib import admin
from django.db.models import Count

from .models import Group, Membership


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0
    autocomplete_fields = ("user",)
    fields = ("user", "role", "created_at", "updated_at")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "color", "member_count", "created_at", "updated_at")
    search_fields = ("name", "members__email")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("name",)
    inlines = (MembershipInline,)

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
