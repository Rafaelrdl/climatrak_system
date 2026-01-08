from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny

from .models import BlogPost
from .permissions import MarketingEditorPermission
from .serializers import BlogPostSerializer


class BlogPostViewSet(viewsets.ModelViewSet):
    serializer_class = BlogPostSerializer
    queryset = BlogPost.objects.all()
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "excerpt", "content", "category", "author_name"]
    ordering_fields = ["published_at", "created_at", "title"]
    ordering = ["-published_at", "-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [MarketingEditorPermission()]

    def get_queryset(self):
        queryset = BlogPost.objects.all()
        status_filter = self.request.query_params.get("status")
        category_filter = self.request.query_params.get("category")
        is_editor = MarketingEditorPermission.is_editor(self.request)

        if not is_editor:
            queryset = queryset.filter(status=BlogPost.Status.PUBLISHED)
        elif status_filter:
            queryset = queryset.filter(status=status_filter)

        if category_filter:
            queryset = queryset.filter(category__iexact=category_filter)

        return queryset.order_by("-published_at", "-created_at")
