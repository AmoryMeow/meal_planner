from django.contrib import admin

from .models import Plan, PlanItem


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "color", "created_at", "updated_at")
    search_fields = ("name", "owner__email")
    list_select_related = ("owner",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("name",)


@admin.register(PlanItem)
class PlanItemAdmin(admin.ModelAdmin):
    list_display = ("meal", "plan", "date", "meal_type", "servings")
    list_filter = ("meal_type", "date")
    search_fields = ("meal__name", "plan__name", "plan__owner__email")
    list_select_related = ("meal", "plan", "plan__owner")
    autocomplete_fields = ("meal", "plan")
    readonly_fields = ("meal_snapshot", "created_at", "updated_at")
    ordering = ("-date", "meal_type", "id")
