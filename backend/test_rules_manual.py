#!/usr/bin/env python
"""
Script para testar avaliaÇõÇœo de regras manualmente com suporte multi-tenant
"""
import os


def main() -> None:
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

    from django_tenants.utils import schema_context, get_tenant_model
    from apps.alerts.models import Rule
    from apps.alerts.tasks import evaluate_single_rule
    from apps.alerts.services import NotificationService

    print("ÐY\"? Iniciando avaliaÇõÇœo manual de regras...\n")

    # Obter todos os tenants
    TenantModel = get_tenant_model()
    tenants = TenantModel.objects.exclude(schema_name="public")

    notification_service = NotificationService()
    total_evaluated = 0
    total_triggered = 0

    for tenant in tenants:
        print(f"ÐY\"< Tenant: {tenant.schema_name}")

        with schema_context(tenant.schema_name):
            # Buscar regras ativas
            rules = Rule.objects.filter(enabled=True).select_related("equipment")

            if not rules.exists():
                print("   ƒsÿ‹÷?  Nenhuma regra ativa encontrada\n")
                continue

            print(f"   ƒo. {rules.count()} regra(s) ativa(s) encontrada(s)")

            for rule in rules:
                total_evaluated += 1
                print(f"\n   ÐY\"Z Avaliando regra: {rule.name}")
                print(
                    f"      Equipamento: {rule.equipment.name} ({rule.equipment.tag})"
                )

                # Verificar se tem parÇ½metros
                params_count = rule.parameters.count()
                print(f"      ParÇ½metros: {params_count}")

                if params_count > 0:
                    for param in rule.parameters.all():
                        print(
                            f"         - {param.parameter_key} "
                            f"{param.operator} {param.threshold}"
                        )

                try:
                    # Avaliar regra
                    alert = evaluate_single_rule(rule)

                    if alert:
                        total_triggered += 1
                        print(f"      ÐYsù ALERTA DISPARADO! ID: {alert.id}")
                        print(f"         Mensagem: {alert.message}")
                        print(f"         Severidade: {alert.severity}")

                        # Enviar notificaÇõÇæes
                        try:
                            results = notification_service.send_alert_notifications(
                                alert
                            )
                            print(
                                "         ÐY\"õ NotificaÇõÇæes: "
                                f"{len(results['sent'])} enviadas, "
                                f"{len(results['failed'])} falharam"
                            )
                        except Exception as exc:
                            print(f"         ƒ?O Erro ao enviar notificaÇõÇæes: {exc}")
                    else:
                        print(
                            "      ƒo\" CondiÇõÇœo nÇœo atendida "
                            "(nenhum alerta disparado)"
                        )

                except Exception as exc:
                    print(f"      ƒ?O Erro ao avaliar: {exc}")

            print()

    print("\nÐY\"S Resumo:")
    print(f"   Regras avaliadas: {total_evaluated}")
    print(f"   Alertas disparados: {total_triggered}")


if __name__ == "__main__":
    main()
