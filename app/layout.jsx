import Link from "next/link";
import "../frontend/styles.css";
import SiteNav from "./site-nav";

export const metadata = {
  title: { default: "Pelita Belajar", template: "%s | Pelita Belajar" },
  description: "Ruang untuk memahami catatan belajar dan merencanakan pendampingan mahasiswa.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#konten">Lewati ke isi</a>
        <SiteNav />
        {children}
        <footer className="site-footer shell"><strong>Pelita Belajar</strong><Link className="text-link" href="/panduan">Panduan tutor</Link></footer>
      </body>
    </html>
  );
}
