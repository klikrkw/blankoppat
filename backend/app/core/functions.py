"""Registry function engine untuk template.

Hanya function yang terdaftar di sini yang dapat dipanggil dari template.
Arbitrary code execution tidak diizinkan.
"""
from __future__ import annotations

import ast
import operator
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
    terbilang_pihak,
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


def _odd(value: Any) -> bool:
    try:
        return int(float(value)) % 2 != 0
    except (TypeError, ValueError):
        return False


def _even(value: Any) -> bool:
    try:
        return int(float(value)) % 2 == 0
    except (TypeError, ValueError):
        return False


def _penerima_phb(items: Any, filters: Any, field: Any = "nama") -> str:
    """Daftar pihak yang cocok dengan filter, memakai nomor urut aslinya.

    Contoh: item yang cocok pada posisi 2, 3, dan 5 menjadi
    "Pihak Kedua (A), Pihak Ketiga (B) dan Pihak Kelima (C)".
    """
    if not isinstance(items, list):
        return ""
    if isinstance(filters, dict):
        filters = [filters]
    key = str(field or "nama").strip() or "nama"
    parts: List[str] = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        if _find(item, filters) is None:
            continue
        label = f"Pihak {terbilang_pihak(index)}"
        name = item.get(key)
        if name not in (None, ""):
            label += f" ({name})"
        parts.append(label)
    if not parts:
        return ""
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + " dan " + parts[-1]


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
    "terbilang_pihak": (
        terbilang_pihak,
        "Urutan pihak: Pertama, Kedua, Ketiga, Keempat, dst.",
    ),
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
    "odd": (_odd, "True jika nomor ganjil (untuk filter where)"),
    "even": (_even, "True jika nomor genap (untuk filter where)"),
    "penerima_phb": (
        _penerima_phb,
        "Daftar pihak yang cocok dengan filter: Pihak Kedua (nama), Pihak Ketiga (nama), dst.",
    ),
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
            "name": "find",
            "description": "Cari object di dalam array object (mis. find(pihak, peran.PENJUAL))",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "eval",
            "description": "Hitung ekspresi aritmetika dengan variabel (mis. eval('custom.harga * 0.05'))",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "section",
            "description": "Ambil detail section berdasarkan nama item (mis. section('Luas Tanah'))",
            "built_in": True,
        }
    )
    items.append(
        {
            "name": "section_contains",
            "description": "Cek apakah ada section dengan nama item (mis. section_contains('Luas Tanah'))",
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


_CALC_QUOTES = {"'": "'", '"': '"', "‘": "’", "“": "”"}
_CALC_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}


def _calc_number(value: Any) -> float:
    if isinstance(value, bool) or value is None:
        raise ValueError("bukan angka")
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            raise ValueError("bukan angka")
        if "," in text:
            text = text.replace(".", "").replace(",", ".")
        elif re.fullmatch(r"-?\d{1,3}(?:\.\d{3})+", text):
            # "1.000" / "1.234.567" -> pemisah ribuan Indonesia.
            text = text.replace(".", "")
        return float(text)
    raise ValueError("bukan angka")


def _calc_path(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_calc_path(node.value)}.{node.attr}"
    if isinstance(node, ast.Subscript):
        base = _calc_path(node.value)
        sl = node.slice
        if isinstance(sl, ast.Constant) and isinstance(sl.value, (int, str)):
            return f"{base}.{sl.value}"
    raise ValueError("path tidak didukung")


def _calc_node(node: ast.AST, context: Dict[str, Any]) -> Any:
    if isinstance(node, ast.Expression):
        return _calc_node(node.body, context)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
            raise ValueError("konstanta tidak didukung")
        return node.value
    if isinstance(node, (ast.Name, ast.Attribute, ast.Subscript)):
        path = _calc_path(node)
        if path.startswith("__at_"):
            path = "@" + path[len("__at_") :]
        elif path.startswith("__arg_"):
            path = "$" + path[len("__arg_") :]
        return resolve_path(context, path)
    if isinstance(node, ast.BinOp) and type(node.op) in _CALC_BINOPS:
        left = _calc_number(_calc_node(node.left, context))
        right = _calc_number(_calc_node(node.right, context))
        if isinstance(node.op, ast.Pow) and abs(right) > 1000:
            raise ValueError("eksponen terlalu besar")
        return _CALC_BINOPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp):
        value = _calc_number(_calc_node(node.operand, context))
        if isinstance(node.op, ast.USub):
            return -value
        if isinstance(node.op, ast.UAdd):
            return value
        raise ValueError("operator tidak didukung")
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and not node.keywords:
        name = node.func.id
        args = [_calc_number(_calc_node(arg, context)) for arg in node.args]
        if name == "min":
            return min(args)
        if name == "max":
            return max(args)
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs butuh 1 argumen")
            return abs(args[0])
        if name == "round":
            if len(args) == 1:
                return round(args[0])
            if len(args) == 2:
                return round(args[0], int(args[1]))
        raise ValueError("fungsi tidak didukung")
    raise ValueError("ekspresi tidak didukung")


