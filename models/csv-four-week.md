# Model CSV empat minggu

Model LightGBM ini membaca satu baris secara mandiri. Empat belas kolom masukan membentuk 15 fitur model. `id` dapat dipakai pemanggil sebagai identitas catatan. Model mengabaikan kolom tambahan, termasuk `id`, `at_risk`, kode modul/periode, demografi, dan fitur tautan. Pelatihan membaca hanya `data/train.csv` dengan target `at_risk`.

| Kelompok | Kolom wajib | Asal dan batas |
|---|---|---|
| Riwayat saat awal studi | `num_of_prev_attempts`, `studied_credits` | Riwayat percobaan dan beban studi dalam schema DSCO. Pada sistem baru, ambil keduanya dari catatan yang sudah tersedia saat batas observasi. |
| Asesmen awal | `has_score`, `avg_score`, `no_submission_by_cutoff` | Dokumentasi dataset menyatakan fitur asesmen berasal dari jendela hingga hari 28. Gunakan nilai dan flag yang sudah tercatat pada batas itu. Flag bernilai 0 atau 1. Saat `has_score=0`, kosongkan `avg_score` atau masukkan angka 0–100. Skor itu diperlakukan sebagai data kosong. |
| Aktivitas awal | `interaction_volume`, `active_days`, `unique_sites`, `first_activity_day`, `last_activity_day`, `week1_interactions` sampai `week4_interactions` | Gunakan aktivitas hari 0–28. Hari pertama dan terakhir berada di 0–28. Jumlah hari aktif bisa 29 karena kedua batas inklusif. Isi nol pada kolom jumlah serta kosongkan hari pertama/terakhir bila belum aktif. |

Sumber definisi adalah [catatan dataset DSCO](../../DSCO%20BINUS-ZHAHRA/docs/04_dataset.md) poin 10–12 dan notebook asli bagian 3.1b. Kode menyalin aturan nilai pengisi notebook. Kombinasi `interaction_volume=182`, `active_days=10`, `unique_sites=20`, `first_activity_day=1`, dan `last_activity_day=26` ditandai sebagai aktivitas belum tercatat. Input baru juga dapat menyatakan kondisi itu dengan kolom jumlah nol. Model menambahkan `vle_none`, menetapkan nol pada jumlah aktivitas, dan memperlakukan hari pertama serta terakhir sebagai kosong. Gunakan konvensi DSCO untuk unggahan baru karena flag tanggal asli tidak tersedia di data publik.

## Evaluasi

Data latih DSCO berisi 26.086 baris berlabel. Split terstratifikasi mengelompokkan vektor fitur yang identik agar satu vektor tidak masuk ke dua set. Ambang dipilih dari F1 pada 5.217 baris kalibrasi. Artefak memakai model yang dipasang pada 15.652 baris fit. Sebanyak 5.217 baris di luar kedua proses tersebut mengukur kualitas model. Nilai lengkap direkam dalam `next/csv-four-week.json`.

| Set | Baris | F1 | Precision | Recall |
|---|---:|---:|---:|---:|
| Fit | 15.652 | 74,82% | 79,63% | 70,56% |
| Evaluasi held-out | 5.217 | 74,22% | 78,51% | 70,37% |

Metrik ini mengukur hasil pada bagian data latih DSCO yang disisihkan. Identitas mahasiswa unik tidak tersedia sehingga pengujian tidak menjamin pemisahan antarorang. Penerapan pada institusi atau periode baru memerlukan pengujian tambahan berdasarkan label aktual dan ketepatan pengambilan fitur.

## Reproduksi dan pemakaian

Jalankan dari `web binus` dalam PowerShell dengan lingkungan Python DSCO yang sudah ada di workspace.

```powershell
$python = '..\DSCO BINUS-ZHAHRA\folder kumpul\_VERIFIKASI_RERUN_20261102\runtime_python313\python.exe'
& $python scripts\train_csv_four_week.py
```

`--train` dan `--output` dapat digunakan untuk menentukan jalur lain. `--verification-output` menyimpan referensi Python lokal berupa input held-out, skor, dan keputusan untuk pemeriksaan portabilitas. Modul `lib/csv-model.mjs` mengekspor `CSV_REQUIRED_COLUMNS`, `predictCsvRow(raw)`, `CsvInputError`, dan `csvModelInfo()`. Nilai masukan dapat berupa string CSV atau angka. `predictCsvRow` memuat pohon yang sama dengan model evaluasi dan mengembalikan `score`, `needs_follow_up`, serta ringkasan empat sinyal utama. Model ini tersendiri dari ensemble historis untuk ID test asli.
