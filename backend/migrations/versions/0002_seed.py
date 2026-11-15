"""seed — data awal aplikasi

Revision ID: 0002_seed
Revises: 0001_initial
Create Date: 2026-10-10

Seed bersifat idempotent: setiap bagian hanya diisi apabila tabel
bersangkutan masih kosong.

Password default admin: admin123 (wajib diganti setelah login pertama).
"""
from __future__ import annotations

import calendar
from datetime import date
from uuid import uuid4

import bcrypt
import sqlalchemy as sa
from alembic import op

revision = "0002_seed"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _count(bind, table: str) -> int:
    return bind.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar_one()


def _insert_many(bind, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    # Quote identifier dengan backtick (kolom `key` adalah reserved word MySQL).
    columns = ", ".join(f"`{c}`" for c in rows[0].keys())
    placeholders = ", ".join(f":{key}" for key in rows[0])
    bind.execute(sa.text(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"), rows)


def _ids(bind, table: str, key_col: str, id_col: str = "id") -> dict:
    rows = bind.execute(sa.text(f"SELECT {id_col}, {key_col} FROM {table}")).fetchall()
    return {key: rid for rid, key in rows}


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------


PERMISSIONS: dict[str, list[tuple[str, str]]] = {
    "user": [
        ("user.view", "Melihat daftar user"),
        ("user.create", "Membuat user"),
        ("user.update", "Mengubah user"),
        ("user.delete", "Menghapus user"),
    ],
    "role": [
        ("role.view", "Melihat daftar role"),
        ("role.create", "Membuat role"),
        ("role.update", "Mengubah role"),
        ("role.delete", "Menghapus role"),
    ],
    "permission": [("permission.view", "Melihat daftar permission")],
    "template": [
        ("template.view", "Melihat template"),
        ("template.create", "Membuat template"),
        ("template.update", "Mengubah template"),
        ("template.delete", "Menghapus template"),
    ],
    "template_category": [
        ("template_category.view", "Melihat kategori template"),
        ("template_category.create", "Membuat kategori"),
        ("template_category.update", "Mengubah kategori"),
        ("template_category.delete", "Menghapus kategori"),
    ],
    "template_group": [
        ("template_group.view", "Melihat group template"),
        ("template_group.create", "Membuat group"),
        ("template_group.update", "Mengubah group"),
        ("template_group.delete", "Menghapus group"),
    ],
    "custom_field": [
        ("custom_field.view", "Melihat custom field"),
        ("custom_field.create", "Membuat custom field"),
        ("custom_field.update", "Mengubah custom field"),
        ("custom_field.delete", "Menghapus custom field"),
    ],
    "custom_field_group": [
        ("custom_field_group.view", "Melihat group custom field"),
        ("custom_field_group.create", "Membuat group"),
        ("custom_field_group.update", "Mengubah group"),
        ("custom_field_group.delete", "Menghapus group"),
    ],
    "function": [
        ("function.view", "Melihat function"),
        ("function.create", "Membuat function"),
        ("function.update", "Mengubah function"),
        ("function.delete", "Menghapus function"),
    ],
    "transaction": [
        ("transaction.view", "Melihat transaksi"),
        ("transaction.create", "Membuat transaksi"),
        ("transaction.update", "Mengubah transaksi"),
        ("transaction.delete", "Menghapus transaksi"),
        ("transaction.view_all", "Melihat transaksi semua user"),
        ("transaction.manage_all", "Mengelola transaksi semua user"),
    ],
    "jenis_transaksi": [
        ("jenis_transaksi.view", "Melihat jenis transaksi"),
        ("jenis_transaksi.create", "Membuat jenis transaksi"),
        ("jenis_transaksi.update", "Mengubah jenis transaksi"),
        ("jenis_transaksi.delete", "Menghapus jenis transaksi"),
    ],
    "jenistransaksi_surat": [
        ("jenistransaksi_surat.view", "Melihat koleksi surat"),
        ("jenistransaksi_surat.manage", "Mengelola koleksi surat"),
    ],
    "surat": [
        ("surat.view", "Melihat surat"),
        ("surat.create", "Membuat surat"),
        ("surat.update", "Mengubah surat"),
        ("surat.delete", "Menghapus surat"),
        ("surat.manage_relation", "Mengelola relasi surat"),
    ],
    "party": [
        ("party.view", "Melihat pihak"),
        ("party.create", "Membuat pihak"),
        ("party.update", "Mengubah pihak"),
        ("party.delete", "Menghapus pihak"),
    ],
    "document": [
        ("document.view", "Melihat dokumen"),
        ("document.create", "Membuat dokumen"),
        ("document.download", "Mengunduh dokumen"),
        ("document.view_all", "Melihat dokumen semua user"),
        ("document.manage_all", "Mengelola dokumen semua user"),
    ],
    "subscription": [
        ("subscription.view", "Melihat subscription miliknya"),
        ("subscription.create", "Membuat subscription"),
        ("subscription.cancel", "Membatalkan subscription"),
        ("subscription.view_all", "Melihat subscription semua user"),
        ("subscription.manage_all", "Mengelola subscription semua user"),
    ],
    "subscription_plan": [
        ("subscription_plan.view", "Melihat paket subscription"),
        ("subscription_plan.create", "Membuat paket"),
        ("subscription_plan.update", "Mengubah paket"),
        ("subscription_plan.delete", "Menghapus paket"),
    ],
    "invoice": [
        ("invoice.view", "Melihat invoice miliknya"),
        ("invoice.view_all", "Melihat semua invoice"),
        ("invoice.manage_all", "Mengelola invoice"),
    ],
    "payment": [
        ("payment.view", "Melihat pembayaran miliknya"),
        ("payment.view_all", "Melihat semua pembayaran"),
        ("payment.verify", "Memverifikasi pembayaran"),
        ("payment.reject", "Menolak pembayaran"),
    ],
    "bank_account": [
        ("bank_account.view", "Melihat rekening bank"),
        ("bank_account.create", "Membuat rekening"),
        ("bank_account.update", "Mengubah rekening"),
        ("bank_account.delete", "Menghapus rekening"),
    ],
    "audit_log": [
        ("audit_log.view", "Melihat audit log"),
        ("audit_log.view_all", "Melihat seluruh audit log"),
    ],
    "settings": [
        ("settings.view", "Melihat pengaturan"),
        ("settings.update", "Mengubah pengaturan"),
    ],
}

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "Super Admin": [p for perms in PERMISSIONS.values() for p, _ in perms],
    "Admin": [
        "user.view", "user.create", "user.update",
        "role.view",
        "template.view", "template.create", "template.update", "template.delete",
        "template_category.view", "template_category.create", "template_category.update",
        "template_group.view", "template_group.create", "template_group.update",
        "custom_field.view", "custom_field.create", "custom_field.update", "custom_field.delete",
        "custom_field_group.view", "custom_field_group.create", "custom_field_group.update",
        "function.view", "function.create", "function.update",
        "transaction.view", "transaction.view_all",
        "jenis_transaksi.view", "jenis_transaksi.create", "jenis_transaksi.update",
        "jenistransaksi_surat.view", "jenistransaksi_surat.manage",
        "surat.view", "surat.create", "surat.update", "surat.manage_relation",
        "document.view", "document.view_all",
        "subscription.view", "subscription.view_all", "subscription.manage_all",
        "subscription_plan.view", "subscription_plan.create", "subscription_plan.update",
        "invoice.view", "invoice.view_all", "invoice.manage_all",
        "payment.view", "payment.view_all", "payment.verify", "payment.reject",
        "bank_account.view", "bank_account.create", "bank_account.update",
        "audit_log.view", "audit_log.view_all",
        "settings.view", "settings.update",
    ],
    "Operator": [
        "transaction.view", "transaction.create", "transaction.update",
        "document.view", "document.create", "document.download",
        "jenis_transaksi.view", "surat.view", "jenistransaksi_surat.view",
        "template.view", "custom_field.view",
        "subscription.view", "invoice.view", "payment.view",
    ],
    "Viewer": [
        "transaction.view", "document.view",
        "template.view", "custom_field.view",
        "jenis_transaksi.view", "surat.view",
    ],
}

ROLES: list[tuple[str, str]] = [
    ("Super Admin", "Akses penuh ke seluruh modul"),
    ("Admin", "Kelola master data, template, dan verifikasi pembayaran"),
    ("Operator", "Membuat transaksi dan dokumen"),
    ("Viewer", "Hanya melihat data"),
]

PLANS: list[dict] = [
    {"code": "FREE", "name": "Free", "description": "Untuk mencoba aplikasi",
     "price": 0, "billing_period": "monthly", "document_limit": 5,
     "is_free": True, "is_active": True, "sort_order": 1},
    {"code": "BASIC", "name": "Basic", "description": "Untuk PPAT perorangan",
     "price": 50000, "billing_period": "monthly", "document_limit": 50,
     "is_free": False, "is_active": True, "sort_order": 2},
    {"code": "PRO", "name": "Professional", "description": "Untuk kantor PPAT aktif",
     "price": 150000, "billing_period": "monthly", "document_limit": 200,
     "is_free": False, "is_active": True, "sort_order": 3},
    {"code": "BUSINESS", "name": "Business", "description": "Untuk kantor besar",
     "price": 1200000, "billing_period": "yearly", "document_limit": 1000,
     "is_free": False, "is_active": True, "sort_order": 4},
]

CATEGORIES = [
    {"name": "Akta", "code": "AKTA", "description": "Dokumen akta PPAT", "sort_order": 1},
    {"name": "Surat", "code": "SURAT", "description": "Surat pendukung", "sort_order": 2},
    {"name": "Pernyataan", "code": "PERNY", "description": "Surat pernyataan", "sort_order": 3},
    {"name": "Perjanjian", "code": "PERJ", "description": "Dokumen perjanjian", "sort_order": 4},
    {"name": "Lampiran", "code": "LAMP", "description": "Dokumen lampiran", "sort_order": 5},
]

GROUPS = [
    {"name": "Jual Beli", "code": "JB", "category_code": "AKTA", "sort_order": 1},
    {"name": "Hibah", "code": "HIB", "category_code": "AKTA", "sort_order": 2},
    {"name": "APHT", "code": "APHT", "category_code": "AKTA", "sort_order": 3},
    {"name": "SKMHT", "code": "SKMHT", "category_code": "PERJ", "sort_order": 4},
    {"name": "Pembagian Hak Bersama", "code": "PHB", "category_code": "AKTA", "sort_order": 5},
]

TEMPLATES = [
    {"name": "Akta Jual Beli", "code": "AJB", "category_code": "AKTA", "group_code": "JB", "status": "active"},
    {"name": "Akta Hibah", "code": "AHB", "category_code": "AKTA", "group_code": "HIB", "status": "active"},
    {"name": "Akta Pemberian Hak Tanggungan", "code": "APHT", "category_code": "AKTA", "group_code": "APHT", "status": "active"},
    {"name": "Surat Kuasa Membebankan Hak Tanggungan", "code": "SKMHT", "category_code": "PERJ", "group_code": "SKMHT", "status": "active"},
    {"name": "Surat Pernyataan", "code": "SPRN", "category_code": "PERNY", "group_code": "JB", "status": "active"},
    {"name": "Tanda Terima", "code": "TTRM", "category_code": "SURAT", "group_code": "JB", "status": "draft"},
]

JENIS_TRANSAKSI = ["Jual Beli", "Hibah", "Pembagian Hak Bersama", "APHT", "SKMHT"]

SURAT = [
    {"id": "AJB-001", "template_code": "AJB", "jenis_surat": "AKTA",
     "nama_surat": "Akta Jual Beli", "keterangan": "Akta utama transaksi jual beli"},
    {"id": "SPRN-001", "template_code": "SPRN", "jenis_surat": "SURAT PERNYATAAN",
     "nama_surat": "Surat Pernyataan", "keterangan": "Pernyataan para pihak"},
    {"id": "TTRM-001", "template_code": "TTRM", "jenis_surat": "TANDA TERIMA",
     "nama_surat": "Tanda Terima", "keterangan": "Bukti penerimaan pembayaran"},
    {"id": "AHB-001", "template_code": "AHB", "jenis_surat": "AKTA",
     "nama_surat": "Akta Hibah", "keterangan": "Akta utama transaksi hibah"},
    {"id": "SPRH-001", "template_code": "SPRN", "jenis_surat": "SURAT PERNYATAAN",
     "nama_surat": "Surat Pernyataan Hibah", "keterangan": "Pernyataan hibah"},
    {"id": "APHT-001", "template_code": "APHT", "jenis_surat": "AKTA",
     "nama_surat": "Akta Pemberian Hak Tanggungan", "keterangan": "Akta APHT"},
    {"id": "SKMHT-001", "template_code": "SKMHT", "jenis_surat": "SURAT KUASA",
     "nama_surat": "SKMHT", "keterangan": "Surat Kuasa Membebankan Hak Tanggungan"},
]

KOLEKSI_SURAT: dict[str, list[dict]] = {
    "Jual Beli": [
        {"surat_id": "AJB-001", "urutan": 1, "wajib": True, "default_selected": True},
        {"surat_id": "SPRN-001", "urutan": 2, "wajib": False, "default_selected": True},
        {"surat_id": "TTRM-001", "urutan": 3, "wajib": False, "default_selected": True},
    ],
    "Hibah": [
        {"surat_id": "AHB-001", "urutan": 1, "wajib": True, "default_selected": True},
        {"surat_id": "SPRH-001", "urutan": 2, "wajib": False, "default_selected": True},
    ],
    "APHT": [
        {"surat_id": "APHT-001", "urutan": 1, "wajib": True, "default_selected": True},
    ],
    "SKMHT": [
        {"surat_id": "SKMHT-001", "urutan": 1, "wajib": True, "default_selected": True},
    ],
}

CUSTOM_FIELD_GROUPS = [
    {"name": "Data Akta", "title": "Data Akta", "description": "Field utama akta", "sort_order": 1},
    {"name": "Data Transaksi", "title": "Data Transaksi", "description": "Field data transaksi", "sort_order": 2},
    {"name": "Data Saksi", "title": "Data Saksi", "description": "Field data saksi", "sort_order": 3},
]

CUSTOM_FIELDS = [
    {"name": "nomor_akta", "field_title": "Nomor Akta", "data_type": "text",
     "group_name": "Data Akta", "required": True, "placeholder": "Contoh: 12/2026", "sort_order": 1},
    {"name": "tanggal_akta", "field_title": "Tanggal Akta", "data_type": "date",
     "group_name": "Data Akta", "required": True, "placeholder": "Pilih tanggal", "sort_order": 2},
    {"name": "harga_transaksi", "field_title": "Harga Transaksi", "data_type": "number",
     "group_name": "Data Transaksi", "required": True, "placeholder": "Contoh: 500000000", "sort_order": 1},
    {"name": "uang_muka", "field_title": "Uang Muka", "data_type": "number",
     "group_name": "Data Transaksi", "required": False, "default_value": "0", "sort_order": 2},
    {"name": "cara_pembayaran", "field_title": "Cara Pembayaran", "data_type": "list",
     "group_name": "Data Transaksi", "required": True, "default_value": "Tunai", "sort_order": 3},
    {"name": "nama_saksi_1", "field_title": "Nama Saksi 1", "data_type": "text",
     "group_name": "Data Saksi", "required": True, "sort_order": 1},
    {"name": "nama_saksi_2", "field_title": "Nama Saksi 2", "data_type": "text",
     "group_name": "Data Saksi", "required": False, "sort_order": 2},
]

CARA_PEMBAYARAN_OPTIONS = [
    {"value": "Tunai", "label": "Tunai", "sort_order": 1},
    {"value": "Transfer", "label": "Transfer", "sort_order": 2},
    {"value": "Bertahap", "label": "Bertahap", "sort_order": 3},
]

SETTINGS: list[tuple[str, str]] = [
    ("company_name", "PPAT & Notaris Ahmad Fauzi, S.H., M.Kn."),
    ("address", "Jl. Kartini No. 25, Panggang, Jepara, Jawa Tengah"),
    ("email", "kantor@ppat-fauzi.id"),
    ("phone", "0291-591234"),
    ("postal_code", "59411"),
    ("permit_number", "SK-05/PPAT/2021"),
    ("permit_date", "2021-04-12"),
    ("default_date_format", "DD MMMM YYYY"),
    ("default_currency", "IDR"),
    ("timezone", "Asia/Jakarta"),
    ("locale", "id-ID"),
    ("subscription_enabled", "true"),
    ("free_plan_enabled", "true"),
    ("payment_transfer_enabled", "true"),
    ("invoice_due_days", "3"),
    ("document_counting_mode", "successful_generation"),
]


def _seed_permissions(bind) -> dict[str, int]:
    if _count(bind, "permissions") == 0:
        rows = [
            {"name": name, "module": module, "description": description}
            for module, perms in PERMISSIONS.items()
            for name, description in perms
        ]
        _insert_many(bind, "permissions", rows)
    return _ids(bind, "permissions", "name")


def _seed_roles(bind, perm_ids: dict[str, int]) -> dict[str, int]:
    if _count(bind, "roles") == 0:
        _insert_many(bind, "roles", [{"name": n, "description": d} for n, d in ROLES])
    role_ids = _ids(bind, "roles", "name")
    if _count(bind, "role_permissions") == 0:
        rows = [
            {"role_id": role_ids[role], "permission_id": perm_ids[perm]}
            for role, perms in ROLE_PERMISSIONS.items()
            for perm in perms
        ]
        _insert_many(bind, "role_permissions", rows)
    return role_ids


def _seed_admin(bind, role_ids: dict[str, int]) -> int | None:
    if _count(bind, "users") > 0:
        row = bind.execute(
            sa.text("SELECT id FROM users WHERE username = 'admin'")
        ).first()
        return row[0] if row else None
    password_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    _insert_many(
        bind,
        "users",
        [{
            "name": "Nur Ahmad Setiawan",
            "username": "admin",
            "email": "admin@blankoppat.id",
            "password_hash": password_hash,
            "is_active": True,
        }],
    )
    user_ids = _ids(bind, "users", "username")
    admin_id = user_ids["admin"]
    _insert_many(bind, "user_roles", [{"user_id": admin_id, "role_id": role_ids["Super Admin"]}])
    return admin_id


DEMO_USERS = [
    ("Admin Demo", "admin_demo", "admin_demo@blankoppat.id", "admin123", "Admin"),
    ("Operator Demo", "operator_demo", "operator_demo@blankoppat.id", "operator123", "Operator"),
    ("Viewer Demo", "viewer_demo", "viewer_demo@blankoppat.id", "viewer123", "Viewer"),
]


def _seed_demo_users(bind, role_ids: dict[str, int]) -> None:
    for name, username, email, password, role in DEMO_USERS:
        exists = bind.execute(
            sa.text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).first()
        if exists or role not in role_ids:
            continue
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        _insert_many(
            bind,
            "users",
            [{
                "name": name,
                "username": username,
                "email": email,
                "password_hash": password_hash,
                "is_active": True,
            }],
        )
        user_id = bind.execute(
            sa.text("SELECT id FROM users WHERE username = :u"), {"u": username}
        ).scalar()
        _insert_many(
            bind, "user_roles", [{"user_id": user_id, "role_id": role_ids[role]}]
        )


def _seed_plans_and_subscription(bind, admin_id: int | None) -> int | None:
    if _count(bind, "subscription_plans") == 0:
        _insert_many(bind, "subscription_plans", PLANS)
    plan_ids = _ids(bind, "subscription_plans", "code")
    free_id = plan_ids.get("FREE")
    if admin_id is None:
        return free_id
    if _count(bind, "user_subscriptions") == 0:
        today = date.today()
        starts = today.replace(day=1)
        ends = today.replace(day=calendar.monthrange(today.year, today.month)[1])
        _insert_many(
            bind,
            "user_subscriptions",
            [{
                "id": uuid4().hex,
                "user_id": admin_id,
                "plan_id": free_id,
                "plan_name": "Free",
                "status": "active",
                "starts_at": starts,
                "ends_at": ends,
                "document_limit": 5,
                "document_used": 0,
                "auto_renew": True,
            }],
        )
    return free_id


def _seed_templates(bind) -> dict[str, int]:
    if _count(bind, "template_categories") == 0:
        _insert_many(
            bind,
            "template_categories",
            [{**c, "is_active": True} for c in CATEGORIES],
        )
    cat_ids = _ids(bind, "template_categories", "code")
    if _count(bind, "template_groups") == 0:
        _insert_many(
            bind,
            "template_groups",
            [{
                "name": g["name"],
                "code": g["code"],
                "category_id": cat_ids[g["category_code"]],
                "sort_order": g["sort_order"],
                "is_active": True,
            } for g in GROUPS],
        )
    group_ids = _ids(bind, "template_groups", "code")
    if _count(bind, "templates") == 0:
        admin_row = bind.execute(
            sa.text("SELECT id FROM users WHERE username = 'admin'")
        ).first()
        created_by = admin_row[0] if admin_row else None
        _insert_many(
            bind,
            "templates",
            [{
                "name": t["name"],
                "code": t["code"],
                "category_id": cat_ids[t["category_code"]],
                "group_id": group_ids[t["group_code"]],
                "version": 1,
                "status": t["status"],
                "created_by": created_by,
            } for t in TEMPLATES],
        )
    return _ids(bind, "templates", "code")


def _seed_jenistransaksi_dan_surat(bind, template_ids: dict[str, int]) -> None:
    if _count(bind, "jenistransaksi") == 0:
        _insert_many(
            bind,
            "jenistransaksi",
            [{"nama_jenistransaksi": n} for n in JENIS_TRANSAKSI],
        )
    jenis_ids = _ids(bind, "jenistransaksi", "nama_jenistransaksi", "id")

    if _count(bind, "surat") == 0:
        _insert_many(
            bind,
            "surat",
            [{
                "id": s["id"],
                "template_id": template_ids.get(s["template_code"]),
                "jenis_surat": s["jenis_surat"],
                "nama_surat": s["nama_surat"],
                "keterangan": s["keterangan"],
            } for s in SURAT],
        )

    if _count(bind, "jenistransaksi_surat") == 0:
        rows = []
        for jenis, items in KOLEKSI_SURAT.items():
            for item in items:
                rows.append({
                    "id": uuid4().hex,
                    "jenistransaksi_id": jenis_ids[jenis],
                    "surat_id": item["surat_id"],
                    "urutan": item["urutan"],
                    "wajib": item["wajib"],
                    "default_selected": item["default_selected"],
                    "is_active": True,
                })
        _insert_many(bind, "jenistransaksi_surat", rows)


def _seed_custom_fields(bind) -> None:
    if _count(bind, "custom_field_groups") == 0:
        _insert_many(bind, "custom_field_groups", CUSTOM_FIELD_GROUPS)
    group_ids = _ids(bind, "custom_field_groups", "name")

    if _count(bind, "custom_fields") == 0:
        _insert_many(
            bind,
            "custom_fields",
            [{
                "name": f["name"],
                "field_title": f["field_title"],
                "data_type": f["data_type"],
                "group_id": group_ids.get(f["group_name"]),
                "source_type": "manual",
                "default_value": f.get("default_value"),
                "display": True,
                "required": f["required"],
                "placeholder": f.get("placeholder", ""),
                "sort_order": f["sort_order"],
                "is_active": True,
            } for f in CUSTOM_FIELDS],
        )
    field_ids = _ids(bind, "custom_fields", "name")

    if _count(bind, "custom_field_options") == 0:
        cara_id = field_ids.get("cara_pembayaran")
        if cara_id:
            _insert_many(
                bind,
                "custom_field_options",
                [{
                    "custom_field_id": cara_id,
                    "value": o["value"],
                    "label": o["label"],
                    "sort_order": o["sort_order"],
                    "is_active": True,
                } for o in CARA_PEMBAYARAN_OPTIONS],
            )


def _seed_settings(bind) -> None:
    if _count(bind, "system_settings") == 0:
        _insert_many(
            bind,
            "system_settings",
            [{"key": key, "value": value} for key, value in SETTINGS],
        )


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------


def upgrade() -> None:
    bind = op.get_bind()
    perm_ids = _seed_permissions(bind)
    role_ids = _seed_roles(bind, perm_ids)
    admin_id = _seed_admin(bind, role_ids)
    _seed_demo_users(bind, role_ids)
    _seed_plans_and_subscription(bind, admin_id)
    template_ids = _seed_templates(bind)
    _seed_jenistransaksi_dan_surat(bind, template_ids)
    _seed_custom_fields(bind)
    _seed_settings(bind)


def downgrade() -> None:
    bind = op.get_bind()
    for table in (
        "system_settings", "custom_field_options", "custom_field_values",
        "custom_fields", "custom_field_groups",
        "jenistransaksi_surat", "surat", "jenistransaksi",
        "templates", "template_versions", "template_variables",
        "template_groups", "template_categories",
        "subscription_payments", "subscription_invoices",
        "user_subscriptions", "subscription_plans", "payment_bank_accounts",
        "audit_logs", "documents", "document_parties", "document_objects",
        "document_custom_values", "document_snapshots",
        "pihak_ektp", "pihak", "transaksi",
        "functions", "user_roles", "role_permissions",
        "users", "roles", "permissions",
    ):
        bind.execute(sa.text(f"DELETE FROM {table}"))
