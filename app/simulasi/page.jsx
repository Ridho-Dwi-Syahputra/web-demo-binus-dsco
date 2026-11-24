import Link from "next/link";
import Demo from "../demo";

export const metadata = { title: "Simulasi" };

export default function Simulasi() {
  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <header className="page-intro"><div><h1>Analisis pendampingan</h1><p>Masukkan ID catatan dari data test untuk melihat skor, ringkasan belajar, dan langkah pendampingan.</p></div></header>
      <section className="demo-window" aria-label="Simulasi tutor">
        <div className="window-top"><span className="illustration-dots" aria-hidden="true"><i /><i /><i /></span>Analisis data test</div>
        <Demo />
      </section>
      <p className="page-note">Data historis mencakup informasi yang tersedia setelah periode awal. <Link className="text-link" href="/panduan">Baca panduan penggunaan</Link></p>
    </main>
  );
}
