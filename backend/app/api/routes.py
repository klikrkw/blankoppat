"""API Blanko PPAT — endpoint utama (FastAPI + MySQL via SQLAlchemy)."""
from __future__ import annotations

import calendar
import json
import os
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File as FastAPIFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import (
    create_token,
    get_current_user,
    get_user_roles,
    hash_password,
    require_admin,
    user_to_dict,
    verify_password,
)
from ..db import get_engine
from ..models import (
    AuditLog,
    CustomField,
    CustomFieldGroup,
    CustomFieldOption,
    CustomFieldValue,
    Document,
    Edisi,
    DocumentCustomValue,
    DocumentSnapshot,
    Ektp,
    Function,
    Item,
    Job,
    Staff,
    JenisHak,
    JenisTransaksi,
    JenisTransaksiSurat,
    Section,
    Letak,
    Obyek,
    Pekerjaan,
    Gelar,
    Provinsi,
    PaymentBankAccount,
    Pihak,
    PihakRole,
    PihakEktp,
    Permission,
    Role,
    RolePermission,
    UserRole,
    SubscriptionInvoice,
    SubscriptionPayment,
    SubscriptionPlan,
    Surat,
    SystemSetting,
    Template,
    TemplateCategory,
    TemplateGroup,
    TemplateVersion,
    Transaksi,
    Uraian,
    User,
    UserSubscription,
    Wilayah,
)
from ..core import docx_engine, template_engine

router = APIRouter(prefix="/api/v1")

STORAGE = Path(os.getenv("STORAGE_PATH", "./storage"))


# ---------------------------------------------------------------------------
# Util
# ---------------------------------------------------------------------------


def session_dep() -> Session:
    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database belum dikonfigurasi")
    with Session(engine) as session:
        yield session


def rows_to_dict(rows: List[Any], columns: List[str]) -> List[Dict[str, Any]]:
    return [dict(zip(columns, row)) for row in rows]


def iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def add_audit(
    session: Session,
    user_id: int,
    action: str,
    module: str,
    record_id: str = "",
    detail: str = "",
) -> None:
    session.add(
        AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            record_id=(record_id or "")[:255],
            detail=detail,
            ip_address="",
            created_at=datetime.now(),
        )
    )


def _settings_dict(session: Session) -> Dict[str, str]:
    rows = session.execute(select(SystemSetting)).scalars().all()
    data = {row.key: (row.value or "") for row in rows}
    # wilayah_id adalah kolom relasi (bukan baris key-value), ambil nilai
    # pertama yang tidak null dari seluruh baris pengaturan.
    wilayah_id = next((row.wilayah_id for row in rows if row.wilayah_id), None)
    if wilayah_id is not None:
        data["wilayah_id"] = str(wilayah_id)
    ektp_id = next((row.ektp_id for row in rows if row.ektp_id), None)
    if ektp_id is not None:
        data["ektp_id"] = str(ektp_id)
    return data


def _decode_section_symbols(value: str) -> str:
    """Terjemahkan simbol \\n (Enter) dan \\t (Tab) pada teks dinamis."""
    return (value or "").replace("\\n", "\n").replace("\\t", "\t")


def _sections_context(session: Session, transaksi_id: str) -> List[Dict[str, Any]]:
    if session is None or not transaksi_id:
        return []
    rows = session.execute(
        select(Section).where(Section.transaksi_id == transaksi_id).order_by(Section.urutan)
    ).scalars().all()
    result = []
    for sec in rows:
        item = session.get(Item, sec.item_id) if sec.item_id else None
        uraian_row = session.get(Uraian, sec.uraian_id) if sec.uraian_id else None
        party = session.get(Pihak, sec.pihak_id) if sec.pihak_id else None
        result.append(
            {
                "id": sec.id,
                "item_id": sec.item_id,
                "nama_item": item.nama_item if item else "",
                "uraian_id": sec.uraian_id,
                "nama_uraian": uraian_row.nama_uraian if uraian_row else "",
                "pihak_id": sec.pihak_id,
                "nama_pihak": party.nama_pihak if party else "",
                "sebutan_pihak": party.sebutan_pihak if party else "",
                "detail": _decode_section_symbols(sec.detail or ""),
                "short_text": _decode_section_symbols(sec.short_text or ""),
                "urutan": sec.urutan,
            }
        )
    return result


