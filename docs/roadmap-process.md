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
- Production closeout checklist: private operations workspace

## Completion closeout

Before marking production-impacting work complete, run the private production
closeout checklist. It collects the final health, public-surface, baseline,
automation, alerting, continuity, and docs/roadmap checks in one place.

For annual crawl/capture campaigns, run the broader private annual campaign
closeout playbook instead. It includes the production closeout gate plus
per-source readiness review, report writing, public-safe summary text, and
roadmap cleanup.

Use it when:

- closing an incident or maintenance window;
- moving an active implementation plan to `planning/implemented/`;
- removing completed items from the roadmap or ops roadmap;
- confirming a production deploy is stable enough to stop active follow-up.

Use the annual campaign closeout when:

- closing a yearly crawl/capture campaign;
- declaring the annual edition search-ready or research-ready;
- producing the annual wrap-up report or public-safe campaign summary.

If the checklist finds a failure, keep the item open and record the public next
action in `planning/roadmap.md`, or the operator-only next action in the private
operations workspace.
