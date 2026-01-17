"""
Upload validation tests for WorkOrderPhoto.
"""

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django_tenants.test.cases import TenantTestCase

from apps.cmms.serializers import WorkOrderPhotoSerializer


class WorkOrderPhotoUploadValidationTests(TenantTestCase):
    @override_settings(UPLOAD_ALLOWED_CONTENT_TYPES=["image/jpeg"])
    def test_rejects_invalid_content_type(self):
        file = SimpleUploadedFile(
            "test.txt",
            b"not-an-image",
            content_type="text/plain",
        )
        serializer = WorkOrderPhotoSerializer(data={"file": file})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)

    @override_settings(UPLOAD_MAX_SIZE_BYTES=1)
    def test_rejects_large_files(self):
        file = SimpleUploadedFile(
            "test.jpg",
            b"too-large",
            content_type="image/jpeg",
        )
        serializer = WorkOrderPhotoSerializer(data={"file": file})
        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)

    @override_settings(
        UPLOAD_ALLOWED_CONTENT_TYPES=["image/jpeg"],
        UPLOAD_MAX_SIZE_BYTES=1024,
    )
    def test_accepts_valid_file(self):
        file = SimpleUploadedFile(
            "test.jpg",
            b"ok",
            content_type="image/jpeg",
        )
        serializer = WorkOrderPhotoSerializer(data={"file": file})
        self.assertTrue(serializer.is_valid())