def _staff_context(
    session: Session,
) -> tuple[Dict[str, Any], Dict[str, List[Dict[str, Any]]]]:
    """Data staff untuk template.

    - `staff.<Job Name>`        -> staff pertama pada job tersebut
    - `staff_by_job.<Job Name>` -> daftar semua staff pada job tersebut
    Nama job juga tersedia dalam bentuk slug (huruf kecil, garis bawah).
    """
    if session is None:
        return {}, {}
    single: Dict[str, Any] = {}
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    rows = session.execute(select(Staff).order_by(Staff.id)).scalars().all()
    for row in rows:
        account = session.get(Ektp, row.ektp_id)
        if account is None:
            continue
        job = session.get(Job, row.job_id) if row.job_id else None
        data = dict(serialize_ektp(account, session))
        data.update(
            {
                "staff_id": row.id,
                "jabatan": row.jabatan or "",
                "job_name": job.name if job else "",
                "job": (
                    {
                        "id": job.id,
                        "name": job.name,
                        "description": job.description or "",
                    }
                    if job
                    else {}
                ),
            }
        )
        keys: List[str] = []
        if job and (job.name or "").strip():
            name = job.name.strip()
            keys.extend([name, re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")])
        for key in keys:
            if not key:
                continue
            grouped.setdefault(key, []).append(data)
            single.setdefault(key, data)
    return single, grouped


def _users_context(session: Session) -> List[Dict[str, Any]]:
    """Seluruh user aktif untuk template ({{#each system.users}}).

    Settings bersifat global (tidak lagi punya relasi khusus ke user),
    sehingga semua user tersedia untuk dipakai di template.
    """
    if session is None:
        return []
    rows = session.execute(select(User).order_by(User.name)).scalars().all()
    result: List[Dict[str, Any]] = []
    for account in rows:
        if not account.is_active:
            continue
        result.append(
            {
                "id": account.id,
                "name": account.name,
                "username": account.username,
                "email": account.email,
                "roles": get_user_roles(session, account.id),
            }
        )
    return result


def _uraian_context(session: Session) -> Dict[str, str]:
    """Peta uraian untuk template DOCX.

    Kunci tersedia dalam dua bentuk:
    - nama asli  : "Uraian Jual Beli"  -> {{uraian.Uraian Jual Beli}}
    - slug aman  : "uraian_jual_beli"  -> {{uraian.uraian_jual_beli}}
    Nama asli diprioritaskan bila bentrok dengan slug.
    """
    if session is None:
        return {}
    result: Dict[str, Any] = {}
    meta: Dict[str, Any] = {}
    for u in session.execute(select(Uraian)).scalars().all():
        name = (u.nama_uraian or "").strip()
        if not name:
            continue
        slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        params = u.parameters or []
        # Dukung simbol \n (baris baru) dan \t (tab) baik saat dipanggil
        # langsung `{{uraian.Nama}}` maupun lewat `uraian('Nama')`.
        isi = _decode_section_symbols(u.isi_uraian or "")
        singkat = _decode_section_symbols(u.isi_singkat or "")
        entry = {
            "isi": isi,
            "singkat": singkat,
            "parameters": params,
        }
        if slug:
            meta.setdefault(slug, entry)
        meta[name] = entry
        # Uraian tanpa parameter tetap bisa dipanggil langsung via {{uraian.Nama}}.
        if not params:
            if slug:
                result.setdefault(slug, isi)
            result[name] = isi
    result["__meta__"] = meta
    return result


def _gelar_context(session: Session) -> Dict[str, str]:
    """Peta singkatan gelar -> kepanjangan untuk fungsi `gelar_panjang`."""
    if session is None:
        return {}
    result: Dict[str, str] = {}
    for gelar in session.execute(select(Gelar)).scalars().all():
        singkatan = (gelar.singkatan or "").strip()
        kepanjangan = (gelar.kepanjangan or "").strip()
        if singkatan and kepanjangan:
            result[singkatan] = kepanjangan
    return result


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str
    password: str


class TemplateCreate(BaseModel):
    name: str
    code: str = ""
    description: str = ""
    category_id: Optional[int] = None
    group_id: Optional[int] = None
    content: str = ""
    status: str = "draft"


class TemplateUpdate(BaseModel):
    name: str
    code: str = ""
    description: str = ""
    category_id: Optional[int] = None
    group_id: Optional[int] = None
    status: str = "draft"


class TemplateContentUpdate(BaseModel):
    content: str


class PihakInput(BaseModel):
    nama_pihak: str
    sebutan_pihak: str
    pihak_role_id: Optional[int] = None
    ektp_ids: List[int] = Field(default_factory=list)
    # Relasi parent/child. `key` adalah id sementara antar baris pada request,
    # `parent_key` merujuk ke key baris lain. `parent_id` dipakai bila klien
    # mengirim id pihak yang sudah ada.
    key: str = ""
    parent_key: str = ""
    parent_id: Optional[str] = None


class SectionInput(BaseModel):
    item_id: int
    uraian_id: Optional[int] = None
    pihak_id: Optional[str] = None
    pihak_key: str = ""
    detail: str = ""
    short_text: str = ""


class TransaksiCreate(BaseModel):
    jenistransaksi_id: int
    obyek_id: Optional[int] = None
    nomor_transaksi: str
    tanggal_transaksi: str
    judul: str
    keterangan: str = ""
    pihak: List[PihakInput] = Field(default_factory=list)
    sections: List[SectionInput] = Field(default_factory=list)


class TransaksiUpdate(BaseModel):
    jenistransaksi_id: Optional[int] = None
    obyek_id: Optional[int] = None
    nomor_transaksi: str = ""
    tanggal_transaksi: str = ""
    judul: str = ""
    keterangan: str = ""
    pihak: List[PihakInput] = Field(default_factory=list)
    sections: Optional[List[SectionInput]] = None
    surat_ids: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class PreviewRequest(BaseModel):
    template_id: int
    context: Dict[str, Any] = Field(default_factory=dict)


class GenerateRequest(BaseModel):
    transaksi_id: str
    surat_ids: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class SuratCreate(BaseModel):
    template_id: Optional[int] = None
    jenis_surat: str
    nama_surat: str
    keterangan: str = ""


class JenisTransaksiCreate(BaseModel):
    nama_jenistransaksi: str


class JtsSuratCreate(BaseModel):
    surat_id: str
    urutan: int = 0
    wajib: bool = False
    default_selected: bool = False


class JtsSuratSet(BaseModel):
    items: List[JtsSuratCreate] = Field(default_factory=list)



class InvoiceCreate(BaseModel):
    plan_id: int


class PaymentCreate(BaseModel):
    invoice_id: str
    bank_account_id: int
    amount: float
    transfer_date: str
    sender_name: str
    proof_file: str = ""


class RejectRequest(BaseModel):
    reason: str = ""


class EktpCreate(BaseModel):
    nik: str
    nama: str
    tempat_lahir: str
    tanggal_lahir: str
    jenis_kelamin: str
    alamat: str
    rt: str = ""
    rw: str = ""
    wilayah_id: Optional[int] = None
    agama: str = "ISLAM"
    status_perkawinan: str = "BELUM KAWIN"
    pekerjaan: str = ""
    kewarganegaraan: str = "WNI"


class BankAccountCreate(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    branch: str = ""
    is_active: bool = True



class SettingsUpdate(BaseModel):
    settings: Dict[str, str]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@router.post("/auth/login")
def login(body: LoginRequest, session: Session = Depends(session_dep)):
    user = session.execute(
        select(User).where(User.username == body.username)
    ).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    token = create_token(user.id)
    from ..auth import get_user_roles

    roles = get_user_roles(session, user.id)
    add_audit(session, user.id, "LOGIN", "auth", detail="Login berhasil")
    session.commit()
    return {"token": token, "user": user_to_dict(user, roles)}


@router.get("/auth/me")
def me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if not k.startswith("_")}


class ProfileUpdateBody(BaseModel):
    name: str
    username: str
    email: str = ""


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


@router.put("/auth/profile")
def update_profile(
    body: ProfileUpdateBody,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    """Perbarui profil pengguna yang sedang login (nama, username, email)."""
    target = session.get(User, int(user["id"]))
    if target is None:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    name = body.name.strip()
    username = body.username.strip()
    if not name or not username:
        raise HTTPException(status_code=400, detail="Nama dan username wajib diisi")
    if session.execute(
        select(User.id).where(User.username == username, User.id != target.id)
    ).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    email = body.email.strip() or target.email
    if session.execute(
        select(User.id).where(User.email == email, User.id != target.id)
    ).first():
        raise HTTPException(status_code=400, detail="Email sudah digunakan")

    target.name = name
    target.username = username
    target.email = email
    add_audit(session, target.id, "UPDATE_PROFILE", "auth", str(target.id), "Profil diperbarui")
    session.commit()
    session.refresh(target)
    return user_to_dict(target, get_user_roles(session, target.id))


@router.post("/auth/change-password")
def change_password(
    body: ChangePasswordBody,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    """Ganti password pengguna yang sedang login."""
    target = session.get(User, int(user["id"]))
    if target is None:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if not verify_password(body.current_password, target.password_hash):
        raise HTTPException(status_code=400, detail="Password saat ini salah")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="Password baru harus berbeda dari password saat ini")

    target.password_hash = hash_password(body.new_password)
    add_audit(session, target.id, "CHANGE_PASSWORD", "auth", str(target.id), "Password diubah")
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard")
def dashboard(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    today_start = datetime.combine(date.today(), datetime.min.time())
    month_start = today_start.replace(day=1)

    def count(statement: Any) -> int:
        return session.execute(statement).scalar_one()

    docs_today = count(select(func.count()).select_from(Document).where(Document.created_at >= today_start))
    docs_month = count(select(func.count()).select_from(Document).where(Document.created_at >= month_start))
    sub = session.execute(
        select(UserSubscription).where(UserSubscription.status == "active").order_by(UserSubscription.created_at.desc())
    ).scalars().first()

    recent_activity = session.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(6)
    ).scalars().all()
    recent_docs = session.execute(
        select(Document).order_by(Document.created_at.desc()).limit(5)
    ).scalars().all()

    return {
        "total_templates": count(select(func.count()).select_from(Template)),
        "active_templates": count(select(func.count()).select_from(Template).where(Template.status == "active")),
        "documents_today": docs_today,
        "documents_month": docs_month,
        "active_users": count(select(func.count()).select_from(User).where(User.is_active == True)),  # noqa: E712
        "total_ektp": count(select(func.count()).select_from(Ektp)),
        "total_obyek": count(select(func.count()).select_from(Obyek)),
        "total_transaksi": count(select(func.count()).select_from(Transaksi)),
        "recent_activity": [
            {
                "id": a.id,
                "user_name": (session.get(User, a.user_id).name if a.user_id else "-"),
                "action": a.action,
                "module": a.module,
                "detail": a.detail,
                "created_at": iso(a.created_at),
            }
            for a in recent_activity
        ],
        "recent_documents": [
            {
                "id": d.id,
                "title": d.title,
                "document_number": d.document_number,
                "status": d.status,
                "created_at": iso(d.created_at),
                "transaction_id": d.transaction_id,
                "surat_id": d.surat_id,
                "template_id": d.template_id,
                "template_version_id": d.template_version_id,
                "generated_file": d.generated_file,
                "created_by": d.created_by,
            }
            for d in recent_docs
        ],
        "subscription": {
            "plan_name": sub.plan_name if sub else "Free",
            "document_used": sub.document_used if sub else 0,
            "document_limit": sub.document_limit if sub else 5,
            "ends_at": iso(sub.ends_at) if sub else None,
            "status": sub.status if sub else "active",
        },
    }


# ---------------------------------------------------------------------------
# Data master
# ---------------------------------------------------------------------------


@router.get("/ektp")
def list_ektp(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Ektp)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            Ektp.nik.like(like) | Ektp.nama.like(like) | Ektp.alamat.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = session.execute(stmt.order_by(Ektp.id).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {
        "data": [serialize_ektp(r, session) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def serialize_ektp(e: Ektp, session: Optional[Session] = None) -> Dict[str, Any]:
    wilayah = None
    if session is not None and e.wilayah_id:
        w = session.get(Wilayah, e.wilayah_id)
        if w is not None:
            wilayah = {
                "id": w.id,
                "kode_wilayah": w.kode_wilayah,
                "desa": w.desa,
                "tipe_desa": w.tipe_desa,
                "kecamatan": w.kecamatan,
                "kabupaten": w.kabupaten,
                "tipe_kabupaten": w.tipe_kabupaten,
                "provinsi": w.provinsi,
            }
    return {
        "id": e.id,
        "nik": e.nik,
        "nama": e.nama,
        "tempat_lahir": e.tempat_lahir,
        "tanggal_lahir": iso(e.tanggal_lahir),
        "jenis_kelamin": e.jenis_kelamin,
        "alamat": e.alamat,
        "rt": e.rt,
        "rw": e.rw,
        "wilayah_id": e.wilayah_id,
        "wilayah": wilayah or {},
        "agama": e.agama,
        "status_perkawinan": e.status_perkawinan,
        "pekerjaan": e.pekerjaan,
        "kewarganegaraan": e.kewarganegaraan,
        "created_at": iso(e.created_at),
        "updated_at": iso(e.updated_at),
    }


def serialize_obyek(o: Obyek, session: Session) -> Dict[str, Any]:
    jenishak = session.get(JenisHak, o.jenishak_id) if o.jenishak_id else None
    wilayah = session.get(Wilayah, o.wilayah_id) if o.wilayah_id else None
    return {
        "id": o.id,
        "jenishak_id": o.jenishak_id,
        "jenishak": {"nama_jenishak": jenishak.nama_jenishak, "singkatan": jenishak.singkatan} if jenishak else None,
        "jenis_sertipikat": o.jenis_sertipikat,
        "nomor_hak": o.nomor_hak,
        "persil": o.persil,
        "klas": o.klas,
        "luas_tanah": o.luas_tanah,
        "luas_bangunan": o.luas_bangunan,
        "atas_nama": o.atas_nama,
        "penggunaan": o.penggunaan,
        "no_surat_ukur": o.no_surat_ukur,
        "tanggal_surat_ukur": iso(o.tanggal_surat_ukur),
        "nib": o.nib,
        "nop": o.nop,
        "nomor_seri_blanko": o.nomor_seri_blanko or "",
        "batas_utara": o.batas_utara,
        "batas_timur": o.batas_timur,
        "batas_selatan": o.batas_selatan,
        "batas_barat": o.batas_barat,
        "wilayah_id": o.wilayah_id,
        "edisi_id": o.edisi_id,
        "edisi": (
            {"id": o.edisi.id, "nama_edisi": o.edisi.nama_edisi} if o.edisi is not None else None
        ),
        "wilayah": (
            {
                "id": wilayah.id,
                "kode_wilayah": wilayah.kode_wilayah,
                "desa": wilayah.desa,
                "tipe_desa": wilayah.tipe_desa,
                "kecamatan": wilayah.kecamatan,
                "kabupaten": wilayah.kabupaten,
                "tipe_kabupaten": wilayah.tipe_kabupaten,
                "provinsi": wilayah.provinsi,
            }
            if wilayah
            else None
        ),
        # Alias datar agar {{obyek.provinsi}} / {{obyek.kabupaten}} bisa dipakai.
        "desa": wilayah.desa if wilayah else "",
        "tipe_desa": wilayah.tipe_desa if wilayah else "",
        "kecamatan": wilayah.kecamatan if wilayah else "",
        "kabupaten": wilayah.kabupaten if wilayah else "",
        "tipe_kabupaten": wilayah.tipe_kabupaten if wilayah else "",
        "provinsi": wilayah.provinsi if wilayah else "",
    }


@router.get("/ektp/check-nik")
def check_ektp_nik(
    nik: str = Query(""),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    exists = session.execute(select(Ektp).where(Ektp.nik == nik)).scalar_one_or_none() is not None
    return {"exists": exists}


@router.get("/ektp/{ektp_id}")
def get_ektp(
    ektp_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    row = session.get(Ektp, ektp_id)
    if row is None:
        raise HTTPException(status_code=404, detail="e-KTP tidak ditemukan")
    return serialize_ektp(row, session)


E_KTP_SCAN_WEBHOOK = os.getenv("E_KTP_SCAN_WEBHOOK", "https://n8n.masbahtr.com/webhook/upload-ektp")
E_KTP_SCAN_API_KEY = os.getenv("E_KTP_SCAN_API_KEY", "rTv6RosICcBGKhn7p9lxM1rcs9akSiFR")


def _post_scan_webhook(file_bytes: bytes, filename: str, content_type: str) -> bytes:
    """Kirim file ke webhook n8n (multipart) memakai stdlib, tanpa dependency tambahan."""
    import urllib.error
    import urllib.request

    boundary = f"----BlankoPPAT{uuid4().hex}"
    head = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="ektp_image"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode()
    tail = f"\r\n--{boundary}--\r\n".encode()
    body = head + file_bytes + tail

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "X-API-Key": E_KTP_SCAN_API_KEY,
        "Accept": "application/json",
        # Cloudflare menolak User-Agent default Python (Error 1010).
        "User-Agent": "BlankoPPAT/1.0",
    }
    # Dukungan webhook n8n yang memakai Basic Auth.
    basic_user = os.getenv("E_KTP_SCAN_BASIC_USER", "")
    if basic_user:
        import base64

        basic_pass = os.getenv("E_KTP_SCAN_BASIC_PASS", "")
        token = base64.b64encode(f"{basic_user}:{basic_pass}".encode()).decode()
        headers["Authorization"] = f"Basic {token}"

    req = urllib.request.Request(
        E_KTP_SCAN_WEBHOOK,
        data=body,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:  # noqa: S310
            return resp.read()
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            raise RuntimeError(
                "Credential webhook ditolak (403). Periksa E_KTP_SCAN_API_KEY "
                "atau E_KTP_SCAN_BASIC_USER/PASS."
            ) from exc
        raise


def _norm_date(value: Any) -> str:
    text_value = str(value or "").strip()
    if not text_value:
        return ""
    # Buang bagian waktu (mis. "1978-07-01T00:00:00" atau "01-07-1978 12:30").
    text_value = re.sub(r"[ T]\d{1,2}:\d{2}.*$", "", text_value).strip()
    from datetime import datetime as _dt

    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return _dt.strptime(text_value, fmt).date().isoformat()
        except ValueError:
            continue
    bulan = {
        "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
        "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12,
    }
    m = re.fullmatch(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", text_value)
    if m and m.group(2).lower() in bulan:
        return f"{int(m.group(3)):04d}-{bulan[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    return text_value


def _norm_gender(value: Any) -> str:
    v = str(value or "").strip().upper()
    if v in ("L", "LAKI-LAKI", "LAKI LAKI", "PRIA", "MALE"):
        return "LAKI-LAKI"
    if v in ("P", "PEREMPUAN", "WANITA", "FEMALE"):
        return "PEREMPUAN"
    if "LAKI" in v:
        return "LAKI-LAKI"
    if "PEREMPUAN" in v or "WANITA" in v:
        return "PEREMPUAN"
    return ""


def _norm_marital(value: Any) -> str:
    v = str(value or "").strip().upper()
    if not v:
        return ""
    if "BELUM" in v or v in ("SINGLE", "TK"):
        return "BELUM KAWIN"
    if "CERAI" in v and "MATI" in v:
        return "CERAI MATI"
    if "CERAI" in v:
        return "CERAI HIDUP"
    if "KAWIN" in v or "MENIKAH" in v or v in ("MARRIED", "K"):
        return "KAWIN"
    return ""


def _parse_ktp_text(text_value: str) -> Dict[str, Any]:
    """Parser fallback bila webhook mengembalikan teks bebas hasil OCR."""
    labels = {
        "nik": ["nik"],
        "nama": ["nama"],
        "tempat_lahir": ["tempat lahir", "tempat/lahir", "tempat"],
        "tanggal_lahir": ["tanggal lahir", "tgl lahir", "tanggal/lahir", "tgl/lahir"],
        "jenis_kelamin": ["jenis kelamin", "jenis/kelamin"],
        "alamat": ["alamat"],
        "rt": ["rt"],
        "rw": ["rw"],
        "desa": ["desa", "kelurahan", "kel/desa"],
        "kecamatan": ["kecamatan"],
        "agama": ["agama"],
        "status_perkawinan": ["status perkawinan", "status"],
        "pekerjaan": ["pekerjaan"],
        "kewarganegaraan": ["kewarganegaraan", "kwn"],
    }
    out: Dict[str, Any] = {}
    for raw_line in re.split(r"[\r\n]+", text_value):
        line = raw_line.strip(" :-")
        if not line:
            continue
        lower = line.lower()
        for key, aliases in labels.items():
            for alias in aliases:
                if lower.startswith(alias):
                    rest = line[len(alias):].strip(" :\t")
                    if rest:
                        out.setdefault(key, rest)
    return out


def _scan_extract(payload: Any) -> Dict[str, Any]:
    """Normalisasi payload webhook OCR menjadi field form e-KTP."""
    if isinstance(payload, list) and payload:
        payload = payload[0]
    if isinstance(payload, dict):
        for key in ("data", "result", "hasil", "output", "json", "body"):
            value = payload.get(key)
            if isinstance(value, dict):
                payload = value
                break
            if isinstance(value, list) and value:
                payload = value[0]
                break
    if isinstance(payload, str):
        payload = _parse_ktp_text(payload)
    if not isinstance(payload, dict):
        return {}

    aliases = {
        "nik": ["nik", "no_nik", "nomor_nik", "no_ktp", "nomor_ktp"],
        "nama": ["nama", "nama_lengkap", "name", "full_name"],
        "tempat_lahir": ["tempat_lahir", "tempat lahir", "tempat/lahir", "birth_place"],
        "tanggal_lahir": ["tanggal_lahir", "tgl_lahir", "tanggal lahir", "birth_date", "date_of_birth"],
        "jenis_kelamin": ["jenis_kelamin", "jenis kelamin", "jk", "gender", "sex"],
        "alamat": ["alamat", "address"],
        "rt": ["rt", "rukun_tetangga"],
        "rw": ["rw", "rukun_warga"],
        "agama": ["agama", "religion"],
        "status_perkawinan": ["status_perkawinan", "status perkawinan", "status", "perkawinan", "marital_status"],
        "pekerjaan": ["pekerjaan", "occupation", "job"],
        "kewarganegaraan": ["kewarganegaraan", "kwn", "nationality"],
        "desa": ["desa", "kelurahan", "kel_desa", "village"],
        "kecamatan": ["kecamatan", "district"],
        "kabupaten": ["kabupaten", "kota", "kabupaten_kota", "kabupaten/kota", "regency"],
        "provinsi": ["provinsi", "province"],
        "kode_wilayah": ["kode_wilayah", "kode", "kode_wilayah_desa"],
        "wilayah_id": ["wilayah_id", "id_wilayah"],
    }
    lowered = {str(k).strip().lower(): v for k, v in payload.items()}
    result: Dict[str, Any] = {}
    for field_name, keys in aliases.items():
        for key in keys:
            value = lowered.get(key)
            if value not in (None, "", []):
                result[field_name] = value
                break

    alamat = str(result.get("alamat", ""))
    if alamat:
        if not result.get("rt"):
            m = re.search(r"RT[\s./:]*(\d{1,3})", alamat, re.I)
            if m:
                result["rt"] = m.group(1)
        if not result.get("rw"):
            m = re.search(r"RW[\s./:]*(\d{1,3})", alamat, re.I)
            if m:
                result["rw"] = m.group(1)
        for field_name, label in (("desa", "Desa|Kelurahan"), ("kecamatan", "Kecamatan"), ("kabupaten", "Kabupaten|Kota")):
            if not result.get(field_name):
                m = re.search(rf"(?:{label})[\s.:]*([^,;\n]+)", alamat, re.I)
                if m:
                    value = re.split(
                        r"\s+(?=(?:RT|RW|Desa|Kelurahan|Kecamatan|Kabupaten|Kota|Provinsi)\b)",
                        m.group(1),
                        flags=re.I,
                    )[0]
                    result[field_name] = value.strip()

    for key in list(result.keys()):
        if isinstance(result[key], str):
            result[key] = result[key].strip()

    if result.get("wilayah_id") not in (None, ""):
        try:
            result["wilayah_id"] = int(float(result["wilayah_id"]))
        except (TypeError, ValueError):
            result.pop("wilayah_id", None)
    if result.get("kode_wilayah") is not None:
        result["kode_wilayah"] = str(result["kode_wilayah"]).strip()

    if result.get("tanggal_lahir"):
        result["tanggal_lahir"] = _norm_date(result["tanggal_lahir"])
    if result.get("jenis_kelamin"):
        result["jenis_kelamin"] = _norm_gender(result["jenis_kelamin"])
    if result.get("status_perkawinan"):
        result["status_perkawinan"] = _norm_marital(result["status_perkawinan"])
    if result.get("agama"):
        result["agama"] = str(result["agama"]).strip().upper()
    if result.get("kewarganegaraan"):
        kwn = str(result["kewarganegaraan"]).strip().upper()
        result["kewarganegaraan"] = "WNI" if kwn in ("WNI", "INDONESIA", "WARGA NEGARA INDONESIA") else kwn
    return {k: v for k, v in result.items() if v not in (None, "")}


def _norm_area(value: Any) -> str:
    v = str(value or "").strip().lower()
    v = re.sub(r"^(kabupaten|kab\.?|kota|kecamatan|kec\.?|desa|kelurahan|kel\.?)\s+", "", v)
    return re.sub(r"\s+", " ", v)


def _find_wilayah(session: Session, data: Dict[str, Any]):
    """Cocokkan wilayah hasil OCR ke master: prioritas wilayah_id, kode, lalu nama."""
    if session is None:
        return None

    # 1) wilayah_id langsung dari webhook.
    raw_id = data.get("wilayah_id")
    if raw_id not in (None, ""):
        try:
            w = session.get(Wilayah, int(float(raw_id)))
        except (TypeError, ValueError):
            w = None
        if w is not None:
            return w

    # 2) kode wilayah.
    kode = str(data.get("kode_wilayah") or "").strip()
    if kode:
        w = session.execute(select(Wilayah).where(Wilayah.kode_wilayah == kode)).scalar_one_or_none()
        if w is not None:
            return w

    desa = _norm_area(data.get("desa") or data.get("kelurahan"))
    kecamatan = _norm_area(data.get("kecamatan"))
    kabupaten = _norm_area(data.get("kabupaten"))
    provinsi = _norm_area(data.get("provinsi"))

    def best_of(rows: List[Wilayah]):
        best = None
        best_score = -1
        for w in rows:
            score = 0
            if kecamatan and _norm_area(w.kecamatan) == kecamatan:
                score += 4
            if kabupaten and _norm_area(w.kabupaten) == kabupaten:
                score += 2
            if provinsi and _norm_area(w.provinsi) == provinsi:
                score += 1
            if score > best_score:
                best, best_score = w, score
        return best

    if desa:
        rows = session.execute(
            select(Wilayah).where(func.lower(Wilayah.desa) == desa)
        ).scalars().all()
        if rows:
            if len(rows) == 1:
                return rows[0]
            # Ambigu: butuh kecamatan/kabupaten untuk memilih.
            winner = best_of(rows)
            if winner is not None and kecamatan and _norm_area(winner.kecamatan) == kecamatan:
                return winner
            return None
        # Toleransi salah ketik/OCR: cocokkan sebagian, hanya bila hasilnya tunggal.
        rows = session.execute(
            select(Wilayah).where(func.lower(Wilayah.desa).like(f"%{desa}%"))
        ).scalars().all()
        if len(rows) == 1:
            return rows[0]
        return None

    # Tanpa nama desa: hanya boleh menebak bila kecamatan menghasilkan satu wilayah.
    if kecamatan:
        rows = session.execute(
            select(Wilayah).where(func.lower(Wilayah.kecamatan) == kecamatan)
        ).scalars().all()
        if len(rows) == 1:
            return rows[0]
    return None


@router.post("/ektp/scan")
async def scan_ektp(
    file: UploadFile = FastAPIFile(...),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    """Upload foto e-KTP ke webhook OCR n8n, hasilnya dipetakan ke field form e-KTP."""
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="File kosong")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 10 MB")
    try:
        raw = _post_scan_webhook(
            contents,
            file.filename or "ektp.jpg",
            file.content_type or "application/octet-stream",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Gagal menghubungi layanan scan e-KTP: {exc}") from exc

    try:
        payload: Any = json.loads(raw.decode("utf-8", "ignore"))
    except Exception:  # noqa: BLE001
        payload = raw.decode("utf-8", "ignore")

    if isinstance(payload, dict) and payload.get("success") is False:
        message = payload.get("error") or "Layanan scan e-KTP gagal memproses gambar"
        raise HTTPException(status_code=422, detail=str(message))

    data = _scan_extract(payload)
    if not data:
        detail = "Data e-KTP tidak terbaca dari hasil scan"
        if isinstance(payload, dict):
            errors = payload.get("validation_errors") or []
            if errors:
                detail = "; ".join(str(e) for e in errors)
        raise HTTPException(status_code=422, detail=detail)

    # Cari wilayah_id dari kode_wilayah / nama wilayah.
    wilayah = _find_wilayah(session, data)
    data["wilayah_id"] = wilayah.id if wilayah is not None else None
    if wilayah is not None:
        data["desa"] = wilayah.desa
        data["kecamatan"] = wilayah.kecamatan
        data["kabupaten"] = wilayah.kabupaten
        data["provinsi"] = wilayah.provinsi
        data["kode_wilayah"] = wilayah.kode_wilayah
    return {"success": True, "data": data, "raw": payload}


@router.post("/ektp")
def create_ektp(
    body: EktpCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    duplicate = session.execute(select(Ektp).where(Ektp.nik == body.nik)).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=409, detail="NIK sudah terdaftar")
    e = Ektp(
        nik=body.nik,
        nama=body.nama,
        tempat_lahir=body.tempat_lahir,
        tanggal_lahir=datetime.strptime(body.tanggal_lahir, "%Y-%m-%d").date(),
        jenis_kelamin=body.jenis_kelamin,
        alamat=body.alamat,
        rt=body.rt,
        rw=body.rw,
        wilayah_id=body.wilayah_id,
        agama=body.agama,
        status_perkawinan=body.status_perkawinan,
        pekerjaan=body.pekerjaan,
        kewarganegaraan=body.kewarganegaraan,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


@router.put("/ektp/{id}")
def update_ektp(
    id: int,
    body: EktpCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    e = session.get(Ektp, id)
    if not e:
        raise HTTPException(status_code=404, detail="Data e-KTP tidak ditemukan")
    duplicate = session.execute(select(Ektp).where(Ektp.nik == body.nik, Ektp.id != id)).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=409, detail="NIK sudah terdaftar")
    e.nik = body.nik
    e.nama = body.nama
    e.tempat_lahir = body.tempat_lahir
    e.tanggal_lahir = datetime.strptime(body.tanggal_lahir, "%Y-%m-%d").date()
    e.jenis_kelamin = body.jenis_kelamin
    e.alamat = body.alamat
    e.rt = body.rt
    e.rw = body.rw
    e.wilayah_id = body.wilayah_id
    e.agama = body.agama
    e.status_perkawinan = body.status_perkawinan
    e.pekerjaan = body.pekerjaan
    e.kewarganegaraan = body.kewarganegaraan
    session.commit()
    return e


@router.delete("/ektp/{id}")
def delete_ektp(
    id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    e = session.get(Ektp, id)
    if not e:
        raise HTTPException(status_code=404, detail="Data e-KTP tidak ditemukan")
    session.delete(e)
    session.commit()
    return {"success": True}


@router.get("/obyek")
def list_obyek(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Obyek)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            Obyek.nomor_hak.like(like) | Obyek.nib.like(like) | Obyek.nop.like(like) | Obyek.nomor_seri_blanko.like(like) | Obyek.persil.like(like) | Obyek.atas_nama.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = session.execute(stmt.order_by(Obyek.id).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {
        "data": [serialize_obyek(r, session) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/obyek/{obyek_id}")
def get_obyek(
    obyek_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    ob = session.get(Obyek, obyek_id)
    if ob is None:
        raise HTTPException(status_code=404, detail="Objek tidak ditemukan")
    return serialize_obyek(ob, session)


@router.post("/obyek")
def create_obyek(
    body: ObyekCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    ob = Obyek(
        jenishak_id=body.jenishak_id,
        jenis_sertipikat=body.jenis_sertipikat,
        nomor_hak=body.nomor_hak,
        persil=body.persil,
        klas=body.klas,
        luas_tanah=body.luas_tanah,
        luas_bangunan=body.luas_bangunan,
        atas_nama=body.atas_nama,
        penggunaan=body.penggunaan,
        no_surat_ukur=body.no_surat_ukur,
        tanggal_surat_ukur=datetime.strptime(body.tanggal_surat_ukur, "%Y-%m-%d").date()
        if body.tanggal_surat_ukur
        else None,
        nib=body.nib,
        nop=body.nop,
        nomor_seri_blanko=body.nomor_seri_blanko,
        batas_utara=body.batas_utara,
        batas_timur=body.batas_timur,
        batas_selatan=body.batas_selatan,
        batas_barat=body.batas_barat,
        wilayah_id=body.wilayah_id,
        edisi_id=body.edisi_id,
    )
    session.add(ob)
    session.commit()
    session.refresh(ob)
    return serialize_obyek(ob, session)


@router.put("/obyek/{obyek_id}")
def update_obyek(
    obyek_id: int,
    body: ObyekCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    ob = session.get(Obyek, obyek_id)
    if ob is None:
        raise HTTPException(status_code=404, detail="Objek tidak ditemukan")
    ob.jenishak_id = body.jenishak_id
    ob.jenis_sertipikat = body.jenis_sertipikat
    ob.nomor_hak = body.nomor_hak
    ob.persil = body.persil
    ob.klas = body.klas
    ob.luas_tanah = body.luas_tanah
    ob.luas_bangunan = body.luas_bangunan
    ob.atas_nama = body.atas_nama
    ob.penggunaan = body.penggunaan
    ob.no_surat_ukur = body.no_surat_ukur
    ob.tanggal_surat_ukur = datetime.strptime(body.tanggal_surat_ukur, "%Y-%m-%d").date() if body.tanggal_surat_ukur else None
    ob.nib = body.nib
    ob.nop = body.nop
    ob.nomor_seri_blanko = body.nomor_seri_blanko
    ob.batas_utara = body.batas_utara
    ob.batas_timur = body.batas_timur
    ob.batas_selatan = body.batas_selatan
    ob.batas_barat = body.batas_barat
    ob.wilayah_id = body.wilayah_id
    ob.edisi_id = body.edisi_id
    session.commit()
    return serialize_obyek(ob, session)


@router.delete("/obyek/{obyek_id}")
def delete_obyek(
    obyek_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    ob = session.get(Obyek, obyek_id)
    if ob is None:
        raise HTTPException(status_code=404, detail="Objek tidak ditemukan")
    session.delete(ob)
    session.commit()
    return {"success": True}


@router.get("/jenishak")
def list_jenishak(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(JenisHak).order_by(JenisHak.id)).scalars().all()
    return {"data": [{"id": r.id, "nama_jenishak": r.nama_jenishak, "singkatan": r.singkatan} for r in rows]}


@router.get("/letak")
def list_letak(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(Letak).order_by(Letak.id)).scalars().all()
    return {"data": [{"id": r.id, "nama_desa": r.nama_desa, "kecamatan_id": r.kecamatan_id} for r in rows]}


# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------


def serialize_template(t: Template, session: Session) -> Dict[str, Any]:
    cat = session.get(TemplateCategory, t.category_id) if t.category_id else None
    grp = session.get(TemplateGroup, t.group_id) if t.group_id else None
    return {
        "id": t.id,
        "name": t.name,
        "code": t.code,
        "description": t.description,
        "category_id": t.category_id,
        "group_id": t.group_id,
        "category": {"name": cat.name} if cat else None,
        "group": {"name": grp.name} if grp else None,
        "file_path": t.file_path,
        "version": t.version,
        "status": t.status,
        "created_by": t.created_by,
        "created_at": iso(t.created_at),
        "updated_at": iso(t.updated_at),
    }


@router.get("/templates")
def list_templates(
    search: str = Query(""),
    category_id: Optional[int] = Query(None),
    group_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Template)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Template.name.like(like) | Template.code.like(like))
    if category_id:
        stmt = stmt.where(Template.category_id == category_id)
    if group_id:
        stmt = stmt.where(Template.group_id == group_id)
    if status:
        stmt = stmt.where(Template.status == status)
    rows = session.execute(stmt.order_by(Template.id.desc())).scalars().all()
    return {"data": [serialize_template(t, session) for t in rows]}


@router.post("/templates")
def create_template(
    body: TemplateCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    t = Template(
        name=body.name,
        code=body.code or body.name[:3].upper(),
        description=body.description,
        category_id=body.category_id,
        group_id=body.group_id,
        version=1,
        status=body.status,
        created_by=user["id"],
        content=body.content,
    )
    session.add(t)
    session.flush()
    session.add(
        TemplateVersion(
            template_id=t.id,
            version=1,
            file_path="",
            notes="Versi awal",
            created_by=user["id"],
        )
    )
    add_audit(session, user["id"], "CREATE_TEMPLATE", "template", str(t.id), f"Template {t.name} dibuat")
    session.commit()
    session.refresh(t)
    return serialize_template(t, session)


@router.get("/templates/{template_id}/content")
def get_template_content(
    template_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    return {"template_id": t.id, "content": t.content or ""}


@router.put("/templates/{template_id}")
def update_template(
    template_id: int,
    body: TemplateUpdate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    t.name = body.name
    t.code = body.code or body.name[:3].upper()
    t.description = body.description
    t.category_id = body.category_id
    t.group_id = body.group_id
    t.status = body.status
    add_audit(session, user["id"], "UPDATE_TEMPLATE", "template", str(t.id), f"Template {t.name} diperbarui")
    session.commit()
    session.refresh(t)
    return serialize_template(t, session)


@router.put("/templates/{template_id}/content")
def update_template_content(
    template_id: int,
    body: TemplateContentUpdate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    t.content = body.content
    add_audit(session, user["id"], "UPDATE_TEMPLATE", "template", str(t.id), f"Konten template {t.name} diperbarui")
    session.commit()
    return {"template_id": t.id, "content": t.content or ""}


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    session.execute(
        text("DELETE FROM template_versions WHERE template_id = :t"), {"t": template_id}
    )
    session.delete(t)
    add_audit(session, user["id"], "DELETE_TEMPLATE", "template", str(template_id), f"Template {t.name} dihapus")
    session.commit()
    return {"success": True}


@router.post("/templates/{template_id}/upload")
async def upload_template_docx(    template_id: int,
    file: UploadFile = FastAPIFile(...),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")

    filename = file.filename or ""
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="File harus berformat .docx")

    out_dir = STORAGE / "templates" / str(template_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "template.docx"

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File maksimal 10 MB")

    out_path.write_bytes(contents)

    if not docx_engine.validate_docx(str(out_path)):
        out_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="File DOCX tidak valid")

    t.file_path = str(out_path)
    t.content = docx_engine.extract_docx_text(str(out_path))
    add_audit(session, user["id"], "UPLOAD_TEMPLATE", "template", str(t.id), f"File DOCX template {t.name} diunggah")
    session.commit()

    return {"template_id": t.id, "file_path": t.file_path, "content": t.content or ""}


DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.get("/templates/{template_id}/download")
def download_template(
    template_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    """Unduh file DOCX template asli (format tetap seperti file yang diunggah)."""
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")

    source = Path(t.file_path) if t.file_path else None
    if source is not None and source.exists():
        return FileResponse(
            source,
            media_type=DOCX_MEDIA_TYPE,
            filename=f"{t.code}-v{t.version}-template.docx",
        )

    # Template yang dibuat dari teks (belum ada file unggahan): buat DOCX
    # sederhana dari konten agar tombol unduh tetap berfungsi.
    if not (t.content or "").strip():
        raise HTTPException(status_code=404, detail="Template belum memiliki file DOCX")
    out_dir = STORAGE / "templates" / str(t.id)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "generated-from-content.docx"
    docx_engine.create_docx_from_text(t.content or "", str(out_path))
    return FileResponse(
        out_path,
        media_type=DOCX_MEDIA_TYPE,
        filename=f"{t.code}-v{t.version}-template.docx",
    )


@router.post("/templates/{template_id}/test-docx")
def generate_template_test_docx(
    template_id: int,
    body: PreviewRequest,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    """Render template DOCX dengan data sample tanpa mengubah format asli."""
    t = session.get(Template, template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")

    out_dir = STORAGE / "templates" / str(t.id)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "test-render.docx"

    source = Path(t.file_path) if t.file_path else None
    if source is not None and source.exists():
        docx_engine.generate_docx(str(source), str(out_path), body.context)
    else:
        text = template_engine.render_text(t.content or "", body.context)
        docx_engine.create_docx_from_text(text, str(out_path))

    return FileResponse(
        out_path,
        media_type=DOCX_MEDIA_TYPE,
        filename=f"{t.code}-test.docx",
    )


@router.post("/templates/preview")
def preview_template(body: PreviewRequest, session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    t = session.get(Template, body.template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    text = template_engine.render_text(t.content or "", body.context)
    return {"success": True, "text": text}


class TemplateCategoryCreate(BaseModel):
    name: str
    code: str = ""
    description: str = ""
    sort_order: int = 0
    is_active: bool = True


@router.get("/template-categories")
def list_categories(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(TemplateCategory).order_by(TemplateCategory.sort_order)).scalars().all()
    return {
        "data": [
            {
                "id": c.id,
                "name": c.name,
                "code": c.code,
                "description": c.description,
                "sort_order": c.sort_order,
                "is_active": c.is_active,
            }
            for c in rows
        ]
    }


@router.post("/template-categories")
def create_category(body: TemplateCategoryCreate, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    category = TemplateCategory(
        name=body.name,
        code=body.code or body.name[:4].upper(),
        description=body.description,
        sort_order=body.sort_order,
        is_active=body.is_active,
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return {"id": category.id, "name": category.name, "code": category.code, "description": category.description, "sort_order": category.sort_order, "is_active": category.is_active}


@router.put("/template-categories/{category_id}")
def update_category(category_id: int, body: TemplateCategoryCreate, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    category = session.get(TemplateCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    category.name = body.name
    category.code = body.code or body.name[:4].upper()
    category.description = body.description
    category.sort_order = body.sort_order
    category.is_active = body.is_active
    session.commit()
    return {"id": category.id, "name": category.name, "code": category.code, "description": category.description, "sort_order": category.sort_order, "is_active": category.is_active}


@router.delete("/template-categories/{category_id}")
def delete_category(category_id: int, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    category = session.get(TemplateCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    used = session.execute(select(func.count()).select_from(Template).where(Template.category_id == category_id)).scalar_one()
    if used:
        raise HTTPException(status_code=400, detail="Kategori masih digunakan template")
    session.delete(category)
    session.commit()
    return {"success": True}


class TemplateGroupCreate(BaseModel):
    name: str
    code: str = ""
    description: str = ""
    category_id: Optional[int] = None
    sort_order: int = 0
    is_active: bool = True


def _group_code(name: str) -> str:
    code = "".join(ch for ch in name.upper() if ch.isalnum())
    return (code[:30] or "GROUP")


def _serialize_group(group: TemplateGroup, session: Session) -> Dict[str, Any]:
    category = session.get(TemplateCategory, group.category_id) if group.category_id else None
    template_count = session.execute(
        select(func.count()).select_from(Template).where(Template.group_id == group.id)
    ).scalar_one()
    return {
        "id": group.id,
        "name": group.name,
        "code": group.code,
        "description": group.description or "",
        "category_id": group.category_id,
        "category": {"id": category.id, "name": category.name} if category else None,
        "sort_order": group.sort_order,
        "is_active": group.is_active,
        "template_count": template_count,
    }


@router.get("/template-groups")
def list_groups(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(
        select(TemplateGroup).order_by(TemplateGroup.sort_order, TemplateGroup.name)
    ).scalars().all()
    return {"data": [_serialize_group(g, session) for g in rows]}


@router.post("/template-groups")
def create_group(
    body: TemplateGroupCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama group wajib diisi")
    if session.execute(
        select(TemplateGroup.id).where(func.lower(TemplateGroup.name) == name.lower())
    ).first():
        raise HTTPException(status_code=400, detail="Nama group sudah digunakan")
    code = (body.code or "").strip().upper() or _group_code(name)
    if session.execute(select(TemplateGroup.id).where(TemplateGroup.code == code)).first():
        raise HTTPException(status_code=400, detail=f"Kode group '{code}' sudah digunakan")
    category_id = body.category_id
    if category_id is not None and session.get(TemplateCategory, category_id) is None:
        raise HTTPException(status_code=400, detail="Kategori tidak ditemukan")
    group = TemplateGroup(
        name=name,
        code=code,
        description=body.description,
        category_id=category_id,
        sort_order=body.sort_order,
        is_active=body.is_active,
    )
    session.add(group)
    session.flush()
    add_audit(session, user["id"], "CREATE_TEMPLATE_GROUP", "template_groups", str(group.id), f"Group {name} dibuat")
    session.commit()
    session.refresh(group)
    return _serialize_group(group, session)


@router.put("/template-groups/{group_id}")
def update_group(
    group_id: int,
    body: TemplateGroupCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    group = session.get(TemplateGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group tidak ditemukan")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama group wajib diisi")
    duplicate = session.execute(
        select(TemplateGroup.id).where(
            func.lower(TemplateGroup.name) == name.lower(), TemplateGroup.id != group_id
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama group sudah digunakan")
    code = (body.code or "").strip().upper() or _group_code(name)
    code_owner = session.execute(
        select(TemplateGroup.id).where(TemplateGroup.code == code, TemplateGroup.id != group_id)
    ).first()
    if code_owner:
        raise HTTPException(status_code=400, detail=f"Kode group '{code}' sudah digunakan")
    category_id = body.category_id
    if category_id is not None and session.get(TemplateCategory, category_id) is None:
        raise HTTPException(status_code=400, detail="Kategori tidak ditemukan")
    group.name = name
    group.code = code
    group.description = body.description
    group.category_id = category_id
    group.sort_order = body.sort_order
    group.is_active = body.is_active
    add_audit(session, user["id"], "UPDATE_TEMPLATE_GROUP", "template_groups", str(group.id), f"Group {name} diperbarui")
    session.commit()
    session.refresh(group)
    return _serialize_group(group, session)


@router.delete("/template-groups/{group_id}")
def delete_group(
    group_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    group = session.get(TemplateGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group tidak ditemukan")
    used = session.execute(
        select(func.count()).select_from(Template).where(Template.group_id == group_id)
    ).scalar_one()
    if used:
        raise HTTPException(
            status_code=400,
            detail=f"Group masih digunakan oleh {used} template",
        )
    name = group.name
    session.delete(group)
    add_audit(session, user["id"], "DELETE_TEMPLATE_GROUP", "template_groups", str(group_id), f"Group {name} dihapus")
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Custom field
# ---------------------------------------------------------------------------


def serialize_field(f: CustomField, session: Session) -> Dict[str, Any]:
    options = session.execute(
        select(CustomFieldOption).where(CustomFieldOption.custom_field_id == f.id).order_by(CustomFieldOption.sort_order)
    ).scalars().all()
    return {
        "id": f.id,
        "name": f.name,
        "field_title": f.field_title,
        "data_type": f.data_type,
        "group_id": f.group_id,
        "source_type": f.source_type,
        "source_config": f.source_config,
        "default_value": f.default_value,
        "display": f.display,
        "required": f.required,
        "placeholder": f.placeholder,
        "description": f.description,
        "sort_order": f.sort_order,
        "is_active": f.is_active,
        "options": [{"id": o.id, "value": o.value, "label": o.label} for o in options],
    }


class CustomFieldOptionCreate(BaseModel):
    value: str
    label: str


class CustomFieldCreate(BaseModel):
    name: str
    field_title: str
    data_type: str = "text"
    group_id: Optional[int] = None
    required: bool = False
    placeholder: str = ""
    default_value: Optional[str] = None
    description: str = ""
    display: bool = True
    is_active: bool = True


@router.get("/custom-fields")
def list_custom_fields(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(CustomField).order_by(CustomField.sort_order)).scalars().all()
    return {"data": [serialize_field(f, session) for f in rows]}


@router.post("/custom-fields")
def create_custom_field(
    body: CustomFieldCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    exists = session.execute(select(CustomField).where(CustomField.name == body.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Nama field sudah digunakan")
    max_sort = session.execute(select(func.coalesce(func.max(CustomField.sort_order), 0))).scalar_one()
    field = CustomField(
        name=body.name,
        field_title=body.field_title,
        data_type=body.data_type,
        group_id=body.group_id,
        source_type="manual",
        default_value=body.default_value,
        display=body.display,
        required=body.required,
        placeholder=body.placeholder,
        description=body.description,
        sort_order=max_sort + 1,
        is_active=body.is_active,
    )
    session.add(field)
    session.commit()
    session.refresh(field)
    return serialize_field(field, session)


@router.put("/custom-fields/{field_id}")
def update_custom_field(
    field_id: int,
    body: CustomFieldCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    field = session.get(CustomField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Custom field tidak ditemukan")
    duplicate = session.execute(
        select(CustomField).where(CustomField.name == body.name, CustomField.id != field_id)
    ).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama field sudah digunakan")
    field.name = body.name
    field.field_title = body.field_title
    field.data_type = body.data_type
    field.group_id = body.group_id
    field.required = body.required
    field.placeholder = body.placeholder
    field.default_value = body.default_value
    field.description = body.description
    field.display = body.display
    field.is_active = body.is_active
    session.commit()
    session.refresh(field)
    return serialize_field(field, session)


@router.post("/custom-fields/{field_id}/options")
def create_custom_field_option(
    field_id: int,
    body: CustomFieldOptionCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    field = session.get(CustomField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Custom field tidak ditemukan")
    max_sort = session.execute(
        select(func.coalesce(func.max(CustomFieldOption.sort_order), 0)).where(
            CustomFieldOption.custom_field_id == field_id
        )
    ).scalar_one()
    option = CustomFieldOption(
        custom_field_id=field_id,
        value=body.value,
        label=body.label,
        sort_order=max_sort + 1,
        is_active=True,
    )
    session.add(option)
    session.commit()
    session.refresh(option)
    return {"id": option.id, "value": option.value, "label": option.label}


@router.delete("/custom-field-options/{option_id}")
def delete_custom_field_option(
    option_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    option = session.get(CustomFieldOption, option_id)
    if not option:
        raise HTTPException(status_code=404, detail="Option tidak ditemukan")
    session.delete(option)
    session.commit()
    return {"success": True}


@router.delete("/custom-fields/{field_id}")
def delete_custom_field(
    field_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    field = session.get(CustomField, field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Custom field tidak ditemukan")
    session.execute(text("DELETE FROM custom_field_values WHERE custom_field_id = :id"), {"id": field_id})
    session.execute(text("DELETE FROM custom_field_options WHERE custom_field_id = :id"), {"id": field_id})
    session.delete(field)
    session.commit()
    return {"success": True}


@router.get("/custom-field-groups")
def list_custom_field_groups(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    groups = session.execute(select(CustomFieldGroup).order_by(CustomFieldGroup.sort_order)).scalars().all()
    fields = session.execute(select(CustomField).where(CustomField.is_active == True).order_by(CustomField.sort_order)).scalars().all()  # noqa: E712
    return {
        "data": [
            {
                "id": g.id,
                "name": g.name,
                "title": g.title,
                "description": g.description,
                "sort_order": g.sort_order,
                "is_active": g.is_active,
                "fields": [serialize_field(f, session) for f in fields if f.group_id == g.id],
            }
            for g in groups
        ]
    }


class FunctionCreate(BaseModel):
    name: str
    code: str = ""
    description: str = ""
    parameters: List[str] = Field(default_factory=list)
    implementation: str
    return_type: str = "text"
    is_active: bool = True


def _serialize_function(f: Function) -> Dict[str, Any]:
    return {
        "id": f.id,
        "name": f.name,
        "code": f.code,
        "description": f.description,
        "parameters": f.parameters or [],
        "implementation": f.implementation,
        "return_type": f.return_type,
        "is_active": f.is_active,
    }


def _load_custom_functions(session: Session) -> None:
    from ..core.functions import register_custom_function, unregister_custom_functions

    unregister_custom_functions()
    rows = session.execute(select(Function).where(Function.is_active == True)).scalars().all()  # noqa: E712
    for f in rows:
        register_custom_function(f.name, f.implementation)


# Custom function tetap berasal dari tabel `functions`. Setiap perubahan melalui
# menu Function langsung dipakai pada render berikutnya; tidak perlu ubah source code.


@router.get("/functions")
def list_functions(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    from ..core.functions import list_functions as registry

    rows = session.execute(select(Function).order_by(Function.name)).scalars().all()
    return {"data": registry(), "custom": [_serialize_function(f) for f in rows]}


@router.post("/functions")
def create_function(body: FunctionCreate, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    exists = session.execute(select(Function).where(Function.name == body.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Nama function sudah digunakan")
    f = Function(
        name=body.name,
        code=body.code or body.name.upper(),
        description=body.description,
        parameters=body.parameters,
        implementation=body.implementation,
        return_type=body.return_type,
        is_active=body.is_active,
        created_by=user["id"],
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    _load_custom_functions(session)
    return _serialize_function(f)


@router.put("/functions/{function_id}")
def update_function(function_id: int, body: FunctionCreate, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    f = session.get(Function, function_id)
    if not f:
        raise HTTPException(status_code=404, detail="Function tidak ditemukan")
    duplicate = session.execute(select(Function).where(Function.name == body.name, Function.id != function_id)).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama function sudah digunakan")
    f.name = body.name
    f.code = body.code or body.name.upper()
    f.description = body.description
    f.parameters = body.parameters
    f.implementation = body.implementation
    f.return_type = body.return_type
    f.is_active = body.is_active
    session.commit()
    session.refresh(f)
    _load_custom_functions(session)
    return _serialize_function(f)


@router.delete("/functions/{function_id}")
def delete_function(function_id: int, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    f = session.get(Function, function_id)
    if not f:
        raise HTTPException(status_code=404, detail="Function tidak ditemukan")
    session.delete(f)
    session.commit()
    _load_custom_functions(session)
    return {"success": True}


# ---------------------------------------------------------------------------
# Jenis transaksi & surat
# ---------------------------------------------------------------------------


@router.get("/jenistransaksi")
def list_jenistransaksi(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(JenisTransaksi).order_by(JenisTransaksi.id)).scalars().all()
    counts = dict(
        session.execute(
            select(JenisTransaksiSurat.jenistransaksi_id, func.count())
            .where(JenisTransaksiSurat.is_active == True)  # noqa: E712
            .group_by(JenisTransaksiSurat.jenistransaksi_id)
        ).all()
    )
    return {
        "data": [
            {
                "id": j.id,
                "nama_jenistransaksi": j.nama_jenistransaksi,
                "surat_count": counts.get(j.id, 0),
            }
            for j in rows
        ]
    }


class PihakRoleCreate(BaseModel):
    role: str
    sebutan: str
    is_active: bool = True


@router.get("/pihak-roles")
def list_pihak_roles(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(PihakRole).order_by(PihakRole.id)).scalars().all()
    return {"data": [{"id": r.id, "role": r.role, "sebutan": r.sebutan, "is_active": r.is_active} for r in rows]}


@router.post("/pihak-roles")
def create_pihak_role(body: PihakRoleCreate, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    role = PihakRole(role=body.role, sebutan=body.sebutan, is_active=body.is_active)
    session.add(role)
    session.commit()
    session.refresh(role)
    return {"id": role.id, "role": role.role, "sebutan": role.sebutan, "is_active": role.is_active}


@router.put("/pihak-roles/{role_id}")
def update_pihak_role(role_id: int, body: PihakRoleCreate, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    role = session.get(PihakRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Peran pihak tidak ditemukan")
    role.role = body.role
    role.sebutan = body.sebutan
    role.is_active = body.is_active
    session.commit()
    return {"id": role.id, "role": role.role, "sebutan": role.sebutan, "is_active": role.is_active}


@router.delete("/pihak-roles/{role_id}")
def delete_pihak_role(role_id: int, session: Session = Depends(session_dep), user: dict = Depends(require_admin)):
    role = session.get(PihakRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Peran pihak tidak ditemukan")
    session.delete(role)
    session.commit()
    return {"success": True}


@router.get("/surat")
def list_surat(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(select(Surat).order_by(Surat.nama_surat)).scalars().all()
    return {
        "data": [
            {
                "id": s.id,
                "template_id": s.template_id,
                "jenis_surat": s.jenis_surat,
                "nama_surat": s.nama_surat,
                "keterangan": s.keterangan,
                "template": (
                    {"id": t.id, "name": t.name, "version": t.version, "status": t.status}
                    if (t := session.get(Template, s.template_id) if s.template_id else None)
                    else None
                ),
            }
            for s in rows
        ]
    }


@router.get("/jenistransaksi/{jenis_id}/surat")
def list_jenistransaksi_surat(
    jenis_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    rows = session.execute(
        select(JenisTransaksiSurat, Surat, Template)
        .join(Surat, Surat.id == JenisTransaksiSurat.surat_id)
        .outerjoin(Template, Template.id == Surat.template_id)
        .where(
            JenisTransaksiSurat.jenistransaksi_id == jenis_id,
            JenisTransaksiSurat.is_active == True,  # noqa: E712
        )
        .order_by(JenisTransaksiSurat.urutan)
    ).all()
    return {
        "jenistransaksi_id": jenis_id,
        "surat": [
            {
                "id": s.id,
                "nama_surat": s.nama_surat,
                "jenis_surat": s.jenis_surat,
                "keterangan": s.keterangan,
                "template_id": s.template_id,
                "urutan": js.urutan,
                "wajib": js.wajib,
                "default_selected": js.default_selected,
                "is_active": js.is_active,
                "template": (
                    {"id": t.id, "name": t.name, "version": t.version, "status": t.status} if t else None
                ),
            }
            for js, s, t in rows
        ],
    }


# ---------------------------------------------------------------------------
# Transaksi
# ---------------------------------------------------------------------------


@router.post("/surat")
def create_surat(
    body: SuratCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    s = Surat(
        template_id=body.template_id,
        jenis_surat=body.jenis_surat,
        nama_surat=body.nama_surat,
        keterangan=body.keterangan,
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return {"id": s.id, "nama_surat": s.nama_surat}


@router.put("/surat/{surat_id}")
def update_surat(
    surat_id: str,
    body: SuratCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    s = session.get(Surat, surat_id)
    if not s:
        raise HTTPException(status_code=404, detail="Surat tidak ditemukan")
    s.template_id = body.template_id
    s.jenis_surat = body.jenis_surat
    s.nama_surat = body.nama_surat
    s.keterangan = body.keterangan
    session.commit()
    return {"id": s.id, "nama_surat": s.nama_surat}


@router.delete("/surat/{surat_id}")
def delete_surat(
    surat_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    s = session.get(Surat, surat_id)
    if not s:
        raise HTTPException(status_code=404, detail="Surat tidak ditemukan")
    session.delete(s)
    session.commit()
    return {"success": True}


@router.post("/jenistransaksi")
def create_jenistransaksi(
    body: JenisTransaksiCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    jt = JenisTransaksi(nama_jenistransaksi=body.nama_jenistransaksi)
    session.add(jt)
    session.commit()
    session.refresh(jt)
    return {"id": jt.id, "nama_jenistransaksi": jt.nama_jenistransaksi}


@router.put("/jenistransaksi/{jenis_id}")
def update_jenistransaksi(
    jenis_id: int,
    body: JenisTransaksiCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    jt = session.get(JenisTransaksi, jenis_id)
    if not jt:
        raise HTTPException(status_code=404, detail="Jenis transaksi tidak ditemukan")
    jt.nama_jenistransaksi = body.nama_jenistransaksi
    session.commit()
    return {"id": jt.id, "nama_jenistransaksi": jt.nama_jenistransaksi}


@router.delete("/jenistransaksi/{jenis_id}")
def delete_jenistransaksi(
    jenis_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    jt = session.get(JenisTransaksi, jenis_id)
    if not jt:
        raise HTTPException(status_code=404, detail="Jenis transaksi tidak ditemukan")
    session.delete(jt)
    session.commit()
    return {"success": True}


@router.post("/jenistransaksi/{jenis_id}/surat")
def assign_surat_to_jenistransaksi(
    jenis_id: int,
    body: JtsSuratCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    jts = JenisTransaksiSurat(
        jenistransaksi_id=jenis_id,
        surat_id=body.surat_id,
        urutan=body.urutan,
        wajib=body.wajib,
        default_selected=body.default_selected,
    )
    session.add(jts)
    session.commit()
    return {"success": True}


@router.put("/jenistransaksi/{jenis_id}/surat")
def set_jenistransaksi_surat(
    jenis_id: int,
    body: JtsSuratSet,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    session.execute(
        text("DELETE FROM jenistransaksi_surat WHERE jenistransaksi_id = :jid"),
        {"jid": jenis_id},
    )
    for item in body.items:
        session.add(
            JenisTransaksiSurat(
                jenistransaksi_id=jenis_id,
                surat_id=item.surat_id,
                urutan=item.urutan,
                wajib=item.wajib,
                default_selected=item.default_selected,
                is_active=True,
            )
        )
    session.commit()
    return {"success": True}


@router.delete("/jenistransaksi/{jenis_id}/surat/{surat_id}")
def remove_surat_from_jenistransaksi(
    jenis_id: int,
    surat_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    jts = session.execute(
        select(JenisTransaksiSurat).where(
            JenisTransaksiSurat.jenistransaksi_id == jenis_id,
            JenisTransaksiSurat.surat_id == surat_id,
        )
    ).scalar_one_or_none()
    if not jts:
        raise HTTPException(status_code=404, detail="Surat tidak tertaut")
    session.delete(jts)
    session.commit()
    return {"success": True}


@router.get("/transaksi")
def list_transaksi(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Transaksi)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            Transaksi.nomor_transaksi.like(like) | Transaksi.judul.like(like) | Transaksi.keterangan.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = session.execute(
        stmt.order_by(Transaksi.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    return {
        "data": [
            {
                "id": t.id,
                "user_id": t.user_id,
                "jenistransaksi_id": t.jenistransaksi_id,
                "obyek_id": t.obyek_id,
                "nomor_transaksi": t.nomor_transaksi,
                "tanggal_transaksi": iso(t.tanggal_transaksi),
                "judul": t.judul,
                "status": t.status,
                "keterangan": t.keterangan,
                "jenistransaksi": {
                    "nama_jenistransaksi": session.get(JenisTransaksi, t.jenistransaksi_id).nama_jenistransaksi
                }
                if t.jenistransaksi_id and session.get(JenisTransaksi, t.jenistransaksi_id)
                else None,
                "created_at": iso(t.created_at),
                "updated_at": iso(t.updated_at),
            }
            for t in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/transaksi")
def create_transaksi(
    body: TransaksiCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    tx = Transaksi(
        id=uuid4().hex,
        user_id=user["id"],
        jenistransaksi_id=body.jenistransaksi_id,
        obyek_id=body.obyek_id,
        nomor_transaksi=body.nomor_transaksi,
        tanggal_transaksi=datetime.strptime(body.tanggal_transaksi, "%Y-%m-%d").date(),
        judul=body.judul,
        status="draft",
        keterangan=body.keterangan,
    )
    session.add(tx)
    session.flush()  # pastikan baris transaksi tersimpan sebelum pihak (FK)
    party_keys = _save_pihak_rows(session, tx.id, body.pihak)
    for idx, sec in enumerate(body.sections, start=1):
        session.add(
            Section(
                transaksi_id=tx.id,
                item_id=sec.item_id,
                uraian_id=sec.uraian_id,
                pihak_id=_resolve_section_party(session, tx.id, sec, party_keys),
                detail=sec.detail,
                short_text=sec.short_text,
                urutan=idx,
            )
        )
    add_audit(session, user["id"], "CREATE_TRANSACTION", "transaksi", tx.id, f"Transaksi {body.judul} dibuat")
    session.commit()
    return {
        "id": tx.id,
        "nomor_transaksi": tx.nomor_transaksi,
        "status": tx.status,
        "created_at": iso(tx.created_at),
    }


def _serialize_transaksi_detail(tx: Transaksi, session: Session) -> Dict[str, Any]:
    parties = session.execute(
        select(Pihak).where(Pihak.transaksi_id == tx.id).order_by(Pihak.urutan)
    ).scalars().all()
    pihak_out = []
    for p in parties:
        links = session.execute(
            select(PihakEktp).where(PihakEktp.pihak_id == p.id).order_by(PihakEktp.urutan)
        ).scalars().all()
        ektp_rows = [session.get(Ektp, l.ektp_id) for l in links]
        pihak_out.append(
            {
                "id": p.id,
                "role": p.nama_pihak,
                "sebutan": p.sebutan_pihak,
                "pihak_role_id": p.pihak_role_id,
                "parent_id": p.parent_id,
                "urutan": p.urutan,
                "ektp": [serialize_ektp(e) for e in ektp_rows if e is not None],
            }
        )
    surat_ids = [
        row[0]
        for row in session.execute(
            select(Document.surat_id).where(Document.transaction_id == tx.id)
        ).all()
        if row[0]
    ]

    stored = {}
    cvs = session.execute(select(CustomFieldValue).where(CustomFieldValue.transaksi_id == tx.id)).scalars().all()
    field_map = {f.id: f.name for f in session.execute(select(CustomField)).scalars().all()}
    for cv in cvs:
        value: Any = cv.value
        # Multi select disimpan sebagai JSON array.
        if isinstance(value, str) and value.strip().startswith("["):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                pass
        stored[field_map.get(cv.custom_field_id, str(cv.custom_field_id))] = value

    section_rows = session.execute(
        select(Section).where(Section.transaksi_id == tx.id).order_by(Section.urutan)
    ).scalars().all()
    sections_out = []
    for sec in section_rows:
        item = session.get(Item, sec.item_id) if sec.item_id else None
        uraian_row = session.get(Uraian, sec.uraian_id) if sec.uraian_id else None
        section_party = session.get(Pihak, sec.pihak_id) if sec.pihak_id else None
        sections_out.append(
            {
                "id": sec.id,
                "item_id": sec.item_id,
                "nama_item": item.nama_item if item else "",
                "uraian_id": sec.uraian_id,
                "nama_uraian": uraian_row.nama_uraian if uraian_row else "",
                "pihak_id": sec.pihak_id,
                "nama_pihak": section_party.nama_pihak if section_party else "",
                "sebutan_pihak": section_party.sebutan_pihak if section_party else "",
                "detail": sec.detail or "",
                "short_text": sec.short_text or "",
                "urutan": sec.urutan,
            }
        )

    return {
        "id": tx.id,
        "jenistransaksi_id": tx.jenistransaksi_id,
        "obyek_id": tx.obyek_id,
        "nomor_transaksi": tx.nomor_transaksi,
        "tanggal_transaksi": iso(tx.tanggal_transaksi),
        "judul": tx.judul,
        "status": tx.status,
        "keterangan": tx.keterangan,
        "pihak": pihak_out,
        "sections": sections_out,
        "surat_ids": surat_ids,
        "custom_fields": stored,
    }


def _resolve_section_party(
    session: Session,
    transaksi_id: str,
    sec: SectionInput,
    party_keys: Dict[str, str],
) -> Optional[str]:
    """Tentukan pihak_id section dari key sementara atau id yang sudah ada."""
    if sec.pihak_key:
        resolved = party_keys.get(sec.pihak_key)
        if not resolved:
            raise HTTPException(
                status_code=400,
                detail=f"Pihak section dengan key '{sec.pihak_key}' tidak ditemukan",
            )
        return resolved
    if sec.pihak_id:
        row = session.get(Pihak, sec.pihak_id)
        if row is None or row.transaksi_id != transaksi_id:
            raise HTTPException(status_code=400, detail="Pihak section tidak ditemukan pada transaksi ini")
        return sec.pihak_id
    return None


def _save_pihak_rows(
    session: Session, transaksi_id: str, rows: List[PihakInput]
) -> Dict[str, str]:
    """Simpan pihak + relasi parent berdasarkan key sementara."""
    created: List[Pihak] = []
    key_map: Dict[str, str] = {}
    pending: List[tuple[Pihak, str, Optional[str]]] = []

    for idx, p in enumerate(rows, start=1):
        role_id = p.pihak_role_id
        if role_id is None:
            role_id = session.execute(
                select(PihakRole.id).where(PihakRole.role == p.nama_pihak)
            ).scalar_one_or_none()
        pihak_id = uuid4().hex
        key = (p.key or "").strip()
        if key:
            if key in key_map:
                raise HTTPException(status_code=400, detail=f"Key pihak duplikat: {key}")
            key_map[key] = pihak_id
        pihak = Pihak(
            id=pihak_id,
            transaksi_id=transaksi_id,
            pihak_role_id=role_id,
            nama_pihak=p.nama_pihak,
            sebutan_pihak=p.sebutan_pihak,
            urutan=idx,
        )
        session.add(pihak)
        created.append(pihak)
        for pos, ektp_id in enumerate(p.ektp_ids, start=1):
            session.add(PihakEktp(id=uuid4().hex, pihak_id=pihak_id, ektp_id=ektp_id, urutan=pos))
        pending.append((pihak, key, (p.parent_key or "").strip(), p.parent_id))

    session.flush()
    ids = {p.id for p in created}
    for pihak, key, parent_key, parent_id in pending:
        parent = key_map.get(parent_key) if parent_key else (parent_id or "")
        if parent_key and not parent:
            raise HTTPException(
                status_code=400,
                detail=f"Parent pihak dengan key '{parent_key}' tidak ditemukan",
            )
        if not parent:
            continue
        if parent not in ids:
            raise HTTPException(status_code=400, detail="Parent pihak tidak ditemukan pada transaksi ini")
        if parent == pihak.id:
            raise HTTPException(status_code=400, detail="Pihak tidak boleh menjadi parent dirinya sendiri")
        pihak.parent_id = parent
    session.flush()

    # validasi siklus (A -> B -> A)
    parent_of = {p.id: p.parent_id for p in created}
    for pid in parent_of:
        seen = set()
        cur: Optional[str] = pid
        while cur:
            if cur in seen:
                raise HTTPException(
                    status_code=400, detail="Relasi parent pihak membentuk siklus"
                )
            seen.add(cur)
            cur = parent_of.get(cur)
    return key_map


@router.delete("/transaksi/{tx_id}")
def delete_transaksi(
    tx_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    tx = session.get(Transaksi, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    document_ids = session.execute(
        select(Document.id).where(Document.transaction_id == tx_id)
    ).scalars().all()
    if document_ids:
        for document_id in document_ids:
            session.execute(text("DELETE FROM document_snapshots WHERE document_id = :id"), {"id": document_id})
            session.execute(text("DELETE FROM document_parties WHERE document_id = :id"), {"id": document_id})
            session.execute(text("DELETE FROM document_objects WHERE document_id = :id"), {"id": document_id})
        session.execute(text("DELETE FROM documents WHERE transaction_id = :tx_id"), {"tx_id": tx_id})
    session.execute(text("DELETE FROM custom_field_values WHERE transaksi_id = :tx_id"), {"tx_id": tx_id})
    session.execute(text("DELETE FROM pihak_ektp WHERE pihak_id IN (SELECT id FROM pihak WHERE transaksi_id = :tx_id)"), {"tx_id": tx_id})
    session.execute(text("DELETE FROM pihak WHERE transaksi_id = :tx_id"), {"tx_id": tx_id})
    session.delete(tx)
    add_audit(session, user["id"], "DELETE_TRANSACTION", "transaksi", tx_id, f"Transaksi {tx.judul} dihapus beserta dokumen")
    session.commit()
    return {"success": True}


ROMAN_MONTHS = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"}


@router.get("/transaksi/next-number")
def next_transaksi_number(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1)
    month_end = datetime(now.year, now.month, 1).replace(month=now.month % 12 + 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
    count = session.execute(
        select(func.count()).select_from(Transaksi).where(Transaksi.created_at >= month_start, Transaksi.created_at < month_end)
    ).scalar_one()
    seq = count + 1
    return {"nomor_transaksi": f"{seq:02d}/{ROMAN_MONTHS[now.month]}/{now.year}"}


@router.get("/transaksi/{tx_id}")
def get_transaksi(tx_id: str, session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    tx = session.get(Transaksi, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return _serialize_transaksi_detail(tx, session)


@router.put("/transaksi/{tx_id}")
def update_transaksi(
    tx_id: str,
    body: TransaksiUpdate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    tx = session.get(Transaksi, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    if body.jenistransaksi_id is not None:
        tx.jenistransaksi_id = body.jenistransaksi_id
    if body.obyek_id is not None:
        tx.obyek_id = body.obyek_id
    if body.nomor_transaksi:
        tx.nomor_transaksi = body.nomor_transaksi
    if body.tanggal_transaksi:
        tx.tanggal_transaksi = datetime.strptime(body.tanggal_transaksi, "%Y-%m-%d").date()
    if body.judul:
        tx.judul = body.judul
    tx.keterangan = body.keterangan

    # Ganti pihak
    session.execute(text("DELETE FROM pihak_ektp WHERE pihak_id IN (SELECT id FROM pihak WHERE transaksi_id = :t)"), {"t": tx.id})
    session.execute(text("DELETE FROM pihak WHERE transaksi_id = :t"), {"t": tx.id})
    party_keys = _save_pihak_rows(session, tx.id, body.pihak)

    # Ganti sections hanya jika dikirim (None = pertahankan yang lama)
    if body.sections is not None:
        session.execute(text("DELETE FROM sections WHERE transaksi_id = :t"), {"t": tx.id})
        for idx, sec in enumerate(body.sections, start=1):
            session.add(
                Section(
                    transaksi_id=tx.id,
                    item_id=sec.item_id,
                    uraian_id=sec.uraian_id,
                    pihak_id=_resolve_section_party(session, tx.id, sec, party_keys),
                    detail=sec.detail,
                    short_text=sec.short_text,
                    urutan=idx,
                )
            )

    # Simpan custom field value
    _persist_custom_values(session, tx.id, body.custom_fields)

    # Regenerate dokumen bila transaksi sudah punya dokumen, agar nomor/tanggal
    # di dokumen ikut ter-update sesuai data terbaru.
    existing_docs = session.execute(
        select(Document.id).where(Document.transaction_id == tx.id)
    ).scalars().all()
    if existing_docs:
        surat_ids = body.surat_ids or [
            s for s in (session.execute(select(Document.surat_id).where(Document.transaction_id == tx.id)).scalars().all()) if s
        ]
        if surat_ids:
            session.execute(text("DELETE FROM document_snapshots WHERE document_id IN (SELECT id FROM documents WHERE transaction_id = :t)"), {"t": tx.id})
            session.execute(text("DELETE FROM document_parties WHERE document_id IN (SELECT id FROM documents WHERE transaction_id = :t)"), {"t": tx.id})
            session.execute(text("DELETE FROM document_objects WHERE document_id IN (SELECT id FROM documents WHERE transaction_id = :t)"), {"t": tx.id})
            session.execute(text("DELETE FROM documents WHERE transaction_id = :t"), {"t": tx.id})
            _do_generate_documents(session, tx, surat_ids, body.custom_fields, user["id"])

    add_audit(session, user["id"], "UPDATE_TRANSACTION", "transaksi", tx.id, f"Transaksi {tx.judul} diperbarui")
    session.commit()
    return _serialize_transaksi_detail(tx, session)


# ---------------------------------------------------------------------------
# Dokumen
# ---------------------------------------------------------------------------


def _sections_by_name(session: Session, transaksi_id: str, mode: str = "detail") -> Dict[str, str]:
    data: Dict[str, str] = {}
    for row in _sections_context(session, transaksi_id):
        if row.get("pihak_id"):
            continue  # section khusus pihak tidak menimpa section umum
        name = row.get("nama_item") or ""
        if not name:
            continue
        value = row.get("detail") or ""
        if mode == "short":
            value = row.get("short_text") or value
        data[name] = value
    return data


def _sections_by_party(
    session: Session, transaksi_id: str, mode: str = "detail"
) -> Dict[str, Dict[str, str]]:
    data: Dict[str, Dict[str, str]] = {}
    for row in _sections_context(session, transaksi_id):
        role = (row.get("nama_pihak") or "").strip()
        name = row.get("nama_item") or ""
        if not role or not name:
            continue
        value = row.get("detail") or ""
        if mode == "short":
            value = row.get("short_text") or value
        slug = re.sub(r"[^a-z0-9]+", "_", role.lower()).strip("_")
        for key in (role, slug):
            data.setdefault(key, {})[name] = value
    return data


def _transaction_context(session: Session, tx: Transaksi, custom_values: Dict[str, Any]) -> Dict[str, Any]:
    _load_custom_functions(session)
    parties = session.execute(select(Pihak).where(Pihak.transaksi_id == tx.id).order_by(Pihak.urutan)).scalars().all()
    pihak_data: List[Dict[str, Any]] = []
    penjual: List[Dict[str, Any]] = []
    pembeli: List[Dict[str, Any]] = []
    saksi: List[Dict[str, Any]] = []
    peran: Dict[str, List[Dict[str, Any]]] = {}

    # Kumpulkan orang per pihak lebih dulu agar relasi parent/child dapat
    # dipasang setelah seluruh data terkumpul.
    party_persons: Dict[str, List[Dict[str, Any]]] = {}
    for p in parties:
        links = session.execute(
            select(PihakEktp).where(PihakEktp.pihak_id == p.id).order_by(PihakEktp.urutan)
        ).scalars().all()
        persons = [serialize_ektp(e, session) for e in (session.get(Ektp, l.ektp_id) for l in links) if e is not None]
        party_persons[p.id] = persons
    parties_by_id = {p.id: p for p in parties}
    children_map: Dict[str, List[Pihak]] = {}
    for p in parties:
        if p.parent_id and p.parent_id in parties_by_id:
            children_map.setdefault(p.parent_id, []).append(p)

    def flat_children(party: Pihak, depth: int = 0, visited: frozenset[str] = frozenset()) -> List[Dict[str, Any]]:
        """Child sebagai daftar ORANG (satu e-KTP = satu entri).

        Satu baris pihak bisa memuat beberapa e-KTP (mis. suami-isteri), dan
        orang yang sama bisa muncul di beberapa role. Entri digabung per
        e-KTP agar template cukup `#each p.children` + `ektp_paragraph(c)`.
        """
        if depth >= 5:
            return []
        seen_party = visited | {party.id}
        result: List[Dict[str, Any]] = []
        index: Dict[Any, Dict[str, Any]] = {}
        for child in children_map.get(party.id, []):
            for person in party_persons.get(child.id, []):
                key = person.get("id")
                existing = index.get(key) if key is not None else None
                if existing is not None:
                    if child.nama_pihak not in existing["roles"]:
                        existing["roles"].append(child.nama_pihak)
                    continue
                entry: Dict[str, Any] = {
                    **person,
                    "role": child.nama_pihak,
                    "sebutan": child.sebutan_pihak,
                    "party_id": child.id,
                    "pihak_id": child.id,
                    "roles": [child.nama_pihak],
                    "persons": party_persons.get(child.id, []),
                }
                if child.id not in seen_party:
                    kids = flat_children(child, depth + 1, seen_party)
                    if kids:
                        entry["children"] = kids
                if key is not None:
                    index[key] = entry
                result.append(entry)
        return result

    # Satu orang (e-KTP) bisa muncul pada beberapa baris pihak dengan role
    # berbeda. Relasi parent/child digabung per orang agar `p.children` tetap
    # tersedia walau relasi dipasang pada role lain dari orang yang sama.
    person_parties: Dict[Any, List[str]] = {}
    for party_id, persons in party_persons.items():
        for person in persons:
            key = person.get("id")
            if key is None:
                continue
            bucket = person_parties.setdefault(key, [])
            if party_id not in bucket:
                bucket.append(party_id)

    flat_children_map: Dict[str, List[Dict[str, Any]]] = {
        p.id: flat_children(p) for p in parties
    }

    person_children: Dict[Any, List[Dict[str, Any]]] = {}
    person_parent: Dict[Any, Optional[Pihak]] = {}
    for ektp_id, party_ids in person_parties.items():
        merged: List[Dict[str, Any]] = []
        index: Dict[Any, Dict[str, Any]] = {}
        parent: Optional[Pihak] = None
        for party_id in party_ids:
            party = parties_by_id.get(party_id)
            if party is None:
                continue
            if parent is None and party.parent_id and party.parent_id in parties_by_id:
                parent = parties_by_id[party.parent_id]
            for entry in flat_children_map.get(party_id, []):
                key = entry.get("id")
                existing = index.get(key) if key is not None else None
                if existing is not None:
                    for role_name in entry.get("roles", []):
                        if role_name not in existing["roles"]:
                            existing["roles"].append(role_name)
                    continue
                if key is not None:
                    index[key] = entry
                merged.append(entry)
        person_children[ektp_id] = merged
        person_parent[ektp_id] = parent

    def party_object(
        party: Pihak, depth: int = 0, visited: frozenset[str] = frozenset()
    ) -> Dict[str, Any]:
        persons = party_persons.get(party.id) or []
        first = persons[0] if persons else {}
        obj: Dict[str, Any] = {
            **first,
            "party_id": party.id,
            "role": party.nama_pihak,
            "sebutan": party.sebutan_pihak,
            "persons": persons,
        }
        if depth >= 5:
            return obj
        seen = visited | {party.id}
        kids = [
            party_object(child, depth + 1, seen)
            for child in children_map.get(party.id, [])
            if child.id not in seen
        ]
        if kids:
            obj["children"] = kids
        parent_id = party.parent_id
        if parent_id and parent_id in parties_by_id and parent_id not in seen:
            obj["parent"] = party_object(parties_by_id[parent_id], depth + 1, seen)
        return obj

    for p in parties:
        persons = party_persons.get(p.id) or []
        parent_obj = (
            party_object(parties_by_id[p.parent_id])
            if p.parent_id and p.parent_id in parties_by_id
            else {}
        )
        children_obj = flat_children_map.get(p.id, [])
        for data in persons:
            ektp_key = data.get("id")
            person_kids = person_children.get(ektp_key)
            person_parent_obj = person_parent.get(ektp_key)
            entry = {
                "role": p.nama_pihak,
                "sebutan": p.sebutan_pihak,
                "party_id": p.id,
                "pihak_id": p.id,
                **data,
                "parent": (
                    party_object(person_parent_obj)
                    if person_parent_obj is not None
                    else parent_obj
                ),
                "children": person_kids if person_kids else children_obj,
            }
            pihak_data.append(entry)
            peran.setdefault(p.nama_pihak, []).append(entry)
            if p.nama_pihak in ("PENJUAL", "PELEPAS"):
                penjual.append(entry)
            elif p.nama_pihak in ("PEMBELI", "PENERIMA"):
                pembeli.append(entry)
            else:
                saksi.append(entry)

    ob = session.get(Obyek, tx.obyek_id) if tx.obyek_id else None
    ob_data = serialize_obyek(ob, session) if ob else {}

    stored = {}
    if tx.id:
        cvs = session.execute(select(CustomFieldValue).where(CustomFieldValue.transaksi_id == tx.id)).scalars().all()
        field_map = {f.id: f.name for f in session.execute(select(CustomField)).scalars().all()}
        for cv in cvs:
            raw_value = cv.value
            # Multi select disimpan sebagai JSON array.
            if isinstance(raw_value, str) and raw_value.strip().startswith("["):
                try:
                    raw_value = json.loads(raw_value)
                except json.JSONDecodeError:
                    pass
            stored[field_map.get(cv.custom_field_id, str(cv.custom_field_id))] = raw_value

    custom = {**stored, **custom_values}
    # Fallback: nomor & tanggal akta ambil dari transaksi bila belum diisi.
    if not custom.get("nomor_akta"):
        custom["nomor_akta"] = tx.nomor_transaksi
    if not custom.get("tanggal_akta"):
        custom["tanggal_akta"] = iso(tx.tanggal_transaksi)

    settings = _settings_dict(session)
    system_ektp: Dict[str, Any] = {}
    if settings.get("ektp_id"):
        try:
            se = session.get(Ektp, int(settings["ektp_id"]))
        except (TypeError, ValueError):
            se = None
        if se is not None:
            system_ektp = serialize_ektp(se, session)
    system_wilayah: Dict[str, Any] = {}
    if settings.get("wilayah_id"):
        try:
            sw = session.get(Wilayah, int(settings["wilayah_id"]))
        except (TypeError, ValueError):
            sw = None
        if sw is not None:
            system_wilayah = {
                "id": sw.id,
                "kode_wilayah": sw.kode_wilayah,
                "desa": sw.desa,
                "tipe_desa": sw.tipe_desa,
                "kecamatan": sw.kecamatan,
                "kabupaten": sw.kabupaten,
                "tipe_kabupaten": sw.tipe_kabupaten,
                "provinsi": sw.provinsi,
            }
    return {
        "transaksi": {
            "nomor_transaksi": tx.nomor_transaksi,
            "tanggal_transaksi": iso(tx.tanggal_transaksi),
            "judul": tx.judul,
            "jenistransaksi": {
                "nama_jenistransaksi": session.get(JenisTransaksi, tx.jenistransaksi_id).nama_jenistransaksi
            }
            if tx.jenistransaksi_id and session.get(JenisTransaksi, tx.jenistransaksi_id)
            else {},
        },
        "pihak": pihak_data,
        "penjual": penjual,
        "pembeli": pembeli,
        "saksi": saksi,
        "peran": peran,
        "obyek": ob_data,
        "jenishak": ob_data.get("jenishak") or {},
        "letak": ob_data.get("wilayah") or {},
        "wilayah": ob_data.get("wilayah") or {},
        "sections": _sections_context(session, tx.id),
        "sections_by_name": _sections_by_name(session, tx.id, "detail"),
        "sections_by_name_short": _sections_by_name(session, tx.id, "short"),
        "sections_by_party": _sections_by_party(session, tx.id, "detail"),
        "sections_by_party_short": _sections_by_party(session, tx.id, "short"),
        "custom": custom,
        "uraian": _uraian_context(session),
        "gelar": _gelar_context(session),
        "staff": _staff_context(session)[0],
        "staff_by_job": _staff_context(session)[1],
        "system": {
            "company_name": settings.get("company_name", ""),
            "address": settings.get("address", ""),
            "email": settings.get("email", ""),
            "phone": settings.get("phone", ""),
            "postal_code": settings.get("postal_code", ""),
            "permit_number": settings.get("permit_number", ""),
            "permit_date": settings.get("permit_date", ""),
            "daerah_kerja": settings.get("daerah_kerja", ""),
            "wilayah_id": settings.get("wilayah_id", ""),
            "wilayah": system_wilayah,
            "ektp": system_ektp,
            "users": _users_context(session),
        },
    }


@router.post("/documents/preview")
def preview_document(body: PreviewRequest, session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    t = session.get(Template, body.template_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    text = template_engine.render_text(t.content or "", body.context)
    return {"success": True, "text": text}


def _persist_custom_values(session: Session, tx_id: str, custom_fields: Dict[str, Any]) -> None:
    if not custom_fields:
        return
    fields = session.execute(select(CustomField)).scalars().all()
    name_to_id = {f.name: f.id for f in fields}
    for name, value in custom_fields.items():
        if name not in name_to_id:
            continue
        cfv = session.execute(
            select(CustomFieldValue).where(
                CustomFieldValue.transaksi_id == tx_id,
                CustomFieldValue.custom_field_id == name_to_id[name],
            )
        ).scalar_one_or_none()
        if isinstance(value, (list, tuple)):
            new_value = json.dumps(list(value), ensure_ascii=False)
        elif isinstance(value, dict):
            new_value = json.dumps(value, ensure_ascii=False)
        else:
            new_value = "" if value is None else str(value)
        if cfv:
            cfv.value = new_value
        else:
            session.add(
                CustomFieldValue(
                    transaksi_id=tx_id,
                    custom_field_id=name_to_id[name],
                    value=new_value,
                )
            )


@router.post("/documents/generate")
def generate_document(
    body: GenerateRequest,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    tx = session.get(Transaksi, body.transaksi_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    sub = session.execute(
        select(UserSubscription)
        .where(UserSubscription.user_id == tx.user_id, UserSubscription.status == "active")
        .order_by(UserSubscription.created_at.desc())
    ).scalars().first()
    if sub is None:
        raise HTTPException(status_code=402, detail="Subscription tidak aktif")
    if sub.document_used >= sub.document_limit:
        raise HTTPException(
            status_code=402,
            detail="Kuota dokumen bulan ini telah habis. Silakan menunggu periode berikutnya atau upgrade subscription.",
        )

    created = _do_generate_documents(session, tx, body.surat_ids, body.custom_fields, user["id"])
    _persist_custom_values(session, tx.id, body.custom_fields)

    if sub:
        sub.document_used += len(created)
    add_audit(
        session,
        user["id"],
        "GENERATE_DOCUMENT",
        "document",
        ",".join(str(d["id"]) for d in created),
        f"Generate {len(created)} dokumen",
    )
    session.commit()
    return {"success": True, "documents": created}


@router.post("/documents/regenerate")
def regenerate_document(
    body: GenerateRequest,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    tx = session.get(Transaksi, body.transaksi_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    surat_ids = body.surat_ids
    if not surat_ids:
        surat_ids = [
            s
            for s in (
                session.execute(
                    select(Document.surat_id).where(Document.transaction_id == tx.id)
                ).scalars().all()
            )
            if s
        ]

    # Hapus dokumen lama transaksi ini (snapshot + dokumen)
    old_docs = session.execute(
        select(Document.id).where(Document.transaction_id == tx.id)
    ).scalars().all()
    if old_docs:
        session.execute(
            text("DELETE FROM document_snapshots WHERE document_id IN (SELECT id FROM documents WHERE transaction_id = :t)"),
            {"t": tx.id},
        )
        session.execute(
            text("DELETE FROM document_parties WHERE document_id IN (SELECT id FROM documents WHERE transaction_id = :t)"),
            {"t": tx.id},
        )
        session.execute(
            text("DELETE FROM document_objects WHERE document_id IN (SELECT id FROM documents WHERE transaction_id = :t)"),
            {"t": tx.id},
        )
        session.execute(text("DELETE FROM documents WHERE transaction_id = :t"), {"t": tx.id})

    created = _do_generate_documents(session, tx, surat_ids, body.custom_fields, user["id"])
    _persist_custom_values(session, tx.id, body.custom_fields)
    add_audit(
        session,
        user["id"],
        "REGENERATE_DOCUMENT",
        "document",
        ",".join(str(d["id"]) for d in created),
        f"Regenerate {len(created)} dokumen",
    )
    session.commit()
    return {"success": True, "documents": created}


def _do_generate_documents(
    session: Session,
    tx: Transaksi,
    surat_ids: List[str],
    custom_fields: Dict[str, Any],
    user_id: int,
) -> List[Dict[str, Any]]:
    context = _transaction_context(session, tx, custom_fields)
    created: List[Dict[str, Any]] = []
    year_month = f"{date.today():%Y/%m}"

    for surat_id in surat_ids:
        s = session.get(Surat, surat_id)
        if s is None:
            continue
        t = session.get(Template, s.template_id) if s.template_id else None
        if t is None:
            continue
        tv = session.execute(
            select(TemplateVersion)
            .where(TemplateVersion.template_id == t.id, TemplateVersion.version == t.version)
            .order_by(TemplateVersion.id.desc())
        ).scalars().first()

        # Tentukan konten teks untuk render & snapshot. Jika konten kosong
        # tapi ada file DOCX template, ekstrak teks placeholder dari file.
        content = t.content or ""
        if not content.strip() and t.file_path and Path(t.file_path).exists():
            content = docx_engine.extract_docx_text(t.file_path)
        text = template_engine.render_text(content, context)

        doc_id = uuid4().hex
        document_number = f"{t.code}-{doc_id[:8].upper()}"
        file_name = f"{document_number}.docx"
        out_dir = STORAGE / "documents" / year_month
        if t.file_path and Path(t.file_path).exists():
            out_path = docx_engine.generate_docx(t.file_path, str(out_dir / file_name), context)
        else:
            out_path = docx_engine.create_docx_from_text(text, str(out_dir / file_name))

        doc = Document(
            id=doc_id,
            transaction_id=tx.id,
            surat_id=s.id,
            template_id=t.id,
            template_version_id=tv.id if tv else None,
            document_number=document_number,
            title=f"{s.nama_surat} - {tx.judul}",
            status="generated",
            generated_file=str(out_path),
            created_by=user_id,
        )
        session.add(doc)
        session.flush()
        session.add(
            DocumentSnapshot(
                document_id=doc.id,
                template_version=t.version,
                generated_at=datetime.now(),
                data=json.dumps({"text": text, "context": context}, ensure_ascii=False),
            )
        )
        created.append(
            {
                "id": doc.id,
                "document_number": document_number,
                "title": doc.title,
                "status": doc.status,
                "generated_file": doc.generated_file,
            }
        )

    return created


@router.get("/documents")
def list_documents(
    search: str = Query(""),
    status: str = Query(""),
    transaction_id: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Document)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Document.title.like(like) | Document.document_number.like(like))
    if status:
        stmt = stmt.where(Document.status == status)
    if transaction_id:
        stmt = stmt.where(Document.transaction_id == transaction_id)
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = session.execute(
        stmt.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    result = []
    for d in rows:
        snap = session.execute(
            select(DocumentSnapshot).where(DocumentSnapshot.document_id == d.id)
        ).scalars().first()
        snapshot = {}
        if snap and snap.data:
            try:
                snapshot = json.loads(snap.data)
            except json.JSONDecodeError:
                snapshot = {}
        t = session.get(Template, d.template_id) if d.template_id else None
        tx = session.get(Transaksi, d.transaction_id) if d.transaction_id else None
        result.append(
            {
                "id": d.id,
                "transaction_id": d.transaction_id,
                "surat_id": d.surat_id,
                "template_id": d.template_id,
                "template_version_id": d.template_version_id,
                "document_number": d.document_number,
                "title": d.title,
                "status": d.status,
                "generated_file": d.generated_file,
                "created_by": d.created_by,
                "created_at": iso(d.created_at),
                "snapshot": snapshot,
                "template": {"name": t.name, "version": t.version} if t else None,
                "transaksi": {"nomor_transaksi": tx.nomor_transaksi} if tx else None,
            }
        )
    return {"data": result, "total": total, "page": page, "page_size": page_size}


@router.get("/documents/{document_id}/text")
def get_document_text(
    document_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    snap = session.execute(
        select(DocumentSnapshot).where(DocumentSnapshot.document_id == document_id)
    ).scalars().first()
    if snap and snap.data:
        try:
            data = json.loads(snap.data)
            return {"text": data.get("text", "")}
        except json.JSONDecodeError:
            pass
    return {"text": ""}


@router.get("/documents/{document_id}/editable-text")
def get_document_editable_text(
    document_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    doc = session.get(Document, document_id)
    if doc is None or not doc.generated_file:
        raise HTTPException(status_code=404, detail="File dokumen tidak ditemukan")
    path = Path(doc.generated_file)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File dokumen tidak tersedia di storage")
    return docx_engine.read_editable_text(str(path))


class DocumentContentUpdate(BaseModel):
    text: str


@router.put("/documents/{document_id}/content")
def update_document_content(
    document_id: str,
    body: DocumentContentUpdate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    doc = session.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")

    path = Path(doc.generated_file) if doc.generated_file else None
    if path is not None and path.exists():
        # Edit teks in-place: seluruh format DOCX (font, tabel, spasi) tetap.
        try:
            docx_engine.apply_editable_text(str(path), body.text)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        new_text = docx_engine.extract_docx_text(str(path))
    else:
        file_name = f"{doc.document_number}.docx"
        out_path = docx_engine.create_docx_from_text(
            body.text,
            str(STORAGE / "documents" / f"{date.today():%Y/%m}" / file_name),
        )
        doc.generated_file = str(out_path)
        new_text = body.text

    snap = session.execute(
        select(DocumentSnapshot).where(DocumentSnapshot.document_id == document_id)
    ).scalars().first()
    if snap:
        try:
            data = json.loads(snap.data)
        except json.JSONDecodeError:
            data = {}
        if not isinstance(data, dict):
            data = {}
        data["text"] = new_text
        snap.data = json.dumps(data, ensure_ascii=False)

    add_audit(session, user["id"], "EDIT_DOCUMENT", "document", document_id, f"Dokumen {doc.document_number} diedit")
    session.commit()
    return {"success": True, "document_number": doc.document_number, "text": new_text}


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    doc = session.get(Document, document_id)
    if doc is None or not doc.generated_file:
        raise HTTPException(status_code=404, detail="File dokumen tidak ditemukan")
    path = Path(doc.generated_file)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File tidak tersedia di storage")
    return FileResponse(path, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename=f"{doc.document_number}.docx")


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


@router.get("/audit-logs")
def list_audit_logs(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(AuditLog)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            AuditLog.action.like(like) | AuditLog.module.like(like) | AuditLog.detail.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = session.execute(stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return {
        "data": [
            {
                "id": a.id,
                "user_id": a.user_id,
                "user_name": session.get(User, a.user_id).name if a.user_id and session.get(User, a.user_id) else "-",
                "action": a.action,
                "module": a.module,
                "record_id": a.record_id,
                "detail": a.detail,
                "ip_address": a.ip_address,
                "created_at": iso(a.created_at),
            }
            for a in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ---------------------------------------------------------------------------
# Subscription & pembayaran
# ---------------------------------------------------------------------------


@router.get("/subscription/me")
def my_subscription(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(
        select(UserSubscription)
        .where(UserSubscription.user_id == user["id"])
        .order_by(UserSubscription.created_at.desc())
    ).scalars().all()
    def sub_dict(s: UserSubscription) -> Dict[str, Any]:
        return {
            "id": s.id,
            "plan_id": s.plan_id,
            "plan_name": s.plan_name,
            "status": s.status,
            "starts_at": iso(s.starts_at),
            "ends_at": iso(s.ends_at),
            "document_limit": s.document_limit,
            "document_used": s.document_used,
            "auto_renew": s.auto_renew,
        }

    return {
        "subscription": sub_dict(rows[0]) if rows else None,
        "history": [sub_dict(s) for s in rows],
    }


@router.get("/subscription-plans")
def list_plans(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.is_active == True).order_by(SubscriptionPlan.sort_order)  # noqa: E712
    ).scalars().all()
    return {
        "data": [
            {
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "description": p.description,
                "price": float(p.price),
                "billing_period": p.billing_period,
                "document_limit": p.document_limit,
                "is_free": p.is_free,
                "is_active": p.is_active,
                "sort_order": p.sort_order,
            }
            for p in rows
        ]
    }


@router.get("/bank-accounts")
def list_bank_accounts(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(
        select(PaymentBankAccount).where(PaymentBankAccount.is_active == True).order_by(PaymentBankAccount.sort_order)  # noqa: E712
    ).scalars().all()
    return {
        "data": [
            {
                "id": b.id,
                "bank_name": b.bank_name,
                "account_name": b.account_name,
                "account_number": b.account_number,
                "branch": b.branch,
                "is_active": b.is_active,
            }
            for b in rows
        ]
    }


@router.get("/invoices")
def list_invoices(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(
        select(SubscriptionInvoice).where(SubscriptionInvoice.user_id == user["id"]).order_by(SubscriptionInvoice.created_at.desc())
    ).scalars().all()
    return {
        "data": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "plan_id": inv.plan_id,
                "plan_name": session.get(SubscriptionPlan, inv.plan_id).name if inv.plan_id else "-",
                "amount": float(inv.amount),
                "billing_period": inv.billing_period,
                "status": inv.status,
                "due_at": iso(inv.due_at),
                "paid_at": iso(inv.paid_at),
                "created_at": iso(inv.created_at),
            }
            for inv in rows
        ]
    }


@router.get("/payments")
def list_payments(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    rows = session.execute(
        select(SubscriptionPayment).where(SubscriptionPayment.user_id == user["id"]).order_by(SubscriptionPayment.created_at.desc())
    ).scalars().all()
    return {
        "data": [
            {
                "id": p.id,
                "invoice_id": p.invoice_id,
                "bank_name": session.get(PaymentBankAccount, p.bank_account_id).bank_name if p.bank_account_id and session.get(PaymentBankAccount, p.bank_account_id) else "-",
                "amount": float(p.amount),
                "transfer_date": iso(p.transfer_date),
                "sender_name": p.sender_name,
                "reference_number": p.reference_number,
                "proof_file": p.proof_file,
                "status": p.status,
            }
            for p in rows
        ]
    }


@router.post("/invoices")
def create_invoice(
    body: InvoiceCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    plan = session.get(SubscriptionPlan, body.plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Paket tidak ditemukan")
    seq = session.execute(select(func.count()).select_from(SubscriptionInvoice)).scalar_one() + 1
    inv = SubscriptionInvoice(
        id=uuid4().hex,
        invoice_number=f"INV-{date.today().year}-{seq:06d}",
        user_id=user["id"],
        plan_id=plan.id,
        amount=plan.price,
        billing_period=plan.billing_period,
        status="pending",
        due_at=datetime.now() + timedelta(days=3),
    )
    session.add(inv)
    add_audit(session, user["id"], "CREATE_INVOICE", "invoice", inv.invoice_number, f"Invoice {plan.name} dibuat")
    session.commit()
    session.refresh(inv)
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "plan_id": inv.plan_id,
        "plan_name": plan.name,
        "amount": float(inv.amount),
        "billing_period": inv.billing_period,
        "status": inv.status,
        "due_at": iso(inv.due_at),
        "paid_at": None,
        "created_at": iso(inv.created_at),
    }


@router.post("/payments")
def create_payment(
    body: PaymentCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    inv = session.get(SubscriptionInvoice, body.invoice_id)
    if inv is None:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")
    if inv.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Invoice bukan milik Anda")
    pay = SubscriptionPayment(
        id=uuid4().hex,
        invoice_id=inv.id,
        user_id=user["id"],
        bank_account_id=body.bank_account_id,
        amount=body.amount,
        transfer_date=datetime.strptime(body.transfer_date, "%Y-%m-%d").date(),
        sender_name=body.sender_name,
        proof_file=body.proof_file,
        status="pending",
    )
    session.add(pay)
    add_audit(session, user["id"], "SUBMIT_PAYMENT", "payment", pay.id, "Bukti transfer dikirim")
    session.commit()
    return {"id": pay.id, "status": pay.status}


@router.post("/payments/{payment_id}/verify")
def verify_payment(
    payment_id: str,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    pay = session.get(SubscriptionPayment, payment_id)
    if pay is None or pay.status != "pending":
        raise HTTPException(status_code=400, detail="Pembayaran tidak dapat diverifikasi")
    inv = session.get(SubscriptionInvoice, pay.invoice_id)
    if inv is None or inv.status != "pending":
        raise HTTPException(status_code=400, detail="Invoice tidak valid")
    plan = session.get(SubscriptionPlan, inv.plan_id)
    if plan is None:
        raise HTTPException(status_code=400, detail="Paket tidak ditemukan")

    today = date.today()
    starts = today
    if inv.billing_period == "yearly":
        ends = starts.replace(year=starts.year + 1)
    else:
        last_day = calendar.monthrange(starts.year, starts.month)[1]
        ends = starts.replace(day=last_day)

    session.execute(
        text("UPDATE user_subscriptions SET status = 'expired' WHERE user_id = :uid AND status = 'active'"),
        {"uid": pay.user_id},
    )
    session.add(
        UserSubscription(
            id=uuid4().hex,
            user_id=pay.user_id,
            plan_id=plan.id,
            plan_name=plan.name,
            status="active",
            starts_at=starts,
            ends_at=ends,
            document_limit=plan.document_limit or 0,
            document_used=0,
            auto_renew=True,
        )
    )
    pay.status = "verified"
    pay.verified_by = user["id"]
    pay.verified_at = datetime.now()
    inv.status = "paid"
    inv.paid_at = datetime.now()
    add_audit(session, user["id"], "VERIFY_PAYMENT", "payment", pay.id, f"Pembayaran diverifikasi, paket {plan.name} aktif")
    session.commit()
    return {"success": True, "plan_name": plan.name}


@router.post("/payments/{payment_id}/reject")
def reject_payment(
    payment_id: str,
    body: RejectRequest,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    pay = session.get(SubscriptionPayment, payment_id)
    if pay is None or pay.status != "pending":
        raise HTTPException(status_code=400, detail="Pembayaran tidak dapat ditolak")
    pay.status = "rejected"
    pay.rejection_reason = body.reason
    add_audit(session, user["id"], "REJECT_PAYMENT", "payment", pay.id, f"Pembayaran ditolak: {body.reason}")
    session.commit()
    return {"success": True}


@router.post("/bank-accounts")
def create_bank_account(
    body: BankAccountCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    b = PaymentBankAccount(
        bank_name=body.bank_name,
        account_name=body.account_name,
        account_number=body.account_number,
        branch=body.branch,
        is_active=body.is_active,
        sort_order=0,
    )
    session.add(b)
    session.commit()
    session.refresh(b)
    return {
        "id": b.id,
        "bank_name": b.bank_name,
        "account_name": b.account_name,
        "account_number": b.account_number,
        "branch": b.branch,
        "is_active": b.is_active,
    }


@router.put("/bank-accounts/{id}")
def update_bank_account(
    id: int,
    body: BankAccountCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    b = session.get(PaymentBankAccount, id)
    if not b:
        raise HTTPException(status_code=404, detail="Rekening tidak ditemukan")
    b.bank_name = body.bank_name
    b.account_name = body.account_name
    b.account_number = body.account_number
    b.branch = body.branch
    b.is_active = body.is_active
    session.commit()
    return {
        "id": b.id,
        "bank_name": b.bank_name,
        "account_name": b.account_name,
        "account_number": b.account_number,
        "branch": b.branch,
        "is_active": b.is_active,
    }


@router.delete("/bank-accounts/{id}")
def delete_bank_account(
    id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    b = session.get(PaymentBankAccount, id)
    if not b:
        raise HTTPException(status_code=404, detail="Rekening tidak ditemukan")
    session.delete(b)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Wilayah
# ---------------------------------------------------------------------------


class WilayahCreate(BaseModel):
    kode_wilayah: str
    desa: str
    tipe_desa: str = "Desa"
    kecamatan: str
    kabupaten: str
    tipe_kabupaten: str = "Kabupaten"
    provinsi: str


class PekerjaanCreate(BaseModel):
    nama_pekerjaan: str


class GelarCreate(BaseModel):
    singkatan: str
    kepanjangan: str


class ObyekCreate(BaseModel):
    jenishak_id: Optional[int] = None
    jenis_sertipikat: str = "manual"
    nomor_hak: str = ""
    persil: str = ""
    klas: str = ""
    luas_tanah: Optional[float] = None
    luas_bangunan: Optional[float] = None
    atas_nama: str = ""
    penggunaan: str = ""
    no_surat_ukur: str = ""
    tanggal_surat_ukur: Optional[str] = None
    nib: str = ""
    nop: str = ""
    nomor_seri_blanko: str = ""
    batas_utara: str = ""
    batas_timur: str = ""
    batas_selatan: str = ""
    batas_barat: str = ""
    wilayah_id: Optional[int] = None
    edisi_id: Optional[int] = None


def serialize_wilayah(w: Wilayah) -> Dict[str, Any]:
    return {
        "id": w.id,
        "kode_wilayah": w.kode_wilayah,
        "desa": w.desa,
        "tipe_desa": w.tipe_desa,
        "kecamatan": w.kecamatan,
        "kabupaten": w.kabupaten,
        "tipe_kabupaten": w.tipe_kabupaten,
        "provinsi": w.provinsi,
    }


@router.get("/wilayah")
def list_wilayah(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Wilayah)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            Wilayah.kode_wilayah.like(like) | Wilayah.desa.like(like) | Wilayah.kecamatan.like(like) | Wilayah.kabupaten.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = session.execute(
        stmt.order_by(Wilayah.id).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    return {
        "data": [serialize_wilayah(w) for w in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/wilayah")
def create_wilayah(
    body: WilayahCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    w = Wilayah(
        kode_wilayah=body.kode_wilayah,
        desa=body.desa,
        tipe_desa=body.tipe_desa,
        kecamatan=body.kecamatan,
        kabupaten=body.kabupaten,
        tipe_kabupaten=body.tipe_kabupaten,
        provinsi=body.provinsi,
    )
    session.add(w)
    session.commit()
    session.refresh(w)
    return serialize_wilayah(w)


@router.get("/wilayah/{id}")
def get_wilayah(
    id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    w = session.get(Wilayah, id)
    if not w:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    return serialize_wilayah(w)


@router.put("/wilayah/{id}")
def update_wilayah(
    id: int,
    body: WilayahCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    w = session.get(Wilayah, id)
    if not w:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    w.kode_wilayah = body.kode_wilayah
    w.desa = body.desa
    w.tipe_desa = body.tipe_desa
    w.kecamatan = body.kecamatan
    w.kabupaten = body.kabupaten
    w.tipe_kabupaten = body.tipe_kabupaten
    w.provinsi = body.provinsi
    session.commit()
    return serialize_wilayah(w)


@router.delete("/wilayah/{id}")
def delete_wilayah(
    id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    w = session.get(Wilayah, id)
    if not w:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    session.delete(w)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Pekerjaan
# ---------------------------------------------------------------------------


@router.get("/provinsi")
def list_provinsi(
    search: str = Query(""),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Provinsi)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Provinsi.code.like(like) | Provinsi.name.like(like))
    rows = session.execute(stmt.order_by(Provinsi.code)).scalars().all()
    return {"data": [{"id": r.id, "code": r.code, "name": r.name} for r in rows]}


@router.get("/pekerjaan")
def list_pekerjaan(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Pekerjaan)
    if search:
        stmt = stmt.where(Pekerjaan.nama_pekerjaan.like(f"%{search}%"))
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(
            stmt.order_by(Pekerjaan.id).offset((page - 1) * page_size).limit(page_size)
        )
        .scalars()
        .all()
    )
    return {
        "data": [{"id": p.id, "nama_pekerjaan": p.nama_pekerjaan} for p in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/pekerjaan")
def create_pekerjaan(
    body: PekerjaanCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    p = Pekerjaan(nama_pekerjaan=body.nama_pekerjaan)
    session.add(p)
    session.commit()
    session.refresh(p)
    return {"id": p.id, "nama_pekerjaan": p.nama_pekerjaan}


@router.put("/pekerjaan/{id}")
def update_pekerjaan(
    id: int,
    body: PekerjaanCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    p = session.get(Pekerjaan, id)
    if not p:
        raise HTTPException(status_code=404, detail="Pekerjaan tidak ditemukan")
    p.nama_pekerjaan = body.nama_pekerjaan
    session.commit()
    return {"id": p.id, "nama_pekerjaan": p.nama_pekerjaan}


@router.delete("/pekerjaan/{id}")
def delete_pekerjaan(
    id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    p = session.get(Pekerjaan, id)
    if not p:
        raise HTTPException(status_code=404, detail="Pekerjaan tidak ditemukan")
    session.delete(p)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Gelar
# ---------------------------------------------------------------------------


def _serialize_gelar(g: Gelar) -> Dict[str, Any]:
    return {"id": g.id, "singkatan": g.singkatan, "kepanjangan": g.kepanjangan}


@router.get("/gelar")
def list_gelar(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Gelar)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Gelar.singkatan.like(like) | Gelar.kepanjangan.like(like))
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(
            stmt.order_by(Gelar.singkatan).offset((page - 1) * page_size).limit(page_size)
        )
        .scalars()
        .all()
    )
    return {
        "data": [_serialize_gelar(g) for g in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/gelar")
def create_gelar(
    body: GelarCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    singkatan = body.singkatan.strip()
    kepanjangan = body.kepanjangan.strip()
    if not singkatan or not kepanjangan:
        raise HTTPException(status_code=400, detail="Singkatan dan kepanjangan wajib diisi")
    duplicate = session.execute(
        select(Gelar.id).where(func.lower(Gelar.singkatan) == singkatan.lower())
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Singkatan gelar sudah digunakan")
    gelar = Gelar(singkatan=singkatan, kepanjangan=kepanjangan)
    session.add(gelar)
    session.commit()
    session.refresh(gelar)
    return _serialize_gelar(gelar)


@router.put("/gelar/{id}")
def update_gelar(
    id: int,
    body: GelarCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    gelar = session.get(Gelar, id)
    if not gelar:
        raise HTTPException(status_code=404, detail="Gelar tidak ditemukan")
    singkatan = body.singkatan.strip()
    kepanjangan = body.kepanjangan.strip()
    if not singkatan or not kepanjangan:
        raise HTTPException(status_code=400, detail="Singkatan dan kepanjangan wajib diisi")
    duplicate = session.execute(
        select(Gelar.id).where(
            func.lower(Gelar.singkatan) == singkatan.lower(), Gelar.id != id
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Singkatan gelar sudah digunakan")
    gelar.singkatan = singkatan
    gelar.kepanjangan = kepanjangan
    session.commit()
    session.refresh(gelar)
    return _serialize_gelar(gelar)


@router.delete("/gelar/{id}")
def delete_gelar(
    id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    gelar = session.get(Gelar, id)
    if not gelar:
        raise HTTPException(status_code=404, detail="Gelar tidak ditemukan")
    session.delete(gelar)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Uraian (master teks uraian)
# ---------------------------------------------------------------------------


class UraianCreate(BaseModel):
    nama_uraian: str
    isi_uraian: str = ""
    isi_singkat: str = ""
    parameters: List[str] = Field(default_factory=list)


class EdisiCreate(BaseModel):
    nama_edisi: str


def serialize_uraian(u: Uraian) -> Dict[str, Any]:
    return {
        "id": u.id,
        "nama_uraian": u.nama_uraian,
        "isi_uraian": u.isi_uraian or "",
        "isi_singkat": u.isi_singkat or "",
        "parameters": u.parameters or [],
        "created_at": iso(u.created_at),
        "updated_at": iso(u.updated_at),
    }


@router.get("/edisi")
def list_edisi(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Edisi)
    if search:
        stmt = stmt.where(Edisi.nama_edisi.like(f"%{search}%"))
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(stmt.order_by(Edisi.id).offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )
    return {
        "data": [
            {
                "id": e.id,
                "nama_edisi": e.nama_edisi,
                "created_at": iso(e.created_at),
                "updated_at": iso(e.updated_at),
            }
            for e in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/edisi/check-name")
def check_edisi_name(
    nama: str = Query(""),
    exclude_id: Optional[int] = Query(None),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    name = nama.strip()
    if not name:
        return {"exists": False}
    stmt = select(Edisi.id).where(func.lower(Edisi.nama_edisi) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Edisi.id != exclude_id)
    return {"exists": session.execute(stmt.limit(1)).first() is not None}


@router.post("/edisi")
def create_edisi(
    body: "EdisiCreate",
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.nama_edisi.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama edisi wajib diisi")
    duplicate = session.execute(
        select(Edisi.id).where(func.lower(Edisi.nama_edisi) == name.lower())
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama edisi sudah digunakan")
    e = Edisi(nama_edisi=name)
    session.add(e)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama edisi sudah digunakan") from exc
    session.refresh(e)
    return {"id": e.id, "nama_edisi": e.nama_edisi}


@router.put("/edisi/{edisi_id}")
def update_edisi(
    edisi_id: int,
    body: "EdisiCreate",
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    e = session.get(Edisi, edisi_id)
    if not e:
        raise HTTPException(status_code=404, detail="Edisi tidak ditemukan")
    name = body.nama_edisi.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama edisi wajib diisi")
    duplicate = session.execute(
        select(Edisi.id).where(func.lower(Edisi.nama_edisi) == name.lower(), Edisi.id != edisi_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama edisi sudah digunakan")
    e.nama_edisi = name
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama edisi sudah digunakan") from exc
    session.refresh(e)
    return {"id": e.id, "nama_edisi": e.nama_edisi}


@router.delete("/edisi/{edisi_id}")
def delete_edisi(
    edisi_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    e = session.get(Edisi, edisi_id)
    if not e:
        raise HTTPException(status_code=404, detail="Edisi tidak ditemukan")
    used = session.execute(
        select(func.count()).select_from(Obyek).where(Obyek.edisi_id == edisi_id)
    ).scalar_one()
    if used:
        raise HTTPException(
            status_code=400,
            detail=f"Edisi masih dipakai oleh {used} objek tanah. Ubah edisi objek tersebut dulu.",
        )
    session.delete(e)
    session.commit()
    return {"success": True}


@router.get("/uraian")
def list_uraian(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Uraian)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            Uraian.nama_uraian.like(like)
            | Uraian.isi_uraian.like(like)
            | Uraian.isi_singkat.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(stmt.order_by(Uraian.id).offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )
    return {
        "data": [serialize_uraian(u) for u in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/uraian/check-name")
def check_uraian_name(
    nama: str = Query(""),
    exclude_id: Optional[int] = Query(None),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    name = nama.strip()
    if not name:
        return {"exists": False}
    stmt = select(Uraian.id).where(func.lower(Uraian.nama_uraian) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Uraian.id != exclude_id)
    return {"exists": session.execute(stmt.limit(1)).first() is not None}


@router.get("/uraian/{uraian_id}")
def get_uraian(
    uraian_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    u = session.get(Uraian, uraian_id)
    if not u:
        raise HTTPException(status_code=404, detail="Uraian tidak ditemukan")
    return serialize_uraian(u)


@router.post("/uraian")
def create_uraian(
    body: UraianCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.nama_uraian.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama uraian wajib diisi")
    duplicate = session.execute(
        select(Uraian.id).where(func.lower(Uraian.nama_uraian) == name.lower())
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama uraian sudah digunakan")
    u = Uraian(
        nama_uraian=name,
        isi_uraian=body.isi_uraian,
        isi_singkat=body.isi_singkat,
        parameters=[p.strip() for p in body.parameters if p.strip()],
    )
    session.add(u)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama uraian sudah digunakan") from exc
    session.refresh(u)
    return serialize_uraian(u)


@router.put("/uraian/{uraian_id}")
def update_uraian(
    uraian_id: int,
    body: UraianCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    u = session.get(Uraian, uraian_id)
    if not u:
        raise HTTPException(status_code=404, detail="Uraian tidak ditemukan")
    name = body.nama_uraian.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama uraian wajib diisi")
    duplicate = session.execute(
        select(Uraian.id).where(
            func.lower(Uraian.nama_uraian) == name.lower(), Uraian.id != uraian_id
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama uraian sudah digunakan")
    u.nama_uraian = name
    u.isi_uraian = body.isi_uraian
    u.isi_singkat = body.isi_singkat
    u.parameters = [p.strip() for p in body.parameters if p.strip()]
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama uraian sudah digunakan") from exc
    session.refresh(u)
    return serialize_uraian(u)


@router.delete("/uraian/{uraian_id}")
def delete_uraian(
    uraian_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    u = session.get(Uraian, uraian_id)
    if not u:
        raise HTTPException(status_code=404, detail="Uraian tidak ditemukan")
    session.delete(u)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Jobs & Staff
# ---------------------------------------------------------------------------


class JobCreate(BaseModel):
    name: str
    description: str = ""


class StaffCreate(BaseModel):
    ektp_id: int
    job_id: Optional[int] = None
    jabatan: str = ""


def serialize_job(job: Job, session: Session) -> Dict[str, Any]:
    staff_count = session.execute(
        select(func.count()).select_from(Staff).where(Staff.job_id == job.id)
    ).scalar_one()
    return {
        "id": job.id,
        "name": job.name,
        "description": job.description or "",
        "staff_count": staff_count,
        "created_at": iso(job.created_at),
        "updated_at": iso(job.updated_at),
    }


def serialize_staff(row: Staff, session: Session) -> Dict[str, Any]:
    account = session.get(Ektp, row.ektp_id)
    job = session.get(Job, row.job_id) if row.job_id else None
    return {
        "id": row.id,
        "ektp_id": row.ektp_id,
        "job_id": row.job_id,
        "jabatan": row.jabatan or "",
        "ektp": serialize_ektp(account, session) if account else None,
        "nama": account.nama if account else "",
        "nik": account.nik if account else "",
        "pekerjaan": account.pekerjaan if account else "",
        "job": (
            {"id": job.id, "name": job.name, "description": job.description or ""}
            if job
            else None
        ),
        "created_at": iso(row.created_at),
        "updated_at": iso(row.updated_at),
    }


@router.get("/jobs")
def list_jobs(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Job)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Job.name.like(like) | Job.description.like(like))
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(
            stmt.order_by(Job.name).offset((page - 1) * page_size).limit(page_size)
        )
        .scalars()
        .all()
    )
    return {
        "data": [serialize_job(job, session) for job in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/jobs/check-name")
def check_job_name(
    name: str = Query(""),
    exclude_id: Optional[int] = Query(None),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    value = name.strip()
    if not value:
        return {"exists": False}
    stmt = select(Job.id).where(func.lower(Job.name) == value.lower())
    if exclude_id is not None:
        stmt = stmt.where(Job.id != exclude_id)
    return {"exists": session.execute(stmt.limit(1)).first() is not None}


@router.get("/jobs/{job_id}")
def get_job(
    job_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    return serialize_job(job, session)


@router.post("/jobs")
def create_job(
    body: JobCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama job wajib diisi")
    duplicate = session.execute(
        select(Job.id).where(func.lower(Job.name) == name.lower())
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama job sudah digunakan")
    job = Job(name=name, description=body.description)
    session.add(job)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama job sudah digunakan") from exc
    session.refresh(job)
    return serialize_job(job, session)


@router.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    body: JobCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama job wajib diisi")
    duplicate = session.execute(
        select(Job.id).where(func.lower(Job.name) == name.lower(), Job.id != job_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama job sudah digunakan")
    job.name = name
    job.description = body.description
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama job sudah digunakan") from exc
    session.refresh(job)
    return serialize_job(job, session)


@router.delete("/jobs/{job_id}")
def delete_job(
    job_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    used = session.execute(
        select(func.count()).select_from(Staff).where(Staff.job_id == job_id)
    ).scalar_one()
    if used:
        raise HTTPException(
            status_code=400,
            detail=f"Job masih dipakai oleh {used} staff. Ubah job staff tersebut dulu.",
        )
    session.delete(job)
    session.commit()
    return {"success": True}


@router.get("/staff")
def list_staff(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Staff).join(Ektp, Ektp.id == Staff.ektp_id)
    if search:
        like = f"%{search}%"
        stmt = stmt.outerjoin(Job, Job.id == Staff.job_id).where(
            Ektp.nama.like(like)
            | Ektp.nik.like(like)
            | Staff.jabatan.like(like)
            | Job.name.like(like)
        )
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(stmt.order_by(Staff.id).offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )
    return {
        "data": [serialize_staff(row, session) for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/staff/{staff_id}")
def get_staff(
    staff_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    row = session.get(Staff, staff_id)
    if not row:
        raise HTTPException(status_code=404, detail="Staff tidak ditemukan")
    return serialize_staff(row, session)


def _apply_staff_payload(session: Session, body: StaffCreate) -> tuple[Ektp, Optional[Job]]:
    account = session.get(Ektp, body.ektp_id)
    if account is None:
        raise HTTPException(status_code=400, detail="e-KTP tidak ditemukan")
    job = None
    if body.job_id is not None:
        job = session.get(Job, body.job_id)
        if job is None:
            raise HTTPException(status_code=400, detail="Job tidak ditemukan")
    return account, job


@router.post("/staff")
def create_staff(
    body: StaffCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    _apply_staff_payload(session, body)
    row = Staff(
        ektp_id=body.ektp_id,
        job_id=body.job_id,
        jabatan=body.jabatan.strip(),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return serialize_staff(row, session)


@router.put("/staff/{staff_id}")
def update_staff(
    staff_id: int,
    body: StaffCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    row = session.get(Staff, staff_id)
    if not row:
        raise HTTPException(status_code=404, detail="Staff tidak ditemukan")
    _apply_staff_payload(session, body)
    row.ektp_id = body.ektp_id
    row.job_id = body.job_id
    row.jabatan = body.jabatan.strip()
    session.commit()
    session.refresh(row)
    return serialize_staff(row, session)


@router.delete("/staff/{staff_id}")
def delete_staff(
    staff_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    row = session.get(Staff, staff_id)
    if not row:
        raise HTTPException(status_code=404, detail="Staff tidak ditemukan")
    session.delete(row)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Items & Sections
# ---------------------------------------------------------------------------


class ItemCreate(BaseModel):
    nama_item: str
    keterangan: str = ""


def serialize_item(item: Item) -> Dict[str, Any]:
    return {
        "id": item.id,
        "nama_item": item.nama_item,
        "keterangan": item.keterangan or "",
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


@router.get("/items")
def list_items(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    stmt = select(Item)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Item.nama_item.like(like) | Item.keterangan.like(like))
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(stmt.order_by(Item.id).offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )
    return {
        "data": [serialize_item(i) for i in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/items/check-name")
def check_item_name(
    nama: str = Query(""),
    exclude_id: Optional[int] = Query(None),
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    name = nama.strip()
    if not name:
        return {"exists": False}
    stmt = select(Item.id).where(func.lower(Item.nama_item) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Item.id != exclude_id)
    return {"exists": session.execute(stmt.limit(1)).first() is not None}


@router.post("/items")
def create_item(
    body: ItemCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.nama_item.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama item wajib diisi")
    if session.execute(select(Item.id).where(func.lower(Item.nama_item) == name.lower())).first():
        raise HTTPException(status_code=400, detail="Nama item sudah digunakan")
    item = Item(nama_item=name, keterangan=body.keterangan)
    session.add(item)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama item sudah digunakan") from exc
    session.refresh(item)
    return serialize_item(item)


@router.put("/items/{item_id}")
def update_item(
    item_id: int,
    body: ItemCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    name = body.nama_item.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama item wajib diisi")
    duplicate = session.execute(
        select(Item.id).where(func.lower(Item.nama_item) == name.lower(), Item.id != item_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama item sudah digunakan")
    item.nama_item = name
    item.keterangan = body.keterangan
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail="Nama item sudah digunakan") from exc
    session.refresh(item)
    return serialize_item(item)


@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    used = session.execute(
        select(func.count()).select_from(Section).where(Section.item_id == item_id)
    ).scalar_one()
    if used:
        raise HTTPException(
            status_code=400,
            detail=f"Item masih dipakai oleh {used} section transaksi.",
        )
    session.delete(item)
    session.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Users & Roles (administrasi)
# ---------------------------------------------------------------------------


class UserCreateBody(BaseModel):
    name: str
    username: str
    email: str = ""
    password: str
    roles: List[str] = Field(default_factory=list)
    is_active: bool = True


class UserUpdateBody(BaseModel):
    name: str
    username: str
    email: str = ""
    password: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    is_active: bool = True


def _serialize_user(user: User, session: Session) -> Dict[str, Any]:
    return user_to_dict(user, get_user_roles(session, user.id))


def _apply_user_roles(session: Session, user_id: int, role_names: List[str]) -> None:
    session.execute(text("DELETE FROM user_roles WHERE user_id = :u"), {"u": user_id})
    if not role_names:
        return
    rows = session.execute(select(Role).where(Role.name.in_(role_names))).scalars().all()
    for role in rows:
        session.add(UserRole(user_id=user_id, role_id=role.id))


class RoleCreate(BaseModel):
    name: str
    description: str = ""
    permissions: List[str] = Field(default_factory=list)


def _role_permissions(session: Session, role_id: int) -> List[str]:
    return list(
        session.execute(
            select(Permission.name)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role_id)
            .order_by(Permission.name)
        ).scalars().all()
    )


def _serialize_role(role: Role, session: Session) -> Dict[str, Any]:
    user_count = session.execute(
        select(func.count()).select_from(UserRole).where(UserRole.role_id == role.id)
    ).scalar_one()
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description or "",
        "user_count": user_count,
        "permissions": _role_permissions(session, role.id),
    }


@router.get("/roles")
def list_roles(
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    rows = session.execute(select(Role).order_by(Role.name)).scalars().all()
    return {"data": [_serialize_role(r, session) for r in rows]}


@router.get("/permissions")
def list_permissions(
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    rows = session.execute(select(Permission).order_by(Permission.module, Permission.name)).scalars().all()
    return {
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "module": p.module,
                "description": p.description or "",
            }
            for p in rows
        ]
    }


@router.post("/roles")
def create_role(
    body: RoleCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama role wajib diisi")
    if session.execute(select(Role.id).where(func.lower(Role.name) == name.lower())).first():
        raise HTTPException(status_code=400, detail="Nama role sudah digunakan")
    role = Role(name=name, description=body.description)
    session.add(role)
    session.flush()
    _apply_role_permissions(session, role.id, body.permissions)
    add_audit(session, user["id"], "CREATE_ROLE", "roles", str(role.id), f"Role {name} dibuat")
    session.commit()
    session.refresh(role)
    return _serialize_role(role, session)


@router.put("/roles/{role_id}")
def update_role(
    role_id: int,
    body: RoleCreate,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama role wajib diisi")
    duplicate = session.execute(
        select(Role.id).where(func.lower(Role.name) == name.lower(), Role.id != role_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama role sudah digunakan")
    role.name = name
    role.description = body.description
    _apply_role_permissions(session, role.id, body.permissions)
    add_audit(session, user["id"], "UPDATE_ROLE", "roles", str(role.id), f"Role {name} diperbarui")
    session.commit()
    session.refresh(role)
    return _serialize_role(role, session)


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")
    if role.name == "Super Admin":
        raise HTTPException(status_code=400, detail="Role Super Admin tidak dapat dihapus")
    used = session.execute(
        select(func.count()).select_from(UserRole).where(UserRole.role_id == role_id)
    ).scalar_one()
    if used:
        raise HTTPException(status_code=400, detail=f"Role masih dipakai oleh {used} user.")
    session.execute(text("DELETE FROM role_permissions WHERE role_id = :r"), {"r": role_id})
    session.delete(role)
    add_audit(session, user["id"], "DELETE_ROLE", "roles", str(role_id), f"Role {role.name} dihapus")
    session.commit()
    return {"success": True}


def _apply_role_permissions(session: Session, role_id: int, permission_names: List[str]) -> None:
    session.execute(text("DELETE FROM role_permissions WHERE role_id = :r"), {"r": role_id})
    if not permission_names:
        return
    rows = session.execute(
        select(Permission).where(Permission.name.in_(permission_names))
    ).scalars().all()
    for perm in rows:
        session.add(RolePermission(role_id=role_id, permission_id=perm.id))


@router.get("/users")
def list_users(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=1000),
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    stmt = select(User)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(User.name.like(like) | User.username.like(like) | User.email.like(like))
    total = session.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = (
        session.execute(stmt.order_by(User.id).offset((page - 1) * page_size).limit(page_size))
        .scalars()
        .all()
    )
    return {
        "data": [_serialize_user(u, session) for u in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/users")
def create_user(
    body: UserCreateBody,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    name = body.name.strip()
    username = body.username.strip()
    if not name or not username:
        raise HTTPException(status_code=400, detail="Nama dan username wajib diisi")
    if len(body.password or "") < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    if session.execute(select(User.id).where(User.username == username)).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    email = body.email.strip() or f"{username}@blankoppat.id"
    if session.execute(select(User.id).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="Email sudah digunakan")
    new_user = User(
        name=name,
        username=username,
        email=email,
        password_hash=hash_password(body.password),
        is_active=body.is_active,
    )
    session.add(new_user)
    session.flush()
    _apply_user_roles(session, new_user.id, body.roles)
    add_audit(session, user["id"], "CREATE_USER", "users", str(new_user.id), f"User {username} dibuat")
    session.commit()
    session.refresh(new_user)
    return _serialize_user(new_user, session)


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    body: UserUpdateBody,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    name = body.name.strip()
    username = body.username.strip()
    if not name or not username:
        raise HTTPException(status_code=400, detail="Nama dan username wajib diisi")
    duplicate = session.execute(
        select(User.id).where(User.username == username, User.id != user_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    email = body.email.strip() or target.email
    duplicate_email = session.execute(
        select(User.id).where(User.email == email, User.id != user_id)
    ).first()
    if duplicate_email:
        raise HTTPException(status_code=400, detail="Email sudah digunakan")

    target.name = name
    target.username = username
    target.email = email
    target.is_active = body.is_active
    if body.password:
        if len(body.password) < 6:
            raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
        target.password_hash = hash_password(body.password)
    _apply_user_roles(session, target.id, body.roles)
    add_audit(session, user["id"], "UPDATE_USER", "users", str(target.id), f"User {username} diperbarui")
    session.commit()
    session.refresh(target)
    return _serialize_user(target, session)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(session_dep),
    user: dict = Depends(require_admin),
):
    if int(user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus akun sendiri")
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    session.execute(text("DELETE FROM user_roles WHERE user_id = :u"), {"u": user_id})
    session.delete(target)
    add_audit(session, user["id"], "DELETE_USER", "users", str(user_id), f"User {target.username} dihapus")
    session.commit()
    return {"success": True}


@router.get("/settings")
def get_settings(session: Session = Depends(session_dep), user: dict = Depends(get_current_user)):
    return _settings_dict(session)


@router.put("/settings")
def update_settings(
    body: SettingsUpdate,
    session: Session = Depends(session_dep),
    user: dict = Depends(get_current_user),
):
    payload = dict(body.settings)
    has_wilayah = "wilayah_id" in payload
    raw_wilayah = payload.pop("wilayah_id", None)
    wilayah_id: Optional[int] = None
    if has_wilayah and raw_wilayah not in (None, "", "null"):
        try:
            wilayah_id = int(raw_wilayah)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="wilayah_id tidak valid")
        if session.get(Wilayah, wilayah_id) is None:
            raise HTTPException(status_code=400, detail="Wilayah tidak ditemukan")

    has_ektp = "ektp_id" in payload
    raw_ektp = payload.pop("ektp_id", None)
    ektp_id: Optional[int] = None
    if has_ektp and raw_ektp not in (None, "", "null"):
        try:
            ektp_id = int(raw_ektp)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="ektp_id tidak valid")
        if session.get(Ektp, ektp_id) is None:
            raise HTTPException(status_code=400, detail="e-KTP tidak ditemukan")

    for key, value in payload.items():
        row = session.execute(select(SystemSetting).where(SystemSetting.key == key)).scalar_one_or_none()
        if row:
            row.value = value
        else:
            session.add(SystemSetting(key=key, value=value))

    if has_wilayah:
        session.flush()
        session.execute(update(SystemSetting).values(wilayah_id=wilayah_id))
    if has_ektp:
        session.flush()
        session.execute(update(SystemSetting).values(ektp_id=ektp_id))

    add_audit(session, user["id"], "UPDATE_SETTINGS", "settings", detail="Pengaturan sistem diperbarui")
    session.commit()
    return _settings_dict(session)


@router.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}
