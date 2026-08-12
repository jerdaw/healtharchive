# Decision: Dataset Publication and Stewardship Disposition (2026-08-12)

Decision status: accepted

Rollout status: incomplete as of 2026-08-12; see the dated acceptance gate
below.

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
- The accepted target is to pause automatic and scheduled publication of new
  dataset releases. Once that control is published and verified, any future
  release requires explicit maintainer approval and manual dispatch after the
  field schema, provenance inventory, and reuse posture are reviewed together.
- Near-term work is limited to rights and claim containment, schema-drift
  prevention, essential integrity/security stewardship, and an explicit
  data-continuity decision before another capture campaign or release.
- There is no active dataset conversion, DOI, publication, adoption, or
  outbound partnership campaign. At most one later outside stewardship review
  may proceed when capacity is available and its question, reviewer, output,
  and workload are bounded in advance.

## Rationale

Once rolled out, manual approval and a fail-closed schema boundary prevent an
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
- Once rollout is complete, new publication fails closed on schema drift and
  requires deliberate human approval.
- Public claims can distinguish availability from reuse permission, legal
  clearance, outside use, or institutional adoption.
- Data-continuity decisions become explicit instead of following an assumed
  calendar.

### Negative / risks

- There is no guaranteed release cadence or DOI timeline.
- Reuse questions remain unresolved until a qualified review occurs.
- The accepted pause does not by itself decide whether or when future capture
  campaigns should run; that requires a separate continuity decision.

## Dated rollout status and acceptance gate (2026-08-12)

This decision defines the accepted target posture; it does not assert that the
controls or corrected public claims are live. As of 2026-08-12:

- The datasets repository's published main branch still contains scheduled
  publication and keepalive triggers and does not yet publish the reviewed
  `RIGHTS.md` notice or exact-field schema guards.
- The datasets controls and the monorepo claim corrections exist only as
  coordinated local, uncommitted patches. Existing live schedules and public
  claims have not been corrected by those patches.

Rollout must occur in this order:

1. Review the datasets patch as one control set: manual-dispatch-only
   workflows, the conservative rights/provenance notice, and the 15-snapshot /
   24-change exact-field guards.
2. Merge and publish that datasets control set first. This gate does not
   authorize a dataset release, tag, or release-asset change.
3. Verify on the published datasets branch that scheduled triggers are absent,
   manual dispatch remains available, `RIGHTS.md` resolves, and the schema
   regression tests pass.
4. Update this dated rollout status and the public rollout copy from pending to
   verified, then confirm that any dataset-repository links resolve.
5. Only then may the monorepo public-claim patch be merged and deployed. Verify
   the English and French export/researcher pages, dataset JSON-LD, and linked
   public documentation after deployment.

The monorepo public-claim patch fails this acceptance gate if it is proposed
for deployment before steps 1-4 are complete. This dated section must be
updated or superseded during deployment review so a completed rollout is not
left labelled as pending.

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
- Dataset provenance and reuse notice: the versioned `RIGHTS.md` in the
  datasets repository after rollout gate 3 confirms that it is available.
