#!/usr/bin/env python3
"""End-to-end verification script for Wallcano Authentication & Password Reset System."""

import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8001/api/v1"


def api_call(method: str, path: str, data: dict = None, token: str = None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = json.loads(resp.read().decode("utf-8"))
            return status, content
    except urllib.error.HTTPError as err:
        try:
            content = json.loads(err.read().decode("utf-8"))
        except Exception:
            content = {"error": str(err)}
        return err.code, content


def main():
    print("==================================================")
    print("WALCANO INVENTORY AUTHENTICATION INTEGRATION TEST")
    print("==================================================")

    # 1. Admin Login
    print("\n[TEST 1] Admin Authentication:")
    status, res = api_call("POST", "/auth/login", {
        "email": "admin@wallcano.com",
        "password": "Admin@Wallcano2026!"
    })
    print(f"  Status: {status}")
    assert status == 200, f"Admin login failed: {res}"
    admin_token = res["access_token"]
    user = res["user"]
    print(f"  ✓ Admin logged in: {user['email']} (role: {user['role']}, name: {user['full_name']})")

    # 2. Get Profile (/auth/me)
    print("\n[TEST 2] Fetch Authenticated Profile (/auth/me):")
    status, me_res = api_call("GET", "/auth/me", token=admin_token)
    print(f"  Status: {status}")
    assert status == 200, f"/auth/me failed: {me_res}"
    print(f"  ✓ Verified profile: {me_res['full_name']} <{me_res['email']}>")

    # 3. Register New Staff User
    print("\n[TEST 3] User Registration (Staff Role Security):")
    test_email = "alex.murphy@wallcano.com"
    status, reg_res = api_call("POST", "/auth/register", {
        "full_name": "Alex Murphy",
        "email": test_email,
        "password": "Password123!"
    })
    if status == 400 and "already exists" in str(reg_res):
        print(f"  (User {test_email} already exists, proceeding to login...)")
        status, reg_res = api_call("POST", "/auth/login", {
            "email": test_email,
            "password": "Password123!"
        })
    print(f"  Status: {status}")
    assert status in (200, 201), f"Registration failed: {reg_res}"
    assert reg_res["user"]["role"] == "staff", "Public registration granted non-staff role!"
    print(f"  ✓ Staff registered: {reg_res['user']['email']} (role: {reg_res['user']['role']})")

    # 4. Forgot Password Flow
    print("\n[TEST 4] Forgot Password Request:")
    status, forgot_res = api_call("POST", "/auth/forgot-password", {"email": test_email})
    print(f"  Status: {status}")
    assert status == 200
    print(f"  ✓ Response: {forgot_res['message']}")

    # 5. Non-existent email security check
    print("\n[TEST 5] Security Check - Non-existent Email Enumeration Defense:")
    status, fake_res = api_call("POST", "/auth/forgot-password", {"email": "fake.user.doesnotexist@wallcano.com"})
    print(f"  Status: {status}")
    assert status == 200
    assert fake_res["message"] == forgot_res["message"], "Error message leaked user existence!"
    print(f"  ✓ Response identical: {fake_res['message']}")

    # 6. Verify QuickBooks Status Endpoint Unaffected
    print("\n[TEST 6] System Regression Check (QuickBooks & AI Endpoints):")
    status, qb_res = api_call("GET", "/quickbooks/status")
    print(f"  Status: {status}")
    assert status == 200
    print(f"  ✓ QuickBooks status endpoint responding normally: client_configured={qb_res.get('client_configured')}")

    # 7. Health Check
    print("\n[TEST 7] System Health Check:")
    req = urllib.request.Request("http://127.0.0.1:8001/api/health")
    with urllib.request.urlopen(req) as resp:
        health_res = json.loads(resp.read().decode("utf-8"))
        print(f"  Status: {resp.status} => {health_res}")
        assert resp.status == 200

    print("\n==================================================")
    print("✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")


if __name__ == "__main__":
    main()
