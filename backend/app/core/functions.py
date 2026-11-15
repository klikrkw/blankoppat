"""Registry function engine untuk template.

Hanya function yang terdaftar di sini yang dapat dipanggil dari template.
Arbitrary code execution tidak diizinkan.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .terbilang import (
    BULAN_ID,
    currency,
    format_date,
    format_number,
    tanggal_huruf,
    terbilang,
    terbilang_tanggal,
)


def _upper(value: Any) -> str:
    return str(value or "").upper()


def _lower(value: Any) -> str:
    return str(value or "").lower()


def _capitalize(value: Any) -> str:
    return " ".join(w.capitalize() for w in str(value or "").lower().split())


def _default(value: Any, fallback: Any = "-") -> Any:
    return fallback if value in (None, "") else value


def _sebutan(jenis_kelamin: Any, status_perkawinan: Any = "") -> str:
    jk = str(jenis_kelamin or "").strip().upper()
    if jk == "LAKI-LAKI":
        return "Tuan"
    sp = str(status_perkawinan or "").strip().upper()
    if sp == "BELUM KAWIN":
        return "Nona"
    return "Nyonya"


def _alamat_pihak(ektp: Any) -> str:
    """Format alamat pihak: alamat, RT/RW, kelurahan, kecamatan."""
    if not isinstance(ektp, dict):
        return ""
    parts = []
    alamat = str(ektp.get("alamat") or "").strip()
    if alamat:
        parts.append(alamat)
    rt = str(ektp.get("rt") or "").strip()
    rw = str(ektp.get("rw") or "").strip()
    if rt or rw:
        parts.append(f"RT {rt}/RW {rw}")
    kel = str(ektp.get("kelurahan") or "").strip()
    if kel:
        parts.append(f"Kel. {kel}")
    kec = str(ektp.get("kecamatan") or "").strip()
    if kec:
        parts.append(f"Kec. {kec}")
    return ", ".join(parts)


def _count(value: Any) -> int:
    if isinstance(value, (list, tuple, dict)):
        return len(value)
    return 0


def _umur(tanggal: Any) -> Any:
    """Hitung umur (tahun) dari tanggal lahir sampai hari ini."""
    from .terbilang import _to_date

    born = _to_date(tanggal)
    if born is None:
        return ""
    today = datetime.now().date()
    years = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return max(years, 0)


def _ektp_paragraph(ektp: Any) -> str:
    """Format data satu e-KTP menjadi paragraf pihak."""
    if not isinstance(ektp, dict):
        return ""
    from .template_engine import render_text

    template = (
        '{{sebutan($1.jenis_kelamin, $1.status_perkawinan)}} {{$1.nama}}, '
        'lahir di {{$1.tempat_lahir}}, pada tanggal '
        '{{format_date($1.tanggal_lahir, "DD-MM-YYYY")}} '
        '({{terbilang_tanggal($1.tanggal_lahir)}}), Warga Negara Indonesia, '
        '{{$1.pekerjaan}}, bertempat tinggal di Desa {{$1.wilayah.desa}} '
        'Rukun Tetangga {{$1.rt}}, Rukun Warga {{$1.rw}}, '
        'Kecamatan {{$1.wilayah.kecamatan}}, {{$1.wilayah.kabupaten}}, '
        'pemegang Kartu Tanda Penduduk Nomor : {{$1.nik}}'
    )
    return render_text(template, {"$1": ektp})


FUNCTIONS: Dict[str, Tuple[Any, str]] = {
    # name -> (callable, description)
    "terbilang": (terbilang, "Mengubah angka menjadi terbilang Bahasa Indonesia"),
    "terbilang_tanggal": (terbilang_tanggal, "Mengubah tanggal menjadi terbilang"),
    "tanggal_huruf": (tanggal_huruf, "Tanggal format huruf (10 Januari 1985)"),
    "format_date": (format_date, "Format tanggal Indonesia, mis. DD MMMM YYYY"),
    "format_datetime": (
        lambda v, fmt: format_date(v, fmt),
        "Format tanggal dan waktu",
    ),
    "format_number": (format_number, "Format angka ribuan (500.000.000)"),
    "currency": (currency, "Format mata uang, mis. Rp500.000.000"),
    "upper": (_upper, "Ubah menjadi huruf besar"),
    "lower": (_lower, "Ubah menjadi huruf kecil"),
    "capitalize": (_capitalize, "Kapitalisasi setiap kata"),
    "trim": (lambda v: str(v or "").strip(), "Hapus spasi berlebih"),
    "replace": (lambda v, a, b: str(v or "").replace(str(a), str(b)), "Ganti teks"),
    "default": (_default, "Nilai fallback jika kosong"),
    "sebutan": (_sebutan, "Sebutan Tuan/Nona/Nyonya berdasarkan jenis kelamin & status perkawinan"),
    "count": (_count, "Jumlah item dalam daftar (list)"),
    "umur": (_umur, "Umur dalam tahun dari tanggal lahir sampai hari ini"),
    "alamat_pihak": (_alamat_pihak, "Format alamat pihak: alamat, RT/RW, kelurahan, kecamatan"),
    "ektp_paragraph": (_ektp_paragraph, "Format data e-KTP menjadi paragraf pihak"),
    "concat": (lambda v, *rest: str(v or "") + "".join(str(r) for r in rest), "Gabung teks"),
    "substring": (
        lambda v, s, e=None: str(v or "")[int(s) : int(e) if e is not None else None],
        "Potong teks",
    ),
    "today": (lambda: format_date(datetime.now(), "YYYY-MM-DD"), "Tanggal hari ini"),
    "now": (lambda: format_date(datetime.now(), "DD MMMM YYYY, HH:mm"), "Waktu sekarang"),
    "year": (lambda: datetime.now().year, "Tahun berjalan"),
    "month": (lambda: BULAN_ID[datetime.now().month - 1], "Nama bulan berjalan"),
}


CUSTOM_FUNCTIONS: Dict[str, Any] = {}


def register_custom_function(name: str, implementation: str) -> None:
    """Daftarkan function custom dari database (DSL template, bukan kode bebas)."""
    def _fn(*args: Any) -> Any:
        from .template_engine import render_text  # lazy import cegah circular

        ctx = {f"${i + 1}": a for i, a in enumerate(args)}
        return render_text(implementation, ctx)

    CUSTOM_FUNCTIONS[name] = _fn


def unregister_custom_functions() -> None:
    CUSTOM_FUNCTIONS.clear()


def list_functions() -> List[dict]:
    items = [
        {"name": name, "description": desc, "built_in": True}
        for name, (_, desc) in FUNCTIONS.items()
    ]
    items.append(
        {
            "name": "section",
            "description": "Ambil detail section berdasarkan nama item (mis. section('Luas Tanah'))",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "section_short",
            "description": "Ambil short text section berdasarkan nama item (mis. section_short('Luas Tanah'))",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "staff",
            "description": "Ambil data staff berdasarkan nama job (mis. staff('PPAT').nama)",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "uraian",
            "description": "Ambil isi master uraian berdasarkan nama (mis. uraian('Uraian Jual Beli'))",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "uraian_singkat",
            "description": "Ambil isi singkat master uraian (mis. uraian_singkat('Uraian Jual Beli'))",
            "built_in": True,
        }
    )
    return sorted(items, key=lambda item: item["name"])


def resolve_path(context: Dict[str, Any], path: str) -> Any:
    """Resolve dotted path seperti `obyek.jenishak.nama_jenishak` atau `penjual[0].nama`."""
    if not path:
        return None
    clean = path.strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", clean):
        return float(clean) if "." in clean else int(clean)
    parts = re.split(r"\.", clean.replace("[", ".").replace("]", ""))
    current: Any = context
    for part in parts:
        if current is None:
            return None
        if isinstance(current, list):
            if re.fullmatch(r"-?\d+", part):
                try:
                    current = current[int(part)]
                except (IndexError, TypeError):
                    return None
                continue
            # List of dicts: `pihak.PELEPAS` -> semua item dengan role tersebut.
            # Ini membuat role dapat diakses lewat `pihak.<ROLE>` maupun
            # `peran.<ROLE>` (case-insensitive).
            if part.upper() in ("TRUE", "FALSE"):
                return None
            by_role = [
                item
                for item in current
                if isinstance(item, dict)
                and str(item.get("role", "")).upper() == part.upper()
            ]
            if by_role:
                current = by_role
                continue
            # Field lookup: `pihak.nama` -> daftar nilai field tersebut.
            values = [item.get(part) for item in current if isinstance(item, dict) and part in item]
            values = [v for v in values if v not in (None, "")]
            current = values or None
        elif isinstance(current, dict):
            if part in current:
                current = current[part]
                continue
            # Kunci tidak persis sama (mis. `peran.pelepas`): cari
            # case-insensitive agar role uppercase tetap bisa dipanggil.
            match = next((k for k in current if str(k).lower() == part.lower()), None)
            current = current[match] if match is not None else None
        else:
            return None
    return current


def _tokenize_args(raw: str) -> List[str]:
    args: List[str] = []
    depth = 0
    cur = ""
    in_string: Optional[str] = None
    for ch in raw:
        if in_string:
            cur += ch
            if ch == in_string:
                in_string = None
            continue
        if ch in "\"'“”‘’":
            if ch in "'\"‘“’”":
                in_string = {"‘": "’", "“": "”"}.get(ch, ch)
            cur += ch
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            args.append(cur.strip())
            cur = ""
            continue
        cur += ch
    if cur.strip():
        args.append(cur.strip())
    return args


def _eval_arg(arg: str, context: Dict[str, Any]) -> Any:
    a = arg.strip()
    if len(a) >= 2 and a[0] in "'\"‘“’”" and a[-1] == {"‘": "’", "“": "”"}.get(a[0], a[0]):
        return a[1:-1]
    if a.startswith("{{"):
        return eval_expr(a[2:-2].strip(), context)
    # Panggilan fungsi bersarang, mis. default(umur(x), '-') atau staff('PPAT').nama
    if re.fullmatch(r"[A-Za-z_]\w*\s*\([\s\S]*\)(?:\s*[.\[][\w\]]*)*", a):
        return eval_expr(a, context)
    return resolve_path(context, a)


def _tokens(raw_args: str, context: Dict[str, Any]) -> List[Any]:
    return [_eval_arg(a, context) for a in _tokenize_args(raw_args)]


def _render_uraian(
    context: Dict[str, Any], args: List[Any], field: str = "isi"
) -> Any:
    """Render master uraian (isi lengkap atau isi singkat) dengan banyak parameter.

    Parameter diikat berurutan: `$1`, `$2`, ... dan nama dari daftar parameter
    uraian. Dengan begitu `isi_uraian` maupun `isi_singkat` sama-sama bisa
    memakai placeholder multi parameter.
    """
    key = str(args[0]).strip() if args else ""
    data = context.get("uraian") or {}
    if not isinstance(data, dict) or not key:
        return ""
    slug = re.sub(r"[^a-z0-9]+", "_", key.lower()).strip("_")
    meta = data.get("__meta__") or {}
    entry = meta.get(key) or meta.get(slug)
    if isinstance(entry, dict):
        bindings: Dict[str, Any] = {}
        params = entry.get("parameters") or []
        for index, value in enumerate(args[1:], start=1):
            bindings[f"${index}"] = value
            if index - 1 < len(params):
                param_name = str(params[index - 1]).strip()
                if param_name:
                    bindings[param_name] = value
        template = entry.get(field) or ""
        if field == "singkat" and not str(template).strip():
            # Isi singkat belum diisi: pakai isi lengkap sebagai fallback.
            template = entry.get("isi") or ""
        from .template_engine import render_text  # lazy import

        return render_text(str(template), bindings)
    if field == "singkat":
        return ""
    if key in data:
        return data[key]
    return data.get(slug, "")


def eval_expr(expr: str, context: Dict[str, Any]) -> Any:
    """Evaluasi ekspresi template: path atau pemanggilan function."""
    trimmed = expr.strip()
    # Function diikuti akses field, mis. staff('PPAT').nama atau staff('PPAT')[0].nik
    trailing = re.fullmatch(
        r"([a-zA-Z_]\w*)\s*\(([\s\S]*)\)\s*((?:\.[A-Za-z_]\w*(?:\[\d+\])?)+)",
        trimmed,
    )
    if trailing:
        fn_name, raw_args, suffix = trailing.groups()
        value = eval_expr(f"{fn_name}({raw_args})", context)
        path = suffix.replace("[", ".").replace("]", "").strip(".")
        return resolve_path(value, path) if path else value
    match = re.fullmatch(r"([a-zA-Z_]\w*)\s*\(([\s\S]*)\)", trimmed)
    if match:
        name, raw_args = match.groups()
        if name in ("section", "section_short"):
            args = [_eval_arg(a, context) for a in _tokenize_args(raw_args)]
            key = str(args[0]).strip() if args else ""
            data = context.get(
                "sections_by_name_short" if name == "section_short" else "sections_by_name"
            ) or {}
            if not isinstance(data, dict) or not key:
                return ""
            if key in data:
                return data[key]
            lowered = {str(k).strip().lower(): v for k, v in data.items()}
            return lowered.get(key.lower(), "")
        if name == "staff":
            args = _tokens(raw_args, context)
            key = str(args[0]).strip() if args else ""
            data = context.get("staff") or {}
            if not isinstance(data, dict) or not key:
                return ""
            entry = data.get(key)
            if entry is None:
                slug = re.sub(r"[^a-z0-9]+", "_", key.lower()).strip("_")
                entry = data.get(slug)
            if entry is None:
                return ""
            if len(args) > 1 and str(args[1]).strip():
                return resolve_path(entry, str(args[1]).strip())
            return entry
        if name == "uraian":
            return _render_uraian(context, _tokens(raw_args, context), "isi")
        if name == "uraian_singkat":
            return _render_uraian(context, _tokens(raw_args, context), "singkat")
        # Custom dapat menimpa built-in agar parameter/implementasi dapat diedit dari menu.
        fn_entry = CUSTOM_FUNCTIONS.get(name) or FUNCTIONS.get(name)
        if not fn_entry:
            return None
        fn = fn_entry[0] if isinstance(fn_entry, tuple) else fn_entry
        args = [_eval_arg(a, context) for a in _tokenize_args(raw_args)]
        try:
            return fn(*args)
        except Exception:
            return None
    return resolve_path(context, trimmed)
