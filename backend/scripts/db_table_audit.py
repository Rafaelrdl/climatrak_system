#!/usr/bin/env python3
import csv
import os
import re
import subprocess
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CSV = REPO_ROOT / "reports" / "db_tables.csv"
DEFAULT_REPORT = REPO_ROOT / "reports" / "db_table_audit_report.md"

FRAMEWORK_TABLES = {
    "django_migrations",
    "django_content_type",
    "django_session",
    "django_admin_log",
    "auth_group",
    "auth_permission",
    "auth_group_permissions",
    "users_groups",
    "users_user_permissions",
}
FRAMEWORK_PREFIXES = ("django_", "auth_")

EXCLUDE_RG_GLOBS = [
    "!**/migrations/**",
    "!**/.venv/**",
    "!**/node_modules/**",
    "!**/__pycache__/**",
    "!**/dist/**",
    "!**/build/**",
    "!**/reports/**",
    "!**/tmp/**",
]

SEARCH_ROOTS = [
    REPO_ROOT / "backend",
    REPO_ROOT / "frontend",
    REPO_ROOT / "mobile",
    REPO_ROOT / "website",
    REPO_ROOT / "scripts",
    REPO_ROOT / "infra",
]


def run_rg(pattern, roots, fixed=False, word=False, files_only=True):
    cmd = ["rg"]
    if files_only:
        cmd.append("-l")
    if fixed:
        cmd.append("-F")
    if word:
        cmd.append("-w")
    for glob in EXCLUDE_RG_GLOBS:
        cmd.extend(["-g", glob])
    cmd.append(pattern)
    cmd.extend(str(root) for root in roots if root.exists())
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode not in (0, 1):
        raise RuntimeError(result.stderr.strip() or "rg failed")
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return sorted(set(lines))


def parse_models():
    model_map = {}
    model_name_map = {}
    m2m_map = {}
    model_files = sorted(REPO_ROOT.glob("backend/apps/**/models*.py"))
    class_re = re.compile(r"^class\s+(\w+)\s*\(([^)]*)\)\s*:", re.M)
    m2m_re = re.compile(r"^\s*(\w+)\s*=\s*models\.ManyToManyField\(", re.M)
    for model_file in model_files:
        app_label = model_file.parent.name
        text = model_file.read_text(encoding="utf-8")
        matches = list(class_re.finditer(text))
        model_bases = set()
        for idx, match in enumerate(matches):
            class_name = match.group(1)
            bases_raw = match.group(2)
            bases = [base.strip() for base in bases_raw.split(",") if base.strip()]
            is_model = any(
                base.endswith("Model")
                or base == "models.Model"
                or base in model_bases
                for base in bases
            )
            if not is_model:
                continue
            start = match.start()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
            block = text[start:end]
            if re.search(r"abstract\s*=\s*True", block):
                model_bases.add(class_name)
                continue
            db_table_match = re.search(r"db_table\s*=\s*['\"]([^'\"]+)['\"]", block)
            if db_table_match:
                table = db_table_match.group(1)
            else:
                table = f"{app_label}_{class_name.lower()}"
            model_map.setdefault(table, []).append(
                {"origin_type": "model", "origin_path": str(model_file), "model_name": class_name}
            )
            model_name_map.setdefault(table, set()).add(class_name)
            model_bases.add(class_name)

            for m2m_match in m2m_re.finditer(block):
                field_name = m2m_match.group(1)
                paren_start = block.find("(", m2m_match.start())
                field_block = extract_paren_block(block, paren_start) if paren_start != -1 else ""
                if "through=" in field_block:
                    continue
                table_name = f"{app_label}_{class_name.lower()}_{field_name}"
                m2m_map.setdefault(table_name, []).append(
                    {"origin_type": "m2m_auto", "origin_path": str(model_file)}
                )
    return model_map, model_name_map, m2m_map


def extract_paren_block(text, start_index):
    depth = 0
    i = start_index
    while i < len(text):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return text[start_index : i + 1]
        i += 1
    return text[start_index:]


def parse_migrations():
    migration_map = {}
    migration_files = sorted(REPO_ROOT.glob("backend/apps/**/migrations/*.py"))
    for mig_file in migration_files:
        if mig_file.name == "__init__.py":
            continue
        app_label = mig_file.parent.parent.name
        text = mig_file.read_text(encoding="utf-8")
        cursor = 0
        while True:
            idx = text.find("migrations.CreateModel(", cursor)
            if idx == -1:
                break
            block = extract_paren_block(text, idx + len("migrations.CreateModel"))
            name_match = re.search(r"name\s*=\s*['\"]([^'\"]+)['\"]", block)
            db_table_match = re.search(r"db_table['\"]?\s*:\s*['\"]([^'\"]+)['\"]", block)
            if name_match:
                model_name = name_match.group(1)
                if db_table_match:
                    table = db_table_match.group(1)
                else:
                    table = f"{app_label}_{model_name.lower()}"
                migration_map.setdefault(table, []).append(
                    {"origin_type": "migration", "origin_path": str(mig_file)}
                )
            cursor = idx + 1
    return migration_map


