from django.urls import include, path

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import RegisterView, UserProfileView, UserViewSet

# Create router for ViewSet
router = DefaultRouter()
router.register(r"users", UserViewSet)

urlpatterns = [
    # JWT Authentication endpoints
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # User registration
    path("auth/register/", RegisterView.as_view(), name="register"),
    # Current user profile
    path("me/", UserProfileView.as_view(), name="user-profile"),
    # User management routes (admin only)
    path("", include(router.urls)),
]
