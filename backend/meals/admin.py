from django.contrib import admin
from django.db.models import Count

from .models import Ingredient, Meal, MealIngredient


class IngredientInline(admin.TabularInline):
    model = MealIngredient
    extra = 0
    fields = ("ingredient", "quantity", "unit")
    autocomplete_fields = ("ingredient",)


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "source",
        "ingredient_count",
        "created_at",
        "updated_at",
    )
    list_filter = ("source", "created_at", "updated_at")
    search_fields = ("name", "owner__email")
    list_select_related = ("owner",)
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    inlines = (IngredientInline,)

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(ingredient_total=Count("ingredients"))
        )

    @admin.display(ordering="ingredient_total", description="Ingredients")
    def ingredient_count(self, obj):
        return obj.ingredient_total


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at", "updated_at")
    search_fields = ("name", "owner__email")
    list_select_related = ("owner",)
    ordering = ("name",)
    readonly_fields = ("normalized_name", "created_at", "updated_at")


@admin.register(MealIngredient)
class MealIngredientAdmin(admin.ModelAdmin):
    list_display = ("ingredient", "meal", "quantity", "unit")
    list_filter = ("meal__source",)
    search_fields = ("ingredient__name", "meal__name", "meal__owner__email")
    list_select_related = ("ingredient", "meal", "meal__owner")
    autocomplete_fields = ("ingredient", "meal")
    ordering = ("meal__name", "ingredient__name")
