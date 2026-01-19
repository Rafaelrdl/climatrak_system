#!/usr/bin/env python
"""Script para rodar testes do RootCauseAgent."""
import subprocess
import sys

result = subprocess.run(
    [sys.executable, "manage.py", "test", "apps.ai.tests.test_root_cause_agent", "-v", "2"],
    capture_output=True,
    text=True,
)

print("=== STDOUT ===")
print(result.stdout)
print("\n=== STDERR ===")
print(result.stderr)
print(f"\n=== EXIT CODE: {result.returncode} ===")
