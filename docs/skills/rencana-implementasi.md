# Rencana implementasi Ruang Tutor

Nama kerja produk adalah **Ruang Tutor**. Tujuan demo ialah membantu juri melihat bagaimana sinyal akademik pada data panitia dapat dipakai untuk memprioritaskan tindak lanjut. Satu alur inti disiapkan untuk presentasi dan dapat berjalan di laptop secara lokal.

## Alur satu halaman

1. **Beranda.** Judul “Kenali mahasiswa yang perlu ditindaklanjuti” dan tombol “Coba demo”. Di sampingnya ada ilustrasi ringkas berupa panel tutor dengan susunan sinyal, hasil, dan tindakan.
2. **Pilih contoh.** Pengguna memilih “Belum aktif di VLE”, “Asesmen terlewat”, atau “Aktivitas tercatat”. Ringkasan memuat modul, hari aktif, dan status asesmen yang relevan.
3. **Analisis.** Tombol “Analisis contoh” meminta server menghitung skor dengan model tersimpan. Saat proses berjalan, tampilkan status dan cegah pengiriman ganda. Saat contoh berganti, kosongkan hasil lama dan abaikan respons yang datang terlambat.
4. **Tindakan.** Hasil menampilkan skor model, status tindak lanjut, sinyal yang diamati, dan langkah yang bisa dipertimbangkan tutor. Contoh VLE kosong memunculkan cek akses. Contoh asesmen terlewat memunculkan usulan kontak tutor dalam 48 jam. Contoh dengan aktivitas tercatat dan skor di bawah batas menampilkan pemantauan rutin. Sinyal yang tampil adalah catatan input, tanpa mengklaim kontribusi masing-masing terhadap skor.
5. **Tentang model.** Penjelasan ringkas tentang sumber data kompetisi, tiga algoritma, dan cakupan demo. Untuk pertanyaan juri, jelaskan bahwa model kompetisi membentuk fitur dari kumpulan data modul dan sebagian memakai periode selanjutnya. Penerapan pada minggu keempat perlu dinilai dengan fitur yang sudah tersedia saat itu.

## Komponen

| Bagian | Lokasi | Keputusan |
|---|---|---|
| Model | `models/next/` | Paket hasil ekspor berisi pohon dari 90 estimator dan tiga contoh terproses. Joblib serta manifest sumber tersimpan di `models/ensemble/`. |
| Contoh demo | `models/next/contoh.json` | Pengguna memilih ID skenario, dan browser menerima ringkasan sinyal. |
| Inferensi | `lib/model.mjs` | Node.js memuat pohon saat analisis pertama, menghitung setiap skor, lalu merata-ratakan probabilitas. |
| Server lokal | `app/api/` | Next.js di loopback menyajikan halaman dan endpoint analisis dari alamat yang sama. |
| Halaman | `app/page.jsx` dan `app/demo.jsx` | React dengan stylesheet yang sudah diuji terhadap acuan UDA Planner. Aset disimpan lokal. |

Kontrak yang dipakai saat implementasi:

- `GET /api/examples` mengirim ringkasan sinyal untuk tiga contoh yang tersedia. `POST /api/predict` menerima JSON dengan satu properti `case_id`. ID sah ialah `belum-aktif`, `asesmen-terlewat`, atau `aktivitas-tercatat`.
- Respons sukses memuat `case_id`, `score`, `needs_follow_up`, dan `signals`. Gunakan istilah “skor model” pada layar. Ambil batas keputusan dari manifest.
- Beri `400` untuk JSON atau bentuk input yang salah, `404` untuk ID contoh yang tidak dikenal, dan pesan “Analisis belum bisa dijalankan. Coba lagi.” untuk kegagalan inferensi. Sajikan detail penyebab pada log server.
- Jalankan dengan Node.js 20.9 atau lebih baru. Sebelum presentasi, klik analisis sekali agar pohon sudah dimuat.

## Urutan kerja

| Tahap | Keluaran yang bisa diperiksa | Status |
|---|---|---|
| 1. Fondasi | Paket model dan contoh lokal, rencana, spesifikasi desain, dua skill, serta uji inferensi | Selesai. Ketiga contoh memberi label yang sesuai dan selisih skor maksimum di bawah 1 × 10⁻⁶ terhadap catatan internal run. |
| 2. Antarmuka | Halaman responsif dengan navigasi ringkas, panel pilihan contoh, dan tampilan untuk keadaan awal, berjalan, hasil, serta galat | Selesai. Review visual mencakup 1.440, 820, 390, dan 320 px. |
| 3. Integrasi | Halaman memanggil endpoint Python dan menampilkan hasil yang dihitung oleh model | Selesai. Tiga respons API cocok dengan inferensi langsung. |
| 4. Uji demo | Seluruh contoh dicoba di browser pada desktop dan ponsel | Selesai. Alur keyboard, pergantian contoh, galat dan coba ulang diperiksa, dengan akses jaringan dibatasi ke localhost. |

## Kriteria penerimaan MVP

- Dari beranda, pengguna dapat membuka demo, memilih contoh, dan menjalankan prediksi dengan keyboard atau sentuhan.
- Tiga ID contoh mengembalikan hasil dari fungsi inferensi. Pergantian contoh dan permintaan yang gagal menghasilkan keadaan UI yang jelas.
- Saat lebar 390 px dan 1440 px, halaman dan panel dapat dibaca tanpa geser horizontal. Tombol utama, skor, dan saran terlihat jelas dalam proyeksi layar.
- Dalam satu sesi demo, model dimuat sekali dan situs dapat digunakan setelah koneksi internet dimatikan.
- Tampilan dapat dijelaskan dalam satu menit. Contoh presentasi dimulai dari “Asesmen terlewat”, diteruskan ke skor, lalu usulan kontak tutor.

Mode formulir mahasiswa baru merupakan tahap tersendiri. Tahap tersebut memerlukan spesifikasi fitur mentah yang dapat diisi, preprocessing yang cocok, dan evaluasi model yang hanya memakai informasi yang tersedia pada waktu penilaian. Model tahap ini menerima preset yang telah diproses.
