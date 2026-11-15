"""DOCX engine berbasis manipulasi XML langsung (format-preserving).

Tidak memakai python-docx untuk membuka/menyimpan template hasil render,
melainkan mem-patch teks `<w:t>` pada XML di dalam zip DOCX. Dengan begitu
semua properti paragraf (indent, first-line indent, alignment, spacing),
style, numbering, header/footer, dan bagian lain TIDAK berubah — hanya teks
placeholder yang diganti.
"""
from __future__ import annotations

import copy
import difflib
import re
import zipfile
from pathlib import Path
from typing import Any, Dict

from lxml import etree

from .template_engine import render_text

import re

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
TAG_P = f"{{{W_NS}}}p"
TAG_T = f"{{{W_NS}}}t"
XML_SPACE = f"{{http://www.w3.org/XML/1998/namespace}}space"
PLACEHOLDER_RE = re.compile(r"\{\{.*?\}\}", re.DOTALL)
EACH_START_RE = re.compile(
    r"\{\{\s*#?each\s+([\w.[\]]+)(?:\s+as\s+(\w+))?(?:\s+where\s+(.+?))?\s*\}\}"
)
EACH_END_RE = re.compile(r"\{\{\s*(?:/each|endeach)\s*\}\}?")
IF_START_RE = re.compile(r"\{\{\s*#?if\s+(.+?)\s*\}\}")
IF_ELSE_RE = re.compile(r"\{\{\s*else\s*\}\}")
IF_END_RE = re.compile(r"\{\{\s*/(?:if|endif)\s*\}\}?")
WITH_START_RE = re.compile(r"\{\{\s*#?with\s+([\w.[\]]+)(?:\s+as\s+(\w+))?\s*\}\}")
WITH_END_RE = re.compile(r"\{\{\s*(?:/with|endwith)\s*\}\}?")


def _with_context(target: Any, context: Dict[str, Any], alias: str | None = None) -> Dict[str, Any]:
    if alias:
        return {**context, alias: target, "this": target}
    if isinstance(target, dict):
        return {**context, **target}
    if target is not None:
        return {**context, "this": target}
    return {**context}


def _expand_with_blocks(root: Any, context: Dict[str, Any]) -> None:
    """Proses `{{#with path}}...{{/with}}` (satu atau banyak paragraf)."""
    from .functions import resolve_path

    for parent in root.iter():
        children = list(parent)
        i = 0
        while i < len(children):
            if children[i].tag != TAG_P:
                i += 1
                continue
            start_text = _paragraph_text(children[i])
            start = WITH_START_RE.search(start_text)
            if not start:
                i += 1
                continue

            # Lewati jika #with ini berada di dalam blok #each/#if yang belum ditutup
            # di paragraf yang sama (biar blok luarnya diproses lebih dulu).
            prefix_text = start_text[: start.start()]
            open_each = len(EACH_START_RE.findall(prefix_text)) - len(EACH_END_RE.findall(prefix_text))
            open_if = len(IF_START_RE.findall(prefix_text)) - len(IF_END_RE.findall(prefix_text))
            if open_each > 0 or open_if > 0:
                i += 1
                continue

            # Kasus satu paragraf: {{#with x}}body{{/with}}
            same_end = WITH_END_RE.search(start_text, start.end())
            if same_end:
                target = resolve_path(context, start.group(1))
                if target is None:
                    # Selaras dengan template engine teks: blok #with tanpa
                    # target dilewati, bukan dirender dengan placeholder "-".
                    _replace_text_range(children[i], start.start(), same_end.end(), "")
                    continue
                merged = _with_context(target, context, start.group(2))
                body = start_text[start.end() : same_end.start()]
                value = render_text(body, merged)
                _replace_text_range(children[i], start.start(), same_end.end(), value)
                continue

            depth = 1
            end = None
            for j in range(i + 1, len(children)):
                if children[j].tag != TAG_P:
                    continue
                text = _paragraph_text(children[j])
                depth += len(WITH_START_RE.findall(text))
                depth -= len(WITH_END_RE.findall(text))
                if depth <= 0:
                    end = j
                    break
            if end is None:
                i += 1
                continue

            target = resolve_path(context, start.group(1))
            body_nodes = [copy.deepcopy(n) for n in children[i + 1 : end]]
            insert_at = parent.index(children[i])
            for node in children[i : end + 1]:
                parent.remove(node)
            if target is None:
                # Tanpa target: blok dilewati (konsisten dengan template engine teks).
                children = list(parent)
                i = insert_at
                continue
            merged = _with_context(target, context, start.group(2))

            temp = etree.Element("blanko-with")
            for node in body_nodes:
                temp.append(node)
            for _ in range(3):
                before = etree.tostring(temp)
                _expand_with_blocks(temp, merged)
                _expand_if_blocks(temp, merged)
                _expand_each_paragraphs(temp, merged)
                if etree.tostring(temp) == before:
                    break
            for paragraph in temp.iter(TAG_P):
                _expand_same_paragraph_blocks(paragraph, merged)
                _patch_paragraph(_own_t_nodes(paragraph), merged)
                _normalize_paragraph_inline(paragraph)

            for node in list(temp):
                parent.insert(insert_at, node)
                insert_at += 1
            children = list(parent)
            i = insert_at


IF_ANY_RE = re.compile(r"\{\{\s*(#if\b|/(?:if|endif)\b|else\b)", re.IGNORECASE)


def _scan_if_block(children: list, start_index: int) -> tuple[int | None, int | None]:
    """Cari paragraf penutup `{{/if}}` dan `{{else}}` level teratas (nesting-aware)."""
    depth = 0
    else_index: int | None = None
    for j in range(start_index, len(children)):
        if children[j].tag != TAG_P:
            continue
        text = _paragraph_text(children[j])
        for match in IF_ANY_RE.finditer(text):
            tag = match.group(1).lower()
            if tag.startswith("#if"):
                depth += 1
            elif tag.startswith("/"):
                depth -= 1
                if depth == 0:
                    return j, else_index
            elif else_index is None and depth == 1:
                else_index = j
    return None, None


