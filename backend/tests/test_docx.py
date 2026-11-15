"""Test generate DOCX dengan blok if/each/where antar-paragraf."""
import os
import tempfile
import unittest

from docx import Document

from app.core.docx_engine import extract_docx_text, generate_docx


class DocxBlockTest(unittest.TestCase):
    def _build_template(self, path: str) -> None:
        doc = Document()
        doc.add_paragraph("{{#with peran.PENERIMA[0]}}")
        doc.add_paragraph("{{nama}}")
        doc.add_paragraph("{{/with}}")
        doc.add_paragraph("{{#if count(peran.PENERIMA)>1}}")
        doc.add_paragraph("{{#each peran.PENERIMA where @index>0}}")
        doc.add_paragraph("{{@number}}/{{@count}}. {{nama}}")
        doc.add_paragraph("{{/each}}")
        doc.add_paragraph("{{/if}}")
        doc.save(path)

    def test_each_where_blocks(self):
        ctx = {
            "peran": {
                "PENERIMA": [
                    {"nama": "ANY"},
                    {"nama": "AGUS"},
                    {"nama": "JUWITA"},
                ]
            }
        }
        with tempfile.TemporaryDirectory() as tmp:
            template = os.path.join(tmp, "template.docx")
            output = os.path.join(tmp, "output.docx")
            self._build_template(template)
            generate_docx(template, output, ctx)
            text = extract_docx_text(output)
            self.assertIn("ANY", text)
            self.assertIn("1/2. AGUS", text)
            self.assertIn("2/2. JUWITA", text)
            self.assertNotIn("-/-.", text)
            self.assertNotIn("{{", text)

    def test_same_paragraph_each_where(self):
        """each+where dalam satu paragraf (dulu memicu ValueError)."""
        doc = Document()
        doc.add_paragraph(
            "{{#each peran.PENERIMA where @index>0}}{{@number}}. {{nama}};{{/each}}"
        )
        ctx = {"peran": {"PENERIMA": [{"nama": "A"}, {"nama": "B"}, {"nama": "C"}]}}
        with tempfile.TemporaryDirectory() as tmp:
            template = os.path.join(tmp, "template.docx")
            output = os.path.join(tmp, "output.docx")
            doc.save(template)
            generate_docx(template, output, ctx)
            text = extract_docx_text(output)
            self.assertIn("1. B;", text)
            self.assertIn("2. C;", text)
            self.assertNotIn("A;", text)
            self.assertNotIn("{{", text)

    def test_each_over_table(self):
        """Blok each yang membungkus tabel Word (placeholder di sel tabel)."""
        doc = Document()
        doc.add_paragraph("{{#each peran.PENERIMA as p}}")
        table = doc.add_table(rows=2, cols=2)
        table.cell(0, 0).text = "{{@number}}"
        table.cell(0, 1).text = "Nama"
        table.cell(1, 0).text = "{{p.nama}}"
        table.cell(1, 1).text = "{{p.nik}}"
        doc.add_paragraph("{{/each}}")

        ctx = {
            "peran": {
                "PENERIMA": [
                    {"nama": "SUNARTI", "nik": "111"},
                    {"nama": "SUYAT", "nik": "222"},
                ]
            }
        }
        with tempfile.TemporaryDirectory() as tmp:
            template = os.path.join(tmp, "template.docx")
            output = os.path.join(tmp, "output.docx")
            doc.save(template)
            generate_docx(template, output, ctx)
            text = extract_docx_text(output)
            self.assertIn("SUNARTI", text)
            self.assertIn("SUYAT", text)
            self.assertIn("111", text)
            self.assertIn("222", text)
            self.assertNotIn("-", text.split())
            self.assertNotIn("{{", text)

    def test_empty_penerima_no_placeholder_left(self):
        ctx = {"peran": {"PENERIMA": []}}
        with tempfile.TemporaryDirectory() as tmp:
            template = os.path.join(tmp, "template.docx")
            output = os.path.join(tmp, "output.docx")
            self._build_template(template)
            generate_docx(template, output, ctx)
            text = extract_docx_text(output)
            self.assertNotIn("-/-.", text)
            self.assertNotIn("{{", text)
            self.assertNotIn("ANY", text)


if __name__ == "__main__":
    unittest.main()
