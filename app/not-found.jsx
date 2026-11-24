import Link from "next/link";

export default function NotFound() {
  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <header className="page-intro"><div><h1>Halaman tidak ditemukan</h1><p>Telusuri data belajar untuk mencari catatan lain.</p></div></header>
      <Link className="button button-primary" href="/data-belajar">Buka data belajar</Link>
    </main>
  );
}
