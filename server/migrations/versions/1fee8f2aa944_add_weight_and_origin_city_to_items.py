"""add weight and origin city to items
Revision ID: 1fee8f2aa944
Revises: ddd0b7c31d15
Create Date: 2026-04-28 23:43:35.994731
"""
from alembic import op
import sqlalchemy as sa

revision = '1fee8f2aa944'
down_revision = 'ddd0b7c31d15'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('weight_kg', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('origin_city', sa.String(length=50), nullable=True))

def downgrade():
    with op.batch_alter_table('items', schema=None) as batch_op:
        batch_op.drop_column('origin_city')
        batch_op.drop_column('weight_kg')

