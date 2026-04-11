# 2026-04-10: Crawl Rescue Observability And Operator Ergonomics

**Status:** Active  
**Scope:** Make annual-crawl rescue behavior explicit, operator-readable, and
easy to verify without reconstructing state from multiple logs and metrics by
hand.

## Why this plan exists

The 2026 HC rescue path proved that the backend can now recover from a failing
Browsertrix-first attempt into the `playwright_warc` fallback backend on the
real VPS.

What did **not** prove out cleanly was the operator experience around that
recovery.

During live HC rescue, the system eventually did the right thing, but the
operator still had to:

1. inspect multiple metrics manually
2. identify the current combined log by mtime rather than filename ordering
3. infer that Browsertrix had failed and fallback had taken over
4. confirm by hand that the fallback backend was now healthy

That means the rescue control flow is ahead of the rescue observability.

This plan exists to close that gap.

## Goal

Make annual-crawl rescue states and transitions understandable from the normal
operator surfaces, so a human can answer these questions quickly:

1. Which backend is this job using **right now**?
2. Did the job promote from Browsertrix to a fallback backend?
3. Why did that promotion happen?
4. Is the fallback backend healthy and making forward progress?
5. What should the operator do next, if anything?

## Non-goals

This plan does not:

1. redesign the annual execution policy
2. replace the current Browsertrix-first plus fallback strategy
3. broaden source scope
4. change the production SSH/access posture
5. remove the need for deeper logs during unusual incidents

## Triggering evidence

On 2026-04-10, HC job `6` demonstrated the current gap clearly:

1. the fresh Browsertrix phase still failed immediately with
   `net::ERR_HTTP2_PROTOCOL_ERROR`
2. the job remained alive through the configured backoff/recovery logic
3. it then auto-promoted into `playwright_warc`
4. the fallback phase became healthy and made real forward progress on prod
5. but that state transition was not obvious from `show-job` or the standard
   operator surfaces without manual log digging

So the rescue logic is working better than the rescue UX.

## Desired operator outcome

After this plan, the normal operator path should be:

1. run one status command or read one status surface
2. see the current effective backend, recent rescue events, and current health
3. decide whether to:
   - keep watching
   - retry later
   - patch config/code
   - or escalate

without needing to grep combined logs unless there is a genuinely novel
failure mode.

## Candidate implementation areas

This plan is expected to touch a combination of the following:

1. `ha-backend show-job`
   - expose the current effective backend
   - expose rescue-stage or rescue-summary fields
2. metrics
   - expose whether the current run is in fallback backend
   - expose whether fallback promotion has happened for the current job
   - expose recent rescue/fallback reason counters or gauges
3. state/provenance files
   - persist rescue-stage information in a stable machine-readable location
4. operator-facing CLI/reporting
   - add a compact command/report for annual rescue state
5. docs/runbooks
   - shorten the standard diagnostic path for rescue-state questions

## Likely concrete deliverables

The exact shape can be refined during implementation, but likely deliverables
include:

1. A machine-readable rescue status model for active jobs
2. `show-job` output that reports:
   - configured primary backend
   - configured fallback backend
   - current effective backend
   - fresh-failure count within the current rescue sequence
   - whether fallback promotion has occurred
   - latest rescue event/reason
3. New metrics for current rescue state
4. A compact CLI summary command or status extension for annual rescue jobs
5. Tests covering:
   - Browsertrix failure to fallback promotion
   - operator-facing summary rendering
   - metrics/state-file consistency
6. Updated operator docs that make the intended diagnosis path short and stable

## Constraints

1. The current annual-crawl rescue work remains the priority; this plan is a
   follow-on, not a reason to interrupt healthy fallback progress.
2. Status surfaces must stay truthful even when the active run is between
   phases or sleeping through configured backoff.
3. New observability should not require tailing large combined logs on every
   status call.
4. Operator docs should describe current reality, not speculative future flow.

## Work sequence

Implement this in a few small steps:

1. Define the rescue-state vocabulary
   - fresh Browsertrix phase
   - fallback backend active
   - backoff between rescue attempts
   - terminal failure after rescue budget exhaustion
2. Persist that state in a stable place
3. Surface it in `show-job`
4. Surface it in metrics
5. Add one compact operator summary/report
6. Update runbooks and ops roadmap references

## Exit criteria

This plan is complete when:

1. an operator can identify the current effective backend for a rescue job
   without opening the combined log
2. an operator can see whether fallback promotion already happened and why
3. the normal annual-crawl status workflow clearly distinguishes:
   - stuck Browsertrix-first failure
   - healthy fallback progress
   - intentional backoff between rescue attempts
4. tests cover the new rescue observability behavior
5. the relevant operator docs reflect the shorter diagnostic path
