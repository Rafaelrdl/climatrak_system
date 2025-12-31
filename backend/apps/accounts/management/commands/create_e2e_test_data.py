"""
Management command to create E2E test data.

Usage:
    python manage.py create_e2e_test_data
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create test users for E2E testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Remove existing test users before creating new ones",
        )

    def handle(self, *args, **options):
        test_users = [
            {
                "email": "admin@climatrak.test",
                "username": "admin_e2e",
                "password": "TestAdmin123!",
                "first_name": "Admin",
                "last_name": "E2E",
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "email": "operator@climatrak.test",
                "username": "operator_e2e",
                "password": "TestOperator123!",
                "first_name": "Operador",
                "last_name": "E2E",
                "is_staff": False,
                "is_superuser": False,
            },
            {
                "email": "viewer@climatrak.test",
                "username": "viewer_e2e",
                "password": "TestViewer123!",
                "first_name": "Viewer",
                "last_name": "E2E",
                "is_staff": False,
                "is_superuser": False,
            },
        ]

        if options["clean"]:
            emails = [u["email"] for u in test_users]
            deleted, _ = User.objects.filter(email__in=emails).delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {deleted} existing test users")
            )

        created_count = 0
        for user_data in test_users:
            password = user_data.pop("password")
            user, created = User.objects.get_or_create(
                email=user_data["email"],
                defaults=user_data,
            )
            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created user: {user.email}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"User already exists: {user.email}")
                )

        self.stdout.write(
            self.style.SUCCESS(f"\n✅ Created {created_count} test users")
        )
        self.stdout.write("\nTest credentials:")
        self.stdout.write("  Admin:    admin@climatrak.test / TestAdmin123!")
        self.stdout.write("  Operator: operator@climatrak.test / TestOperator123!")
        self.stdout.write("  Viewer:   viewer@climatrak.test / TestViewer123!")
