from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.responses import PlainTextResponse

from ha_backend import api as api_module
from ha_backend.api import deps


class FakeSession:
    def __init__(self, *, commit_raises: bool = False) -> None:
        self.commit_raises = commit_raises
        self.commits = 0
        self.rollbacks = 0
        self.closes = 0

    def commit(self) -> None:
        self.commits += 1
        if self.commit_raises:
            raise RuntimeError("commit failed")

    def rollback(self) -> None:
        self.rollbacks += 1

    def close(self) -> None:
        self.closes += 1


def _request() -> Any:
    return SimpleNamespace(state=SimpleNamespace())


def test_request_db_session_lifecycle_commits_success(monkeypatch) -> None:
    fake = FakeSession()
    monkeypatch.setattr(deps, "get_session_factory", lambda: lambda: fake)

    async def call_next(request):
        assert deps.get_request_db_session(request) is fake
        return PlainTextResponse("ok", status_code=200)

    response = asyncio.run(api_module.db_session_lifecycle_middleware(_request(), call_next))

    assert response.status_code == 200
    assert fake.commits == 1
    assert fake.rollbacks == 0
    assert fake.closes == 1


def test_request_db_session_lifecycle_rolls_back_client_error(monkeypatch) -> None:
    fake = FakeSession()
    monkeypatch.setattr(deps, "get_session_factory", lambda: lambda: fake)

    async def call_next(request):
        assert deps.get_request_db_session(request) is fake
        return PlainTextResponse("missing", status_code=404)

    response = asyncio.run(api_module.db_session_lifecycle_middleware(_request(), call_next))

    assert response.status_code == 404
    assert fake.commits == 0
    assert fake.rollbacks == 1
    assert fake.closes == 1


def test_request_db_session_lifecycle_rolls_back_exceptions(monkeypatch) -> None:
    fake = FakeSession()
    monkeypatch.setattr(deps, "get_session_factory", lambda: lambda: fake)

    async def call_next(request):
        deps.get_request_db_session(request)
        raise RuntimeError("route failed")

    with pytest.raises(RuntimeError, match="route failed"):
        asyncio.run(api_module.db_session_lifecycle_middleware(_request(), call_next))

    assert fake.commits == 0
    assert fake.rollbacks == 1
    assert fake.closes == 1


def test_request_db_session_lifecycle_rolls_back_failed_commit(monkeypatch) -> None:
    fake = FakeSession(commit_raises=True)
    monkeypatch.setattr(deps, "get_session_factory", lambda: lambda: fake)

    async def call_next(request):
        deps.get_request_db_session(request)
        return PlainTextResponse("ok", status_code=200)

    with pytest.raises(RuntimeError, match="commit failed"):
        asyncio.run(api_module.db_session_lifecycle_middleware(_request(), call_next))

    assert fake.commits == 1
    assert fake.rollbacks == 1
    assert fake.closes == 1
