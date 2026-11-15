-- ============================================================
-- SAMPLE DATA — tabel existing (ektp, jenishak, letak, obyek)
-- OPSIONAL: jalankan manual bila tabel existing masih kosong.
--
--   mysql -u webuser -p blanko_ppat < sample_existing_data.sql
-- ============================================================

INSERT IGNORE INTO jenishak (id, nama_jenishak, singkatan) VALUES
    (1, 'Hak Milik', 'HM'),
    (2, 'Hak Guna Bangunan', 'HGB'),
    (3, 'Hak Pakai', 'HP'),
    (4, 'Hak Guna Usaha', 'HGU');

INSERT IGNORE INTO letak (id, nama_desa, kecamatan_id) VALUES
    (1, 'Ngemplak Kidul', 1),
    (2, 'Bapangan', 1),
    (3, 'Panggang', 1),
    (4, 'Pecangaan Kulon', 2),
    (5, 'Ngabul', 3);

INSERT IGNORE INTO ektp
    (id, nik, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, rt, rw,
     kelurahan, kecamatan, agama, status_perkawinan, pekerjaan, kewarganegaraan)
VALUES
    (1, '3320011001830001', 'AGUS KUNCORO WARDONO', 'Jepara', '1985-01-10',
     'LAKI-LAKI', 'Jalan Kartini No. 12', '002', '005', 'Panggang', 'Jepara',
     'Islam', 'Kawin', 'Wiraswasta', 'WNI'),
    (2, '3320014502880002', 'SITI NURHALIZA', 'Kudus', '1988-02-15',
     'PEREMPUAN', 'Jalan Pemuda No. 45', '003', '001', 'Bapangan', 'Jepara',
     'Islam', 'Kawin', 'Karyawan Swasta', 'WNI'),
    (3, '3320011109900003', 'BUDI SANTOSO', 'Semarang', '1990-09-11',
     'LAKI-LAKI', 'Jalan A. Yani No. 8', '001', '003', 'Pecangaan Kulon', 'Pecangaan',
     'Kristen', 'Belum Kawin', 'Pengusaha', 'WNI');

INSERT IGNORE INTO obyek
    (id, jenishak_id, jenis_sertipikat, nomor_hak, persil, klas, luas_tanah,
     luas_bangunan, atas_nama, penggunaan, no_surat_ukur, tanggal_surat_ukur,
     nib, batas_utara, batas_timur, batas_selatan, batas_barat, letak_id)
VALUES
    (1, 1, 'manual', '1234', '56', 'D.II', 1200, 180, 'AGUS KUNCORO WARDONO',
     'non-pertanian', '00432/SU/2025', '2025-11-02', '33200112345678',
     'Tanah milik H. Rasyid', 'Jalan desa', 'Sungai kecil', 'Tanah milik Budi Santoso', 1),
    (2, 1, 'elektronik', '2201', '112', 'D.III', 850, NULL, 'H. MOHAMMAD SYAFII',
     'pertanian', '00510/SU/2025', '2025-12-15', '33200187654321',
     'Tanah milik desa', 'Jalan setapak', 'Tanah milik Lestari', 'Saluran irigasi', 3);
