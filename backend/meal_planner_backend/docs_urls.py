from django.contrib.admin.views.decorators import staff_member_required
from django.urls import path

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# Apply decorator to require staff member (admin) status
protected_swagger_view = staff_member_required(
    SpectacularSwaggerView.as_view(url_name="schema"), login_url="/admin/login/"
)
protected_schema_view = staff_member_required(
    SpectacularAPIView.as_view(), login_url="/admin/login/"
)

urlpatterns = [
    # API schema (internal, for Swagger UI, protected by admin authentication)
    path("schema/", protected_schema_view, name="schema"),
    # Swagger UI (protected by admin authentication)
    path("doc/", protected_swagger_view, name="swagger-ui"),
]
