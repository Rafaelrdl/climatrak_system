"""
Storage utilities for MinIO/S3 integration.
"""

import logging

from django.conf import settings
from minio import Minio

logger = logging.getLogger(__name__)


def get_minio_client():
    """
    Get configured MinIO client instance.

    Returns:
        Minio: Configured MinIO client
    """
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )


def ensure_bucket_exists(bucket_name=None):
    """
    Ensure MinIO bucket exists, create if not.

    Args:
        bucket_name (str): Bucket name. Defaults to settings.MINIO_BUCKET
    """
    if bucket_name is None:
        bucket_name = settings.MINIO_BUCKET

    client = get_minio_client()

    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
        if settings.DEBUG:
            logger.info("Created MinIO bucket: %s", bucket_name)

    return bucket_name
