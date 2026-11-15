const ANGKA = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];
const GROUP = ["", "ribu", "juta", "milyar", "triliun"];
export const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
export const HARI_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

function terbilangSatuan(n: number): string {
  if (n < 12) return ANGKA[n];
  if (n < 20) return `${ANGKA[n - 10]} belas`;
  const puluh = Math.floor(n / 10);
  const sisa = n % 10;
  return `${ANGKA[puluh]} puluh${sisa ? ` ${ANGKA[sisa]}` : ""}`;
}

function terbilangRatusan(n: number): string {
  const ratus = Math.floor(n / 100);
  const sisa = n % 100;
  let hasil = "";
  if (ratus === 1) hasil = "seratus";
  else if (ratus > 1) hasil = `${ANGKA[ratus]} ratus`;
  if (sisa) hasil += (hasil ? " " : "") + terbilangSatuan(sisa);
  return hasil;
}

export function terbilang(value: number | string, satuan?: string): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/[.,\s]/g, "").replace(",", ".")) : value;
  if (num === null || num === undefined || Number.isNaN(num)) return "-";
  const negatif = num < 0;
  const abs = Math.abs(num);
  const bulat = Math.floor(abs);
  const desimal = abs - bulat;

  let hasil = "";
  if (bulat === 0) {
    hasil = "nol";
  } else {
    const parts: string[] = [];
    let rest = bulat;
    let i = 0;
    while (rest > 0) {
      const chunk = rest % 1000;
      if (chunk > 0) {
        let kata = terbilangRatusan(chunk);
        if (i === 1 && chunk === 1) kata = "seribu";
        else if (GROUP[i]) kata += ` ${GROUP[i]}`;
        parts.unshift(kata);
      }
      rest = Math.floor(rest / 1000);
      i++;
    }
    hasil = parts.join(" ");
  }

  if (desimal > 0.000001) {
    const d = Math.round(desimal * 100);
    hasil += ` koma ${terbilangRatusan(d)}`;
  }

  let out = hasil.charAt(0).toUpperCase() + hasil.slice(1);
  if (negatif) out = `Minus ${out.toLowerCase()}`;
  if (satuan) out += ` ${satuan}`;
  return out;
}

function parseDate(value: string | Date): Date | null {
  if (value instanceof Date) return value;
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  value: string | Date,
  fmt = "DD MMMM YYYY"
): string {
  const d = parseDate(value);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return fmt
    .replace(/dddd/g, HARI_ID[d.getDay()])
    .replace(/MMMM/g, BULAN_ID[d.getMonth()])
    .replace(/MMM/g, BULAN_ID[d.getMonth()].slice(0, 3))
    .replace(/DD/g, dd)
    .replace(/D(?![a-zA-Z])/g, String(d.getDate()))
    .replace(/MM/g, mm)
    .replace(/YYYY/g, String(yyyy))
    .replace(/YY/g, String(yyyy).slice(2));
}

export function terbilangTanggal(value: string | Date): string {
  const d = parseDate(value);
  if (!d) return "-";
  const hari = terbilang(d.getDate()).toLowerCase();
  const bulan = BULAN_ID[d.getMonth()];
  const tahun = terbilang(d.getFullYear()).toLowerCase();
  return `${hari} ${bulan} ${tahun}`;
}

export function tanggalHuruf(value: string | Date): string {
  const d = parseDate(value);
  if (!d) return "-";
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "-";
  const [int, dec] = String(num).split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec ? `${withSep},${dec}` : withSep;
}

export function currency(
  value: number | string,
  code: string = "IDR"
): string {
  const formatted = formatNumber(value);
  if (formatted === "-") return "-";
  return code.toUpperCase() === "IDR" ? `Rp${formatted}` : `${code} ${formatted}`;
}

