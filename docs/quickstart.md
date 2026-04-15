# Quick Start

Get up and running with HealthArchive in 5 minutes.

## What is HealthArchive?

HealthArchive is a web archiving service that preserves Canadian health government sources (Health Canada, PHAC). It crawls, indexes, and makes searchable snapshots of public health information for research and accountability.

## Choose Your Path

Pick the guide that matches your role:

### 👤 I'm an Operator

**Goal**: Deploy, monitor, and maintain the production system.

1. Read the [Production Runbook](deployment/production-single-vps.md) for deployment setup
2. Review [Operator Responsibilities](operations/playbooks/core/operator-responsibilities.md) for your must-do checklist
3. Bookmark [Incident Response](operations/playbooks/core/incident-response.md) for emergencies

**Quick Deploy**:
```bash
# On the VPS
cd /opt/healtharchive
./scripts/vps-deploy.sh --apply --baseline-mode live
```

---

### 💻 I'm a Developer

**Goal**: Contribute code, fix bugs, add features.

1. **Clone and setup**:
   ```bash
   git clone https://github.com/jerdaw/healtharchive.git
   cd healtharchive
   make venv
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   source .env
   ```

3. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

4. **Start the API**:
   ```bash
   uvicorn ha_backend.api:app --reload --port 8001
   ```

5. **Run tests**:
   ```bash
   make ci
   ```

**Next**: Follow the [Architecture Walkthrough](tutorials/architecture-walkthrough.md) tutorial to understand how everything fits together.

---

### 🔧 I'm an API Consumer / Researcher

**Goal**: Search the archive and retrieve historical snapshots.

**API Base URL**: `https://api.healtharchive.ca`

**Quick Examples**:

```bash
# Search for content about vaccines
curl "https://api.healtharchive.ca/api/search?q=vaccines&sort=relevance"

# Get archive stats
curl "https://api.healtharchive.ca/api/stats"

# List all sources
curl "https://api.healtharchive.ca/api/sources"

# Get a specific snapshot
curl "https://api.healtharchive.ca/api/snapshot/42"
```

**Interactive API Docs**: [api.healtharchive.ca](https://api.healtharchive.ca/api/docs) (OpenAPI/Swagger UI)

**Next**: Read the [API Consumer Guide](api-consumer-guide.md) for detailed examples and use cases.

---

## Project Repositories

HealthArchive now uses a single app monorepo plus a separate datasets repo:

- **App monorepo** (this repo): backend API, crawler, docs hub, and the in-tree frontend under `frontend/`
  - GitHub: [jerdaw/healtharchive](https://github.com/jerdaw/healtharchive)
  - Docs: [docs.healtharchive.ca](https://docs.healtharchive.ca)
  - Live Site: [healtharchive.ca](https://healtharchive.ca)

- **Datasets**: Versioned data releases
  - GitHub: [jerdaw/healtharchive-datasets](https://github.com/jerdaw/healtharchive-datasets)

See the [Project Overview](project.md) for detailed navigation.

---

## Common Tasks

| Task | Command |
|------|---------|
| Run all checks | `make ci` |
| Run frontend checks | `make frontend-ci` |
| Sync generated API contract | `make contract-sync` |
| Start API server | `uvicorn ha_backend.api:app --reload --port 8001` |
| Start worker | `healtharchive start-worker --poll-interval 30` |
| Create a crawl job | `healtharchive create-job --source hc` |
| Run a job | `healtharchive run-db-job --id 42` |
| Index WARCs | `healtharchive index-job --id 42` |
| List jobs | `healtharchive list-jobs` |
| Serve docs locally | `make docs-serve` |

---

## Need Help?

- **Architecture Deep Dive**: [Architecture Guide](architecture.md)
- **Local Development**: [Live Testing](development/live-testing.md)
- **API Reference**: [API Documentation](api.md)
- **Troubleshooting**: Check the [How-To Guides](operations/README.md)
- **Report Issues**: [GitHub Issues](https://github.com/jerdaw/healtharchive/issues)

---

## What's Next?

### For Operators
1. Complete production deployment
2. Set up monitoring and alerts
3. Review the [Ops Cadence Checklist](operations/ops-cadence-checklist.md)

### For Developers
1. Complete [Your First Contribution](tutorials/first-contribution.md) tutorial
2. Read the [Architecture Walkthrough](tutorials/architecture-walkthrough.md)
3. Review [Testing Guidelines](development/testing-guidelines.md)

### For Researchers
1. Explore the [API Documentation](api.md)
2. Download datasets from [healtharchive-datasets](https://github.com/jerdaw/healtharchive-datasets)
3. Read about [Data Handling](operations/data-handling-retention.md)
