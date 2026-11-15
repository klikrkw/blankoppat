"use client";

/**
 * Membuat dan mengunduh file DOCX langsung di browser (klien).
 * File dibangun dari teks hasil render template; di produksi file
 * final dihasilkan oleh backend (python-docx) melalui endpoint
 * GET /api/v1/documents/{id}/download.
 */

export async function textToDocxBlob(text: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const lines = text.split("\n");
  const children = lines.map((line, i) =>
    new Paragraph({
      children: [new TextRun({ text: line, bold: i === 0 })],
      spacing: { after: 120 },
    })
  );
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadTextAsDocx(text: string, filename: string): Promise<void> {
  const blob = await textToDocxBlob(text);
  downloadBlob(blob, filename);
}

export function printText(title: string, text: string): void {
  const win = window.open("", "_blank", "width=794,height=1123");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: "Poppins", "Times New Roman", serif; font-size: 12pt;
         line-height: 1.6; color: #000; padding: 48px; white-space: pre-wrap; }
</style>
</head>
<body>${text}</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}