def _expand_if_blocks(root: Any, context: Dict[str, Any]) -> None:
    """Pilih cabang if DOCX sebelum engine memperluas each (mendukung nested if)."""
    from .template_engine import _eval_condition

    for parent in root.iter():
        children = list(parent)
        i = 0
        while i < len(children):
            if children[i].tag != TAG_P:
                i += 1
                continue
            start = IF_START_RE.search(_paragraph_text(children[i]))
            if not start:
                i += 1
                continue

            end, else_index = _scan_if_block(children, i)
            if end is None or end == i:
                # Blok satu paragraf ditangani _expand_same_paragraph_ifs.
                i += 1
                continue

            condition_true = _eval_condition(start.group(1), context)
            if condition_true:
                first, last = i + 1, else_index if else_index is not None else end
            elif else_index is not None:
                first, last = else_index + 1, end
            else:
                first, last = end, end

            selected = [copy.deepcopy(n) for n in children[first:last]]
            for node in children[i : end + 1]:
                parent.remove(node)
            insert_at = i
            for node in selected:
                parent.insert(insert_at, node)
                insert_at += 1
            children = list(parent)
            i = insert_at


def _paragraph_text(paragraph: Any) -> str:
    return "".join(node.text or "" for node in _own_t_nodes(paragraph))


def _expand_each_paragraphs(root: Any, context: Dict[str, Any]) -> None:
    """Expand `#each` blocks yang tersebar antar paragraf."""
    from .functions import resolve_path

    for parent in root.iter():
        children = list(parent)
        i = 0
        while i < len(children):
            if children[i].tag != TAG_P:
                i += 1
                continue
            start_text = _paragraph_text(children[i])
            start = EACH_START_RE.search(start_text)
            if not start:
                i += 1
                continue
            # Cari paragraf penutup `{{/each}}`.
            end = None
            for j in range(i, len(children)):
                if children[j].tag == TAG_P and EACH_END_RE.search(_paragraph_text(children[j])):
                    end = j
                    break
            if end is None:
                i += 1
                continue

            items = resolve_path(context, start.group(1))
            alias = start.group(2)
            where_expr = start.group(3)

            if end == i:
                # Start & end di paragraf yang sama — biarkan _patch_paragraph.
                i += 1
                continue

            start_txt = start_text
            end_txt = _paragraph_text(children[end])
            end_m = EACH_END_RE.search(end_txt)
            prefix = start_txt[: start.start()]
            body_inline = start_txt[start.end():]
            before_end = end_txt[: end_m.start()]
            suffix = end_txt[end_m.end():]
            body_nodes = [children[k] for k in range(i + 1, end)]

            start_para = children[i]
            end_para = children[end]
            insert_at = parent.index(start_para)
            for node in children[i : end + 1]:
                parent.remove(node)

            def patch_in_place(node: Any, ctx: Dict[str, Any]) -> Any:
                clone = copy.deepcopy(node)
                # Patch per paragraf (bukan per node) agar placeholder di dalam
                # tabel/textbox ikut terisi dengan konteks item.
                for paragraph in clone.iter(TAG_P):
                    _expand_same_paragraph_blocks(paragraph, ctx)
                    _patch_paragraph(_own_t_nodes(paragraph), ctx)
                return clone

            # Paragraf prefix (teks sebelum {{#each}}) — marker hilang in-place,
            # format run & tab stop tetap.
            if prefix.strip() and not body_inline.strip():
                parent.insert(insert_at, patch_in_place(start_para, context))
                insert_at += 1

            if isinstance(items, list):
                from .template_engine import _eval_condition

                prepared = []
                for idx, item in enumerate(items):
                    item_context = {
                        **context,
                        "index": idx + 1,
                        "@index": idx,
                        "@number": idx + 1,
                        "this": item,
                    }
                    if alias:
                        item_context[alias] = item
                    if isinstance(item, dict):
                        item_context.update(item)
                    prepared.append((idx, item_context))
                if where_expr and where_expr.strip():
                    prepared = [
                        entry for entry in prepared
                        if _eval_condition(where_expr.strip(), entry[1])
                    ]
                total = len(prepared)
                for pos, (idx, item_context) in enumerate(prepared):
                    item_context.update(
                        {
                            "index": idx + 1,
                            "@number": pos + 1,
                            "@index": idx,
                            "@first": pos == 0,
                            "@last": pos == total - 1,
                            "@count": total,
                        }
                    )

                    if body_nodes:
                        # Body antar paragraf: clone per paragraf + patch in-place.
                        # Struktur run (label, w:tab, tab stop, numbering) dipertahankan.
                        for b_idx, body in enumerate(body_nodes):
                            clone = patch_in_place(body, item_context)
                            if b_idx == 0 and body_inline.strip():
                                inline_text = render_text(body_inline, item_context)
                                t_nodes = _own_t_nodes(clone)
                                if t_nodes:
                                    t_nodes[0].text = inline_text + (t_nodes[0].text or "")
                            if b_idx == len(body_nodes) - 1 and before_end.strip():
                                end_text = render_text(before_end, item_context)
                                t_nodes = _own_t_nodes(clone)
                                if t_nodes:
                                    t_nodes[-1].text = (t_nodes[-1].text or "") + end_text
                            parent.insert(insert_at, clone)
                            insert_at += 1
                    else:
                        # Body inline pada paragraf start/end — fallback render teks.
                        item_template = body_inline or before_end
                        rendered = render_text(item_template, item_context)
                        lines = rendered.split("\n") if rendered else [""]
                        if prefix:
                            lines[0] = prefix + lines[0]
                        proto = start_para if body_inline else end_para
                        for line in lines:
                            clone = copy.deepcopy(proto)
                            _set_paragraph_text(clone, line)
                            parent.insert(insert_at, clone)
                            insert_at += 1
            else:
                if prefix.strip() or suffix.strip():
                    clone = copy.deepcopy(start_para)
                    _set_paragraph_text(clone, prefix + suffix)
                    parent.insert(insert_at, clone)
                    insert_at += 1

            # Paragraf suffix (teks setelah {{/each}}).
            if suffix.strip():
                parent.insert(insert_at, patch_in_place(end_para, context))
                insert_at += 1

            children = list(parent)
            i = insert_at


