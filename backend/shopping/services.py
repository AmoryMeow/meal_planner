from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

QUANTITY_PRECISION = Decimal("0.01")


def build_shopping_list(plan_items):
    totals = {}

    for plan_item in plan_items:
        snapshot = plan_item.meal_snapshot or {}
        recipe_servings = _positive_decimal(snapshot.get("servings")) or Decimal(1)
        planned_servings = _positive_decimal(plan_item.servings)
        if planned_servings is None:
            continue

        multiplier = planned_servings / recipe_servings
        for ingredient in snapshot.get("ingredients", []):
            name = _clean_label(ingredient.get("name"))
            unit = _clean_label(ingredient.get("unit"))
            quantity = _positive_decimal(ingredient.get("quantity"))
            if not name or not unit or quantity is None:
                continue

            key = (name.casefold(), unit.casefold())
            if key not in totals:
                totals[key] = {
                    "name": name,
                    "unit": unit,
                    "quantity": Decimal(0),
                }
            totals[key]["quantity"] += quantity * multiplier

    return [
        {
            "name": item["name"],
            "quantity": str(
                item["quantity"].quantize(
                    QUANTITY_PRECISION,
                    rounding=ROUND_HALF_UP,
                )
            ),
            "unit": item["unit"],
        }
        for item in sorted(
            totals.values(),
            key=lambda item: (item["name"].casefold(), item["unit"].casefold()),
        )
    ]


def _positive_decimal(value):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return number if number > 0 else None


def _clean_label(value):
    return " ".join(value.split()) if isinstance(value, str) else ""
