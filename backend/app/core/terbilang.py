"""Mesin terbilang angka & tanggal Bahasa Indonesia."""
from datetime import date, datetime
from typing import Optional, Union

ANGKA = [
    "", "satu", "dua", "tiga", "empat", "lima",
    "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas",
]
GROUP = ["", "ribu", "juta", "milyar", "triliun"]
BULAN_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]


def _satuan(n: int) -> str:
    if n < 12:
        return ANGKA[n]
    if n < 20:
        return f"{ANGKA[n - 10]} belas"
    puluh, sisa = divmod(n, 10)
    hasil = f"{ANGKA[puluh]} puluh"
    if sisa:
        hasil += f" {ANGKA[sisa]}"
    return hasil


def _ratusan(n: int) -> str:
    ratus, sisa = divmod(n, 100)
    hasil = ""
    if ratus == 1:
        hasil = "seratus"
    elif ratus > 1:
        hasil = f"{ANGKA[ratus]} ratus"
    if sisa:
        hasil = f"{hasil} {_satuan(sisa)}" if hasil else _satuan(sisa)
    return hasil


def terbilang(
    value: Union[int, float, str], satuan: Optional[str] = None
) -> str:
    """Mengubah angka menjadi terbilang Bahasa Indonesia."""
    try:
        num = float(str(value).replace(".", "").replace(",", ".")) if isinstance(value, str) else float(value)
    except (TypeError, ValueError):
        return "-"
    if num != num or num in (float("inf"), float("-inf")):
        return "-"

    negatif = num < 0
    abs_val = abs(num)
    bulat = int(abs_val)
    desimal = round(abs_val - bulat, 2)

    if bulat == 0:
        hasil = "nol"
    else:
        parts = []
        rest = bulat
        i = 0
        while rest > 0:
            chunk = rest % 1000
            if chunk:
                kata = _ratusan(chunk)
                if i == 1 and chunk == 1:
                    kata = "seribu"
                elif GROUP[i]:
                    kata = f"{kata} {GROUP[i]}"
                parts.insert(0, kata)
            rest //= 1000
            i += 1
        hasil = " ".join(parts)

    if desimal > 0:
        hasil += f" koma {_ratusan(int(round(desimal * 100)))}"

    hasil = hasil.capitalize()
    if negatif:
        hasil = f"Minus {hasil.lower()}"
    if satuan:
        hasil += f" {satuan}"
    return hasil


def _to_date(value: Union[str, date, datetime]) -> Optional[date]:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except (TypeError, ValueError):
            continue
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def format_date(value: Union[str, date, datetime], fmt: str = "DD MMMM YYYY") -> str:
    d = _to_date(value)
    if d is None:
        return "-"
    mapping = {
        "dddd": HARI_ID[d.weekday() + 1 if d.weekday() < 6 else 0],
        "MMMM": BULAN_ID[d.month - 1],
        "DD": f"{d.day:02d}",
        "MM": f"{d.month:02d}",
        "YYYY": str(d.year),
    }
    result = fmt
    for token, replacement in mapping.items():
        result = result.replace(token, replacement)
    return result


def terbilang_pihak(value: Union[int, float, str]) -> str:
    """Ubah angka menjadi urutan pihak: Pertama, Kedua, Ketiga, Keempat, ...

    Mendukung angka puluhan/ratusan/ribuan, mis. 21 -> "Kedua puluh satu",
    100 -> "Keseratus", 1000 -> "Keseribu".
    """
    try:
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return "-"
            num = float(text.replace(".", "").replace(",", "."))
        else:
            num = float(value)
    except (TypeError, ValueError):
        return "-"

    if num != num or num in (float("inf"), float("-inf")):  # NaN / inf
        return "-"
    if num != int(num) or num < 1:
        return "-"

    n = int(num)
    if n == 1:
        return "Pertama"

    words = terbilang(n).lower()
    # "satu juta" -> "sejuta" agar menjadi "Kesejuta" (bukan "Kesatu juta").
    if words.startswith("satu "):
        words = "se" + words[len("satu "):]
    hasil = f"ke{words}"
    return hasil[0].upper() + hasil[1:]


def terbilang_tanggal(value: Union[str, date, datetime]) -> str:
    d = _to_date(value)
    if d is None:
        return "-"
    return (
        f"{terbilang(d.day).lower()} {BULAN_ID[d.month - 1]} "
        f"{terbilang(d.year).lower()}"
    )


def tanggal_huruf(value: Union[str, date, datetime]) -> str:
    d = _to_date(value)
    if d is None:
        return "-"
    return f"{d.day} {BULAN_ID[d.month - 1]} {d.year}"


def format_number(value: Union[int, float, str, None]) -> str:
    if value is None or value == "":
        return "-"
    try:
        num = float(value)
    except (TypeError, ValueError):
        return "-"
    text = f"{num:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if text.endswith(",00"):
        text = text[:-3]
    return text


def currency(value: Union[int, float, str], code: str = "IDR") -> str:
    formatted = format_number(value)
    if formatted == "-":
        return "-"
    return f"Rp{formatted}" if code.upper() == "IDR" else f"{code} {formatted}"
