from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).parents[1] / ".github" / "workflows"
AUTOMATIC = {
    "backend-ci.yml",
    "docs.yml",
    "frontend-ci.yml",
    "platform-ops-integration.yml",
    "workflow-lint.yml",
}
MANUAL_ONLY = {"backend-ci-full.yml", "production-smoke.yml"}
REQUIRED_JOBS = {
    "backend-ci.yml": {"Backend CI / test", "Backend CI / api-health"},
    "frontend-ci.yml": {
        "Frontend CI / contract-sync",
        "Frontend CI / lint-and-test",
    },
}


def load_workflow(name: str) -> dict:
    return yaml.load(
        (WORKFLOWS / name).read_text(encoding="utf-8"),
        Loader=yaml.BaseLoader,
    )


def workflow_paths() -> list[Path]:
    return sorted([*WORKFLOWS.glob("*.yml"), *WORKFLOWS.glob("*.yaml")])


def test_every_workflow_supports_manual_dispatch() -> None:
    workflow_names = {path.name for path in workflow_paths()}

    assert workflow_names == AUTOMATIC | MANUAL_ONLY
    for name in workflow_names:
        assert "workflow_dispatch" in load_workflow(name)["on"]


def test_manual_only_workflows_have_no_automatic_triggers() -> None:
    for name in MANUAL_ONLY:
        assert set(load_workflow(name)["on"]) == {"workflow_dispatch"}


def test_concurrency_matches_workflow_class() -> None:
    for name in AUTOMATIC:
        assert load_workflow(name)["concurrency"]["cancel-in-progress"] == "true"

    for name in MANUAL_ONLY:
        assert load_workflow(name)["concurrency"]["cancel-in-progress"] == "false"


def test_ruleset_required_job_names_stay_stable() -> None:
    for name, required_names in REQUIRED_JOBS.items():
        jobs = load_workflow(name)["jobs"].values()
        configured_names = {job.get("name") for job in jobs}

        assert required_names <= configured_names


def test_uploaded_artifacts_expire_within_three_days() -> None:
    upload_steps: list[tuple[str, dict]] = []

    for path in workflow_paths():
        workflow = load_workflow(path.name)
        for job in workflow["jobs"].values():
            for step in job.get("steps", []):
                if step.get("uses", "").startswith("actions/upload-artifact@"):
                    upload_steps.append((path.name, step))

    assert upload_steps
    for workflow_name, step in upload_steps:
        retention_days = step.get("with", {}).get("retention-days")
        assert retention_days is not None, workflow_name
        assert 1 <= int(retention_days) <= 3, workflow_name
