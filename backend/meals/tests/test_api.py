from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from groups.models import Membership
from groups.services import create_group
from meals.models import Ingredient, Meal, MealIngredient, MealShare


class MealApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )

    def test_list_requires_authentication(self):
        response = self.client.get(reverse("meal-list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contains_only_current_users_meals(self):
        own_meal = Meal.objects.create(owner=self.user, name="Vegetable soup")
        Meal.objects.create(owner=self.other_user, name="Other user's meal")
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("meal-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], own_meal.id)

    def test_create_assigns_current_user_as_owner(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("meal-list"),
            {
                "name": "Pizza",
                "source": Meal.Source.DELIVERY,
                "tags": ["weekend"],
                "owner": self.other_user.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        meal = Meal.objects.get(pk=response.data["id"])
        self.assertEqual(meal.owner, self.user)
        self.assertTrue(response.data["is_owner"])
        self.assertTrue(response.data["can_edit"])
        self.assertTrue(response.data["can_delete"])

    def test_user_can_update_own_meal(self):
        meal = Meal.objects.create(owner=self.user, name="Vegetable soup")
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("meal-detail", args=[meal.id]),
            {"name": "Carrot soup"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        meal.refresh_from_db()
        self.assertEqual(meal.name, "Carrot soup")

    def test_user_can_delete_own_meal(self):
        meal = Meal.objects.create(owner=self.user, name="Vegetable soup")
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(reverse("meal-detail", args=[meal.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Meal.objects.filter(pk=meal.id).exists())

    def test_user_cannot_retrieve_another_users_meal(self):
        meal = Meal.objects.create(owner=self.other_user, name="Private meal")
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("meal-detail", args=[meal.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_change_another_users_meal(self):
        meal = Meal.objects.create(owner=self.other_user, name="Private meal")
        self.client.force_authenticate(user=self.user)

        update_response = self.client.patch(
            reverse("meal-detail", args=[meal.id]),
            {"name": "Changed meal"},
            format="json",
        )
        delete_response = self.client.delete(reverse("meal-detail", args=[meal.id]))

        self.assertEqual(update_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)
        meal.refresh_from_db()
        self.assertEqual(meal.name, "Private meal")

    def test_group_member_can_list_and_retrieve_read_only_shared_meal(self):
        group = create_group(owner=self.user, name="Family")
        meal = Meal.objects.create(owner=self.other_user, name="Shared soup")
        MealShare.objects.create(meal=meal, group=group)
        self.client.force_authenticate(user=self.user)

        list_response = self.client.get(reverse("meal-list"))
        detail_response = self.client.get(reverse("meal-detail", args=(meal.id,)))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["count"], 1)
        self.assertEqual(list_response.data["results"][0]["id"], meal.id)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertFalse(detail_response.data["is_owner"])
        self.assertFalse(detail_response.data["can_edit"])
        self.assertFalse(detail_response.data["can_delete"])

    def test_group_member_cannot_update_read_only_shared_meal(self):
        group = create_group(owner=self.user, name="Family")
        meal = Meal.objects.create(owner=self.other_user, name="Shared soup")
        MealShare.objects.create(meal=meal, group=group)
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("meal-detail", args=(meal.id,)),
            {"name": "Changed soup"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        meal.refresh_from_db()
        self.assertEqual(meal.name, "Shared soup")

    def test_group_member_can_update_editable_shared_meal(self):
        group = create_group(owner=self.user, name="Family")
        meal = Meal.objects.create(owner=self.other_user, name="Shared soup")
        MealShare.objects.create(
            meal=meal,
            group=group,
            access=MealShare.Access.EDIT,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("meal-detail", args=(meal.id,)),
            {"name": "Changed soup"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_owner"])
        self.assertTrue(response.data["can_edit"])
        self.assertFalse(response.data["can_delete"])
        meal.refresh_from_db()
        self.assertEqual(meal.name, "Changed soup")

    def test_group_member_cannot_delete_editable_shared_meal(self):
        group = create_group(owner=self.user, name="Family")
        meal = Meal.objects.create(owner=self.other_user, name="Shared soup")
        MealShare.objects.create(
            meal=meal,
            group=group,
            access=MealShare.Access.EDIT,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(reverse("meal-detail", args=(meal.id,)))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Meal.objects.filter(pk=meal.id).exists())

    def test_meal_shared_through_multiple_groups_appears_once(self):
        first_group = create_group(owner=self.user, name="Family")
        second_group = create_group(owner=self.user, name="Friends")
        meal = Meal.objects.create(owner=self.other_user, name="Shared soup")
        MealShare.objects.create(meal=meal, group=first_group)
        MealShare.objects.create(meal=meal, group=second_group)
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("meal-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], meal.id)


class MealShareApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.owner, name="Family", color="#A78BFA")
        self.other_group = create_group(owner=self.other_user, name="Friends")
        self.meal = Meal.objects.create(owner=self.owner, name="Vegetable soup")
        self.other_meal = Meal.objects.create(
            owner=self.other_user,
            name="Private meal",
        )
        self.list_url = reverse("meal-share-list", args=(self.meal.id,))

    def test_shares_require_authentication(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_list_meal_shares(self):
        share = MealShare.objects.create(meal=self.meal, group=self.group)
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0],
            {
                "id": share.id,
                "group_id": self.group.id,
                "group_name": "Family",
                "group_color": "#A78BFA",
                "access": MealShare.Access.READ,
                "created_at": response.data[0]["created_at"],
                "updated_at": response.data[0]["updated_at"],
            },
        )

    def test_owner_can_share_meal_with_their_group(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"group_id": self.group.id, "access": MealShare.Access.EDIT},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        share = MealShare.objects.get(pk=response.data["id"])
        self.assertEqual(share.meal, self.meal)
        self.assertEqual(share.group, self.group)
        self.assertEqual(share.access, MealShare.Access.EDIT)

    def test_owner_cannot_share_with_group_they_do_not_belong_to(self):
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"group_id": self.other_group.id, "access": MealShare.Access.READ},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["group_id"][0], "Group does not exist.")
        self.assertFalse(MealShare.objects.exists())

    def test_owner_cannot_create_duplicate_share(self):
        MealShare.objects.create(meal=self.meal, group=self.group)
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            self.list_url,
            {"group_id": self.group.id, "access": MealShare.Access.EDIT},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["group_id"][0],
            "Meal is already shared with this group.",
        )

    def test_owner_can_change_share_access(self):
        share = MealShare.objects.create(meal=self.meal, group=self.group)
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("meal-share-detail", args=(self.meal.id, share.id)),
            {"access": MealShare.Access.EDIT},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        share.refresh_from_db()
        self.assertEqual(share.access, MealShare.Access.EDIT)

    def test_share_group_cannot_be_changed(self):
        second_group = create_group(owner=self.owner, name="Parents")
        share = MealShare.objects.create(meal=self.meal, group=self.group)
        self.client.force_authenticate(user=self.owner)

        response = self.client.patch(
            reverse("meal-share-detail", args=(self.meal.id, share.id)),
            {"group_id": second_group.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["group_id"][0], "Group cannot be changed.")

    def test_owner_can_revoke_share(self):
        share = MealShare.objects.create(meal=self.meal, group=self.group)
        self.client.force_authenticate(user=self.owner)

        response = self.client.delete(
            reverse("meal-share-detail", args=(self.meal.id, share.id))
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MealShare.objects.filter(pk=share.pk).exists())

    def test_non_owner_cannot_manage_meal_shares(self):
        share = MealShare.objects.create(meal=self.meal, group=self.group)
        self.client.force_authenticate(user=self.other_user)

        list_response = self.client.get(self.list_url)
        update_response = self.client.patch(
            reverse("meal-share-detail", args=(self.meal.id, share.id)),
            {"access": MealShare.Access.EDIT},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(update_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_share_must_belong_to_meal_from_url(self):
        share = MealShare.objects.create(meal=self.other_meal, group=self.other_group)
        self.client.force_authenticate(user=self.owner)

        response = self.client.get(
            reverse("meal-share-detail", args=(self.meal.id, share.id))
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class IngredientCatalogApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.ingredient = Ingredient.objects.create(
            owner=self.user,
            name="Carrot",
        )
        Ingredient.objects.create(owner=self.user, name="Rice")
        self.other_ingredient = Ingredient.objects.create(
            owner=self.other_user,
            name="Private ingredient",
        )

    def test_list_requires_authentication(self):
        response = self.client.get(reverse("ingredient-catalog-list"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contains_only_current_users_ingredients(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("ingredient-catalog-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertNotIn(
            self.other_ingredient.id,
            [ingredient["id"] for ingredient in response.data["results"]],
        )

    def test_list_can_be_searched_by_name(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("ingredient-catalog-list"),
            {"search": "carr"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.ingredient.id)

    def test_create_assigns_current_user_and_normalizes_name(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ingredient-catalog-list"),
            {"name": "  Green   Onion  "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ingredient = Ingredient.objects.get(pk=response.data["id"])
        self.assertEqual(ingredient.owner, self.user)
        self.assertEqual(ingredient.name, "Green Onion")
        self.assertEqual(ingredient.normalized_name, "green onion")

    def test_create_rejects_duplicate_normalized_name(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ingredient-catalog-list"),
            {"name": "  CARROT "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_user_can_update_own_ingredient(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("ingredient-catalog-detail", args=[self.ingredient.id]),
            {"name": "Baby carrot"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.name, "Baby carrot")
        self.assertEqual(self.ingredient.normalized_name, "baby carrot")

    def test_user_cannot_access_another_users_ingredient(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("ingredient-catalog-detail", args=[self.other_ingredient.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_catalog_ingredient_cannot_be_deleted_through_api(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(
            reverse("ingredient-catalog-detail", args=[self.ingredient.id])
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Ingredient.objects.filter(pk=self.ingredient.id).exists())


class MealIngredientCatalogApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.editor = User.objects.create_user(
            email="editor@example.com",
            password="A-secure-password-123",
        )
        self.group = create_group(owner=self.owner, name="Family", color="#A78BFA")
        Membership.objects.create(
            group=self.group,
            user=self.editor,
            role=Membership.Role.MEMBER,
        )
        self.meal = Meal.objects.create(owner=self.owner, name="Vegetable soup")
        self.carrot = Ingredient.objects.create(owner=self.owner, name="Carrot")
        self.rice = Ingredient.objects.create(owner=self.owner, name="Rice")
        self.editors_ingredient = Ingredient.objects.create(
            owner=self.editor,
            name="Private ingredient",
        )
        self.share = MealShare.objects.create(
            meal=self.meal,
            group=self.group,
            access=MealShare.Access.EDIT,
        )
        self.url = reverse("meal-ingredient-catalog", args=[self.meal.id])

    def test_catalog_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_read_only_share_cannot_access_owner_catalog(self):
        self.share.access = MealShare.Access.READ
        self.share.save(update_fields=("access", "updated_at"))
        self.client.force_authenticate(user=self.editor)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_editor_can_search_meal_owners_catalog(self):
        self.client.force_authenticate(user=self.editor)

        response = self.client.get(self.url, {"search": "carr"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.carrot.id)
        self.assertNotEqual(response.data["results"][0]["id"], self.rice.id)
        self.assertNotEqual(
            response.data["results"][0]["id"],
            self.editors_ingredient.id,
        )

    def test_editor_can_create_ingredient_for_meal_owner(self):
        self.client.force_authenticate(user=self.editor)

        response = self.client.post(
            self.url,
            {"name": "  Green   Onion  "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ingredient = Ingredient.objects.get(pk=response.data["id"])
        self.assertEqual(ingredient.owner, self.owner)
        self.assertEqual(ingredient.name, "Green Onion")


class IngredientApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="A-secure-password-123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="A-secure-password-123",
        )
        self.meal = Meal.objects.create(owner=self.user, name="Vegetable soup")
        self.other_meal = Meal.objects.create(
            owner=self.other_user,
            name="Private meal",
        )
        self.ingredient = Ingredient.objects.create(owner=self.user, name="Carrot")
        self.other_ingredient = Ingredient.objects.create(
            owner=self.other_user,
            name="Private ingredient",
        )
        self.group = create_group(
            owner=self.user,
            name="Family",
            color="#A78BFA",
        )
        Membership.objects.create(
            group=self.group,
            user=self.other_user,
            role=Membership.Role.MEMBER,
        )

    def test_list_requires_authentication(self):
        response = self.client.get(reverse("ingredient-list", args=[self.meal.id]))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contains_meals_ingredients(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity="2.00",
            unit="piece",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("ingredient-list", args=[self.meal.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], meal_ingredient.id)
        self.assertEqual(
            response.data["results"][0]["ingredient_id"], self.ingredient.id
        )

    def test_user_can_add_ingredient_to_own_meal(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ingredient-list", args=[self.meal.id]),
            {
                "ingredient_id": self.ingredient.id,
                "quantity": "2.00",
                "unit": "piece",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        meal_ingredient = MealIngredient.objects.get(pk=response.data["id"])
        self.assertEqual(meal_ingredient.meal, self.meal)
        self.assertEqual(meal_ingredient.ingredient, self.ingredient)

    def test_user_can_update_own_ingredient(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity="2.00",
            unit="piece",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("ingredient-detail", args=[self.meal.id, meal_ingredient.id]),
            {"quantity": "3.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        meal_ingredient.refresh_from_db()
        self.assertEqual(str(meal_ingredient.quantity), "3.00")

    def test_user_can_delete_own_ingredient(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity="2.00",
            unit="piece",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(
            reverse("ingredient-detail", args=[self.meal.id, meal_ingredient.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MealIngredient.objects.filter(pk=meal_ingredient.id).exists())
        self.assertTrue(Ingredient.objects.filter(pk=self.ingredient.id).exists())

    def test_user_cannot_access_another_users_ingredients(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.other_meal,
            ingredient=self.other_ingredient,
            quantity="1.00",
            unit="piece",
        )
        self.client.force_authenticate(user=self.user)

        list_response = self.client.get(
            reverse("ingredient-list", args=[self.other_meal.id])
        )
        detail_response = self.client.get(
            reverse(
                "ingredient-detail",
                args=[self.other_meal.id, meal_ingredient.id],
            )
        )

        self.assertEqual(list_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_ingredient_must_belong_to_meal_from_url(self):
        second_meal = Meal.objects.create(owner=self.user, name="Second meal")
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity="2.00",
            unit="piece",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("ingredient-detail", args=[second_meal.id, meal_ingredient.id])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_rejects_non_positive_quantity(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ingredient-list", args=[self.meal.id]),
            {
                "ingredient_id": self.ingredient.id,
                "quantity": "0.00",
                "unit": "piece",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)

    def test_user_cannot_add_another_users_catalog_ingredient(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ingredient-list", args=[self.meal.id]),
            {
                "ingredient_id": self.other_ingredient.id,
                "quantity": "1.00",
                "unit": "piece",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ingredient_id", response.data)

    def test_read_only_editor_can_list_but_cannot_change_meal_ingredients(self):
        meal_ingredient = MealIngredient.objects.create(
            meal=self.meal,
            ingredient=self.ingredient,
            quantity="2.00",
            unit="piece",
        )
        MealShare.objects.create(
            meal=self.meal,
            group=self.group,
            access=MealShare.Access.READ,
        )
        self.client.force_authenticate(user=self.other_user)

        list_response = self.client.get(
            reverse("ingredient-list", args=[self.meal.id])
        )
        create_response = self.client.post(
            reverse("ingredient-list", args=[self.meal.id]),
            {
                "ingredient_id": self.ingredient.id,
                "quantity": "1.00",
                "unit": "piece",
            },
            format="json",
        )
        detail_url = reverse(
            "ingredient-detail",
            args=[self.meal.id, meal_ingredient.id],
        )
        update_response = self.client.patch(
            detail_url,
            {"quantity": "3.00"},
            format="json",
        )
        delete_response = self.client.delete(detail_url)

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(update_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(MealIngredient.objects.filter(pk=meal_ingredient.id).exists())

    def test_editor_can_create_update_and_delete_meal_ingredient(self):
        MealShare.objects.create(
            meal=self.meal,
            group=self.group,
            access=MealShare.Access.EDIT,
        )
        self.client.force_authenticate(user=self.other_user)
        list_url = reverse("ingredient-list", args=[self.meal.id])

        create_response = self.client.post(
            list_url,
            {
                "ingredient_id": self.ingredient.id,
                "quantity": "1.00",
                "unit": "piece",
            },
            format="json",
        )
        detail_url = reverse(
            "ingredient-detail",
            args=[self.meal.id, create_response.data["id"]],
        )
        update_response = self.client.patch(
            detail_url,
            {"quantity": "3.00"},
            format="json",
        )
        delete_response = self.client.delete(detail_url)

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["quantity"], "3.00")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            MealIngredient.objects.filter(pk=create_response.data["id"]).exists()
        )

    def test_editor_cannot_attach_ingredient_from_their_own_catalog(self):
        MealShare.objects.create(
            meal=self.meal,
            group=self.group,
            access=MealShare.Access.EDIT,
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            reverse("ingredient-list", args=[self.meal.id]),
            {
                "ingredient_id": self.other_ingredient.id,
                "quantity": "1.00",
                "unit": "piece",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ingredient_id", response.data)
