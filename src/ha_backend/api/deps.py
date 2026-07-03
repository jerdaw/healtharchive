from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from ha_backend.db import get_session_factory

_REQUEST_DB_SESSION_ATTR = "_healtharchive_db_session"
_REQUEST_DB_SESSION_CLOSED_ATTR = "_healtharchive_db_session_closed"
DEV_ADMIN_NO_TOKEN_VALUES = {"1", "true", "yes"}


def get_request_db_session(request: Request) -> Session:
    """
    Return the SQLAlchemy session scoped to the current HTTP request.
    """
    session = getattr(request.state, _REQUEST_DB_SESSION_ATTR, None)
    if session is None:
        session = get_session_factory()()
        setattr(request.state, _REQUEST_DB_SESSION_ATTR, session)
        setattr(request.state, _REQUEST_DB_SESSION_CLOSED_ATTR, False)
    return session


def close_request_db_session(request: Request, *, commit: bool) -> None:
    """
    Commit/rollback and close the request-scoped DB session, if one exists.
    """
    session = getattr(request.state, _REQUEST_DB_SESSION_ATTR, None)
    if session is None:
        return
    if getattr(request.state, _REQUEST_DB_SESSION_CLOSED_ATTR, False):
        return

    try:
        if commit:
            try:
                session.commit()
            except Exception:
                session.rollback()
                raise
        else:
            session.rollback()
    finally:
        session.close()
        setattr(request.state, _REQUEST_DB_SESSION_CLOSED_ATTR, True)


def _get_expected_admin_token() -> Optional[str]:
    """
    Read the expected admin token from the environment.
    """
    return os.getenv("HEALTHARCHIVE_ADMIN_TOKEN")


def _allow_dev_admin_without_token(env: str) -> bool:
    if env not in {"development", "local", "test"}:
        return False
    raw = os.getenv("HEALTHARCHIVE_ALLOW_DEV_ADMIN_NO_TOKEN", "")
    return raw.strip().lower() in DEV_ADMIN_NO_TOKEN_VALUES


async def require_admin(
    request: Request,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
) -> None:
    """
    Dependency that enforces a simple token-based admin auth scheme.

    Behaviour:
    - If HEALTHARCHIVE_ADMIN_TOKEN is unset, fail closed with HTTP 500.
    - Unset-token local development access requires
      HEALTHARCHIVE_ALLOW_DEV_ADMIN_NO_TOKEN=true and a local/dev/test env.
    - If set, require the same token via either:
      * Authorization: Bearer <token>
      * X-Admin-Token: <token>
    """
    env = os.getenv("HEALTHARCHIVE_ENV", "development").lower()
    expected = _get_expected_admin_token()

    if not expected:
        if _allow_dev_admin_without_token(env):
            return
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin token not configured for this environment",
        )

    presented: Optional[str] = None

    if authorization:
        parts = authorization.split(None, 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            presented = parts[1]
    if not presented and x_admin_token:
        presented = x_admin_token

    if not presented or presented != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin token required",
        )


__all__ = ["close_request_db_session", "get_request_db_session", "require_admin"]
