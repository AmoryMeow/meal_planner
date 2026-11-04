import os
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from groups.models import Group, Invite, Membership
from groups.services import create_group
from meals.models import Ingredient, Meal, MealIngredient, MealShare, Tag
from planning.models import PlanItem
from planning.services import create_plan_item, get_or_create_personal_plan

DEMO_OWNER_EMAIL = "landing-demo@mealendar.local"
DEMO_MEMBER_EMAIL = "landing-member@mealendar.local"


class Command(BaseCommand):
    help = "Recreate local demo data used for landing page screenshots."

    def add_arguments(self, parser):
        parser.add_argument(
            "--week-start",
            type=date.fromisoformat,
            help="First day of the demo week in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow seeding when DEBUG=False in a trusted local environment.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Demo data requires DEBUG=True. Use --force only in a trusted "
                "local environment."
            )

        password = os.getenv("DEMO_USER_PASSWORD")
        if not password:
            raise CommandError("Set DEMO_USER_PASSWORD before seeding demo data.")

        week_start = options["week_start"] or get_current_week_start()
        remove_existing_demo_data()
        result = create_demo_data(password=password, week_start=week_start)

        self.stdout.write(
            self.style.SUCCESS(
                "Created landing demo data for "
                f"{result['owner']} starting {week_start.isoformat()}: "
                f"{result['meals']} meals, {result['plans']} plans, "
                f"{result['plan_items']} plan items."
            )
        )


def get_current_week_start():
    today = timezone.localdate()
    return today - timedelta(days=today.weekday())


def remove_existing_demo_data():
    users = User.objects.filter(email__in=(DEMO_OWNER_EMAIL, DEMO_MEMBER_EMAIL))
    group_ids = list(
        Group.objects.filter(members__in=users).values_list("id", flat=True).distinct()
    )
    PlanItem.objects.filter(meal__owner__in=users).delete()
    Group.objects.filter(id__in=group_ids).delete()
    users.delete()


def create_demo_data(*, password, week_start):
    owner = User.objects.create_user(
        email=DEMO_OWNER_EMAIL,
        password=password,
        first_name="Mia",
        last_name="Taylor",
    )
    member = User.objects.create_user(
        email=DEMO_MEMBER_EMAIL,
        password=password,
        first_name="Alex",
        last_name="Morgan",
    )

    personal_plan = get_or_create_personal_plan(owner)
    personal_plan.name = "My meals"
    personal_plan.color = "#0EA5E9"
    personal_plan.save(update_fields=("name", "color", "updated_at"))

    family = create_group(owner=owner, name="Family", color="#8B5CF6")
    Membership.objects.create(
        group=family,
        user=member,
        role=Membership.Role.MEMBER,
    )
    friends = create_group(owner=owner, name="Friends", color="#F59E0B")
    Invite.objects.create(
        group=family,
        email="jamie@example.com",
        invited_by=owner,
    )

    tags = {
        name: Tag.objects.create(owner=owner, name=name)
        for name in ("Comfort food", "Healthy", "Quick", "Vegetarian")
    }
    ingredients = {
        name: Ingredient.objects.create(owner=owner, name=name)
        for name in (
            "Avocado",
            "Bell pepper",
            "Bread",
            "Chicken breast",
            "Eggs",
            "Greek yogurt",
            "Lemon",
            "Oats",
            "Pasta",
            "Salmon fillet",
            "Spinach",
            "Tomatoes",
        )
    }
    meals = create_meals(owner=owner, tags=tags, ingredients=ingredients)

    for meal in meals.values():
        MealShare.objects.create(
            meal=meal,
            group=family,
            access=MealShare.Access.EDIT,
        )
        MealShare.objects.create(
            meal=meal,
            group=friends,
            access=MealShare.Access.READ,
        )

    schedule = (
        (personal_plan, 0, PlanItem.MealType.BREAKFAST, "oats", 2),
        (personal_plan, 0, PlanItem.MealType.DINNER, "pasta", 2),
        (personal_plan, 1, PlanItem.MealType.BREAKFAST, "toast", 2),
        (family.plan, 1, PlanItem.MealType.DINNER, "chicken", 4),
        (personal_plan, 2, PlanItem.MealType.BREAKFAST, "omelette", 2),
        (personal_plan, 2, PlanItem.MealType.LUNCH, "salmon", 2),
        (family.plan, 2, PlanItem.MealType.DINNER, "pasta", 4),
        (personal_plan, 3, PlanItem.MealType.BREAKFAST, "oats", 2),
        (family.plan, 3, PlanItem.MealType.DINNER, "salmon", 4),
        (personal_plan, 4, PlanItem.MealType.BREAKFAST, "toast", 2),
        (friends.plan, 4, PlanItem.MealType.DINNER, "ramen", 2),
        (family.plan, 5, PlanItem.MealType.BREAKFAST, "omelette", 4),
        (friends.plan, 5, PlanItem.MealType.DINNER, "pizza", 4),
        (family.plan, 6, PlanItem.MealType.LUNCH, "chicken", 4),
        (personal_plan, 6, PlanItem.MealType.DINNER, "pasta", 2),
    )

    for plan, offset, meal_type, meal_key, servings in schedule:
        create_plan_item(
            plan=plan,
            meal=meals[meal_key],
            scheduled_date=week_start + timedelta(days=offset),
            meal_type=meal_type,
            servings=servings,
        )

    return {
        "owner": owner.email,
        "meals": len(meals),
        "plans": 3,
        "plan_items": len(schedule),
    }


