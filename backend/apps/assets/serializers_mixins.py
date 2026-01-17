"""
Shared serializer helpers for assets domain.
"""

from typing import Optional


def device_display_name(serial_number: Optional[str], name: Optional[str]) -> str:
    """
    Build a short, user-friendly device name from serial or fallback name.
    """
    if serial_number:
        if len(serial_number) > 4:
            return f"Device {serial_number[-4:]}"
        return serial_number
    return name or "N/A"


def device_display_name_from_device(device) -> str:
    """
    Safe display name for device instances (handles None).
    """
    if not device:
        return "N/A"
    return device_display_name(device.serial_number, device.name)


def resolve_company_from_asset(asset):
    """
    Resolve company instance via sector/subsection relationships.
    """
    if asset.sector and asset.sector.company:
        return asset.sector.company
    if asset.subsection and asset.subsection.sector and asset.subsection.sector.company:
        return asset.subsection.sector.company
    return None


def company_id_from_asset(asset) -> Optional[int]:
    company = resolve_company_from_asset(asset)
    return company.id if company else None


def company_name_from_asset(asset) -> Optional[str]:
    company = resolve_company_from_asset(asset)
    return company.name if company else None


class AssetTypeDisplayMixin:
    """
    Mixin to resolve asset_type display name with per-request caching.
    """

    def _get_asset_type_name_map(self):
        cache_key = "_asset_type_name_map"
        cached = self.context.get(cache_key)
        if cached is not None:
            return cached

        from .models import AssetType

        name_map = {item.code: item.name for item in AssetType.objects.all()}
        self.context[cache_key] = name_map
        return name_map

    def get_asset_type_display(self, obj):
        if not obj.asset_type:
            return None
        name_map = self._get_asset_type_name_map()
        return name_map.get(obj.asset_type) or obj.get_asset_type_display()
