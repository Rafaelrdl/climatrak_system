from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from .models import BlogPost


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "category",
            "author_name",
            "image_url",
            "read_time_minutes",
            "status",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        title = attrs.get("title") or getattr(self.instance, "title", "")
        slug = attrs.get("slug") or getattr(self.instance, "slug", "")

        if not slug and title:
            base = slugify(title)[:60] or "post"
            slug = base
            counter = 1
            while BlogPost.objects.filter(slug=slug).exclude(pk=getattr(self.instance, "pk", None)).exists():
                slug = f"{base}-{counter}"
                counter += 1
            attrs["slug"] = slug

        if not attrs.get("read_time_minutes"):
            content = attrs.get("content") or getattr(self.instance, "content", "")
            if content:
                word_count = len(content.split())
                attrs["read_time_minutes"] = max(1, min(20, round(word_count / 200)))

        status = attrs.get("status", getattr(self.instance, "status", None))
        published_at = attrs.get("published_at") or getattr(self.instance, "published_at", None)
        if status == BlogPost.Status.PUBLISHED and not published_at:
            attrs["published_at"] = timezone.now()

        return attrs
