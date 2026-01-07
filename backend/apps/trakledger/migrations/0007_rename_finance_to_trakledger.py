"""
Migration para renomear o módulo Finance para TrakLedger.

Esta migration:
1. Renomeia todas as tabelas de finance_* para trakledger_*
2. Atualiza as constraints e indexes

⚠️ IMPORTANTE: Esta é uma migration de schema-aware que deve ser executada
em todos os schemas de tenants.
"""

from django.db import migrations


class Migration(migrations.Migration):
    """
    Renomeia o app Finance para TrakLedger.
    """

    dependencies = [
        ("trakledger", "0006_budgetmonth_contingency_amount"),
    ]

    operations = [
        # ========================================
        # 1. Renomear tabelas
        # ========================================
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_costcenter" RENAME TO "trakledger_costcenter";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_costcenter" RENAME TO "finance_costcenter";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_ratecard" RENAME TO "trakledger_ratecard";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_ratecard" RENAME TO "finance_ratecard";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_budgetplan" RENAME TO "trakledger_budgetplan";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_budgetplan" RENAME TO "finance_budgetplan";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_budgetenvelope" RENAME TO "trakledger_budgetenvelope";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_budgetenvelope" RENAME TO "finance_budgetenvelope";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_budgetmonth" RENAME TO "trakledger_budgetmonth";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_budgetmonth" RENAME TO "finance_budgetmonth";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_costtransaction" RENAME TO "trakledger_costtransaction";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_costtransaction" RENAME TO "finance_costtransaction";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_commitment" RENAME TO "trakledger_commitment";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_commitment" RENAME TO "finance_commitment";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_ledgeradjustment" RENAME TO "trakledger_ledgeradjustment";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_ledgeradjustment" RENAME TO "finance_ledgeradjustment";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_savingsevent" RENAME TO "trakledger_savingsevent";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_savingsevent" RENAME TO "finance_savingsevent";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_energytariff" RENAME TO "trakledger_energytariff";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_energytariff" RENAME TO "finance_energytariff";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_energyreading" RENAME TO "trakledger_energyreading";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_energyreading" RENAME TO "finance_energyreading";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_baseline" RENAME TO "trakledger_baseline";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_baseline" RENAME TO "finance_baseline";',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE IF EXISTS "finance_risksnapshot" RENAME TO "trakledger_risksnapshot";',
            reverse_sql='ALTER TABLE IF EXISTS "trakledger_risksnapshot" RENAME TO "finance_risksnapshot";',
        ),
        # ========================================
        # 2. Renomear constraints (UniqueConstraint)
        # ========================================
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_costcenter_unique_code" RENAME TO "tl_cc_unique_code";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_cc_unique_code" RENAME TO "finance_costcenter_unique_code";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_budgetplan_unique_code" RENAME TO "tl_bp_unique_code";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_bp_unique_code" RENAME TO "finance_budgetplan_unique_code";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_envelope_unique_plan_cc_cat" RENAME TO "tl_env_uniq_plan_cc_cat";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_env_uniq_plan_cc_cat" RENAME TO "finance_envelope_unique_plan_cc_cat";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_budgetmonth_unique_env_month" RENAME TO "tl_bm_uniq_env_month";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_bm_uniq_env_month" RENAME TO "finance_budgetmonth_unique_env_month";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_costtx_unique_idempotency" RENAME TO "tl_ctx_uniq_idempotency";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_ctx_uniq_idempotency" RENAME TO "finance_costtx_unique_idempotency";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ereading_unique_asset_date" RENAME TO "tl_eread_uniq_asset_date";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_eread_uniq_asset_date" RENAME TO "finance_ereading_unique_asset_date";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_risksnapshot_unique_asset_date" RENAME TO "tl_risk_uniq_asset_date";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_risk_uniq_asset_date" RENAME TO "finance_risksnapshot_unique_asset_date";',
        ),
        # ========================================
        # 3. Renomear indexes
        # ========================================
        # CostCenter indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_cc_code_idx" RENAME TO "trakledger_cc_code_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_cc_code_idx" RENAME TO "finance_cc_code_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_cc_parent_idx" RENAME TO "trakledger_cc_parent_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_cc_parent_idx" RENAME TO "finance_cc_parent_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_cc_active_idx" RENAME TO "trakledger_cc_active_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_cc_active_idx" RENAME TO "finance_cc_active_idx";',
        ),
        # RateCard indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_rc_role_idx" RENAME TO "trakledger_rc_role_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_rc_role_idx" RENAME TO "finance_rc_role_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_rc_role_code_idx" RENAME TO "trakledger_rc_role_code_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_rc_role_code_idx" RENAME TO "finance_rc_role_code_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_rc_vigencia_idx" RENAME TO "trakledger_rc_vigencia_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_rc_vigencia_idx" RENAME TO "finance_rc_vigencia_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_rc_active_idx" RENAME TO "trakledger_rc_active_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_rc_active_idx" RENAME TO "finance_rc_active_idx";',
        ),
        # BudgetPlan indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_bp_code_idx" RENAME TO "trakledger_bp_code_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_bp_code_idx" RENAME TO "finance_bp_code_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_bp_year_idx" RENAME TO "trakledger_bp_year_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_bp_year_idx" RENAME TO "finance_bp_year_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_bp_status_idx" RENAME TO "trakledger_bp_status_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_bp_status_idx" RENAME TO "finance_bp_status_idx";',
        ),
        # BudgetEnvelope indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_env_plan_idx" RENAME TO "trakledger_env_plan_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_env_plan_idx" RENAME TO "finance_env_plan_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_env_cc_idx" RENAME TO "trakledger_env_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_env_cc_idx" RENAME TO "finance_env_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_env_cat_idx" RENAME TO "trakledger_env_cat_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_env_cat_idx" RENAME TO "finance_env_cat_idx";',
        ),
        # BudgetMonth indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_bm_envelope_idx" RENAME TO "trakledger_bm_envelope_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_bm_envelope_idx" RENAME TO "finance_bm_envelope_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_bm_month_idx" RENAME TO "trakledger_bm_month_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_bm_month_idx" RENAME TO "finance_bm_month_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_bm_locked_idx" RENAME TO "trakledger_bm_locked_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_bm_locked_idx" RENAME TO "finance_bm_locked_idx";',
        ),
        # CostTransaction indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_idemp_idx" RENAME TO "trakledger_ctx_idemp_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_idemp_idx" RENAME TO "finance_ctx_idemp_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_type_idx" RENAME TO "trakledger_ctx_type_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_type_idx" RENAME TO "finance_ctx_type_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_cat_idx" RENAME TO "trakledger_ctx_cat_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_cat_idx" RENAME TO "finance_ctx_cat_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_occurred_idx" RENAME TO "trakledger_ctx_occurred_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_occurred_idx" RENAME TO "finance_ctx_occurred_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_cc_idx" RENAME TO "trakledger_ctx_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_cc_idx" RENAME TO "finance_ctx_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_wo_idx" RENAME TO "trakledger_ctx_wo_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_wo_idx" RENAME TO "finance_ctx_wo_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_asset_idx" RENAME TO "trakledger_ctx_asset_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_asset_idx" RENAME TO "finance_ctx_asset_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_locked_idx" RENAME TO "trakledger_ctx_locked_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_locked_idx" RENAME TO "finance_ctx_locked_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ctx_summary_idx" RENAME TO "trakledger_ctx_summary_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ctx_summary_idx" RENAME TO "finance_ctx_summary_idx";',
        ),
        # Commitment indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_commit_cc_idx" RENAME TO "trakledger_commit_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_commit_cc_idx" RENAME TO "finance_commit_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_commit_month_idx" RENAME TO "trakledger_commit_month_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_commit_month_idx" RENAME TO "finance_commit_month_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_commit_status_idx" RENAME TO "trakledger_commit_status_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_commit_status_idx" RENAME TO "finance_commit_status_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_commit_cat_idx" RENAME TO "trakledger_commit_cat_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_commit_cat_idx" RENAME TO "finance_commit_cat_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_commit_wo_idx" RENAME TO "trakledger_commit_wo_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_commit_wo_idx" RENAME TO "finance_commit_wo_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_commit_summary_idx" RENAME TO "trakledger_commit_summary_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_commit_summary_idx" RENAME TO "finance_commit_summary_idx";',
        ),
        # LedgerAdjustment indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_adj_orig_tx_idx" RENAME TO "trakledger_adj_orig_tx_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_adj_orig_tx_idx" RENAME TO "finance_adj_orig_tx_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_adj_type_idx" RENAME TO "trakledger_adj_type_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_adj_type_idx" RENAME TO "finance_adj_type_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_adj_created_idx" RENAME TO "trakledger_adj_created_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_adj_created_idx" RENAME TO "finance_adj_created_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_adj_approved_idx" RENAME TO "trakledger_adj_approved_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_adj_approved_idx" RENAME TO "finance_adj_approved_idx";',
        ),
        # SavingsEvent indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_savings_cc_idx" RENAME TO "tl_savings_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_savings_cc_idx" RENAME TO "finance_savings_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_savings_type_idx" RENAME TO "tl_savings_type_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_savings_type_idx" RENAME TO "finance_savings_type_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_savings_occurred_idx" RENAME TO "tl_savings_occurred_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_savings_occurred_idx" RENAME TO "finance_savings_occurred_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_savings_asset_idx" RENAME TO "tl_savings_asset_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_savings_asset_idx" RENAME TO "finance_savings_asset_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_savings_wo_idx" RENAME TO "tl_savings_wo_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_savings_wo_idx" RENAME TO "finance_savings_wo_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_savings_summary_idx" RENAME TO "tl_savings_summary_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "tl_savings_summary_idx" RENAME TO "finance_savings_summary_idx";',
        ),
        # EnergyTariff indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_etariff_distrib_idx" RENAME TO "trakledger_etariff_distrib_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_etariff_distrib_idx" RENAME TO "finance_etariff_distrib_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_etariff_class_idx" RENAME TO "trakledger_etariff_class_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_etariff_class_idx" RENAME TO "finance_etariff_class_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_etariff_vig_idx" RENAME TO "trakledger_etariff_vig_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_etariff_vig_idx" RENAME TO "finance_etariff_vig_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_etariff_active_idx" RENAME TO "trakledger_etariff_active_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_etariff_active_idx" RENAME TO "finance_etariff_active_idx";',
        ),
        # EnergyReading indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ereading_asset_idx" RENAME TO "trakledger_ereading_asset_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ereading_asset_idx" RENAME TO "finance_ereading_asset_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ereading_date_idx" RENAME TO "trakledger_ereading_date_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ereading_date_idx" RENAME TO "finance_ereading_date_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ereading_cc_idx" RENAME TO "trakledger_ereading_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ereading_cc_idx" RENAME TO "finance_ereading_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_ereading_source_idx" RENAME TO "trakledger_ereading_source_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_ereading_source_idx" RENAME TO "finance_ereading_source_idx";',
        ),
        # Baseline indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_baseline_asset_idx" RENAME TO "trakledger_baseline_asset_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_baseline_asset_idx" RENAME TO "finance_baseline_asset_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_baseline_cc_idx" RENAME TO "trakledger_baseline_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_baseline_cc_idx" RENAME TO "finance_baseline_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_baseline_status_idx" RENAME TO "trakledger_baseline_status_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_baseline_status_idx" RENAME TO "finance_baseline_status_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_baseline_type_idx" RENAME TO "trakledger_baseline_type_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_baseline_type_idx" RENAME TO "finance_baseline_type_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_baseline_wo_idx" RENAME TO "trakledger_baseline_wo_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_baseline_wo_idx" RENAME TO "finance_baseline_wo_idx";',
        ),
        # RiskSnapshot indexes
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_risk_asset_idx" RENAME TO "trakledger_risk_asset_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_risk_asset_idx" RENAME TO "finance_risk_asset_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_risk_date_idx" RENAME TO "trakledger_risk_date_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_risk_date_idx" RENAME TO "finance_risk_date_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_risk_cc_idx" RENAME TO "trakledger_risk_cc_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_risk_cc_idx" RENAME TO "finance_risk_cc_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_risk_level_idx" RENAME TO "trakledger_risk_level_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_risk_level_idx" RENAME TO "finance_risk_level_idx";',
        ),
        migrations.RunSQL(
            sql='ALTER INDEX IF EXISTS "finance_risk_score_idx" RENAME TO "trakledger_risk_score_idx";',
            reverse_sql='ALTER INDEX IF EXISTS "trakledger_risk_score_idx" RENAME TO "finance_risk_score_idx";',
        ),
        # ========================================
        # 4. Atualizar django_content_type
        # ========================================
        migrations.RunSQL(
            sql="UPDATE django_content_type SET app_label = 'trakledger' WHERE app_label = 'finance';",
            reverse_sql="UPDATE django_content_type SET app_label = 'finance' WHERE app_label = 'trakledger';",
        ),
    ]
