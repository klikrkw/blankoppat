"""Model SQLAlchemy — skema database aplikasi Blanko PPAT.

Semua tabel aplikasi (PRD §62 & §8H) didefinisikan di sini sebagai source
of truth untuk migrasi Alembic.

Tabel existing (ektp, obyek, letak, jenishak) dikelola lewat migrasi
`0001_initial` menggunakan CREATE TABLE IF NOT EXISTS agar tidak
menimpa data yang sudah ada.
"""
from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _uid() -> str:
    return uuid4().hex


def _now() -> datetime:
    return datetime.now()


# ---------------------------------------------------------------------------
# Auth & user management
# ---------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(80), nullable=False, unique=True)
    description = Column(String(255), default="")
    created_at = Column(DateTime, default=_now)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False, unique=True, index=True)
    module = Column(String(60), nullable=False, index=True)
    description = Column(String(255), default="")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


# ---------------------------------------------------------------------------
# Subscription & pembayaran
# ---------------------------------------------------------------------------


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    price = Column(Numeric(15, 2), nullable=False, default=0)
    billing_period = Column(String(10), nullable=False, default="monthly")  # monthly | yearly
    document_limit = Column(Integer, nullable=True)  # NULL = unlimited
    is_free = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(String(36), primary_key=True, default=_uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    plan_name = Column(String(100), default="")
    status = Column(String(20), nullable=False, default="pending")  # pending | active | expired | cancelled
    starts_at = Column(Date, nullable=False)
    ends_at = Column(Date, nullable=False)
    document_limit = Column(Integer, nullable=False)
    document_used = Column(Integer, nullable=False, default=0)
    auto_renew = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class SubscriptionInvoice(Base):
    __tablename__ = "subscription_invoices"

    id = Column(String(36), primary_key=True, default=_uid)
    invoice_number = Column(String(50), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(String(36), ForeignKey("user_subscriptions.id", ondelete="SET NULL"), nullable=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    billing_period = Column(String(10), nullable=False, default="monthly")
    status = Column(String(20), nullable=False, default="pending")  # pending | paid | expired | cancelled
    due_at = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"

    id = Column(String(36), primary_key=True, default=_uid)
    invoice_id = Column(String(36), ForeignKey("subscription_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_account_id = Column(Integer, ForeignKey("payment_bank_accounts.id"), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    transfer_date = Column(Date, nullable=False)
    sender_name = Column(String(150), nullable=False)
    reference_number = Column(String(100), default="")
    proof_file = Column(String(255), default="")
    status = Column(String(20), nullable=False, default="pending")  # pending | verified | rejected
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class PaymentBankAccount(Base):
    __tablename__ = "payment_bank_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_name = Column(String(80), nullable=False)
    account_name = Column(String(150), nullable=False)
    account_number = Column(String(40), nullable=False)
    branch = Column(String(80), default="")
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------


class TemplateCategory(Base):
    __tablename__ = "template_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(30), nullable=False, unique=True)
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class TemplateGroup(Base):
    __tablename__ = "template_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(30), nullable=False, unique=True)
    description = Column(Text, default="")
    category_id = Column(Integer, ForeignKey("template_categories.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    code = Column(String(30), nullable=False, index=True)
    description = Column(Text, default="")
    category_id = Column(Integer, ForeignKey("template_categories.id", ondelete="SET NULL"), nullable=True)
    group_id = Column(Integer, ForeignKey("template_groups.id", ondelete="SET NULL"), nullable=True)
    file_path = Column(String(255), default="")
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="draft")  # draft | active | archived
    content = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class TemplateVersion(Base):
    __tablename__ = "template_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    file_path = Column(String(255), nullable=False)
    notes = Column(Text, default="")
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=_now)


class TemplateVariable(Base):
    __tablename__ = "template_variables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False, index=True)
    variable = Column(String(120), nullable=False)
    label = Column(String(150), default="")
    type = Column(String(30), default="text")
    source = Column(String(120), default="")
    required = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)


# ---------------------------------------------------------------------------
# Custom field
# ---------------------------------------------------------------------------


class CustomFieldGroup(Base):
    __tablename__ = "custom_field_groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class CustomField(Base):
    __tablename__ = "custom_fields"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    field_title = Column(String(150), nullable=False)
    data_type = Column(String(30), nullable=False, default="text")
    # text | number | date | datetime | list | list_from_database | boolean | textarea
    group_id = Column(Integer, ForeignKey("custom_field_groups.id", ondelete="SET NULL"), nullable=True)
    source_type = Column(String(20), nullable=False, default="manual")  # manual | database
    source_config = Column(JSON, nullable=True)
    default_value = Column(Text, nullable=True)
    display = Column(Boolean, default=True)
    required = Column(Boolean, default=False)
    placeholder = Column(String(150), default="")
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class CustomFieldOption(Base):
    __tablename__ = "custom_field_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    custom_field_id = Column(Integer, ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(String(150), nullable=False)
    label = Column(String(150), nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class CustomFieldValue(Base):
    __tablename__ = "custom_field_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaksi_id = Column(String(36), ForeignKey("transaksi.id", ondelete="CASCADE"), nullable=False, index=True)
    custom_field_id = Column(Integer, ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    __table_args__ = (UniqueConstraint("transaksi_id", "custom_field_id", name="uq_cfv_transaksi_field"),)


# ---------------------------------------------------------------------------
# Functions
# ---------------------------------------------------------------------------


class Function(Base):
    __tablename__ = "functions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(50), nullable=False)
    description = Column(Text, default="")
    parameters = Column(JSON, nullable=True)
    implementation = Column(Text, default="")  # Function DSL (bukan kode bebas)
    return_type = Column(String(30), default="text")
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ---------------------------------------------------------------------------
# Transaksi, pihak, surat
# ---------------------------------------------------------------------------


class JenisTransaksi(Base):
    __tablename__ = "jenistransaksi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_jenistransaksi = Column(String(100), nullable=False, unique=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Surat(Base):
    __tablename__ = "surat"

    id = Column(String(36), primary_key=True, default=_uid)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="SET NULL"), nullable=True)
    jenis_surat = Column(String(80), nullable=False)
    nama_surat = Column(String(150), nullable=False)
    keterangan = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class JenisTransaksiSurat(Base):
    __tablename__ = "jenistransaksi_surat"

    id = Column(String(36), primary_key=True, default=_uid)
    jenistransaksi_id = Column(Integer, ForeignKey("jenistransaksi.id", ondelete="CASCADE"), nullable=False, index=True)
    surat_id = Column(String(36), ForeignKey("surat.id", ondelete="CASCADE"), nullable=False, index=True)
    urutan = Column(Integer, default=0)
    wajib = Column(Boolean, default=False)
    default_selected = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    __table_args__ = (UniqueConstraint("jenistransaksi_id", "surat_id", name="uq_jenistransaksi_surat"),)


class Transaksi(Base):
    __tablename__ = "transaksi"

    id = Column(String(36), primary_key=True, default=_uid)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    jenistransaksi_id = Column(Integer, ForeignKey("jenistransaksi.id"), nullable=False, index=True)
    obyek_id = Column(Integer, nullable=True, index=True)  # FK longgar ke tabel existing `obyek`
    nomor_transaksi = Column(String(80), nullable=False)
    tanggal_transaksi = Column(Date, nullable=False)
    judul = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft | active | completed | archived
    keterangan = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Pihak(Base):
    __tablename__ = "pihak"

    id = Column(String(36), primary_key=True, default=_uid)
    transaksi_id = Column(String(36), ForeignKey("transaksi.id", ondelete="CASCADE"), nullable=False, index=True)
    pihak_role_id = Column(Integer, ForeignKey("pihak_roles.id", ondelete="SET NULL"), nullable=True, index=True)
    nama_pihak = Column(String(40), nullable=False)  # PENJUAL | PEMBELI | PELEPAS | PENERIMA | SAKSI
    sebutan_pihak = Column(String(60), nullable=False)  # PIHAK PERTAMA, ...
    parent_id = Column(
        String(36), ForeignKey("pihak.id", ondelete="SET NULL"), nullable=True, index=True
    )
    urutan = Column(Integer, default=0)
    keterangan = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class PihakRole(Base):
    __tablename__ = "pihak_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role = Column(String(40), nullable=False, unique=True)  # PENJUAL | PEMBELI | ...
    sebutan = Column(String(60), nullable=False)  # PIHAK PERTAMA, ...
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class PihakEktp(Base):
    __tablename__ = "pihak_ektp"

    id = Column(String(36), primary_key=True, default=_uid)
    pihak_id = Column(String(36), ForeignKey("pihak.id", ondelete="CASCADE"), nullable=False, index=True)
    ektp_id = Column(BigInteger, nullable=False, index=True)  # FK longgar ke tabel existing `ektp`
    urutan = Column(Integer, default=0)
    keterangan = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    __table_args__ = (UniqueConstraint("pihak_id", "ektp_id", name="uq_pihak_ektp"),)


# ---------------------------------------------------------------------------
# Dokumen & snapshot
# ---------------------------------------------------------------------------


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=_uid)
    transaction_id = Column(String(36), ForeignKey("transaksi.id", ondelete="CASCADE"), nullable=False, index=True)
    surat_id = Column(String(36), ForeignKey("surat.id", ondelete="SET NULL"), nullable=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="SET NULL"), nullable=True)
    template_version_id = Column(Integer, ForeignKey("template_versions.id", ondelete="SET NULL"), nullable=True)
    document_number = Column(String(80), nullable=False, unique=True, index=True)
    title = Column(String(200), nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft | generated | archived
    generated_file = Column(String(255), default="")
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class DocumentParty(Base):
    __tablename__ = "document_parties"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    nama_pihak = Column(String(40), nullable=False)
    sebutan_pihak = Column(String(60), nullable=False)
    urutan = Column(Integer, default=0)
    data = Column(JSON, nullable=True)  # snapshot e-KTP


class DocumentObject(Base):
    __tablename__ = "document_objects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    obyek_id = Column(Integer, nullable=True)
    data = Column(JSON, nullable=True)  # snapshot obyek


class DocumentCustomValue(Base):
    __tablename__ = "document_custom_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    custom_field_id = Column(Integer, ForeignKey("custom_fields.id", ondelete="SET NULL"), nullable=True)
    field_name = Column(String(100), nullable=False)
    value = Column(Text, nullable=True)


class DocumentSnapshot(Base):
    __tablename__ = "document_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    template_version = Column(Integer, nullable=False)
    generated_at = Column(DateTime, default=_now)
    data = Column(JSON, nullable=True)  # context snapshot lengkap
    created_at = Column(DateTime, default=_now)


# ---------------------------------------------------------------------------
# Audit & settings
# ---------------------------------------------------------------------------


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(80), nullable=False, index=True)
    module = Column(String(60), nullable=False, index=True)
    record_id = Column(String(255), default="")
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    detail = Column(Text, default="")
    ip_address = Column(String(45), default="")
    user_agent = Column(String(255), default="")
    created_at = Column(DateTime, default=_now, index=True)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=True)
    # Satu wilayah dapat dirujuk oleh banyak baris system_settings.
    wilayah_id = Column(
        Integer, ForeignKey("wilayah.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ektp_id = Column(
        BigInteger, ForeignKey("ektp.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    wilayah = relationship("Wilayah", backref="system_settings")
    ektp = relationship("Ektp", backref="system_settings")


# ---------------------------------------------------------------------------
# Tabel existing (milik sistem lama).
# Dibuat dengan checkfirst=True sehingga data yang sudah ada tidak disentuh.
# ---------------------------------------------------------------------------


class Ektp(Base):
    __tablename__ = "ektp"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nik = Column(String(20), nullable=False, unique=True, index=True)
    nama = Column(String(150), nullable=False, index=True)
    tempat_lahir = Column(String(100), default="")
    tanggal_lahir = Column(Date, nullable=True)
    jenis_kelamin = Column(String(20), default="")
    alamat = Column(Text, default="")
    rt = Column(String(10), default="")
    rw = Column(String(10), default="")
    wilayah_id = Column(Integer, ForeignKey("wilayah.id"), nullable=True)
    agama = Column(String(30), default="")
    status_perkawinan = Column(
        Enum("BELUM KAWIN", "KAWIN", "CERAI HIDUP", "CERAI MATI", name="status_perkawinan_enum"),
        nullable=False,
        default="BELUM KAWIN",
    )
    pekerjaan = Column(String(100), default="")
    kewarganegaraan = Column(String(30), default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class JenisHak(Base):
    __tablename__ = "jenishak"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_jenishak = Column(String(100), nullable=False)
    singkatan = Column(String(10), default="")


class Letak(Base):
    __tablename__ = "letak"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_desa = Column(String(150), nullable=False)
    kecamatan_id = Column(Integer, nullable=True)


class Pekerjaan(Base):
    __tablename__ = "pekerjaan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_pekerjaan = Column(String(150), nullable=False)


class Gelar(Base):
    __tablename__ = "gelar"

    id = Column(Integer, primary_key=True, autoincrement=True)
    singkatan = Column(String(50), nullable=False, unique=True, index=True)
    kepanjangan = Column(String(150), nullable=False)


class Uraian(Base):
    __tablename__ = "uraian"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_uraian = Column(String(200), nullable=False, index=True)
    isi_uraian = Column(Text, nullable=True)
    isi_singkat = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ektp_id = Column(
        BigInteger, ForeignKey("ektp.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id = Column(
        Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    jabatan = Column(String(150), default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    ektp = relationship("Ektp", backref="staff_rows")
    job = relationship("Job", backref="staff_rows")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_item = Column(String(200), nullable=False, unique=True, index=True)
    keterangan = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaksi_id = Column(String(36), ForeignKey("transaksi.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    uraian_id = Column(Integer, ForeignKey("uraian.id", ondelete="SET NULL"), nullable=True)
    pihak_id = Column(
        String(36), ForeignKey("pihak.id", ondelete="SET NULL"), nullable=True, index=True
    )
    detail = Column(Text, nullable=True)
    short_text = Column(Text, nullable=True)
    urutan = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Edisi(Base):
    __tablename__ = "edisi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nama_edisi = Column(String(150), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    obyek = relationship("Obyek", back_populates="edisi")


class Provinsi(Base):
    __tablename__ = "provinsi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(10), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Obyek(Base):
    __tablename__ = "obyek"

    id = Column(Integer, primary_key=True, autoincrement=True)
    jenishak_id = Column(Integer, nullable=True)
    jenis_sertipikat = Column(String(20), default="manual")
    nomor_hak = Column(String(50), default="", index=True)
    persil = Column(String(50), default="")
    klas = Column(String(20), default="")
    luas_tanah = Column(Float, nullable=True)
    luas_bangunan = Column(Float, nullable=True)
    atas_nama = Column(String(150), default="")
    penggunaan = Column(String(30), default="")
    no_surat_ukur = Column(String(100), default="")
    tanggal_surat_ukur = Column(Date, nullable=True)
    nib = Column(String(100), default="", index=True)
    nop = Column(String(30), default="", index=True)
    nomor_seri_blanko = Column(String(100), default="")
    batas_utara = Column(String(200), default="")
    batas_timur = Column(String(200), default="")
    batas_selatan = Column(String(200), default="")
    batas_barat = Column(String(200), default="")
    wilayah_id = Column(Integer, ForeignKey("wilayah.id"), nullable=True)
    edisi_id = Column(Integer, ForeignKey("edisi.id"), nullable=True, index=True)
    edisi = relationship("Edisi", back_populates="obyek")



class Wilayah(Base):
    __tablename__ = "wilayah"

    id = Column(Integer, primary_key=True, autoincrement=True)
    kode_wilayah = Column(String(20), nullable=False, unique=True, index=True)
    desa = Column(String(150), default="")
    tipe_desa = Column(Enum("Desa", "Kelurahan", name="tipe_desa_enum"), nullable=False, default="Desa")
    kecamatan = Column(String(150), default="", index=True)
    kabupaten = Column(String(150), default="", index=True)
    tipe_kabupaten = Column(
        Enum("Kabupaten", "Kota", name="tipe_kabupaten_enum"), nullable=False, default="Kabupaten"
    )
    provinsi = Column(String(150), default="", index=True)
    created_at = Column(DateTime, server_default=func.now(), default=_now)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=_now)
