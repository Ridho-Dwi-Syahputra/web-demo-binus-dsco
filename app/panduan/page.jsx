import Link from "next/link";

export const metadata = { title: "Panduan" };

export default function Panduan() {
  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <header className="page-intro">
        <div><h1>Panduan tutor</h1><p>Mulai dengan membaca catatan, tentukan apa yang perlu dikonfirmasi, lalu pilih bantuan bersama mahasiswa.</p></div>
        <Link className="button button-primary" href="/simulasi">Buka simulasi</Link>
      </header>
      <ol className="steps guide-steps">
        <li className="step step-blue"><div><h2>Lihat gambaran umum</h2><p>Buka <Link className="text-link" href="/dashboard">Ringkasan</Link> dan bandingkan porsi per kelompok. Klik modul untuk menelusuri catatan yang mendasarinya.</p></div></li>
        <li className="step step-yellow"><div><h2>Periksa satu catatan</h2><p>Di <Link className="text-link" href="/data-belajar">Data Belajar</Link>, cari ID atau pilih filter. Buka satu ID untuk melihat profil, tugas, aktivitas, dan penanda risiko.</p></div></li>
        <li className="step step-mint"><div><h2>Tentukan tindak lanjut</h2><p>Masukkan ID dari data test di <Link className="text-link" href="/simulasi">Simulasi</Link>. Baca hasil dan catat langkah pendampingan yang perlu dikonfirmasi.</p></div></li>
      </ol>
      <section className="panel guide-panel">
        <h2>Arti status yang muncul</h2>
        <dl>
          <div><dt>Ditandai berisiko</dt><dd>Penanda yang tercatat di data belajar. Ringkasan menghitung penanda ini dari setiap catatan.</dd></div>
          <div><dt>Belum tercatat</dt><dd>Aktivitas atau nilai belum tersedia dalam catatan. Tutor bisa menanyakan akses atau memeriksa catatan lain.</dd></div>
          <div><dt>Status pengumpulan lain</dt><dd>Catatan tidak memiliki penanda tugas yang belum dikumpulkan hingga waktu pencatatan.</dd></div>
          <div><dt>Skor prioritas</dt><dd>Skor analisis untuk catatan test yang dipilih. Gunakan status dan catatan belajar sebagai bahan untuk menentukan tindak lanjut.</dd></div>
        </dl>
      </section>
      <section className="panel guide-panel">
        <h2>Menganalisis CSV</h2>
        <p>Buka <Link className="text-link" href="/analisis-csv">Analisis CSV</Link> dan unduh template. Isi satu baris per catatan dengan informasi empat minggu pertama, lalu unggah file. Jika ada kolom atau nilai yang perlu diperbaiki, halaman akan menunjukkannya.</p>
        <p>Setelah analisis selesai, baca ringkasan prioritas dan penanda aktivitas, lalu lihat daftar hasil atau unduh CSV. Model untuk unggahan memakai fitur per catatan dan memiliki hasil evaluasi tersendiri pada halaman tersebut.</p>
      </section>
      <section className="panel guide-panel step-mint">
        <h2>Untuk mendemokan dalam satu menit</h2>
        <p>Buka Simulasi, masukkan <strong>26098</strong>, lalu tekan <strong>Analisis catatan</strong>. Tunjukkan ringkasan belajar, skor, dan langkah pendampingan. Ulangi dengan ID lain untuk membandingkan hasil.</p>
        <p>Catatan test bersifat historis. Sebagian informasinya tersedia setelah periode awal. Tutor meninjau situasi dan memastikan bantuan sesuai dengan kebutuhan mahasiswa.</p>
      </section>
    </main>
  );
}
