from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from ha_backend.db import get_session_factory

_REQUEST_DB_SESSION_ATTR = "_healtharchive_db_session"
_REQUEST_DB_SESSION_CLOSED_ATTR = "_healtharchive_db_session_closed"


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

    If unset, admin endpoints are effectively open. This is convenient for
    local development but should be configured in production.
    """
    return os.getenv("HEALTHARCHIVE_ADMIN_TOKEN")


async def require_admin(
    request: Request,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
) -> None:
    """
    Dependency that enforces a simple token-based admin auth scheme.

    Behaviour:
    - If HEALTHARCHIVE_ENV is "production" or "staging" and
      HEALTHARCHIVE_ADMIN_TOKEN is unset, fail closed with HTTP 500.
    - If HEALTHARCHIVE_ADMIN_TOKEN is unset in other environments, allow all
      requests (dev mode).
    - If set, require the same token via either:
      * Authorization: Bearer <token>
      * X-Admin-Token: <token>
    """
    env = os.getenv("HEALTHARCHIVE_ENV", "development").lower()
    expected = _get_expected_admin_token()
    if env in {"production", "staging"} and not expected:
        # In non-dev environments, require an admin token to be configured.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin token not configured for this environment",
        )

    if not expected:
        # No token configured: treat admin endpoints as open (dev mode).
        return

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
