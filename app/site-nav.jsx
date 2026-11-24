"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  ["/", "Beranda"],
  ["/dashboard", "Ringkasan"],
  ["/data-belajar", "Data Belajar"],
  ["/analisis-csv", "Analisis CSV"],
  ["/simulasi", "Simulasi"],
  ["/panduan", "Panduan"],
];

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <nav className="nav shell site-menu" aria-label="Navigasi utama">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true" />Pelita Belajar</Link>
        <div className="site-menu-links">
          {pages.map(([path, label]) => (
            <Link key={path} href={path} aria-current={
              path === pathname || (path !== "/" && pathname.startsWith(`${path}/`)) ? "page" : undefined
            }>{label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