def _eval_calculation(expr: Any, context: Dict[str, Any]) -> Any:
    """Evaluasi ekspresi aritmetika aman dengan variabel template.

    Contoh: `eval('custom.harga_transaksi * 0.05')`, `eval('@number + 1')`.
    """
    text = str(expr if expr is not None else "").strip()
    if len(text) >= 2 and text[0] in _CALC_QUOTES and text[-1] == _CALC_QUOTES[text[0]]:
        text = text[1:-1].strip()
    if not text:
        return "-"
    # @number/$1 bukan identifier Python yang valid; ganti sementara.
    text = re.sub(r"@([A-Za-z_]\w*)", r"__at_\1", text)
    text = re.sub(r"\$(\d+)", r"__arg_\1", text)
    try:
        tree = ast.parse(text, mode="eval")
        value = _calc_number(_calc_node(tree, context))
    except Exception:  # noqa: BLE001
        return "-"
    if isinstance(value, float):
        if abs(value - round(value)) < 1e-9:
            return int(round(value))
        return round(value, 10)
    return value


def _match_value(a: Any, b: Any) -> bool:
    if a is None or b is None:
        return False
    if a == b:
        return True
    if isinstance(a, str) and isinstance(b, str):
        return a.strip().lower() == b.strip().lower()
    return str(a) == str(b)


def _find_identity(needle: Dict[str, Any], item: Dict[str, Any]) -> bool:
    """Cocokkan object berdasarkan kunci identitas yang umum dipakai."""
    pairs = (
        ("party_id", "party_id"),
        ("party_id", "pihak_id"),
        ("pihak_id", "pihak_id"),
        ("pihak_id", "party_id"),
        ("nik", "nik"),
        ("ektp_id", "ektp_id"),
        ("id", "id"),
    )
    for needle_key, item_key in pairs:
        needle_value = needle.get(needle_key)
        if needle_value in (None, ""):
            continue
        item_value = item.get(item_key)
        if item_value in (None, ""):
            continue
        if _match_value(needle_value, item_value):
            return True
    return False


def _find_by_key(items: List[Dict[str, Any]], key: str, value: Any) -> Any:
    for item in items:
        if _match_value(value, item.get(key)):
            return item
    return None


def _find(first: Any, second: Any, third: Any = "") -> Any:
    """Cari object di dalam array object.

    Bentuk yang didukung:
    - `find(object, array)`  -> cocokkan identitas, lalu seluruh field object.
    - `find(array, object)`  -> urutan dibalik tetap diterima.
    - `find(array, 'nik', '123')` -> cari berdasarkan satu field.
    """
    if isinstance(first, list) and isinstance(second, str) and third not in (None, ""):
        items = [item for item in first if isinstance(item, dict)]
        return _find_by_key(items, second, third)

    needle, haystack = first, second
    if isinstance(needle, list) and isinstance(haystack, dict):
        needle, haystack = haystack, needle
    if isinstance(haystack, dict):
        haystack = list(haystack.values())
    if not isinstance(haystack, list):
        return None

    items = [item for item in haystack if isinstance(item, dict)]
    if isinstance(needle, dict):
        for item in items:
            if _find_identity(needle, item):
                return item
        criteria = {
            key: value
            for key, value in needle.items()
            if value not in (None, "", [], {})
        }
        if criteria:
            for item in items:
                if all(_match_value(value, item.get(key)) for key, value in criteria.items()):
                    return item
        for item in items:
            if item == needle:
                return item
        return None

    if needle is None or needle == "":
        return None
    for key in ("party_id", "pihak_id", "id", "ektp_id", "nik", "nama", "name", "email"):
        for item in items:
            if _match_value(needle, item.get(key)):
                return item
    for item in items:
        if any(_match_value(needle, value) for value in item.values()):
            return item
    return None


def _section_party_match(row: Dict[str, Any], party: Any) -> bool:
    """Cocokkan baris section dengan pihak (role atau id) jika diberikan."""
    if party is None or party == "":
        return True
    if isinstance(party, dict):
        party_id = str(party.get("party_id") or party.get("pihak_id") or "").strip()
        role = str(party.get("role") or party.get("nama_pihak") or "").strip()
    else:
        party_id = ""
        role = str(party).strip()
    if party_id:
        return str(row.get("pihak_id") or "") == party_id
    if role:
        row_role = str(row.get("nama_pihak") or row.get("role") or "").strip()
        return row_role.lower() == role.lower()
    return True


