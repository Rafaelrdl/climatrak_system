#!/usr/bin/env python
"""Test login endpoint to check features response."""
import json
import os


def main() -> None:
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

    from django.test import Client

    client = Client()

    # Test login
    response = client.post(
        "/api/v2/auth/login/",
        data=json.dumps(
            {
                "email": "rafaelrdlessa@gmail.com",
                "password": "muaythay99",
            }
        ),
        content_type="application/json",
        HTTP_HOST="localhost",
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    # Check for features
    if response.status_code == 200:
        data = response.json()
        if "tenant" in data:
            print(f"\nƒo. Tenant in response: {data['tenant'].get('name')}")
            if "features" in data["tenant"]:
                print(f"ƒo. Features in response: {data['tenant']['features']}")
            else:
                print("ƒ?O NO 'features' key in tenant!")
                print(f"   Tenant keys: {list(data['tenant'].keys())}")
        else:
            print("ƒ?O NO 'tenant' in response!")


if __name__ == "__main__":
    main()
