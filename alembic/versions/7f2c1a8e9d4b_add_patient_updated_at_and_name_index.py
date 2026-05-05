"""add patient updated_at and name index

Revision ID: 7f2c1a8e9d4b
Revises: c40bfe4e4667
Create Date: 2026-05-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f2c1a8e9d4b"
down_revision: Union[str, Sequence[str], None] = "c40bfe4e4667"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "patients",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_index(op.f("ix_patients_name"), "patients", ["name"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_patients_name"), table_name="patients")
    op.drop_column("patients", "updated_at")