function resolvePath(ctx: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const clean = path.trim();
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);
  const parts = clean.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      cur = cur[Number(p)];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function tokenizeArgs(raw: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  let inString: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      cur += ch;
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      cur += ch;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

function evalArg(
  arg: string,
  ctx: Record<string, unknown>
): unknown {
  const a = arg.trim();
  const quotePairs: Record<string, string> = {
    '"': '"',
    "'": "'",
    "\u201c": "\u201d", // "
    "\u2018": "\u2019", // '
  };
  if (a.length >= 2) {
    const closer = quotePairs[a[0]];
    if (closer && a.endsWith(closer)) return a.slice(1, -1);
  }
  if (a.startsWith("{{")) {
    return evalExpr(a.slice(2, -2).trim(), ctx);
  }
  return resolvePath(ctx, a);
}

export function evalExpr(
  expr: string,
  ctx: Record<string, unknown>
): unknown {
  const trimmed = expr.trim();
  const fnMatch = trimmed.match(/^([a-zA-Z_][\w]*)\s*\(([\s\S]*)\)$/);
  if (fnMatch) {
    const [, name, rawArgs] = fnMatch;
    const args = tokenizeArgs(rawArgs).map((a) => evalArg(a, ctx));
    const fn = (FUNCTIONS as Record<string, (value: unknown, ...rest: unknown[]) => unknown>)[name];
    if (!fn) return undefined;
    return fn(...(args as [unknown, ...unknown[]]));
  }
  return resolvePath(ctx, trimmed);
}

const FUNCTIONS = {
  terbilang: (v: unknown, satuan?: unknown) =>
    terbilang(v as number | string, satuan ? String(satuan) : undefined),
  terbilang_tanggal: (v: unknown) => terbilangTanggal(v as string),
  tanggal_huruf: (v: unknown) => tanggalHuruf(v as string),
  format_date: (v: unknown, fmt?: unknown) =>
    formatDate(v as string, fmt ? String(fmt) : undefined),
  format_datetime: (v: unknown, fmt?: unknown) =>
    formatDate(v as string, fmt ? String(fmt) : "DD MMMM YYYY, HH:mm"),
  format_number: (v: unknown) => formatNumber(v as number | string),
  currency: (v: unknown, code?: unknown) =>
    currency(v as number, code ? String(code) : "IDR"),
  upper: (v: unknown) => String(v ?? "").toUpperCase(),
  lower: (v: unknown) => String(v ?? "").toLowerCase(),
  capitalize: (v: unknown) => {
    const s = String(v ?? "").toLowerCase();
    return s.replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  },
  trim: (v: unknown) => String(v ?? "").trim(),
  replace: (v: unknown, a: unknown, b: unknown) =>
    String(v ?? "").split(String(a)).join(String(b)),
  default: (v: unknown, fallback: unknown) =>
    v === undefined || v === null || v === "" ? fallback : v,
  concat: (v: unknown, ...rest: unknown[]) =>
    String(v ?? "") + rest.map(String).join(""),
  substring: (v: unknown, start: unknown, end?: unknown) =>
    String(v ?? "").slice(Number(start), end === undefined ? undefined : Number(end)),
  count: (v: unknown) =>
    Array.isArray(v) ? v.length : typeof v === "object" && v !== null ? Object.keys(v as object).length : 0,
  umur: (v: unknown) => {
    if (!v) return "";
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years -= 1;
    return Math.max(years, 0);
  },
  alamat_pihak: (v: unknown) => {
    const get = (key: string) => {
      if (v && typeof v === "object") return (v as Record<string, unknown>)[key];
      return undefined;
    };
    const parts: string[] = [];
    const alamat = String(get("alamat") ?? "").trim();
    if (alamat) parts.push(alamat);
    const rt = String(get("rt") ?? "").trim();
    const rw = String(get("rw") ?? "").trim();
    if (rt || rw) parts.push(`RT ${rt}/RW ${rw}`);
    const kel = String(get("kelurahan") ?? "").trim();
    if (kel) parts.push(`Kel. ${kel}`);
    const kec = String(get("kecamatan") ?? "").trim();
    if (kec) parts.push(`Kec. ${kec}`);
    return parts.join(", ");
  },
  sebutan: (jk: unknown, status?: unknown) => {
    const j = String(jk ?? "").toUpperCase();
    if (j === "LAKI-LAKI") return "Tuan";
    if (String(status ?? "").toUpperCase() === "BELUM KAWIN") return "Nona";
    return "Nyonya";
  },
  ektp_paragraph: (v: unknown) => {
    const template =
      "{{sebutan($1.jenis_kelamin, $1.status_perkawinan)}} {{$1.nama}}, " +
      "lahir di {{$1.tempat_lahir}}, pada tanggal {{format_date($1.tanggal_lahir, \"DD-MM-YYYY\")}}, " +
      "Warga Negara Indonesia, {{$1.pekerjaan}}, bertempat tinggal di " +
      "{{alamat_pihak($1)}}, pemegang Kartu Tanda Penduduk Nomor : {{$1.nik}}";
    return renderTemplate(template, { $1: v as Record<string, unknown> });
  },
  today: () => formatDate(new Date(), "YYYY-MM-DD"),
  now: () => formatDate(new Date(), "DD MMMM YYYY, HH:mm"),
  year: () => new Date().getFullYear(),
  month: () => BULAN_ID[new Date().getMonth()],
};

function stripParens(expr: string): string {
  let e = expr.trim();
  while (e.startsWith("(") && e.endsWith(")")) {
    let depth = 0;
    let valid = true;
    for (let i = 0; i < e.length; i++) {
      if (e[i] === "(") depth++;
      else if (e[i] === ")") {
        depth--;
        if (depth === 0 && i < e.length - 1) {
          valid = false;
          break;
        }
      }
    }
    if (!valid) break;
    e = e.slice(1, -1).trim();
  }
  return e;
}

function splitTop(expr: string, word: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  let i = 0;
  const lower = expr.toLowerCase();
  while (i < expr.length) {
    const ch = expr[i];
    if (quote) {
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "\u201c" || ch === "\u2018") {
      quote = ch === "\u201c" ? "\u201d" : ch === "\u2018" ? "\u2019" : ch;
      i++;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && lower.slice(i, i + word.length) === word) {
      const before = i === 0 ? "" : expr[i - 1];
      const after = i + word.length >= expr.length ? "" : expr[i + word.length];
      const beforeOk = !before || !/[\w.]/.test(before);
      const afterOk = !after || !/[\w.]/.test(after);
      if (beforeOk && afterOk) {
        parts.push(expr.slice(start, i));
        start = i + word.length;
        i = start;
        continue;
      }
    }
    i++;
  }
  parts.push(expr.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function evalCondition(expr: string, ctx: Record<string, unknown>): boolean {
  const e = stripParens(expr);

  const orParts = splitTop(e, "or");
  if (orParts.length > 1) return orParts.some((p) => evalCondition(p, ctx));

  const andParts = splitTop(e, "and");
  if (andParts.length > 1) return andParts.every((p) => evalCondition(p, ctx));

  if (/^not\b/i.test(e)) {
    return !evalCondition(e.replace(/^not\b/i, ""), ctx);
  }

  // Operator contains / not contains / in
  const containment = e.match(/^(.+?)\s+(not\s+contains|contains|in)\s+(.+)$/i);
  if (containment) {
    let left = evalArg(containment[1].trim(), ctx);
    const op = containment[2].toLowerCase().replace(/\s+/g, " ");
    let right = evalArg(containment[3].trim(), ctx);
    if (op === "in") [left, right] = [right, left];
    const needle = String(right ?? "").trim().toLowerCase();
    let found: boolean;
    if (Array.isArray(left)) {
      found = left.some((item) => String(item).trim().toLowerCase() === needle);
    } else if (left === null || left === undefined) {
      found = false;
    } else {
      found = String(left).toLowerCase().includes(needle);
    }
    return op === "not contains" ? !found : found;
  }

  const m = e.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (m) {
    let left = evalExpr(m[1].trim(), ctx);
    const rightRaw = evalArg(m[3].trim(), ctx);
    const op = m[2];
    const needle = String(rightRaw ?? "").trim().toLowerCase();
    if (Array.isArray(left)) {
      // Multi select: == berarti opsi ada di dalam daftar.
      if (op === "==") {
        return left.some((item) => String(item).trim().toLowerCase() === needle);
      }
      if (op === "!=") {
        return left.every((item) => String(item).trim().toLowerCase() !== needle);
      }
      left = left.length;
    }
    const right = Array.isArray(rightRaw) ? rightRaw.length : rightRaw;
    if (op === "==") return String(left ?? "") === String(right ?? "");
    if (op === "!=") return String(left ?? "") !== String(right ?? "");
    const lf = Number(left);
    const rf = Number(right);
    if (Number.isNaN(lf) || Number.isNaN(rf)) return false;
    switch (op) {
      case ">":
        return lf > rf;
      case "<":
        return lf < rf;
      case ">=":
        return lf >= rf;
      case "<=":
        return lf <= rf;
    }
  }

  return Boolean(evalExpr(e, ctx));
}

const PLACEHOLDER = /\{\{\s*([#/]?(?:[\w@$.[\](),\s"'=<>-]|\([^}]*\))+)\s*\}\}/g;

function matchingBlock(
  text: string,
  bodyStart: number
): { body: string; end: number } | null {
  const tagRe = /\{\{\s*(#?if\b|#?each\b|#?with\b|\/if\b|\/each\b|\/with\b|endif\b|endeach\b|endwith\b|else\b)/gi;
  let depth = 1;
  tagRe.lastIndex = bodyStart;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(text)) !== null) {
    const tag = m[1].toLowerCase();
    if (tag.startsWith("#") || tag === "if" || tag === "each" || tag === "with") {
      depth += 1;
    } else if (tag.startsWith("/") || tag.startsWith("end")) {
      depth -= 1;
      if (depth === 0) {
        // Regex hanya mencocokkan nama tag; majukan melewati penutup "}}".
        const rest = text.slice(tagRe.lastIndex, tagRe.lastIndex + 20);
        const closer = /\}\}/.exec(rest);
        const end = tagRe.lastIndex + (closer ? closer.index + 2 : 0);
        return { body: text.slice(bodyStart, m.index), end };
      }
    }
  }
  return null;
}

function splitElse(body: string): [string, string | null] {
  // Pecah body pada {{else}} di kedalaman 0 (abaikan else dari blok bersarang).
  const openRe = /\{\{\s*(#?if\b|#?each\b|#?with\b)/g;
  const closeRe = /\{\{\s*(\/if\b|endif\b|\/each\b|endeach\b|\/with\b|endwith\b)/g;
  const elseRe = /\{\{\s*else\s*\}\}/g;
  const events: { at: number; len: number; delta: number; isElse: boolean }[] = [];
  let m: RegExpExecArray | null;
  openRe.lastIndex = 0;
  while ((m = openRe.exec(body)) !== null) events.push({ at: m.index, len: m[0].length, delta: 1, isElse: false });
  closeRe.lastIndex = 0;
  while ((m = closeRe.exec(body)) !== null) events.push({ at: m.index, len: m[0].length, delta: -1, isElse: false });
  elseRe.lastIndex = 0;
  while ((m = elseRe.exec(body)) !== null) events.push({ at: m.index, len: m[0].length, delta: 0, isElse: true });
  events.sort((a, b) => a.at - b.at);
  let depth = 0;
  for (const ev of events) {
    if (ev.isElse) {
      if (depth === 0) {
        return [body.slice(0, ev.at), body.slice(ev.at + ev.len)];
      }
    } else {
      depth += ev.delta;
    }
  }
  return [body, null];
}

function renderBlocks(text: string, ctx: Record<string, unknown>): string {
  let out = text;
  for (let i = 0; i < 200; i++) {
    const mIf = /\{\{\s*#?if\s+(.+?)\s*\}\}/.exec(out);
    const mEach = /\{\{\s*#?each\s+([\w.[\]]+)(?:\s+as\s+(\w+))?(?:\s+where\s+(.+?))?\s*\}\}/.exec(out);
    const mWith = /\{\{\s*#?with\s+([\w.[\]]+)(?:\s+as\s+(\w+))?\s*\}\}/.exec(out);
    const candidates: { m: RegExpExecArray; kind: "if" | "each" | "with" }[] = [];
    if (mIf) candidates.push({ m: mIf, kind: "if" });
    if (mEach) candidates.push({ m: mEach, kind: "each" });
    if (mWith) candidates.push({ m: mWith, kind: "with" });
    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.m.index - b.m.index);
    const first = candidates[0];
    const start = first.m.index;
    const bodyStart = start + first.m[0].length;
    const block = matchingBlock(out, bodyStart);
    if (!block) break;

    let rendered = "";
    if (first.kind === "if") {
      const expr = first.m[1].trim();
      const [ifBody, elseBody] = splitElse(block.body);
      rendered = evalCondition(expr, ctx) ? ifBody : (elseBody ?? "");
    } else if (first.kind === "each") {
      const path = first.m[1].trim();
      const alias = first.m[2];
      const whereExpr = first.m[3]?.trim();
      const arr = resolvePath(ctx, path) as unknown[];
      if (Array.isArray(arr)) {
        let prepared = arr.map((item, index) => {
          const merged: Record<string, unknown> = {
            ...ctx,
            index: index + 1,
            "@index": index,
            "@number": index + 1,
            this: item,
          };
          if (alias) merged[alias] = item;
          if (item && typeof item === "object") Object.assign(merged, item);
          return { index, item, merged };
        });
        if (whereExpr) {
          prepared = prepared.filter((entry) => evalCondition(whereExpr, entry.merged));
        }
        const total = prepared.length;
        rendered = prepared
          .map((entry, position) =>
            renderBlocks(block.body, {
              ...entry.merged,
              index: entry.index + 1,
              "@number": position + 1,
              "@index": entry.index,
              "@first": position === 0,
              "@last": position === total - 1,
              "@count": total,
            })
          )
          .join("");
      }
    } else {
      const path = first.m[1].trim();
      const alias = first.m[2];
      const target = resolvePath(ctx, path);
      if (Array.isArray(target)) {
        // Target list: iterasi otomatis seperti #each.
        const total = target.length;
        rendered = target
          .map((item, index) => {
            const merged: Record<string, unknown> = {
              ...ctx,
              index: index + 1,
              "@index": index,
              "@number": index + 1,
              "@first": index === 0,
              "@last": index === total - 1,
              "@count": total,
              this: item,
            };
            if (alias) merged[alias] = item;
            if (item && typeof item === "object") Object.assign(merged, item);
            return renderBlocks(block.body, merged);
          })
          .join("");
      } else if (target === undefined || target === null) {
        // Target tidak ada: blok #with dilewati sepenuhnya.
        rendered = "";
      } else {
        let merged: Record<string, unknown>;
        if (alias) {
          merged = { ...ctx, [alias]: target, this: target };
        } else if (typeof target === "object") {
          merged = { ...ctx, ...(target as Record<string, unknown>) };
        } else {
          merged = { ...ctx, this: target };
        }
        rendered = renderBlocks(block.body, merged);
      }
    }

    out = out.slice(0, start) + rendered + out.slice(block.end);
  }

  return out.replace(PLACEHOLDER, (match) => {
    const expr = match.slice(2, -2).trim();
    if (expr.startsWith("#") || expr.startsWith("/")) return "";
    const value = evalExpr(expr, ctx);
    if (value === undefined || value === null || value === "") return "-";
    return String(value);
  });
}

export function renderTemplate(
  template: string,
  ctx: Record<string, unknown>
): string {
  return renderBlocks(template, ctx);
}

export function extractVariables(template: string): string[] {
  const vars = new Set<string>();
  for (const m of template.matchAll(PLACEHOLDER)) {
    const expr = m[1].trim();
    if (expr.startsWith("#") || expr.startsWith("/")) continue;
    const pathMatch = expr.match(/^[\w.[\]]+$/);
    if (pathMatch && !(FUNCTIONS as Record<string, unknown>)[pathMatch[0]]) vars.add(pathMatch[0]);
  }
  return Array.from(vars);
}
