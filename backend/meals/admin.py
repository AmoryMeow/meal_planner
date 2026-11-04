from django.contrib import admin
from django.db.models import Count

from .models import Ingredient, Meal, MealIngredient, MealShare, Tag


class IngredientInline(admin.TabularInline):
    model = MealIngredient
    extra = 0
    fields = ("ingredient", "quantity", "unit")
    autocomplete_fields = ("ingredient",)


class MealShareInline(admin.TabularInline):
    model = MealShare
    extra = 0
    fields = ("group", "access")
    autocomplete_fields = ("group",)


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "source",
        "servings",
        "ingredient_count",
        "created_at",
        "updated_at",
    )
    list_filter = ("source", "created_at", "updated_at")
    search_fields = ("name", "owner__email")
    list_select_related = ("owner",)
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    filter_horizontal = ("tags",)
    inlines = (IngredientInline, MealShareInline)

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(ingredient_total=Count("ingredients", distinct=True))
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


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
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


@admin.register(MealShare)
class MealShareAdmin(admin.ModelAdmin):
    list_display = ("meal", "group", "access", "created_at", "updated_at")
    list_filter = ("access", "created_at", "updated_at")
    search_fields = ("meal__name", "meal__owner__email", "group__name")
    list_select_related = ("meal", "meal__owner", "group")
    autocomplete_fields = ("meal", "group")
    ordering = ("meal__name", "group__name")
    readonly_fields = ("created_at", "updated_at")
