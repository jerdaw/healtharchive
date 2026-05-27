# Roadmap process (pointer)

This repo separates:

- the **backlog** (what is not implemented),
- **active implementation plans** (what we are currently doing),
- and **canonical docs** (what exists and how to run/operate it),

to reduce documentation drift.

Canonical guidance:

- Roadmap workflow: `documentation-guidelines.md`
- Roadmaps index: `planning/README.md`
- Backlog: `planning/roadmap.md`
- Implemented plans archive: `planning/implemented/README.md`
- Production closeout checklist:
  `operations/playbooks/validation/production-closeout.md`

## Completion closeout

Before marking production-impacting work complete, run the production closeout
checklist. It collects the final health, public-surface, baseline, automation,
alert, backup, and docs/roadmap checks in one place.

Use it when:

- closing an incident or maintenance window;
- moving an active implementation plan to `planning/implemented/`;
- removing completed items from the roadmap or ops roadmap;
- confirming a production deploy is stable enough to stop active follow-up.

If the checklist finds a failure, keep the item open and record the next action
in `planning/roadmap.md` or `operations/healtharchive-ops-roadmap.md`.
