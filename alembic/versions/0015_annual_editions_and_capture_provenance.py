"""Add annual editions, crawl shards, and capture provenance labels.

Revision ID: 0015_annual_editions
Revises: 0014_snapshot_deduplication
Create Date: 2026-04-28
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0015_annual_editions"
down_revision = "0014_snapshot_deduplication"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "annual_editions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_id", sa.Integer(), sa.ForeignKey("sources.id"), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'planning'"),
        ),
        sa.Column(
            "search_ready",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "research_ready",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "intended_url_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "captured_url_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "failed_url_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "missing_url_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "excluded_url_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "fallback_url_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("shard_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "indexed_shard_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "needs_review_shard_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("backend_counts", sa.JSON(), nullable=True),
        sa.Column("coverage_summary", sa.JSON(), nullable=True),
        sa.Column("target_ledger_path", sa.Text(), nullable=True),
        sa.Column("capture_manifest_path", sa.Text(), nullable=True),
        sa.Column("coverage_report_json_path", sa.Text(), nullable=True),
        sa.Column("coverage_report_md_path", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("source_id", "year", name="uq_annual_editions_source_year"),
    )
    op.create_index("ix_annual_editions_source_id", "annual_editions", ["source_id"])
    op.create_index("ix_annual_editions_year", "annual_editions", ["year"])
    op.create_index("ix_annual_editions_status", "annual_editions", ["status"])
    op.create_index("ix_annual_editions_search_ready", "annual_editions", ["search_ready"])
    op.create_index("ix_annual_editions_research_ready", "annual_editions", ["research_ready"])
    op.create_index(
        "ix_annual_editions_source_year",
        "annual_editions",
        ["source_id", "year"],
    )

    with op.batch_alter_table("archive_jobs") as batch_op:
        batch_op.add_column(sa.Column("edition_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("shard_key", sa.String(length=255), nullable=True))
        batch_op.add_column(
            sa.Column(
                "shard_kind",
                sa.String(length=50),
                nullable=False,
                server_default=sa.text("'full_site'"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "acceptance_state",
                sa.String(length=50),
                nullable=False,
                server_default=sa.text("'pending'"),
            )
        )
        batch_op.add_column(sa.Column("coverage_report_path", sa.Text(), nullable=True))
        batch_op.create_foreign_key(
            "fk_archive_jobs_edition_id_annual_editions",
            "annual_editions",
            ["edition_id"],
            ["id"],
        )
        batch_op.create_index("ix_archive_jobs_edition_id", ["edition_id"])
        batch_op.create_index("ix_archive_jobs_shard_key", ["shard_key"])
        batch_op.create_index("ix_archive_jobs_shard_kind", ["shard_kind"])
        batch_op.create_index("ix_archive_jobs_acceptance_state", ["acceptance_state"])

    op.add_column(
        "snapshots",
        sa.Column(
            "capture_backend",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'browsertrix'"),
        ),
    )
    op.add_column(
        "snapshots",
        sa.Column(
            "capture_fidelity",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'high'"),
        ),
    )
    op.add_column("snapshots", sa.Column("provenance_json", sa.JSON(), nullable=True))
    op.create_index("ix_snapshots_capture_backend", "snapshots", ["capture_backend"])
    op.create_index("ix_snapshots_capture_fidelity", "snapshots", ["capture_fidelity"])


def downgrade() -> None:
    op.drop_index("ix_snapshots_capture_fidelity", table_name="snapshots")
    op.drop_index("ix_snapshots_capture_backend", table_name="snapshots")
    op.drop_column("snapshots", "provenance_json")
    op.drop_column("snapshots", "capture_fidelity")
    op.drop_column("snapshots", "capture_backend")

    with op.batch_alter_table("archive_jobs") as batch_op:
        batch_op.drop_index("ix_archive_jobs_acceptance_state")
        batch_op.drop_index("ix_archive_jobs_shard_kind")
        batch_op.drop_index("ix_archive_jobs_shard_key")
        batch_op.drop_index("ix_archive_jobs_edition_id")
        batch_op.drop_constraint(
            "fk_archive_jobs_edition_id_annual_editions",
            type_="foreignkey",
        )
        batch_op.drop_column("coverage_report_path")
        batch_op.drop_column("acceptance_state")
        batch_op.drop_column("shard_kind")
        batch_op.drop_column("shard_key")
        batch_op.drop_column("edition_id")

    op.drop_index("ix_annual_editions_source_year", table_name="annual_editions")
    op.drop_index("ix_annual_editions_research_ready", table_name="annual_editions")
    op.drop_index("ix_annual_editions_search_ready", table_name="annual_editions")
    op.drop_index("ix_annual_editions_status", table_name="annual_editions")
    op.drop_index("ix_annual_editions_year", table_name="annual_editions")
    op.drop_index("ix_annual_editions_source_id", table_name="annual_editions")
    op.drop_table("annual_editions")
