# TODO — Enterprise RAG Pending Work

> Priority: 🔴 High · 🟡 Medium · 🟢 Low
> Status: ⬜ Not started · 🔄 In progress · ✅ Done

---

## 🔴 High Priority

### CI/CD — GitHub Actions
**Status:** ⬜ Not started
- [ ] Create `.github/workflows/ci.yml`
- [ ] On every push/PR: run `cd backend && pytest tests/unit/ -v`
- [ ] On every push/PR: run `cd frontend && tsc && vite build` (type check + build)
- [ ] Block Railway/Vercel deploy if CI fails
- [ ] Optionally: run `python scripts/smoke_test.py` after deploy as post-deploy check
- **Why:** Today's broken Dockerfile went straight to production with zero gate. CI would have caught it.

### `.env.example` — Document all required env vars
**Status:** ⬜ Not started
- [ ] Create `backend/.env.example` with all keys from `app/config.py` (GROQ_API_KEY, COHERE_API_KEY, QDRANT_URL, QDRANT_API_KEY, REDIS_URL, SKIP_AUTH, OTEL_ENABLED, GOOGLE_API_KEY, etc.)
- [ ] Create `frontend/.env.example` with VITE_API_URL, VITE_SKIP_AUTH, VITE_KEYCLOAK_URL, etc.
- **Why:** Anyone setting up the project (or Claude) has to guess what env vars are needed. This ends that.

### Branch Protection on GitHub
**Status:** ⬜ Not started
- [ ] Go to GitHub → repo → Settings → Branches → Add rule for `main`
- [ ] Enable: "Require a pull request before merging"
- [ ] Enable: "Require status checks to pass before merging" (once CI is set up)
- [ ] Enable: "Restrict who can push to main"
- **Why:** Prevents direct pushes to main that break production (exactly what happened today).

---

## 🟡 Medium Priority

### Pre-commit Hooks — Catch errors before push
**Status:** ⬜ Not started
- [ ] Install `pre-commit` (`pip install pre-commit`)
- [ ] Create `.pre-commit-config.yaml`
- [ ] Hook: `tsc --noEmit` on frontend TypeScript files
- [ ] Hook: `pytest tests/unit/ -x --quiet` on backend Python files
- [ ] Hook: `ruff` or `flake8` lint on Python
- **Why:** Catch TypeScript errors and broken imports before they reach Railway.

### Error Monitoring — Sentry
**Status:** ⬜ Not started
- [ ] Sign up at sentry.io (free tier — 5k errors/month)
- [ ] `pip install sentry-sdk[fastapi]` → add to requirements.txt
- [ ] Add `sentry_sdk.init(dsn=SENTRY_DSN)` in `app/main.py`
- [ ] Add `npm install @sentry/react` → init in `frontend/src/main.tsx`
- [ ] Add `SENTRY_DSN` to Railway and Vercel env vars
- **Why:** Right now when something breaks in production you only find out when a user complains. Sentry alerts you immediately.

### Integration Tests — Test with real services
**Status:** ⬜ Not started
- [ ] `backend/tests/integration/test_pipeline.py` — test the full query pipeline against real Qdrant + Redis (local via docker-compose)
- [ ] `backend/tests/integration/test_ingest.py` — test file upload + chunking + vector storage end-to-end
- [ ] Add `pytest tests/integration/` to CI (separate job, only on main branch)
- **Why:** Unit tests mock external services. Integration tests catch real failures (e.g. Qdrant schema changes, Redis TTL bugs).

### Rollback Documentation
**Status:** ⬜ Not started
- [ ] Document how to roll back Railway: Railway dashboard → Deployments → click any previous deployment → Redeploy
- [ ] Document how to roll back Vercel: Vercel dashboard → Deployments → click previous → Promote to Production
- [ ] Document how to roll back via git: `git revert HEAD && git push` (triggers redeploy automatically)
- [ ] Add this to CLAUDE.md under Troubleshooting
- **Why:** Under pressure it's not obvious how to revert. Having it written saves 20 minutes of panic.

---

## 🟢 Low Priority

### Dependency Pinning & Security Audit
**Status:** ⬜ Not started
- [ ] Run `pip-audit` on `backend/requirements.txt` — checks for known CVEs
- [ ] Run `npm audit` in `frontend/` — checks npm package vulnerabilities
- [ ] Pin all `>=` version ranges in requirements.txt to exact versions
- [ ] Set up GitHub Dependabot (`.github/dependabot.yml`) for automated security PRs
- **Why:** Some requirements.txt entries use `>=` ranges — a breaking update could deploy silently.

### Structured Logging
**Status:** ⬜ Not started
- [ ] Replace `print()` and bare exceptions with Python `logging` module
- [ ] Add log levels: DEBUG (local), INFO (Railway), WARNING/ERROR (always)
- [ ] Add request ID to log lines (trace requests end-to-end)
- [ ] Set `LOG_LEVEL` env var in Railway
- **Why:** Railway logs are currently a wall of text. Structured logs make filtering and debugging faster.

### Hybrid Search (OpenSearch BM25)
**Status:** ⬜ Not started · Tracked in `steer.md` as 📋 Planned
- [ ] Add OpenSearch to docker-compose
- [ ] Implement `services/keyword_search.py` — BM25 index
- [ ] Implement `hybrid_search_engine` skill — RRF fusion of vector + BM25 scores
- [ ] Update retrieve node to call hybrid search
- **Why:** Vector-only retrieval misses exact keyword matches. Hybrid gives much better recall.

### RAGAS Evaluation Pipeline
**Status:** ⬜ Not started · Tracked in `skill.md` as 🔧 Partial
- [ ] `pip install ragas`
- [ ] Create `backend/evaluation/` directory
- [ ] Build labelled Q&A dataset from real queries
- [ ] Run RAGAS: context_precision, context_recall, faithfulness, answer_relevancy
- [ ] Track scores over time in MLflow
- **Why:** Current RAG quality metrics are approximations based on similarity scores. RAGAS gives ground-truth quality scores.

### OPA Policy Enforcer
**Status:** ⬜ Not started · Tracked in `steer.md` as 📋 Planned
- [ ] Add OPA sidecar to docker-compose
- [ ] Write Rego policies: RBAC, data classification, query filters
- [ ] Replace role checks in routes with OPA policy calls
- **Why:** Centralises authorization logic. Currently scattered across route decorators.

---

## ✅ Done (reference)

- ✅ Responsive UI — mobile/tablet breakpoints (May 2026)
- ✅ Railway PORT fix — use `${PORT:-8000}` in Dockerfile CMD (May 2026)
- ✅ Unit tests — chunker, health, auth, doc_parser (May 2026)
- ✅ Smoke test script — `scripts/smoke_test.py` (May 2026)
- ✅ Tests tab — live system health checks in frontend (May 2026)
- ✅ Documentation — CLAUDE.md, steer.md, skill.md updated with deployment config (May 2026)
- ✅ Vercel env vars — VITE_API_URL + VITE_SKIP_AUTH in vercel.json (May 2026)
- ✅ ChatWorkflow tab — LangGraph pipeline visualiser (prior)
- ✅ PII detection — Presidio scan_input + scan_output nodes (prior)
- ✅ Metrics + Analytics dashboards (prior)
