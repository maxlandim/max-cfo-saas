from sqlalchemy import Column, String, Integer, ForeignKey, JSON, Boolean, DateTime
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cnpj = Column(String(14), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    plan = Column(String(50), default="Básico") # Básico, Intermediário, Completo, Unlimited
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    users = relationship("User", back_populates="workspace")
    transactions = relationship("Transaction", back_populates="workspace")

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="Operador") # Admin, Operador, Contador
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    workspace = relationship("Workspace", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")

class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), default="Operador")
    token = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), default="PENDING") # PENDING, ACCEPTED, EXPIRED
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    workspace = relationship("Workspace")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False) # RECEITA, DESPESA
    description = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False) # Stored in cents
    date = Column(DateTime(timezone=True), nullable=False)
    category = Column(String(100))
    status = Column(String(50), default="PENDENTE")
    document_url = Column(String(500)) # S3 / Supabase Storage link
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    workspace = relationship("Workspace", back_populates="transactions")
    audit_logs = relationship("AuditLog", back_populates="transaction")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    action = Column(String(50), nullable=False) # CREATE, UPDATE, DELETE
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    transaction = relationship("Transaction", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

class BankAccount(Base):
    __tablename__ = "bank_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    bank_name = Column(String(100), nullable=False)
    account_number = Column(String(50), nullable=False)
    agency = Column(String(20))
    integration_id = Column(String(100), unique=True, index=True) # ID from Asaas, Belvo, Pluggy
    balance = Column(Integer, default=0) # Em centavos
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    workspace = relationship("Workspace")
    statements = relationship("BankStatement", back_populates="account")

class BankStatement(Base):
    __tablename__ = "bank_statements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False, index=True)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id"), nullable=True) # Conciliado com
    amount = Column(Integer, nullable=False) # Positivo para recebimento, Negativo para saída
    description = Column(String(255), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    external_id = Column(String(100), unique=True, index=True) # ID da transação no banco/hub
    is_reconciled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    account = relationship("BankAccount", back_populates="statements")

class Product(Base):
    __tablename__ = "products"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(50), index=True)
    quantity = Column(Integer, default=0)
    reorder_point = Column(Integer, default=5)
    expiration_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ServiceOrder(Base):
    __tablename__ = "service_orders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    client_name = Column(String(200), nullable=False)
    description = Column(String(500))
    total_amount = Column(Integer, default=0) # em centavos
    status = Column(String(50), default="QUOTATION") # QUOTATION, APPROVED, IN_PROGRESS, COMPLETED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Commission(Base):
    __tablename__ = "commissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    service_order_id = Column(UUID(as_uuid=True), ForeignKey("service_orders.id"), nullable=False)
    percentage = Column(Integer, default=0) # ex: 5 para 5%
    amount = Column(Integer, default=0) # em centavos
    status = Column(String(50), default="PENDING") # PENDING, PAID
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PayrollProvision(Base):
    __tablename__ = "payroll_provisions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reference_month = Column(String(10), nullable=False) # ex: '2023-10'
    vacation_provision = Column(Integer, default=0)
    thirteenth_provision = Column(Integer, default=0)
    fgts_provision = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    service_order_id = Column(UUID(as_uuid=True), ForeignKey("service_orders.id"))
    nfe_number = Column(String(50))
    status = Column(String(50), default="PENDING") # PENDING, ISSUED, ERROR
    sefaz_link = Column(String(500))
    issued_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PaymentCharge(Base):
    __tablename__ = "payment_charges"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    service_order_id = Column(UUID(as_uuid=True), ForeignKey("service_orders.id"))
    charge_type = Column(String(50)) # BOLETO, PIX, CREDIT_CARD
    amount = Column(Integer, default=0) # em centavos
    due_date = Column(DateTime(timezone=True))
    status = Column(String(50), default="PENDING") # PENDING, PAID, OVERDUE
    gateway_id = Column(String(100), index=True) # ID no Asaas/Stripe
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PaymentLink(Base):
    __tablename__ = "payment_links"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500))
    amount = Column(Integer, default=0) # 0 significa valor aberto
    checkout_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ReceivableAnticipation(Base):
    __tablename__ = "receivable_anticipations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True)
    payment_charge_id = Column(UUID(as_uuid=True), ForeignKey("payment_charges.id"), nullable=False)
    original_amount = Column(Integer, nullable=False)
    discount_fee = Column(Integer, nullable=False) # Nossa margem de lucro
    net_amount = Column(Integer, nullable=False) # Valor que o cliente recebe hoje
    status = Column(String(50), default="REQUESTED") # REQUESTED, APPROVED, REJECTED, PAID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
