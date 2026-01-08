"""
TrakService Serializers

Serializers for TrakService API endpoints.
"""

from rest_framework import serializers


class TrakServiceMetaSerializer(serializers.Serializer):
    """Serializer for TrakService module metadata."""

    module = serializers.CharField(read_only=True)
    version = serializers.CharField(read_only=True)
    features = serializers.DictField(read_only=True)
    status = serializers.CharField(read_only=True)


class TrakServiceHealthSerializer(serializers.Serializer):
    """Serializer for TrakService health check."""

    status = serializers.CharField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True)
    tenant_id = serializers.IntegerField(read_only=True)
    features_enabled = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )
