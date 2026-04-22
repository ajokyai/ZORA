from alembic import op
import sqlalchemy as sa

revision = '0f35e705a9d8'
down_revision = 'ec5b97e55247'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sizes', sa.String(length=255), nullable=True))

def downgrade():
    with op.batch_alter_table('items', schema=None) as batch_op:
        batch_op.drop_column('sizes')
