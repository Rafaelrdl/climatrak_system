"""
Signals for keeping Company and Site in sync.
"""

from django.db.models import Q
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Company


@receiver(pre_save, sender=Company)
def cache_company_name(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_name = (
            Company.objects.filter(pk=instance.pk)
            .values_list("name", flat=True)
            .first()
        )


@receiver(post_save, sender=Company)
def sync_company_site(sender, instance, **kwargs):
    try:
        from apps.assets.models import Site
    except ImportError:
        return

    previous_name = getattr(instance, "_previous_name", None)
    site = Site.objects.filter(Q(name=instance.name) | Q(company=instance.name)).first()

    if not site and previous_name:
        site = Site.objects.filter(
            Q(name=previous_name) | Q(company=previous_name)
        ).first()

    defaults = {
        "name": instance.name,
        "company": instance.name,
        "address": instance.address or "",
        "timezone": instance.timezone,
        "is_active": instance.is_active,
    }

    if site:
        for field, value in defaults.items():
            setattr(site, field, value)
        site.save()
    else:
        Site.objects.create(**defaults)