def parse_raw_sql():
    raw_map = {}
    sql_patterns = [
        re.compile(r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([^\s(]+)", re.I),
        re.compile(r"CREATE\s+TABLE\s+([^\s(]+)", re.I),
        re.compile(r"CREATE\s+MATERIALIZED\s+VIEW\s+([^\s(]+)", re.I),
        re.compile(r"CREATE\s+VIEW\s+([^\s(]+)", re.I),
    ]
    rg_matches = subprocess.run(
        ["rg", "-n", "CREATE TABLE|CREATE MATERIALIZED VIEW|CREATE VIEW", str(REPO_ROOT)],
        capture_output=True,
        text=True,
    )
    if rg_matches.returncode not in (0, 1):
        raise RuntimeError(rg_matches.stderr.strip() or "rg failed")
    for line in rg_matches.stdout.splitlines():
        parts = line.split(":", 2)
        if len(parts) < 3:
            continue
        path = parts[0]
        content = parts[2]
        for pattern in sql_patterns:
            match = pattern.search(content)
            if match:
                table = match.group(1).strip('"')
                if "." in table:
                    table = table.split(".", 1)[1]
                raw_map.setdefault(table, []).append(
                    {"origin_type": "raw_sql", "origin_path": path}
                )
    return raw_map


def load_tables(csv_path):
    tables = []
    with open(csv_path, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            tables.append({"schema": row["schema"], "table_name": row["table_name"]})
    return tables


def classify_table(table_name):
    if table_name in FRAMEWORK_TABLES or table_name.startswith(FRAMEWORK_PREFIXES):
        return "Framework/Infra"
    return None


def main():
    csv_path = Path(os.environ.get("DB_TABLES_CSV", DEFAULT_CSV))
    report_path = Path(os.environ.get("DB_TABLES_REPORT", DEFAULT_REPORT))
    if not csv_path.exists():
        raise SystemExit(f"Missing CSV at {csv_path}")

    tables = load_tables(csv_path)
    model_map, model_name_map, m2m_map = parse_models()
    migration_map = parse_migrations()
    raw_map = parse_raw_sql()

    rows = []
    for entry in tables:
        schema = entry["schema"]
        table_name = entry["table_name"]
        framework = classify_table(table_name)

        origins = []
        origins.extend(model_map.get(table_name, []))
        origins.extend(migration_map.get(table_name, []))
        origins.extend(raw_map.get(table_name, []))
        origins.extend(m2m_map.get(table_name, []))

        origin_type = "unknown"
        origin_path = ""
        if origins:
            origin_type = origins[0]["origin_type"]
            origin_path = origins[0]["origin_path"]

        evidence = []
        if not framework:
            table_matches = run_rg(table_name, SEARCH_ROOTS, fixed=True)
            for match in table_matches[:5]:
                evidence.append(match)
            model_names = model_name_map.get(table_name, set())
            for model_name in sorted(model_names):
                model_matches = run_rg(rf"\b{model_name}\b", SEARCH_ROOTS, fixed=False)
                for match in model_matches[:5]:
                    if match not in evidence:
                        evidence.append(match)
            if table_name in m2m_map and not evidence:
                evidence.append(m2m_map[table_name][0]["origin_path"])
        evidence_str = ", ".join(evidence) if evidence else "nenhuma evidência"

        classification = framework or ("OK" if evidence else None)
        if not classification:
            if origin_type in ("model", "migration", "raw_sql", "m2m_auto"):
                classification = "Suspeita"
            else:
                classification = "Desconhecida"

        recommendation = {
            "OK": "manter",
            "Framework/Infra": "manter",
            "Suspeita": "investigar",
            "Desconhecida": "investigar",
        }[classification]

        rows.append(
            {
                "schema": schema,
                "table_name": table_name,
                "origin_type": origin_type,
                "origin_path": origin_path,
                "evidence": evidence_str,
                "classification": classification,
                "recommendation": recommendation,
            }
        )

    rows_sorted = sorted(
        rows,
        key=lambda r: (
            0 if r["classification"] == "Suspeita" else 1,
            0 if r["classification"] == "Desconhecida" else 1,
            r["schema"],
            r["table_name"],
        ),
    )

    totals = {"OK": 0, "Framework/Infra": 0, "Suspeita": 0, "Desconhecida": 0}
    for row in rows:
        totals[row["classification"]] += 1

    schemas = sorted({row["schema"] for row in rows})
    report_lines = [
        "# DB Table Audit Report",
        "",
        "## Resumo",
        f"- total de schemas analisados: {len(schemas)} ({', '.join(schemas)})",
        f"- total de tabelas: {len(rows)}",
        f"- OK: {totals['OK']}",
        f"- Framework/Infra: {totals['Framework/Infra']}",
        f"- Suspeita: {totals['Suspeita']}",
        f"- Desconhecida: {totals['Desconhecida']}",
        "",
        "## Tabela principal",
        "",
        "| schema.table | origin_type | origin_path | evidência de uso | recomendação |",
        "| --- | --- | --- | --- | --- |",
    ]

    for row in rows_sorted:
        schema_table = f"{row['schema']}.{row['table_name']}"
        origin_path = row["origin_path"] or "desconhecida"
        report_lines.append(
            f"| {schema_table} | {row['origin_type']} | {origin_path} | {row['evidence']} | {row['recommendation']} |"
        )

    suspects = [r for r in rows_sorted if r["classification"] == "Suspeita"][:30]
    report_lines.extend(
        [
            "",
            "## Top suspeitas",
        ]
    )
    if suspects:
        for row in suspects:
            report_lines.append(
                f"- {row['schema']}.{row['table_name']}: origem {row['origin_type']} ({row['origin_path'] or 'desconhecida'}), sem evidência de uso."
            )
    else:
        report_lines.append("- nenhuma tabela suspeita encontrada.")

    report_lines.extend(
        [
            "",
            "## Próximos passos sugeridos",
            "- checar acessos em runtime/logs (queries em produção) para confirmar uso.",
            "- revisar migrations antigas e decisões de produto associadas.",
            "- validar se há feature flags ou cache offline dependente dessas tabelas.",
            "- revisar tenants específicos com dados divergentes.",
        ]
    )

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(report_lines), encoding="utf-8")

    print(f"Report written to {report_path}")


if __name__ == "__main__":
    main()
