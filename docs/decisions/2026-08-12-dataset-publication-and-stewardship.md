# Decision: Dataset Publication and Stewardship Disposition (2026-08-12)

Decision status: accepted

Rollout prerequisite status: verified on 2026-08-12; the datasets control gate
is complete and monorepo PR 154 is the remaining public-claim rollout.

## Context

- HealthArchive has existing metadata-only dataset releases and public export
  endpoints that support citation and reproducibility.
- Scheduled publication and public reuse claims can create new commitments or
  propagate schema and provenance errors without an explicit review.
- Current stewardship must preserve existing research objects while keeping
  new publication bounded by operator capacity and unresolved reuse questions.

## Decision

- Existing releases remain available and are treated as immutable research
  objects, subject only to the documented bounded recovery path for a partial
  or invalid release.
- Automatic and scheduled publication of new dataset releases is paused. Any
  future release requires explicit maintainer approval and manual dispatch
  after the field schema, provenance inventory, and reuse posture are reviewed
  together.
- Near-term work is limited to rights and claim containment, schema-drift
  prevention, essential integrity/security stewardship, and an explicit
  data-continuity decision before another capture campaign or release.
- There is no active dataset conversion, DOI, publication, adoption, or
  outbound partnership campaign. At most one later outside stewardship review
  may proceed when capacity is available and its question, reviewer, output,
  and workload are bounded in advance.

## Rationale

Manual approval and a fail-closed schema boundary prevent an
unreviewed API change or unsupported reuse statement from silently entering a
new release. Preserving existing releases avoids breaking citations and
reproducibility while review remains open. A bounded stewardship posture also
separates necessary care of an existing public artifact from optional
promotion or research activity.

## Alternatives considered

- Continue quarterly scheduled releases:
  - Rejected because cadence is not a substitute for provenance, reuse, schema,
    capacity, and continuity review.
- Remove or rewrite existing releases while review is pending:
  - Rejected absent a concrete integrity or safety defect; changing existing
    research objects would undermine reproducibility.
- Select a blanket licence immediately:
  - Rejected because the field-level provenance and applicable terms require a
    qualified owner decision. This record does not make that legal judgment.
- Begin a general outreach or adoption campaign:
  - Rejected because there is no preselected outside use, supervised question,
    or attributable output that justifies an active campaign.

## Consequences

### Positive

- Existing releases and citations remain stable.
- New publication fails closed on schema drift and requires deliberate human
  approval.
- Public claims can distinguish availability from reuse permission, legal
  clearance, outside use, or institutional adoption.
- Data-continuity decisions become explicit instead of following an assumed
  calendar.

### Negative / risks

- There is no guaranteed release cadence or DOI timeline.
- Reuse questions remain unresolved until a qualified review occurs.
- The accepted pause does not by itself decide whether or when future capture
  campaigns should run; that requires a separate continuity decision.

## Dated rollout verification and acceptance gate (2026-08-12)

The prerequisite datasets control gate is verified:

- Dataset PR 15 merged to the published main branch as
  `802a91168ef6d315d22c8e14a14a33182b354cd5`.
- Dataset PR 16 then made the dictionary/deployment wording time-robust and
  merged as `ba39fd13315d32db78edc47fbcd90c98109b6b22`.
- Scheduled publication and keepalive triggers are absent; manual dispatch
  remains available.
- The conservative
  [RIGHTS.md notice](https://github.com/jerdaw/healtharchive-datasets/blob/main/RIGHTS.md)
  resolves from the published repository.
- The release builder and validator enforce the reviewed 15-snapshot /
  24-change exact-field sets, including fail-closed missing/unexpected-field
  tests.
- No dataset release, tag, or release asset was created or changed during this
  control rollout.

Monorepo PR 154 contains the coordinated public-claim correction and is the
remaining rollout. It may be merged and deployed only after its required
checks pass and a safe rollback path is confirmed. After deployment, verify
the English and French export and researcher pages, dataset JSON-LD, rights
links, and linked public documentation.

## Verification / rollout

- Acceptance requires the datasets repository to keep release publication and
  keepalive workflows manual-only and to reject unexpected or missing export
  fields against its reviewed schema and provenance inventory.
- Before monorepo deployment, the updated public export and researcher pages
  must state the verified manual, conditional release posture and must not
  publish a blanket dataset licence.
- The active roadmap contains no standing quarterly release, DOI, adoption, or
  outbound validation campaign.
- Reinstating a schedule or approving a new release requires an explicit owner
  decision and updated schema/provenance/reuse evidence; it is not a silent
  rollback of this record.

## References

- Active roadmap: `../planning/roadmap.md`
- Export integrity contract: `../operations/export-integrity-contract.md`
- Dataset repository: https://github.com/jerdaw/healtharchive-datasets
- Dataset provenance and reuse notice:
  https://github.com/jerdaw/healtharchive-datasets/blob/main/RIGHTS.md
