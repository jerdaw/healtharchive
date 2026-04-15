## Checklist

- [ ] If backend code or backend tests changed, ran `make backend-ci`
- [ ] If frontend code or frontend docs/build inputs changed, ran `make contract-check` and `make frontend-ci`
- [ ] If a backend/frontend interaction changed, ran `make integration-e2e`
- [ ] Updated/added tests if needed
- [ ] Updated docs/runbooks/playbooks if behavior or ops changed
- [ ] If schema-sensitive backend code changed, added Alembic migration under `alembic/versions/` (or documented why not); see `docs/development/playbooks/database-migrations.md`
- [ ] Considered user-visible impact (update `/changelog` if needed)
- [ ] No secrets, keys, or credentials included

## Scope (optional)

- Backend:
- Frontend:
- Docs/Ops:

## Notes (optional)

-
