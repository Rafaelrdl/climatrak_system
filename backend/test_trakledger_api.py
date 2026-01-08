#!/usr/bin/env python
"""
Script para testar a API do TrakLedger.
"""
import os
import sys
import requests
import json

BASE_URL = "http://localhost:8000"
HOST = "umc.localhost"

# Login
print("=== LOGIN ===")
resp = requests.post(
    f"{BASE_URL}/api/auth/login/",
    headers={"Host": HOST, "Content-Type": "application/json"},
    json={"email": "owner@umc.localhost", "password": "Dev@123456"}
)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    token = resp.json().get("token") or resp.json().get("access")
    print(f"Token: {token[:50]}..." if token else "No token found")
    print(f"Response keys: {resp.json().keys()}")
    
    # Testar TrakLedger
    print("\n=== TRAKLEDGER BUDGET-SUMMARY ===")
    resp2 = requests.get(
        f"{BASE_URL}/api/trakledger/budget-summary/",
        headers={
            "Host": HOST,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
else:
    print(f"Error: {resp.text}")
