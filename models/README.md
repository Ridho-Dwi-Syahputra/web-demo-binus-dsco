# Paket model lokal

Server Next.js memuat `next/ensemble.json.gz` dan `next/test_features.json.gz`. Paket ini menyimpan pohon dari ketiga algoritma dan 74 fitur untuk semua 6.502 ID test. Node.js menjalankan pohonnya ketika endpoint menerima permintaan. Jalankan `node scripts/verify_model.mjs` dari root proyek untuk memeriksa tiga contoh referensi.

Validasi ekspor mencakup 6.502 baris dari matriks uji terproses. Label ensemble Node.js cocok dengan referensi Python pada semua baris. Selisih skor maksimum per algoritma sekitar 2,6 × 10⁻⁸.

## Artefak sumber

`ensemble/` menyimpan LightGBM, XGBoost, dan CatBoost hasil pembuatan ulang. Setiap berkas berisi 30 estimator. Ketiganya merupakan salinan dari `../DSCO BINUS-ZHAHRA/models/hasil_ulang/` relatif terhadap root `web binus`. Hash, versi pustaka, susunan 74 fitur, dan parameter inferensi tercatat di `ensemble/manifest.json`.

`fixtures/contoh_demo.joblib` memuat tiga contoh: belum aktif di VLE, asesmen terlewat, dan aktivitas tercatat. Contoh dipilih dari matriks uji yang sudah diproses, memakai ID skenario yang dibuat khusus untuk demo. Data fixture menyediakan representasi kategorikal untuk LightGBM dan ordinal untuk XGBoost serta CatBoost. Nilai ekspektasi hanya dipakai oleh verifikasi lokal.

Untuk membuat ulang ekspor setelah mengganti model sumber, jalankan perintah berikut dari root `web binus` memakai lingkungan DSCO:

```powershell
$python = '..\DSCO BINUS-ZHAHRA\folder kumpul\_VERIFIKASI_RERUN_20261102\runtime_python313\python.exe'
& $python .\scripts\export_models.py
```

Ekspor menggunakan Python 3.13 dan versi paket pada manifest. Browser menerima hasil prediksi dan ringkasan sinyal untuk demo. Folder `backend/` menyimpan jalur inferensi Python terdahulu sebagai referensi.

Fitur test dibangun ulang dari matriks terproses yang dipakai saat validasi model. Urutan ID dan nama fitur diperiksa terhadap CSV test dan manifest:

```powershell
& $python .\scripts\export_test_features.py '..\DSCO BINUS-ZHAHRA\models\hasil_ulang\fitur_test_validasi.joblib' .\data\test.csv
```
