import unittest
from types import SimpleNamespace

from app.api.routes import serialize_obyek
from app.models import Wilayah


class FakeSession:
    def __init__(self, wilayah):
        self.wilayah = wilayah

    def get(self, model, pk):
        if model is Wilayah:
            return self.wilayah
        return None


class SerializeObyekTest(unittest.TestCase):
    def test_wilayah_exposes_tipe_kabupaten(self):
        """{{wilayah.tipe_kabupaten}} / {{obyek.wilayah.tipe_kabupaten}} harus terisi."""
        wilayah = SimpleNamespace(
            id=400,
            kode_wilayah="3318212010",
            desa="Tlutup",
            tipe_desa="Desa",
            kecamatan="Trangkil",
            kabupaten="Pati",
            tipe_kabupaten="Kabupaten",
            provinsi="JAWA TENGAH",
        )
        obyek = SimpleNamespace(
            id=6,
            jenishak_id=None,
            jenis_sertipikat="manual",
            nomor_hak="63536",
            persil="",
            klas="",
            luas_tanah=120,
            luas_bangunan=None,
            atas_nama="MUGIYO",
            penggunaan="non-pertanian",
            no_surat_ukur="",
            tanggal_surat_ukur=None,
            nib="",
            nop="",
            nomor_seri_blanko=None,
            batas_utara="",
            batas_timur="",
            batas_selatan="",
            batas_barat="",
            wilayah_id=400,
            edisi_id=None,
            edisi=None,
        )

        data = serialize_obyek(obyek, FakeSession(wilayah))

        self.assertEqual(data["wilayah"]["tipe_kabupaten"], "Kabupaten")
        self.assertEqual(data["wilayah"]["tipe_desa"], "Desa")
        self.assertEqual(data["tipe_kabupaten"], "Kabupaten")
        self.assertEqual(data["tipe_desa"], "Desa")


if __name__ == "__main__":
    unittest.main()
