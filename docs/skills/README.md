# Skill untuk website Ruang Tutor

Mulai dari [rencana implementasi](rencana-implementasi.md), lalu gunakan [arah desain](arah-desain.md) sebagai acuan UI. Dua skill resmi Anthropic disalin dari commit `e4bb5d960d87126ff3b3a8af1a104b7db67560ba` beserta lisensinya. Salinan tersedia untuk dibaca langsung dari workspace.

| Tahap | Skill | Penerapan |
|---|---|---|
| Menjaga ukuran MVP | `C:/Users/Asus/.agents/skills/lean-build/SKILL.md` | Selesaikan satu alur demo dari pemilihan contoh sampai tindak lanjut. Gunakan adapter yang sudah berjalan sebelum menambah infrastruktur. |
| Menyusun antarmuka | [Frontend Design](referensi/frontend-design/SKILL.md) | Ambil aturan warna, tipografi, dan bayangan dari acuan. Buat komposisi dan isi khusus untuk tutor. [Sumber resmi](https://github.com/anthropics/skills/tree/main/skills/frontend-design) |
| Memeriksa UI | [Webapp Testing](referensi/webapp-testing/SKILL.md) | Gunakan browser sungguhan untuk memeriksa layout, perpindahan contoh, hasil inferensi, pesan galat, fokus keyboard, dan tangkapan layar. [Playwright](https://playwright.dev/docs/intro) |
| Menutup tahap | `C:/Users/Asus/.agents/skills/verify-and-stop/SKILL.md` | Buktikan alur demo dan kontrak respons berfungsi, lalu cocokkan tampilan desktop serta ponsel dengan spesifikasi. |

Skills.sh mencatat sekitar 1,2 juta instalasi untuk [Frontend Design](https://skills.sh/anthropics/skills/frontend-design) dan 213 ribu untuk [Webapp Testing](https://skills.sh/anthropics/skills/webapp-testing) saat diperiksa. Jika proyek dipindahkan dan salinan skill diperlukan, perintah upstream adalah `npx skills add https://github.com/anthropics/skills --skill frontend-design` dan `npx skills add https://github.com/anthropics/skills --skill webapp-testing`.
