"""Add durable archive-job indexing progress.

Revision ID: 0016_indexing_progress
Revises: 0015_annual_editions
Create Date: 2026-07-10
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0016_indexing_progress"
down_revision = "0015_annual_editions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "archive_job_indexing_progress",
        sa.Column(
            "job_id",
            sa.Integer(),
            sa.ForeignKey("archive_jobs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("phase", sa.String(length=50), nullable=False),
        sa.Column("current_warc", sa.String(length=255), nullable=True),
        sa.Column("warc_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("warc_total", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "records_processed",
            sa.BigInteger(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "bytes_processed",
            sa.BigInteger(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("bytes_total", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_progress_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("archive_job_indexing_progress")
