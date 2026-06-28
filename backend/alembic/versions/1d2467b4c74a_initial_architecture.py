"""Initial architecture

Revision ID: 1d2467b4c74a
Revises: 
Create Date: 2026-06-28 11:59:34.603508

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d2467b4c74a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    # 2. Create workspaces table (Tenants)
    op.create_table(
        'workspaces',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('cnpj', sa.String(length=14), nullable=False, unique=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('plan', sa.String(length=50), server_default="Básico"),
        sa.Column('is_active', sa.Boolean(), server_default="true"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True))
    )
    op.create_index('ix_workspaces_cnpj', 'workspaces', ['cnpj'])
    
    # 3. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255)),
        sa.Column('role', sa.String(length=50), server_default="Operador"),
        sa.Column('is_active', sa.Boolean(), server_default="true"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_users_workspace_id', 'users', ['workspace_id'])
    
    # 4. Create transactions table with JSONB logs
    op.create_table(
        'transactions',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('category', sa.String(length=100)),
        sa.Column('status', sa.String(length=50), server_default="PENDENTE"),
        sa.Column('document_url', sa.String(length=500)),
        sa.Column('audit_log', sa.dialects.postgresql.JSONB, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'))
    )
    op.create_index('ix_transactions_workspace_id', 'transactions', ['workspace_id'])
    
    # 5. Enable Row Level Security (RLS) on multi-tenant tables
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;")
    
    # Create RLS policies based on current_setting('app.current_tenant')
    op.execute('''
        CREATE POLICY tenant_isolation_users ON users
        FOR ALL
        USING (workspace_id = NULLIF(current_setting('app.current_tenant', TRUE), '')::uuid);
    ''')
    
    op.execute('''
        CREATE POLICY tenant_isolation_transactions ON transactions
        FOR ALL
        USING (workspace_id = NULLIF(current_setting('app.current_tenant', TRUE), '')::uuid);
    ''')

def downgrade() -> None:
    # Remove RLS policies
    op.execute("DROP POLICY IF EXISTS tenant_isolation_transactions ON transactions;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_users ON users;")
    
    # Drop tables
    op.drop_table('transactions')
    op.drop_table('users')
    op.drop_table('workspaces')
    
    # Drop pgvector
    op.execute("DROP EXTENSION IF EXISTS vector;")
