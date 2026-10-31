from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from meals.models import Meal


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