def _set_paragraph_text(paragraph: Any, text: str) -> None:
    """Set teks paragraf pada run pertama, kosongkan run lain (format paragraf tetap)."""
    t_nodes = _own_t_nodes(paragraph)
    if not t_nodes:
        return
    t_nodes[0].text = text
    t_nodes[0].set(XML_SPACE, "preserve")
    for node in t_nodes[1:]:
        node.text = ""


def _patch_xml_text_in_root(root: Any, context: Dict[str, Any]) -> None:
    for p in root.iter(TAG_P):
        _patch_paragraph(_own_t_nodes(p), context)


def _normalize_text_tabs(t_nodes: list) -> None:
    """Simpan tab sebagai elemen Word w:tab agar tab stop aktif."""
    for node in list(t_nodes):
        text = node.text or ""
        if "\t" not in text:
            continue
        parts = text.split("\t")
        node.text = parts[0]
        parent = node.getparent()
        insert_at = parent.index(node) + 1
        for part in parts[1:]:
            run = node.getparent()
            tab = etree.Element(f"{{{W_NS}}}tab")
            run.insert(insert_at, tab)
            insert_at += 1
            text_node = etree.Element(TAG_T)
            text_node.set(XML_SPACE, "preserve")
            text_node.text = part
            run.insert(insert_at, text_node)
            insert_at += 1


def _write_atoms(paragraph: Any, atoms: list[tuple[str, Any]]) -> None:
    """Tulis atom (char, rPr) ke paragraf sebagai run, pertahankan format."""
    current_key = None
    current_run = None
    current_t = None
    for char, rpr in atoms:
        key = etree.tostring(rpr) if rpr is not None else b""
        if current_run is None or key != current_key:
            current_run = etree.SubElement(paragraph, f"{{{W_NS}}}r")
            if rpr is not None:
                current_run.append(copy.deepcopy(rpr))
            current_key = key
            current_t = None
        if char == "\t":
            etree.SubElement(current_run, f"{{{W_NS}}}tab")
            current_t = None
        elif char in ("\n", "\v"):
            etree.SubElement(current_run, f"{{{W_NS}}}br")
            current_t = None
        else:
            if current_t is None:
                current_t = etree.SubElement(current_run, TAG_T)
                current_t.set(XML_SPACE, "preserve")
                current_t.text = ""
            current_t.text = (current_t.text or "") + char


