# Pelita Belajar

## Deploy ke Vercel

Impor repositori ini ke Vercel sebagai proyek Next.js, gunakan root repositori, dan biarkan Build Command serta Output Directory mengikuti deteksi otomatis. Tidak ada environment variable tambahan yang diperlukan. Route API Next.js menjadi backend serverless pada deployment yang sama.

Dataset demo dan artefak model ikut dipaketkan agar halaman Data Belajar, Simulasi, template CSV, dan analisis unggahan berfungsi seperti versi lokal. Jangan menambahkan data mahasiswa baru atau rahasia ke repositori maupun log deployment.

Pelita Belajar membantu tutor memahami catatan belajar dan mencoba langkah pendampingan. Situs berjalan lokal dengan Next.js dan Node.js 20.9 atau lebih baru.

```powershell
.\start.ps1
```

Buka [Pelita Belajar](http://127.0.0.1:8787) setelah server siap. Gunakan `Ctrl+C` untuk menghentikannya atau jalankan `.\start.ps1 -Port 8788` jika port sudah dipakai.

| Halaman | Isi |
| --- | --- |
| Beranda | Gambaran singkat dan tautan ke setiap bagian |
| Ringkasan | Sebaran penanda risiko berdasarkan modul, pengumpulan tugas, dan aktivitas |
| Data Belajar | Seluruh 26.086 catatan latih dengan pencarian, filter, rincian 64 kolom, serta unduhan CSV |
| Analisis CSV | Template, pemeriksaan, prediksi, visualisasi, dan unduhan hasil untuk catatan empat minggu pertama |
| Simulasi | Analisis berdasarkan ID dari 6.502 catatan test, disertai skor, ringkasan catatan, dan saran tindakan |
| Panduan | Cara membaca status dan memperagakan satu simulasi |

Tabel dan grafik membaca `data/train.csv`. Simulasi menghitung skor dari model lokal dan fitur terproses yang sesuai dengan `data/test.csv`. Paket data dan model disimpan di dalam folder situs. Setelah dependensi npm terpasang, situs dapat dijalankan tanpa internet maupun Python.

Analisis CSV menggunakan model terpisah yang menerima fitur per catatan dan tidak membutuhkan urutan atau hubungan antar-ID. Unduh template dari halaman Analisis CSV untuk melihat formatnya. F1, precision, dan recall model tersebut ditampilkan dari data validasi yang dipisahkan dari pelatihan. Fitur ini memproses file secara lokal.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

- [Arah desain](docs/skills/arah-desain.md)
- [Panduan skill](docs/skills/README.md)
- [Model lokal dan cara memeriksa inferensi](models/README.md)
- [Lisensi font Plus Jakarta Sans](public/assets/OFL.txt)