def create_meals(*, owner, tags, ingredients):
    meals = {}

    def add(key, *, name, source, servings, instructions, tag_names, items):
        meal = Meal.objects.create(
            owner=owner,
            name=name,
            source=source,
            servings=servings,
            instructions=instructions,
        )
        meal.tags.set(tags[tag_name] for tag_name in tag_names)
        MealIngredient.objects.bulk_create(
            [
                MealIngredient(
                    meal=meal,
                    ingredient=ingredients[ingredient_name],
                    quantity=quantity,
                    unit=unit,
                )
                for ingredient_name, quantity, unit in items
            ]
        )
        meals[key] = meal

    add(
        "oats",
        name="Overnight oats",
        source=Meal.Source.HOME,
        servings=2,
        instructions="Mix the oats and yogurt, then chill overnight.",
        tag_names=("Healthy", "Quick"),
        items=(("Oats", 120, "g"), ("Greek yogurt", 300, "g")),
    )
    add(
        "toast",
        name="Avocado toast",
        source=Meal.Source.HOME,
        servings=2,
        instructions="Toast the bread and top with seasoned avocado.",
        tag_names=("Quick", "Vegetarian"),
        items=(("Bread", 4, "slices"), ("Avocado", 2, "pcs")),
    )
    add(
        "omelette",
        name="Spinach omelette",
        source=Meal.Source.HOME,
        servings=2,
        instructions="Cook the spinach briefly, add beaten eggs and fold.",
        tag_names=("Healthy", "Quick"),
        items=(("Eggs", 4, "pcs"), ("Spinach", 100, "g")),
    )
    add(
        "salmon",
        name="Lemon salmon bowl",
        source=Meal.Source.HOME,
        servings=2,
        instructions="Bake the salmon with lemon and serve with vegetables.",
        tag_names=("Healthy",),
        items=(("Salmon fillet", 400, "g"), ("Lemon", 1, "pcs")),
    )
    add(
        "pasta",
        name="Tomato basil pasta",
        source=Meal.Source.HOME,
        servings=4,
        instructions="Simmer the tomato sauce and toss with cooked pasta.",
        tag_names=("Comfort food", "Vegetarian"),
        items=(("Pasta", 400, "g"), ("Tomatoes", 600, "g")),
    )
    add(
        "chicken",
        name="Roasted chicken & peppers",
        source=Meal.Source.HOME,
        servings=4,
        instructions="Roast the chicken and peppers until golden.",
        tag_names=("Comfort food", "Healthy"),
        items=(("Chicken breast", 800, "g"), ("Bell pepper", 3, "pcs")),
    )
    add(
        "ramen",
        name="Friday ramen",
        source=Meal.Source.RESTAURANT,
        servings=1,
        instructions="Order from the neighborhood ramen place.",
        tag_names=("Comfort food",),
        items=(),
    )
    add(
        "pizza",
        name="Pizza night",
        source=Meal.Source.DELIVERY,
        servings=4,
        instructions="Choose two pizzas for the group.",
        tag_names=("Comfort food",),
        items=(),
    )
    return meals
