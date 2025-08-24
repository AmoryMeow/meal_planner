from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserProfileSerializer,
    UserRegistrationSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint
    POST /api/auth/register/
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = []  # Available to everyone

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create JWT tokens for new user
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    View and edit current user profile
    GET/PATCH /api/me/
    """

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing users (admin only)
    GET /api/users/ - list users
    GET /api/users/{id}/ - user details
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]  # Only for staff/superuser
