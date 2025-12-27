"""
Forms for the Ops panel.

All forms include validation and sanitization for telemetry filters.
"""
from django import forms
from django.core.exceptions import ValidationError
from datetime import datetime
import re


class TelemetryFilterForm(forms.Form):
    """
    Filter form for telemetry queries.
    
    Validates tenant selection, device/sensor IDs, and ISO-8601 timestamps.
    """
    tenant_slug = forms.SlugField(
        required=True,
        max_length=100,
        help_text="Tenant slug (required)"
    )
    
    device_id = forms.CharField(
        required=False,
        max_length=255,
        help_text="Filter by device ID (optional)"
    )
    
    sensor_id = forms.CharField(
        required=False,
        max_length=255,
        help_text="Filter by sensor ID (optional)"
    )
    
    from_timestamp = forms.CharField(
        required=False,
        label="From",
        help_text="ISO-8601 timestamp (e.g., 2025-10-18T00:00:00Z)"
    )
    
    to_timestamp = forms.CharField(
        required=False,
        label="To",
        help_text="ISO-8601 timestamp (e.g., 2025-10-18T23:59:59Z)"
    )
    
    bucket = forms.ChoiceField(
        required=False,
        choices=[
            ('1m', '1 minute'),
            ('5m', '5 minutes'),
            ('1h', '1 hour'),
        ],
        initial='1m',
        help_text="Aggregation bucket size"
    )
    
    limit = forms.IntegerField(
        required=False,
        min_value=1,
        max_value=1000,
        initial=200,
        help_text="Results per page (max 1000)"
    )
    
    offset = forms.IntegerField(
        required=False,
        min_value=0,
        initial=0,
        help_text="Pagination offset"
    )
    
    def clean_from_timestamp(self):
        """Validate ISO-8601 format for from_timestamp."""
        value = self.cleaned_data.get('from_timestamp')
        if value:
            try:
                # Try parsing ISO-8601 format
                datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                raise ValidationError("Invalid ISO-8601 timestamp format")
        return value
    
    def clean_to_timestamp(self):
        """Validate ISO-8601 format for to_timestamp."""
        value = self.cleaned_data.get('to_timestamp')
        if value:
            try:
                datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                raise ValidationError("Invalid ISO-8601 timestamp format")
        return value
    
    def clean_device_id(self):
        """Sanitize device_id input."""
        value = self.cleaned_data.get('device_id')
        if value:
            # Remove any potentially dangerous characters
            value = re.sub(r'[^\w\-\.]', '', value)
        return value
    
    def clean_sensor_id(self):
        """Sanitize sensor_id input."""
        value = self.cleaned_data.get('sensor_id')
        if value:
            # Remove any potentially dangerous characters
            value = re.sub(r'[^\w\-\.]', '', value)
        return value
