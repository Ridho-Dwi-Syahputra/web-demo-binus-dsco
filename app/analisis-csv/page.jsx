import Link from "next/link";
import CsvAnalysis from "./csv-analysis";
import "../../frontend/csv-analysis.css";

export const metadata = { title: "Analisis CSV" };

export default function CsvPage() {
  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <header className="page-intro">
        <div><h1>Analisis data belajar</h1><p>Unggah catatan empat minggu pertama untuk melihat kelompok yang memerlukan perhatian dan langkah pendampingannya.</p></div>
      </header>
      <CsvAnalysis />
      <p className="page-note">Hasil membantu tutor menentukan prioritas. Konfirmasi situasi mahasiswa sebelum menetapkan tindak lanjut. <Link className="text-link" href="/panduan">Panduan tutor</Link></p>
    </main>
  );
}
