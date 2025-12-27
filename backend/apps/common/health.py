"""
Health check endpoint for monitoring service availability.

This module provides a health check view that verifies the status of:
- PostgreSQL database
- Redis cache
- MinIO S3 storage (optional)
"""

import logging

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from minio import Minio
from redis import Redis

logger = logging.getLogger(__name__)


def check_database():
    """
    Check PostgreSQL database connectivity.
    
    Returns:
        bool: True if database is accessible, False otherwise
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


def check_redis():
    """
    Check Redis connectivity.
    
    Returns:
        bool: True if Redis is accessible, False otherwise
    """
    try:
        redis_client = Redis.from_url(settings.REDIS_URL)
        redis_client.ping()
        return True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False


def check_s3():
    """
    Check MinIO/S3 connectivity.
    
    Returns:
        bool: True if MinIO is accessible, False otherwise
    """
    try:
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        # Check if we can list buckets (basic connectivity test)
        client.list_buckets()
        return True
    except Exception as e:
        logger.error(f"S3/MinIO health check failed: {e}")
        return False


def health_check(request):
    """
    Health check endpoint that returns the status of all critical services.
    
    Args:
        request: Django HTTP request object
        
    Returns:
        JsonResponse with status of each service:
        - db: PostgreSQL database status
        - redis: Redis cache status
        - s3: MinIO/S3 storage status
        - healthy: Overall health status (all services must be up)
    """
    db_healthy = check_database()
    redis_healthy = check_redis()
    s3_healthy = check_s3()
    
    overall_healthy = db_healthy and redis_healthy and s3_healthy
    
    status_code = 200 if overall_healthy else 503
    
    return JsonResponse(
        {
            'db': db_healthy,
            'redis': redis_healthy,
            's3': s3_healthy,
            'healthy': overall_healthy,
        },
        status=status_code
    )
