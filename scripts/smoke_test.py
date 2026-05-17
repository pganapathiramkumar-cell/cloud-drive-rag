"""
Smoke test — run against the live Railway deployment to verify everything works.

Usage:
    python scripts/smoke_test.py
    python scripts/smoke_test.py --url http://localhost:8000   # local
    python scripts/smoke_test.py --token my-jwt-token          # custom token
"""
import argparse
import sys
import time
import urllib.request
import urllib.error
import json

BASE_URL = "https://cloud-drive-rag-production.up.railway.app"
DEV_TOKEN = "dev-token"

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m!\033[0m"

results = []


def check(name: str, fn):
    try:
        msg = fn()
        print(f"  {PASS}  {name}: {msg}")
        results.append((name, True))
    except AssertionError as e:
        print(f"  {FAIL}  {name}: {e}")
        results.append((name, False))
    except Exception as e:
        print(f"  {FAIL}  {name}: unexpected error — {e}")
        results.append((name, False))


def get(path: str, token: str | None = None, origin: str | None = None) -> tuple[int, dict]:
    req = urllib.request.Request(f"{BASE_URL}{path}")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if origin:
        req.add_header("Origin", origin)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.status, json.loads(resp.read())


def main(url: str, token: str):
    global BASE_URL
    BASE_URL = url.rstrip("/")

    print(f"\n{'='*55}")
    print(f"  Enterprise RAG — Smoke Test")
    print(f"  Target: {BASE_URL}")
    print(f"{'='*55}\n")

    # ── 1. Reachability ──────────────────────────────────────
    print("1. Reachability")

    def test_health():
        status, body = get("/v1/health")
        assert status == 200, f"HTTP {status}"
        assert "status" in body, "missing 'status' field"
        return f"status={body['status']} qdrant={body.get('qdrant')} redis={body.get('redis')}"
    check("GET /v1/health", test_health)

    # ── 2. CORS ──────────────────────────────────────────────
    print("\n2. CORS (simulates browser preflight)")

    def test_cors_health():
        req = urllib.request.Request(
            f"{BASE_URL}/v1/health",
            method="GET",
            headers={"Origin": "https://cloud-rag.vercel.app"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            acao = resp.headers.get("Access-Control-Allow-Origin", "")
            assert acao, "Access-Control-Allow-Origin header missing"
            return f"Access-Control-Allow-Origin: {acao}"
    check("CORS header on /v1/health", test_cors_health)

    # ── 3. Authentication ────────────────────────────────────
    print("\n3. Authentication")

    def test_no_token():
        req = urllib.request.Request(f"{BASE_URL}/v1/metrics")
        try:
            urllib.request.urlopen(req, timeout=10)
            # If SKIP_AUTH=true, unauthenticated requests are allowed — that's fine
            return "SKIP_AUTH mode — unauthenticated request allowed"
        except urllib.error.HTTPError as e:
            assert e.code == 401, f"expected 401, got {e.code}"
            return "401 Unauthorized (Keycloak mode — correct)"
    check("No token → 401 or SKIP_AUTH pass", test_no_token)

    def test_dev_token():
        status, body = get("/v1/metrics", token=token)
        assert status == 200, f"HTTP {status} — check SKIP_AUTH=true on Railway"
        return f"HTTP {status} — metrics endpoint accessible"
    check(f"Bearer {token[:12]}... → /v1/metrics", test_dev_token)

    # ── 4. Core endpoints ────────────────────────────────────
    print("\n4. Core endpoints")

    def test_metrics():
        status, body = get("/v1/metrics", token=token)
        assert status == 200, f"HTTP {status}"
        for field in ("queries", "ingestion", "latency"):
            assert field in body, f"missing field '{field}'"
        return f"HTTP {status} — queries.total={body['queries']['total']}"
    check("GET /v1/metrics shape", test_metrics)

    def test_analytics():
        status, body = get("/v1/analytics", token=token)
        assert status == 200, f"HTTP {status}"
        assert "node_latency" in body, "missing 'node_latency'"
        return f"HTTP {status} — node_latency keys={list(body['node_latency'].keys())}"
    check("GET /v1/analytics shape", test_analytics)

    def test_docs():
        req = urllib.request.Request(f"{BASE_URL}/docs")
        with urllib.request.urlopen(req, timeout=10) as resp:
            assert resp.status == 200, f"HTTP {resp.status}"
            return "Swagger UI reachable"
    check("GET /docs (Swagger UI)", test_docs)

    # ── 5. Latency ───────────────────────────────────────────
    print("\n5. Latency")

    def test_health_latency():
        t0 = time.monotonic()
        get("/v1/health")
        ms = (time.monotonic() - t0) * 1000
        assert ms < 3000, f"{ms:.0f} ms — too slow (>3s)"
        return f"{ms:.0f} ms"
    check("Health endpoint < 3000 ms", test_health_latency)

    # ── Summary ──────────────────────────────────────────────
    passed = sum(1 for _, ok in results if ok)
    total  = len(results)
    print(f"\n{'='*55}")
    print(f"  Results: {passed}/{total} passed")
    if passed == total:
        print(f"  {PASS} All checks passed — deployment is healthy")
    else:
        failed = [name for name, ok in results if not ok]
        print(f"  {FAIL} Failed: {', '.join(failed)}")
    print(f"{'='*55}\n")

    return passed == total


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url",   default=BASE_URL, help="Backend base URL")
    parser.add_argument("--token", default=DEV_TOKEN, help="Bearer token")
    args = parser.parse_args()
    ok = main(args.url, args.token)
    sys.exit(0 if ok else 1)
