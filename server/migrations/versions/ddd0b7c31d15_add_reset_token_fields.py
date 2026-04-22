"""add reset token fields
Revision ID: ddd0b7c31d15
Revises: 0f35e705a9d8
Create Date: 2026-04-23 00:07:14.865121
"""
from alembic import op
import sqlalchemy as sa

revision = 'ddd0b7c31d15'
down_revision = '0f35e705a9d8'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reset_token', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('reset_token_expiry', sa.DateTime(), nullable=True))

def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('reset_token_expiry')
        batch_op.drop_column('reset_token')
