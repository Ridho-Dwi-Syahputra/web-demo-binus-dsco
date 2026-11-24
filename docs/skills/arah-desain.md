# Arah desain dari UDA Planner

Acuan visual diperiksa dengan hasil render browser pada [UDA Planner](https://uda-planner.vercel.app/). Catatan di bawah memakai tampilan dan warna yang terlihat pada [desktop 1440 × 1000](referensi/uda-planner/uda-desktop.png) dan [ponsel 390 × 844](referensi/uda-planner/uda-mobile.png).

## Warna dan gaya

| Token web | Warna acuan | Peran di Ruang Tutor |
|---|---|---|
| Teks dan garis | `#0F172A` | Judul, teks utama, garis panel, tombol utama |
| Permukaan | `#FFFFFF` | Navigasi, panel contoh, tombol sekunder |
| Dasar hangat | `#F8F6F0` | Dasar latar; bagian hero tampak putih dengan semburat hijau dan biru tipis |
| Teks sekunder | `#475569` | Penjelasan dan label kecil dengan kontras yang jelas |
| Hijau | `#16A34A` | Bayangan pendek pada tombol utama dan indikator tindakan |
| Mint | `#DCFCE7`, `#A7F3D0` | Tanda status atau area tindakan. Pasangkan permukaan terang dengan teks gelap. |
| Biru muda | `#BAE6FD` | Informasi sinyal aktivitas |
| Kuning muda | `#FEF08A` | Asesmen yang membutuhkan perhatian |
| Oranye | `#F97316` | Satu guratan penekanan pada hero |

Gunakan **Plus Jakarta Sans** dengan judul tebal, teks utama navy, serta body yang tetap nyaman dibaca. Ukuran sasaran H1 sekitar 56–60 px di desktop dan 36–40 px di ponsel. Gunakan garis 2–2,5 px dan bayangan keras sekitar 3–4 px dengan warna navy. Tombol berbentuk pil dengan tinggi minimal 44 px. Permukaan kartu hasil memakai radius sekitar 16–22 px. Semburat mint dan biru di hero cukup tipis sehingga teks tetap tegas.

## Susunan halaman

| Bagian | Desktop | Ponsel |
|---|---|---|
| Navigasi | Bar putih bergaris dengan lebar maksimum sekitar 1.200 px. Kiri “Ruang Tutor”, kanan tautan “Cara kerja” dan tombol “Coba demo”. | Nama dan tombol demo tetap terlihat. Tautan tambahan bisa pindah ke bagian bawah. |
| Hero | Dua kolom. Judul dan CTA di kiri, panel ringkas hasil tutor di kanan. Gunakan garis oranye di bawah satu bagian judul. | Satu kolom. Judul, penjelasan, tombol penuh, lalu panel tutor. |
| Demo | Panel utama lebar. Pilihan skenario dan sinyal di kiri. Skor dan tindakan tutor di kanan. Pemisah dan ruang yang cukup menjaga keterbacaan. | Pilihan contoh → sinyal → tombol → hasil → tindakan, mengikuti urutan tab yang sama. |
| Penjelasan | Tiga langkah pendek: pilih contoh, analisis, tentukan tindak lanjut. Bawahnya catatan ringkas mengenai model kompetisi. | Langkah ditumpuk, teks satu kolom. |

Panel tutor memakai komposisi sendiri dengan status asesmen dan hari aktif. Gunakan aksen pastel untuk memberi hierarki pada data. Tampilkan status dengan teks dan warna sekaligus, serta fokus keyboard yang mudah terlihat. Judul dan panel utama langsung tampak ketika halaman dibuka. Animasi tekan ringan boleh dipakai dan menghormati preferensi pengurangan gerak. Aset visual acuan disimpan sebagai bahan pemeriksaan desain lokal.

## Pemeriksaan saat halaman tersedia

- Bandingkan ukuran judul, warna latar, jarak antara CTA, ketegasan garis, dan cara kolom berpindah terhadap tangkapan referensi.
- Uji kondisi fokus, loading, hasil berisiko, hasil pemantauan rutin, serta kegagalan server di desktop dan ponsel.
- Cek bahwa pengunjung dapat membedakan sinyal dari rekomendasi tanpa mengandalkan warna. Gunakan elemen HTML dengan label yang sesuai. [Panduan aksesibilitas MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML)