def _split_atoms(paragraph: Any) -> list[tuple[str, Any]]:
    """Atom paragraf: newline data tetap '\n', line break lama jadi '\v'."""
    atoms: list[tuple[str, Any]] = []
    for run in paragraph.findall(f"{{{W_NS}}}r"):
        rpr = run.find(f"{{{W_NS}}}rPr")
        rpr_copy = copy.deepcopy(rpr) if rpr is not None else None
        for node in run:
            if node.tag == TAG_T:
                for char in node.text or "":
                    atoms.append((char, rpr_copy))
            elif node.tag == f"{{{W_NS}}}tab":
                atoms.append(("\t", rpr_copy))
            elif node.tag in (f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
                atoms.append(("\v", rpr_copy))
    return atoms


def _split_paragraph_newlines(paragraph: Any) -> bool:
    """Pecah paragraf pada newline menjadi paragraf baru dengan pPr sama.

    Dengan begitu first-line indent / hanging indent tetap berlaku untuk
    setiap baris hasil simbol Enter.
    """
    allowed = {TAG_P, f"{{{W_NS}}}pPr", f"{{{W_NS}}}r", f"{{{W_NS}}}proofErr",
               f"{{{W_NS}}}bookmarkStart", f"{{{W_NS}}}bookmarkEnd"}
    if any(child.tag not in allowed for child in paragraph):
        # Ada hyperlink/field/drawing: jangan pecah paragraf, cukup <w:br/>.
        for node in _own_t_nodes(paragraph):
            if not node.text or "\n" not in node.text:
                continue
            parts = node.text.split("\n")
            node.text = parts[0]
            run = node.getparent()
            insert_at = list(run).index(node) + 1
            for part in parts[1:]:
                br = etree.Element(f"{{{W_NS}}}br")
                run.insert(insert_at, br)
                insert_at += 1
                text_node = etree.Element(TAG_T)
                text_node.set(XML_SPACE, "preserve")
                text_node.text = part
                run.insert(insert_at, text_node)
                insert_at += 1
        return False

    atoms = _split_atoms(paragraph)
    if not any(char == "\n" for char, _ in atoms):
        return False

    segments: list[list[tuple[str, Any]]] = [[]]
    for char, rpr in atoms:
        if char == "\n":
            segments.append([])
        else:
            segments[-1].append((char, rpr))

    # Buang segmen kosong agar tidak muncul baris kosong setelah Enter.
    meaningful = [
        segment
        for segment in segments
        if any(char.strip() for char, _ in segment)
    ]

    parent = paragraph.getparent()
    insert_at = list(parent).index(paragraph)

    if not meaningful:
        # Paragraf hanya berisi line break → hapus agar tidak meninggalkan baris kosong.
        parent.remove(paragraph)
        return True

    for run in paragraph.findall(f"{{{W_NS}}}r"):
        paragraph.remove(run)
    _write_atoms(paragraph, meaningful[0])
    insert_at += 1

    for segment in meaningful[1:]:
        clone = etree.Element(TAG_P)
        ppr = paragraph.find(f"{{{W_NS}}}pPr")
        if ppr is not None:
            clone.append(copy.deepcopy(ppr))
        _write_atoms(clone, segment)
        parent.insert(insert_at, clone)
        insert_at += 1
    return True


def _normalize_paragraph_inline(paragraph: Any) -> None:
    _normalize_text_tabs(_own_t_nodes(paragraph))
    _split_paragraph_newlines(paragraph)


def _replace_text_range(paragraph: Any, start: int, end: int, value: str) -> bool:
    """Ganti rentang teks pada paragraf tanpa mengubah run/format lain."""
    t_nodes = _own_t_nodes(paragraph)
    if not t_nodes:
        return False
    texts = [node.text or "" for node in t_nodes]
    full_len = sum(len(text) for text in texts)
    if start < 0 or end > full_len or start >= end:
        return False

    offsets: list[tuple[int, int]] = []
    pos = 0
    for text in texts:
        offsets.append((pos, pos + len(text)))
        pos += len(text)

    def node_for(char_pos: int) -> int:
        for index, (s, e) in enumerate(offsets):
            if s <= char_pos < e:
                return index
        return len(t_nodes) - 1 if char_pos >= pos else 0

    si = node_for(start)
    ei = node_for(end - 1)
    s_off = start - offsets[si][0]
    e_off = (end - 1) - offsets[ei][0] + 1
    if si == ei:
        node_text = t_nodes[si].text or ""
        t_nodes[si].text = node_text[:s_off] + value + node_text[e_off:]
    else:
        t_nodes[si].text = (t_nodes[si].text or "")[:s_off] + value
        for k in range(si + 1, ei):
            t_nodes[k].text = ""
        t_nodes[ei].text = (t_nodes[ei].text or "")[e_off:]

    for node in t_nodes:
        if node.text and (node.text.startswith(" ") or node.text.endswith(" ") or "\t" in node.text):
            node.set(XML_SPACE, "preserve")
    return True


def _find_top_level_else(inner: str) -> int:
    """Posisi `{{else}}` level teratas di dalam blok if, atau -1."""
    depth = 0
    position = 0
    while position < len(inner):
        next_if = IF_START_RE.search(inner, position)
        next_end = IF_END_RE.search(inner, position)
        next_else = IF_ELSE_RE.search(inner, position)
        candidates = [(m.start(), "if", m) for m in [next_if] if m]
        candidates += [(m.start(), "end", m) for m in [next_end] if m]
        candidates += [(m.start(), "else", m) for m in [next_else] if m]
        if not candidates:
            break
        pos, kind, match = min(candidates, key=lambda item: item[0])
        if kind == "if":
            depth += 1
            position = match.end()
        elif kind == "end":
            if depth == 0:
                break
            depth -= 1
            position = match.end()
        else:
            if depth == 0:
                return pos
            position = match.end()
    return -1


def _expand_same_paragraph_ifs(paragraph: Any, context: Dict[str, Any]) -> bool:
    """Proses `{{#if}}...{{else}}...{{/if}}` yang berada dalam satu paragraf."""
    from .template_engine import _eval_condition

    changed = False
    for _ in range(50):
        text = _paragraph_text(paragraph)
        start = IF_START_RE.search(text)
        if not start:
            break

        depth = 1
        cursor = start.end()
        end_match = None
        while True:
            next_if = IF_START_RE.search(text, cursor)
            next_end = IF_END_RE.search(text, cursor)
            if not next_end:
                break
            if next_if and next_if.start() < next_end.start():
                depth += 1
                cursor = next_if.end()
                continue
            depth -= 1
            if depth == 0:
                end_match = next_end
                break
            cursor = next_end.end()
        if not end_match:
            break

        inner = text[start.end() : end_match.start()]
        else_at = _find_top_level_else(inner)
        if else_at >= 0:
            if_body = inner[:else_at]
            else_body = IF_ELSE_RE.sub("", inner[else_at:], count=1)
        else:
            if_body, else_body = inner, ""

        chosen = if_body if _eval_condition(start.group(1), context) else else_body
        value = render_text(chosen, context)
        if not _replace_text_range(paragraph, start.start(), end_match.end(), value):
            break
        changed = True

    return changed


def _expand_same_paragraph_eachs(paragraph: Any, context: Dict[str, Any]) -> bool:
    """Proses `{{#each}}...{{/each}}` yang berada dalam satu paragraf."""
    changed = False
    for _ in range(50):
        text = _paragraph_text(paragraph)
        start = EACH_START_RE.search(text)
        if not start:
            break

        depth = 1
        cursor = start.end()
        end_match = None
        while True:
            next_start = EACH_START_RE.search(text, cursor)
            next_end = EACH_END_RE.search(text, cursor)
            if not next_end:
                break
            if next_start and next_start.start() < next_end.start():
                depth += 1
                cursor = next_start.end()
                continue
            depth -= 1
            if depth == 0:
                end_match = next_end
                break
            cursor = next_end.end()
        if not end_match:
            break

        block = text[start.start() : end_match.end()]
        value = render_text(block, context)
        if not _replace_text_range(paragraph, start.start(), end_match.end(), value):
            break
        changed = True
    return changed



def _same_paragraph_span(text: str, body_start: int, kind: str) -> tuple[int, int] | None:
    """Cari posisi penutup blok (if/each/with) di paragraf yang sama."""
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
            return None
        tag = match.group(1).lower()
        if tag.startswith("#") or tag in ("if", "each", "with"):
            depth += 1
        elif tag.startswith("/") or tag.startswith("end"):
            depth -= 1
            if depth == 0:
                end = match.end()
                closer = re.search(r"\}\}", text[end : end + 30])
                if closer:
                    end += closer.end()
                return match.start(), end
        position = match.end()
    return None


def _top_level_else(body: str) -> int:
    depth = 0
    position = 0
    while position < len(body):
        token = re.search(r"\{\{\s*(#if\b|/if\b|endif\b|else\b)\s*\}\}?", body[position:])
        if not token:
            return -1
        absolute = position + token.start()
        tag = token.group(1).lower()
        if tag.startswith("#if"):
            depth += 1
        elif tag.startswith("/"):
            depth -= 1
        elif depth == 0:
            return absolute
        position += token.end()
    return -1


def _expand_same_paragraph_blocks(paragraph: Any, context: Dict[str, Any]) -> bool:
    """Proses blok if/each/with dalam satu paragraf, dari yang paling awal."""
    from .functions import resolve_path

    changed = False
    for _ in range(100):
        text = _paragraph_text(paragraph)
        candidates = []
        m_with = WITH_START_RE.search(text)
        m_if = IF_START_RE.search(text)
        m_each = EACH_START_RE.search(text)
        for kind, match in (("with", m_with), ("if", m_if), ("each", m_each)):
            if match:
                candidates.append((match.start(), kind, match))
        if not candidates:
            break
        _, kind, match = min(candidates, key=lambda item: item[0])

        if kind == "if":
            span = _same_paragraph_span(text, match.end(), "if")
            if span is None:
                break
            body = text[match.end() : span[0]]
            else_at = _top_level_else(body)
            if else_at >= 0:
                if_body, else_body = body[:else_at], body[else_at:]
                else_body = re.sub(r"\{\{\s*else\s*\}\}?", "", else_body, count=1)
            else:
                if_body, else_body = body, ""
            from .template_engine import _eval_condition

            chosen = if_body if _eval_condition(match.group(1), context) else else_body
            value = render_text(chosen, context)
            end = span[1]
        elif kind == "each":
            span = _same_paragraph_span(text, match.end(), "each")
            if span is None:
                break
            body = text[match.end() : span[0]]
            path, alias, where_expr = match.groups()
            items = resolve_path(context, path.strip())
            value = ""
            if isinstance(items, list):
                from .template_engine import _eval_condition

                prepared = []
                for index, item in enumerate(items):
                    merged = {**context, "index": index + 1, "@index": index, "@number": index + 1, "this": item}
                    if alias:
                        merged[alias] = item
                    if isinstance(item, dict):
                        merged.update(item)
                    prepared.append(merged)
                if where_expr and where_expr.strip():
                    prepared = [m for m in prepared if _eval_condition(where_expr.strip(), m)]
                total = len(prepared)
                for pos, merged in enumerate(prepared):
                    merged.update({
                        "@number": pos + 1,
                        "@first": pos == 0,
                        "@last": pos == total - 1,
                        "@count": total,
                    })
                    value += render_text(body, merged)
            end = span[1]
        else:
            span = _same_paragraph_span(text, match.end(), "with")
            if span is None:
                break
            body = text[match.end() : span[0]]
            target = resolve_path(context, match.group(1).strip())
            alias = match.group(2) if match.lastindex and match.lastindex >= 2 else None
            if alias:
                merged = {**context, alias: target, "this": target}
            elif isinstance(target, dict):
                merged = {**context, **target}
            elif target is not None:
                merged = {**context, "this": target}
            else:
                merged = {**context}
            value = render_text(body, merged)
            end = span[1]

        if not _replace_text_range(paragraph, match.start(), end, value):
            break
        changed = True
    return changed


def _patch_paragraph(t_nodes: list, context: Dict[str, Any]) -> bool:
    """Ganti placeholder pada satu paragraf, menjaga elemen inline (tab) & format.

    Placeholder yang terpecah antar-run diganti hanya pada run pembentuknya,
    sehingga teks label (mis. `NIK`, `:`) dan elemen `<w:tab/>` tetap utuh.
    """
    if not t_nodes:
        return False
    texts = [node.text or "" for node in t_nodes]
    full = "".join(texts)
    if "{{" not in full:
        return False

    # Offset awal/akhir setiap node teks.
    offsets: list = []
    pos = 0
    for t in texts:
        offsets.append((pos, pos + len(t)))
        pos += len(t)

    def node_for(char_pos: int) -> int:
        for i, (s, e) in enumerate(offsets):
            if s <= char_pos < e:
                return i
        return len(t_nodes) - 1 if char_pos >= pos else 0

    changed = False
    for m in reversed(list(PLACEHOLDER_RE.finditer(full))):
        value = render_text(m.group(0), context)
        si = node_for(m.start())
        ei = node_for(m.end() - 1)
        s_off = m.start() - offsets[si][0]
        e_off = (m.end() - 1) - offsets[ei][0] + 1
        if si == ei:
            node_text = t_nodes[si].text or ""
            t_nodes[si].text = node_text[:s_off] + value + node_text[e_off:]
        else:
            t_nodes[si].text = (t_nodes[si].text or "")[:s_off] + value
            for k in range(si + 1, ei):
                t_nodes[k].text = ""
            t_nodes[ei].text = (t_nodes[ei].text or "")[e_off:]
        changed = True

    for node in t_nodes:
        if node.text and (node.text.startswith(" ") or node.text.endswith(" ") or "\t" in node.text):
            node.set(XML_SPACE, "preserve")

    return changed



def _ensure_table_cells_have_paragraph(root: Any) -> None:
    """Word menolak file jika ada sel tabel tanpa blok (w:p) di dalamnya."""
    for cell in root.iter(TAG_TC):
        if not any(child.tag in (TAG_P, TAG_TBL) for child in cell):
            cell.append(etree.Element(TAG_P))


def _patch_xml_text(xml_bytes: bytes, context: Dict[str, Any]) -> bytes:
    """Ganti placeholder pada seluruh `<w:t>` di satu bagian XML DOCX."""
    root = etree.fromstring(xml_bytes)
    original = etree.tostring(root)
    for _ in range(3):
        before = etree.tostring(root)
        _expand_with_blocks(root, context)
        _expand_if_blocks(root, context)
        _expand_each_paragraphs(root, context)
        if etree.tostring(root) == before:
            break
    changed = etree.tostring(root) != original

    for p in root.iter(TAG_P):
        if _expand_same_paragraph_blocks(p, context):
            changed = True
        if _patch_paragraph(_own_t_nodes(p), context):
            changed = True
        _normalize_paragraph_inline(p)

    before_cells = etree.tostring(root)
    _ensure_table_cells_have_paragraph(root)
    if etree.tostring(root) != before_cells:
        changed = True

    if not changed:
        return xml_bytes
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


TAG_BODY = f"{{{W_NS}}}body"
TAG_TBL = f"{{{W_NS}}}tbl"
TAG_TR = f"{{{W_NS}}}tr"
TAG_TC = f"{{{W_NS}}}tc"


def _own_t_nodes(paragraph: Any) -> list:
    """Node `w:t` milik paragraf ini (bukan paragraf di dalam text box)."""
    nodes = []
    for node in paragraph.iter(TAG_T):
        parent = node.getparent()
        while parent is not None and parent.tag != TAG_P:
            parent = parent.getparent()
        if parent is paragraph:
            nodes.append(node)
    return nodes


def _own_inline_nodes(paragraph: Any) -> list:
    """Node inline (w:t/w:tab/w:br) milik paragraf ini saja."""
    nodes = []
    for node in paragraph.iter():
        if node.tag not in (TAG_T, f"{{{W_NS}}}tab", f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
            continue
        parent = node.getparent()
        while parent is not None and parent.tag != TAG_P:
            parent = parent.getparent()
        if parent is paragraph:
            nodes.append(node)
    return nodes


def read_editable_text(path: str) -> Dict[str, Any]:
    """Teks editable: tiap baris paragraf (line break = baris) + baris tabel."""
    from docx import Document

    doc = Document(path)
    lines: list[str] = []
    for paragraph in doc.paragraphs:
        lines.extend(paragraph.text.split("\n"))
    row_count = 0
    for table in doc.tables:
        for row in table.rows:
            row_count += 1
            cells = [" ".join(cell.text.splitlines()) for cell in row.cells]
            lines.append("\t".join(cells))
    return {
        "text": "\n".join(lines),
        "paragraph_count": len(doc.paragraphs),
        "row_count": row_count,
    }


def _remove_inline_breaks(paragraph: Any) -> None:
    for node in _own_inline_nodes(paragraph):
        if node.tag in (f"{{{W_NS}}}tab", f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
            parent = node.getparent()
            if parent is not None:
                parent.remove(node)


def _set_paragraph_segments(paragraph: Any, segments: list[str]) -> None:
    """Tulis ulang teks paragraf dengan jumlah baris (line break) tertentu."""
    _remove_inline_breaks(paragraph)
    if not segments:
        segments = [""]
    t_nodes = _own_t_nodes(paragraph)
    if not t_nodes:
        run = etree.SubElement(paragraph, f"{{{W_NS}}}r")
        t_nodes = [etree.SubElement(run, TAG_T)]

    first = t_nodes[0]
    first.text = segments[0]
    first.set(XML_SPACE, "preserve")
    for node in t_nodes[1:]:
        node.text = ""

    if len(segments) > 1:
        run = first.getparent()
        insert_at = list(run).index(first) + 1
        for segment in segments[1:]:
            br = etree.Element(f"{{{W_NS}}}br")
            run.insert(insert_at, br)
            insert_at += 1
            node = etree.Element(TAG_T)
            node.set(XML_SPACE, "preserve")
            node.text = segment
            run.insert(insert_at, node)
            insert_at += 1

    _normalize_paragraph_inline(paragraph)


def _replace_paragraph_text(paragraph: Any, text: str) -> None:
    """Ganti teks paragraf satu blok (line break lama dipertahankan proporsional)."""
    segments = [seg.strip() for seg in _paragraph_segments(paragraph)]
    if len(segments) <= 1:
        _set_paragraph_segments(paragraph, [text])
        return
    weights = [max(len(seg), 1) for seg in segments]
    total = sum(weights)
    parts: list[str] = []
    cursor = 0
    consumed = 0
    for i, weight in enumerate(weights):
        if i == len(weights) - 1:
            parts.append(text[cursor:])
            break
        consumed += weight
        cut = max(round(len(text) * consumed / total), cursor)
        parts.append(text[cursor:cut])
        cursor = cut
    _set_paragraph_segments(paragraph, parts)


def _norm_space(value: str) -> str:
    return " ".join(value.split())


_SPECIAL_CHILD_TAGS = {
    f"{{{W_NS}}}hyperlink",
    f"{{{W_NS}}}fldSimple",
    f"{{{W_NS}}}smartTag",
    f"{{{W_NS}}}sdt",
    f"{{{W_NS}}}ins",
    f"{{{W_NS}}}del",
}


def _paragraph_atoms(paragraph: Any) -> list[tuple[str, Any]]:
    """Daftar karakter paragraf beserta rPr run asalnya (untuk diff)."""
    atoms: list[tuple[str, Any]] = []
    for run in paragraph.findall(f"{{{W_NS}}}r"):
        rpr = run.find(f"{{{W_NS}}}rPr")
        rpr_copy = copy.deepcopy(rpr) if rpr is not None else None
        for node in run:
            if node.tag == TAG_T:
                for char in node.text or "":
                    atoms.append((char, rpr_copy))
            elif node.tag == f"{{{W_NS}}}tab":
                atoms.append(("\t", rpr_copy))
            elif node.tag in (f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
                atoms.append(("\n", rpr_copy))
    return atoms


def _patch_paragraph_diff(paragraph: Any, new_text: str) -> bool:
    """Ganti hanya bagian teks yang berubah, mempertahankan format per karakter.

    Return False jika paragraf tidak bisa dipatch aman (mis. ada field/hyperlink).
    """
    if any(child.tag in _SPECIAL_CHILD_TAGS for child in paragraph if child.tag != TAG_P):
        if any(child.tag in _SPECIAL_CHILD_TAGS for child in paragraph):
            return False
    runs = paragraph.findall(f"{{{W_NS}}}r")
    if not runs:
        return False

    atoms = _paragraph_atoms(paragraph)
    old = "".join(char for char, _ in atoms)
    if old == new_text:
        return True

    matcher = difflib.SequenceMatcher(a=old, b=new_text, autojunk=False)
    new_atoms: list[tuple[str, Any]] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            new_atoms.extend(atoms[i1:i2])
        elif tag in ("insert", "replace"):
            if i1 < len(atoms):
                ref = atoms[i1][1]
            elif atoms:
                ref = atoms[-1][1]
            else:
                ref = None
            new_atoms.extend((char, ref) for char in new_text[j1:j2])

    # Bangun ulang run: kelompokkan karakter berurutan dengan rPr sama.
    for run in runs:
        paragraph.remove(run)

    current_run = None
    current_key = None
    current_t = None

    def new_run(rpr: Any) -> Any:
        nonlocal current_run, current_key, current_t
        current_run = etree.SubElement(paragraph, f"{{{W_NS}}}r")
        if rpr is not None:
            current_run.append(copy.deepcopy(rpr))
        current_key = etree.tostring(rpr) if rpr is not None else b""
        current_t = None
        return current_run

    for char, rpr in new_atoms:
        key = etree.tostring(rpr) if rpr is not None else b""
        if current_run is None or key != current_key:
            new_run(rpr)
        assert current_run is not None
        if char == "\n":
            etree.SubElement(current_run, f"{{{W_NS}}}br")
            current_t = None
        elif char == "\t":
            etree.SubElement(current_run, f"{{{W_NS}}}tab")
            current_t = None
        else:
            if current_t is None:
                current_t = etree.SubElement(current_run, TAG_T)
                current_t.set(XML_SPACE, "preserve")
                current_t.text = ""
            current_t.text = (current_t.text or "") + char

    return True


def _set_cell_text(cell: Any, text: str) -> None:
    paragraphs = [el for el in cell if el.tag == TAG_P]
    if not paragraphs:
        paragraphs = [etree.SubElement(cell, TAG_P)]
    if len(paragraphs) == 1:
        if not _patch_paragraph_diff(paragraphs[0], text):
            _set_paragraph_segments(paragraphs[0], [text])
        return
    # Pertahankan jumlah paragraf dalam sel: bagi teks proporsional.
    weights = [max(len(_paragraph_flat_text(p)), 1) for p in paragraphs]
    total = sum(weights)
    cursor = 0
    consumed = 0
    for i, paragraph in enumerate(paragraphs):
        if i == len(paragraphs) - 1:
            part = text[cursor:]
        else:
            consumed += weights[i]
            cut = max(round(len(text) * consumed / total), cursor)
            part = text[cursor:cut]
            cursor = cut
        if not _patch_paragraph_diff(paragraph, part):
            _set_paragraph_segments(paragraph, [part])


def _paragraph_flat_text(paragraph: Any) -> str:
    """Teks paragraf satu baris (line break/tab dinormalkan) untuk pembanding."""
    parts: list[str] = []
    for node in _own_inline_nodes(paragraph):
        if node.tag == TAG_T:
            parts.append(node.text or "")
        elif node.tag in (f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
            parts.append("\n")
        elif node.tag == f"{{{W_NS}}}tab":
            parts.append("\t")
    return " ".join("".join(parts).splitlines())


def _cell_flat_text(cell: Any) -> str:
    texts = [_paragraph_flat_text(p) for p in cell if p.tag == TAG_P]
    return " ".join(texts).strip()


def _paragraph_segments(paragraph: Any) -> list[str]:
    """Pecah teks paragraf pada posisi `<w:br/>`/`<w:cr/>`."""
    segments: list[str] = [""]
    for node in _own_inline_nodes(paragraph):
        if node.tag == TAG_T:
            segments[-1] += node.text or ""
        elif node.tag in (f"{{{W_NS}}}br", f"{{{W_NS}}}cr"):
            segments.append("")
    return segments


def _apply_text_to_xml(xml_bytes: bytes, lines: list[str]) -> bytes:
    root = etree.fromstring(xml_bytes)
    body = root.find(TAG_BODY)
    if body is None:
        return xml_bytes
    paragraphs = [child for child in body if child.tag == TAG_P]
    rows: list[Any] = []
    for table in [child for child in body if child.tag == TAG_TBL]:
        rows.extend(table.findall(TAG_TR))

    index = 0
    for paragraph in paragraphs:
        current = _paragraph_segments(paragraph)
        new_segments = lines[index : index + len(current)]
        index += len(current)
        if [_norm_space(seg) for seg in current] == [_norm_space(seg) for seg in new_segments]:
            continue
        joined = "\n".join(new_segments)
        if not _patch_paragraph_diff(paragraph, joined):
            _set_paragraph_segments(paragraph, new_segments)
    for row in rows:
        cells = lines[index].split("\t")
        index += 1
        tcs = row.findall(TAG_TC)
        # Baris dengan sel merge punya jumlah berbeda — biarkan apa adanya.
        if len(cells) != len(tcs):
            continue
        for tc, value in zip(tcs, cells):
            if _norm_space(_cell_flat_text(tc)) == _norm_space(value):
                continue
            _set_cell_text(tc, value)

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def apply_editable_text(path: str, text: str) -> None:
    """Terapkan hasil edit teks ke DOCX yang sudah ada, format tetap utuh."""
    from docx import Document

    doc = Document(path)
    expected = sum(len(paragraph.text.split("\n")) for paragraph in doc.paragraphs) + sum(
        len(table.rows) for table in doc.tables
    )
    lines = text.split("\n")
    if len(lines) != expected:
        raise ValueError(
            f"Jumlah baris berubah ({len(lines)}). Harus tetap {expected} baris. "
            "Edit teks tanpa menambah/menghapus baris agar format tetap."
        )

    src = Path(path)
    tmp = src.with_suffix(src.suffix + ".tmp")
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = _apply_text_to_xml(data, lines)
            zout.writestr(item, data)
    tmp.replace(src)


def generate_docx(
    template_path: str,
    output_path: str,
    context: Dict[str, Any],
) -> Path:
    """Salin template DOCX dan ganti placeholder tanpa mengubah format."""
    template_path = str(template_path)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    XML_PARTS = (
        "word/document.xml",
        "word/footnotes.xml",
        "word/endnotes.xml",
    )
    PREFIX_PARTS = ("word/header", "word/footer")

    render_failed = False
    with zipfile.ZipFile(template_path, "r") as zin:
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename in XML_PARTS or item.filename.startswith(PREFIX_PARTS):
                    try:
                        data = _patch_xml_text(data, context)
                    except Exception:  # noqa: BLE001
                        if item.filename == "word/document.xml":
                            render_failed = True
                zout.writestr(item, data)

    if render_failed:
        # Fallback: jangan biarkan dokumen berisi placeholder mentah.
        from .template_engine import render_text

        rendered = render_text(extract_docx_text(template_path), context)
        return create_docx_from_text(rendered, output_path)

    return out


def create_docx_from_text(text: str, output_path: str) -> Path:
    """Buat DOCX baru dari teks hasil render (fallback tanpa file template)."""
    from docx import Document
    from docx.shared import Pt

    doc = Document()
    lines = text.split("\n")
    for i, line in enumerate(lines):
        paragraph = doc.add_paragraph()
        run = paragraph.add_run(line)
        if i == 0:
            run.bold = True
        run.font.size = Pt(11)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out)
    return out


def validate_docx(path: str) -> bool:
    """Validasi dasar file DOCX."""
    try:
        with zipfile.ZipFile(path) as zf:
            return "word/document.xml" in zf.namelist()
    except Exception:
        return False


def extract_docx_text(path: str) -> str:
    """Ekstrak seluruh teks DOCX (paragraf, tabel, dan textbox) untuk preview.

    Word menyimpan placeholder di dalam textbox (w:txbxContent) yang TIDAK
    terbaca oleh python-docx `doc.paragraphs`, sehingga ekstraksi dilakukan
    langsung dari XML agar blok template tidak hilang.
    """
    import zipfile

    from lxml import etree

    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

    try:
        with zipfile.ZipFile(path) as zf:
            xml_bytes = zf.read("word/document.xml")
        root = etree.fromstring(xml_bytes)

        def local(el) -> str:
            tag = etree.QName(el).localname
            return tag

        def shallow_text(paragraph) -> str:
            """Teks paragraf tanpa isi textbox yang di-anchor di dalamnya."""
            parts: list[str] = []

            def walk(el) -> None:
                for child in el:
                    if local(child) == "txbxContent":
                        continue
                    if local(child) == "t":
                        parts.append(child.text or "")
                    else:
                        walk(child)

            walk(paragraph)
            return "".join(parts)

        mc_ns = "http://schemas.openxmlformats.org/markup-compatibility/2006"

        def in_fallback(txbx) -> bool:
            return any(
                etree.QName(a).localname == "Fallback"
                and etree.QName(a).namespace == mc_ns
                for a in txbx.iterancestors()
            )

        # Word menyimpan textbox dua kali (mc:Choice + mc:Fallback untuk
        # kompatibilitas). Ambil Choice saja agar teks tidak duplikat;
        # gunakan Fallback bila dokumen tidak punya Choice sama sekali.
        all_txbx = list(root.iter(f"{{{w_ns}}}txbxContent"))
        has_choice = any(not in_fallback(t) for t in all_txbx)

        parts: list[str] = []
        for paragraph in root.iter(f"{{{w_ns}}}p"):
            # Paragraf di dalam textbox diproses lewat induknya.
            if any(local(a) == "p" for a in paragraph.iterancestors()):
                continue
            parts.append(shallow_text(paragraph))
            # Sertakan isi textbox yang di-anchor pada paragraf ini.
            for txbx in paragraph.iter(f"{{{w_ns}}}txbxContent"):
                if has_choice and in_fallback(txbx):
                    continue
                for tp in txbx.iter(f"{{{w_ns}}}p"):
                    parts.append(
                        "".join(t.text or "" for t in tp.iter(f"{{{w_ns}}}t"))
                    )
        # Buang baris kosong berlebih di akhir.
        while parts and not parts[-1].strip():
            parts.pop()
        return "\n".join(parts)
    except Exception:
        # Fallback: python-docx (tanpa textbox).
        from docx import Document

        doc = Document(path)
        parts = [p.text for p in doc.paragraphs]
        for table in doc.tables:
            for row in table.rows:
                parts.append("\t".join(cell.text for cell in row.cells))
        return "\n".join(parts)
