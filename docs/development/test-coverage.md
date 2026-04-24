# Test Coverage Requirements

This document describes the **current** backend coverage posture for
HealthArchive.

The main distinction is:

- the fast PR-blocking backend gate runs `make ci` and does **not** measure
  coverage
- the broader full gate runs `make check-full` and **does** enforce the current
  coverage threshold

## Current Enforcement Surface

| Surface | Workflow / command | When it runs | Coverage enforced? |
|--------|---------------------|--------------|--------------------|
| Fast backend CI | `.github/workflows/backend-ci.yml` → `make ci` | pushes to `main`, pull requests, manual dispatch | No |
| Full backend CI | `.github/workflows/backend-ci-full.yml` → `make check-full` | nightly schedule, manual dispatch | Yes |
| Local full gate | `make check-full` | when run explicitly (recommended before deploys) | Yes |

Do not describe the fast `make ci` path as a coverage gate. Today it checks
formatting, lint, type-checking, and the fast backend test set only.

## What `make coverage-critical` Actually Enforces

`make coverage-critical` is the only automated backend coverage threshold in the
repo today. It:

- measures **combined** coverage across:
  - `src/ha_backend/api`
  - `src/ha_backend/indexing`
  - `src/ha_backend/worker`
- fails when the **combined total** drops below **75%**
- writes an HTML report to `htmlcov-critical/index.html`

Important: the current automation does **not** enforce separate per-package
thresholds. If one package drops while the combined total still clears 75%, the
full gate can still pass.

## Coverage Goals

The current policy has two layers:

- **Hard floor:** 75% combined coverage across the critical backend modules
  above, enforced only when `make coverage-critical` runs
- **Improvement goal:** move the combined total toward 80% over time, with
  indexing coverage remaining the main bottleneck (`make coverage-target`
  prints the current improvement note from the Makefile)

Treat API, worker, and indexing changes as high-scrutiny areas even when the
combined threshold still passes.

## Running Coverage Locally

```bash
# Full coverage report across src/
make coverage

# Combined coverage gate for api + indexing + worker
make coverage-critical

# Print the current threshold / improvement note
make coverage-target

# Show report locations
make coverage-report
```

## Coverage Configuration

Coverage settings live in `pyproject.toml`:

```toml
[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/test_*.py"]

[tool.coverage.report]
precision = 2
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

The 75% threshold itself currently comes from the Makefile:

```make
coverage-critical:
	$(PYTEST) \
		--cov=src/ha_backend/api \
		--cov=src/ha_backend/indexing \
		--cov=src/ha_backend/worker \
		--cov-fail-under=75
```

## When Coverage Failures Matter

Coverage failures currently block:

- `make check-full` when you run it locally
- `.github/workflows/backend-ci-full.yml` when the nightly/manual full workflow
  runs

Coverage failures do **not** currently block:

- `make ci`
- `.github/workflows/backend-ci.yml`
- the default PR-required backend status checks

## Working Expectations

- If you change API, worker, or indexing behavior, prefer adding tests in the
  same change even if the fast gate would pass without them.
- Use `make coverage-critical` when touching riskier logic or when you want to
  check whether a change is eroding the current full-gate baseline.
- Use `make check-full` before deploys or when tightening quality, because that
  is the path that exercises the current coverage threshold plus the broader
  docs/security checks.

## FAQ

**Q: Why not enforce coverage in the fast PR gate?**
A: The current repo choice keeps `make ci` fast and predictable for daily work.
Coverage is still checked in the fuller nightly/manual path and can be run
locally before deploys.

**Q: Is 75% enforced per critical package?**
A: No. The current automation enforces a 75% **combined** threshold across API,
worker, and indexing together.

**Q: How do I see what is missing?**
A: Run `make coverage-critical` and open `htmlcov-critical/index.html`.

**Q: Is 80% enforced today?**
A: No. 80% remains an improvement goal, not a blocking threshold.

---

**Related docs**:
- [Testing Guidelines](testing-guidelines.md)
- [Monitoring and CI Checklist](../operations/monitoring-and-ci-checklist.md)
- [Contributing](https://github.com/jerdaw/healtharchive/blob/main/CONTRIBUTING.md)
