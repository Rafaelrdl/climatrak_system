import os


def main() -> None:
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

    from django.contrib.auth import authenticate, get_user_model
    from django_tenants.utils import schema_context

    User = get_user_model()

    # Testar autenticaÇõÇœo no schema UMC
    with schema_context("umc"):
        print("=== Testando autenticaÇõÇœo ===")

        user = authenticate(
            username="rafael@ascitech.com.br", password="muaythay99"
        )
        if user:
            print("ƒo. AutenticaÇõÇœo bem-sucedida!")
            print(f"   User: {user.email}")
            print(f"   Is active: {user.is_active}")
        else:
            print("ƒ?O AutenticaÇõÇœo falhou!")

            # Testar manualmente
            try:
                u = User.objects.get(email="rafael@ascitech.com.br")
                print(f"\nUsuÇ­rio encontrado: {u.email}")
                print(f"Username: {u.username}")
                print(f"Is active: {u.is_active}")
                print(
                    f"Check password muaythay99: {u.check_password('muaythay99')}"
                )
                print(f"Has usable password: {u.has_usable_password()}")
            except User.DoesNotExist:
                print("UsuÇ­rio nÇœo encontrado no schema UMC")


if __name__ == "__main__":
    main()
