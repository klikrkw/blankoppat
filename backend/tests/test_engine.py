"""Unit test terbilang & template engine."""
import unittest

from app.core.functions import eval_expr
from app.core.template_engine import render_text
from app.core.terbilang import (
    format_date,
    format_number,
    terbilang,
    terbilang_tanggal,
)


class TerbilangTest(unittest.TestCase):
    def test_angka_dasar(self):
        self.assertEqual(terbilang(0), "Nol")
        self.assertEqual(terbilang(11), "Sebelas")
        self.assertEqual(terbilang(25), "Dua puluh lima")
        self.assertEqual(terbilang(100), "Seratus")

    def test_angka_besar(self):
        self.assertEqual(terbilang(500000000), "Lima ratus juta")
        self.assertEqual(
            terbilang(500000000, "rupiah"), "Lima ratus juta rupiah"
        )
        self.assertEqual(terbilang(1000), "Seribu")
        self.assertEqual(terbilang(1985), "Seribu sembilan ratus delapan puluh lima")

    def test_negatif_dan_desimal(self):
        self.assertEqual(terbilang(-5), "Minus lima")
        self.assertIn("koma", terbilang(3.5))

    def test_format_angka(self):
        self.assertEqual(format_number(500000000), "500.000.000")

    def test_tanggal(self):
        self.assertEqual(format_date("1985-01-10", "DD MMMM YYYY"), "10 Januari 1985")
        self.assertIn("sepuluh Januari", terbilang_tanggal("1985-01-10"))


class TemplateEngineTest(unittest.TestCase):
    def setUp(self):
        self.context = {
            "pihak": {"nama": "AGUS KUNCORO WARDONO", "nik": "3320011001830001"},
            "obyek": {"luas_tanah": 1200, "jenishak": {"nama_jenishak": "Hak Milik"}},
            "custom": {"harga_transaksi": 500000000},
        }

    def test_variable_sederhana(self):
        self.assertEqual(
            render_text("Nama: {{pihak.nama}}", self.context),
            "Nama: AGUS KUNCORO WARDONO",
        )

    def test_nested_variable(self):
        self.assertEqual(
            render_text("{{obyek.jenishak.nama_jenishak}}", self.context),
            "Hak Milik",
        )

    def test_function(self):
        self.assertEqual(
            render_text("{{terbilang(custom.harga_transaksi, 'rupiah')}}", self.context),
            "Lima ratus juta rupiah",
        )

    def test_conditional(self):
        template = "{{#if obyek.luas_tanah}}Ada luas{{else}}Tidak ada{{/if}}"
        self.assertEqual(render_text(template, self.context), "Ada luas")

    def test_missing_variable(self):
        self.assertEqual(render_text("{{obyek.nib}}", self.context), "-")

    def test_loop(self):
        template = "{{#each pihak_list}}{{nama}};{{/each}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}]}
        self.assertEqual(render_text(template, context), "A;B;")

    def test_loop_index(self):
        template = (
            "{{#each pihak_list}}"
            "{{#if @index == 0}}PERTAMA: {{nama}}{{else}}LAIN: {{nama}}{{/if}}"
            "{{/each}}"
        )
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}]}
        self.assertEqual(render_text(template, context), "PERTAMA: ALAIN: B")

    def test_loop_index_output(self):
        template = "{{#each pihak_list}}[{{@index}}]{{nama}} {{/each}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}]}
        self.assertEqual(render_text(template, context), "[0]A [1]B ")

    def test_with_list_iterates(self):
        template = "{{#with pihak_list as p}}{{@index}}. {{p.nama}};{{/with}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}]}
        self.assertEqual(render_text(template, context), "0. A;1. B;")

    def test_each_where_index(self):
        template = "{{#each pihak_list where @index>0}}{{index}}. {{nama}} | {{/each}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}, {"nama": "C"}]}
        self.assertEqual(render_text(template, context), "2. B | 3. C | ")

    def test_each_where_range(self):
        template = "{{#each pihak_list where @index>=1 and @index<=2}}{{nama}}{{/each}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}, {"nama": "C"}, {"nama": "D"}]}
        self.assertEqual(render_text(template, context), "BC")

    def test_each_where_specific_index(self):
        template = "{{#each pihak_list where @index==0 or @index==2}}{{nama}};{{/each}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}, {"nama": "C"}]}
        self.assertEqual(render_text(template, context), "A;C;")

    def test_each_where_field(self):
        template = "{{#each pihak_list where nama=='B'}}{{nama}}{{/each}}"
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}]}
        self.assertEqual(render_text(template, context), "B")

    def test_with_empty_target_skips_block(self):
        template = "A{{#with peran.PENERIMA[0]}}{{nama}}{{/with}}B"
        self.assertEqual(render_text(template, {"peran": {"PENERIMA": []}}), "AB")
        self.assertEqual(render_text(template, {}), "AB")
        self.assertEqual(
            render_text(template, {"peran": {"PENERIMA": [{"nama": "X"}]}}), "AXB"
        )

    def test_each_first_last_count(self):
        template = (
            "{{#each pihak_list where @index>0}}"
            "{{#if @first}}P:{{/if}}{{#if @last}}T:{{/if}}{{nama}}({{@number}}/{{@count}});"
            "{{/each}}"
        )
        context = {"pihak_list": [{"nama": "A"}, {"nama": "B"}, {"nama": "C"}]}
        self.assertEqual(render_text(template, context), "P:B(1/2);T:C(2/2);")


if __name__ == "__main__":
    unittest.main()
