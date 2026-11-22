"""Template text engine: placeholder, function, conditional, dan loop.

Mendukung syntax:
    {{pihak.nama}}
    {{obyek.jenishak.nama_jenishak}}
    {{terbilang(custom.harga_transaksi, 'rupiah')}}
    {{#if obyek.jenis_sertipikat == 'elektronik'}}...{{else}}...{{/if}}
    {{#each pihak}}...{{/each}}
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

from .functions import eval_expr, resolve_path

PLACEHOLDER = re.compile(r"\{\{\s*(.+?)\s*\}\}", re.DOTALL)

# Kutip lurus dan kutip melengkung (hasil autokoreksi Word).
QUOTE_PAIRS = {"'": "'", '"': '"', "‘": "’", "’": "’", "“": "”", "”": "”"}
QUOTE_OPENERS = set(QUOTE_PAIRS)
QUOTE_CLOSERS = set(QUOTE_PAIRS.values())


def _is_quoted(value: str) -> bool:
    return (
        len(value) >= 2
        and value[0] in QUOTE_OPENERS
        and value[-1] == QUOTE_PAIRS[value[0]]
    )


def _strip_parens(expr: str) -> str:
    expr = expr.strip()
    while expr.startswith("(") and expr.endswith(")"):
        depth = 0
        quote = None
        wrapped = True
        for i, ch in enumerate(expr):
            if quote:
                if ch == quote:
                    quote = None
                continue
            if ch in "\"'":
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0 and i != len(expr) - 1:
                    wrapped = False
                    break
        if not wrapped:
            break
        expr = expr[1:-1].strip()
    return expr


def _split_top(expr: str, word: str) -> List[str]:
    """Pisah ekspresi pada operator logika level teratas (di luar kurung/string)."""
    parts: List[str] = []
    depth = 0
    quote = None
    start = 0
    i = 0
    n = len(expr)
    wl = len(word)
    while i < n:
        ch = expr[i]
        if quote:
            if ch == quote:
                quote = None
            i += 1
            continue
        if ch in "\"'":
            quote = ch
            i += 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif depth == 0 and expr[i : i + wl].lower() == word:
            before_ok = i == 0 or not (expr[i - 1].isalnum() or expr[i - 1] in "_.")
            after = i + wl
            after_ok = after >= n or not (expr[after].isalnum() or expr[after] in "_.")
            if before_ok and after_ok:
                parts.append(expr[start:i])
                start = after
                i = after
                continue
        i += 1
    parts.append(expr[start:])
    return [p.strip() for p in parts if p.strip()]


def _eval_condition(expr: str, context: Dict[str, Any]) -> bool:
    expr = _strip_parens(expr)

    or_parts = _split_top(expr, "or")
    if len(or_parts) > 1:
        return any(_eval_condition(p, context) for p in or_parts)

    and_parts = _split_top(expr, "and")
    if len(and_parts) > 1:
        return all(_eval_condition(p, context) for p in and_parts)

    if re.match(r"(?i)^not\b", expr):
        return not _eval_condition(re.sub(r"(?i)^not\b", "", expr, count=1), context)

    # Operator `contains` / `in` untuk multi select (list) atau teks.
    containment = re.fullmatch(
        r"(.+?)\s+(not\s+contains|contains|in)\s+(.+)", expr.strip(), re.IGNORECASE
    )
    if containment:
        left_expr, op, right_expr = containment.groups()
        left = _eval_arg_simple(left_expr.strip(), context)
        right = _eval_arg_simple(right_expr.strip(), context)
        op = re.sub(r"\s+", " ", op.lower())
        if op == "in":
            left, right = right, left
        haystack = left
        needle = str(right if right is not None else "").strip().lower()
        if isinstance(haystack, (list, tuple)):
            found = any(str(item).strip().lower() == needle for item in haystack)
        elif haystack is None:
            found = False
        else:
            found = needle in str(haystack).lower()
        if op == "not contains":
            return not found
        return found

    match = re.fullmatch(r"(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)", expr.strip())
    if match:
        left_expr, op, right_expr = match.groups()
        left = eval_expr(left_expr.strip(), context)
        right = _eval_arg_simple(right_expr.strip(), context)
        needle = str(right if right is not None else "").strip().lower()
        if isinstance(left, (list, tuple)):
            # Multi select: `== 'opsi'` berarti opsi ada di dalam daftar.
            if op == "==":
                return any(str(item).strip().lower() == needle for item in left)
            if op == "!=":
                return all(str(item).strip().lower() != needle for item in left)
            left = len(left)
        if isinstance(right, (list, tuple)):
            right = len(right)
        ls, rs = str(left or ""), str(right or "")
        if op == "==":
            return ls == rs
        if op == "!=":
            return ls != rs
        try:
            lf, rf = float(left), float(right)
        except (TypeError, ValueError):
            return False
        return {
            ">": lf > rf,
            "<": lf < rf,
            ">=": lf >= rf,
            "<=": lf <= rf,
        }[op]
    return bool(eval_expr(expr, context))


def _eval_arg_simple(arg: str, context: Dict[str, Any]) -> Any:
    a = arg.strip()
    if _is_quoted(a):
        return a[1:-1]
    return eval_expr(a, context)


def _matching_block(text: str, body_start: int, kind: str) -> tuple[str, int | None]:
    """Ambil isi blok dan posisi akhir setelah tag penutup (depth-aware)."""
    # Tag blok boleh berisi argumen (mis. `#if count(x)>2`, `#with a.b as c`),
    # jadi regex hanya mencocokkan nama tag, bukan hingga `}}`.
    tag_re = re.compile(
        r"\{\{\s*(#?if\b|#?each\b|#?with\b|/if\b|/each\b|/with\b"
        r"|endif\b|endeach\b|endwith\b|else\b)",
        re.IGNORECASE,
    )
    depth = 1
    position = body_start
    while position < len(text):
        match = tag_re.search(text, position)
        if not match:
            return "", None
        tag = match.group(1).lower()
        if tag.startswith("#") or tag in ("if", "each", "with"):
            depth += 1
        elif tag.startswith("/") or tag.startswith("end"):
            depth -= 1
            if depth == 0:
                # Regex hanya mencocokkan nama tag; majukan posisi
                # melewati penutup "}}" agar blok ikut terhapus utuh.
                end = match.end()
                closer = re.search(r"\}\}", text[end : end + 20])
                if closer:
                    end += closer.end()
                return text[body_start:match.start()], end
        position = match.end()
    return "", None


def render_text(template: str, context: Dict[str, Any]) -> str:
    """Render teks template menjadi teks final."""
    out = template

    # Blok diproses dari yang paling awal (outermost) agar konteks benar
    # untuk blok bersarang: #with, #if, dan #each.
    if_start_re = re.compile(r"\{\{\s*#?if\s+(.+?)\s*\}\}")
    each_start_re = re.compile(
        r"\{\{\s*#?each\s+([\w.[\]]+)(?:\s+as\s+(\w+))?(?:\s+where\s+(.+?))?\s*\}\}"
    )
    with_start_re = re.compile(r"\{\{\s*#?with\s+([\w.[\]]+)(?:\s+as\s+(\w+))?\s*\}\}")

    for _ in range(200):
        m_if = if_start_re.search(out)
        m_each = each_start_re.search(out)
        m_with = with_start_re.search(out)
        candidates = [m for m in (m_if, m_each, m_with) if m]
        if not candidates:
            break
        first = min(candidates, key=lambda m: m.start())

        if first is m_with:
            body, close = _matching_block(out, first.end(), "with")
            if close is None:
                break
            target = resolve_path(context, first.group(1).strip())
            alias = first.group(2)
            if isinstance(target, list):
                # Target list: iterasi otomatis seperti #each agar
                # {{@index}} dan field item dapat dipakai di dalamnya.
                inner = ""
                total = len(target)
                for idx, item in enumerate(target):
                    merged = {
                        **context,
                        "index": idx + 1,
                        "@index": idx,
                        "@number": idx + 1,
                        "@first": idx == 0,
                        "@last": idx == total - 1,
                        "@count": total,
                        "this": item,
                    }
                    if alias:
                        merged[alias] = item
                    if isinstance(item, dict):
                        merged.update(item)
                    inner += render_text(body, merged)
                out = out[: first.start()] + inner + out[close:]
            elif target is None:
                # Target tidak ada: blok #with dilewati sepenuhnya
                # (jangan merender isi dengan konteks induk agar tidak "-").
                out = out[: first.start()] + out[close:]
            else:
                if alias:
                    merged = {**context, alias: target, "this": target}
                elif isinstance(target, dict):
                    merged = {**context, **target}
                else:
                    merged = {**context, "this": target}
                out = out[: first.start()] + render_text(body, merged) + out[close:]
            continue

        if first is m_each:
            body, close = _matching_block(out, first.end(), "each")
            if close is None:
                break
            path, alias, where_expr = first.groups()
            arr = resolve_path(context, path.strip())
            inner = ""
            if isinstance(arr, list):
                # Siapkan konteks per item (dipakai untuk filter `where` dan render).
                prepared = []
                for idx, item in enumerate(arr):
                    merged = {
                        **context,
                        "index": idx + 1,
                        "@index": idx,
                        "@number": idx + 1,
                        "@original_number": idx + 1,
                        "this": item,
                    }
                    if alias:
                        merged[alias] = item
                    if isinstance(item, dict):
                        merged.update(item)
                    prepared.append((idx, item, merged))

                if where_expr and where_expr.strip():
                    prepared = [
                        entry for entry in prepared
                        if _eval_condition(where_expr.strip(), entry[2])
                    ]

                total = len(prepared)
                for pos, (idx, item, merged) in enumerate(prepared):
                    merged = {
                        **merged,
                        "index": idx + 1,
                        "@number": pos + 1,
                        "@index": idx,
                        "@original_number": idx + 1,
                        "@first": pos == 0,
                        "@last": pos == total - 1,
                        "@count": total,
                    }
                    inner += render_text(body, merged)
            out = out[: first.start()] + inner + out[close:]
            continue

        # #if
        body, close = _matching_block(out, first.end(), "if")
        if close is None:
            break
        exprs: List[str] = [first.group(1).strip()]
        bodies: List[str] = []
        cursor = 0
        depth = 0
        position = 0
        # Cocokkan seluruh tag `{{...}}`, bukan hanya nama tag, agar nested
        # `#if` dengan argumen (mis. `{{#if @count>1}}`) ikut dihitung.
        tag_re = re.compile(r"\{\{([\s\S]*?)\}\}")
        while position < len(body):
            token = tag_re.search(body, position)
            if not token:
                break
            absolute = token.start()
            tag = token.group(1).strip()
            position = token.end()
            if not re.match(r"(?i)^(#?if\b|/if\b|endif\b|else\b)", tag):
                continue
            if re.match(r"(?i)^#?if\b", tag):
                depth += 1
            elif re.match(r"(?i)^(/if|endif)\b", tag):
                depth -= 1
            elif depth == 0:
                bodies.append(body[cursor:absolute])
                cursor = token.end()
                if tag.startswith("else if"):
                    exprs.append(tag[7:].strip())
                else:
                    exprs.append("__else__")
        bodies.append(body[cursor:])

        chosen = ""
        for expr, branch in zip(exprs, bodies):
            if expr == "__else__" or _eval_condition(expr, context):
                chosen = branch
                break
        out = out[: first.start()] + render_text(chosen, context) + out[close:]

    # Simple placeholders & functions
    def repl(match: re.Match) -> str:
        expr = match.group(1).strip()
        if expr.startswith(("#", "/")):
            return ""
        value = eval_expr(expr, context)
        if value in (None, ""):
            return "-"
        if isinstance(value, (list, tuple)):
            return ", ".join(str(item) for item in value)
        return str(value)

    return PLACEHOLDER.sub(repl, out)


def extract_variables(template: str) -> List[str]:
    """Daftar variable path yang digunakan template."""
    variables: List[str] = []
    for match in PLACEHOLDER.finditer(template):
        expr = match.group(1).strip()
        if expr.startswith(("#", "/")):
            continue
        if re.fullmatch(r"[\w.[\]]+", expr) and not re.search(r"\(", expr):
            variables.append(expr)
    return sorted(set(variables))