def _section_contains(context: Dict[str, Any], args: List[Any]) -> bool:
    """True jika ada section dengan nama item tersebut.

    Parameter kedua opsional: role pihak (string) atau objek pihak (dict),
    mis. `section_contains('Kuasa', 'PENERIMA_KUASA')`.
    """
    key = str(args[0]).strip() if args else ""
    if not key:
        return False
    needle = key.lower()
    party = args[1] if len(args) > 1 else None

    rows = context.get("sections") or []
    if isinstance(rows, list):
        for row in rows:
            if not isinstance(row, dict):
                continue
            if str(row.get("nama_item") or "").strip().lower() != needle:
                continue
            if _section_party_match(row, party):
                return True

    if party is None or party == "":
        data = context.get("sections_by_name") or {}
        if isinstance(data, dict):
            return any(str(name).strip().lower() == needle for name in data)
        return False

    # Fallback: context hanya memuat peta section per pihak.
    if isinstance(party, dict):
        role = str(party.get("role") or party.get("nama_pihak") or "").strip()
    else:
        role = str(party).strip()
    if role:
        maps = context.get("sections_by_party") or {}
        slug = re.sub(r"[^a-z0-9]+", "_", role.lower()).strip("_")
        bucket = maps.get(role) or maps.get(slug) or {}
        if isinstance(bucket, dict):
            return any(str(name).strip().lower() == needle for name in bucket)
    return False


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
        if name == "eval":
            return _eval_calculation(raw_args, context)
        if name == "find":
            args = _tokens(raw_args, context)
            if len(args) < 2:
                return None
            return _find(*args[:3])
        if name == "section_contains":
            return _section_contains(context, _tokens(raw_args, context))
        if name in ("section", "section_short"):
            short_mode = name == "section_short"
            args = [_eval_arg(a, context) for a in _tokenize_args(raw_args)]
            key = str(args[0]).strip() if args else ""
            if not key:
                return ""
            party = args[1] if len(args) > 1 else None

            def finish(value: Any) -> Any:
                """Isi placeholder di detail section dengan data pihak."""
                if (
                    isinstance(party, dict)
                    and isinstance(value, str)
                    and value
                    and "section(" not in value
                ):
                    from .template_engine import render_text  # lazy import

                    try:
                        return render_text(value, {**party, "p": party})
                    except Exception:  # noqa: BLE001
                        return value
                return value

            if party:
                role = ""
                party_id = ""
                if isinstance(party, dict):
                    role = str(party.get("role") or "").strip()
                    party_id = str(party.get("party_id") or party.get("pihak_id") or "")
                elif party is not None:
                    role = str(party).strip()
                # Cocokkan berdasarkan id pihak (paling akurat).
                if party_id:
                    for row in context.get("sections") or []:
                        if str(row.get("pihak_id") or "") != party_id:
                            continue
                        if str(row.get("nama_item") or "").strip().lower() != key.lower():
                            continue
                        value = row.get("detail") or ""
                        if short_mode:
                            value = row.get("short_text") or value
                        return finish(value)
                maps = context.get(
                    "sections_by_party_short" if short_mode else "sections_by_party"
                ) or {}
                bucket = None
                if role:
                    bucket = maps.get(role) or maps.get(
                        re.sub(r"[^a-z0-9]+", "_", role.lower()).strip("_")
                    )
                if bucket:
                    if key in bucket:
                        return finish(bucket[key])
                    lowered = {str(k).strip().lower(): v for k, v in bucket.items()}
                    if key.lower() in lowered:
                        return finish(lowered[key.lower()])
                # Fallback 1: section umum (tanpa pihak) dengan nama item sama.
                general = context.get(
                    "sections_by_name_short" if short_mode else "sections_by_name"
                ) or {}
                lowered_general = {str(k).strip().lower(): v for k, v in general.items()}
                if key.lower() in lowered_general:
                    return finish(lowered_general[key.lower()])
                # Fallback 2: section mana pun dengan nama item sama (mis. section
                # terpasang ke pihak lain tetapi hanya ada satu untuk item itu).
                matches: List[Any] = []
                for row in context.get("sections") or []:
                    if str(row.get("nama_item") or "").strip().lower() != key.lower():
                        continue
                    value = row.get("detail") or ""
                    if short_mode:
                        value = row.get("short_text") or value
                    matches.append(value)
                return finish(matches[0]) if matches else ""
            data = context.get(
                "sections_by_name_short" if short_mode else "sections_by_name"
            ) or {}
            if not isinstance(data, dict):
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
