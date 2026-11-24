import Link from "next/link";
import { dataQuery, hasActivity, integer, riskLabel, taskLabel, trainingData } from "../../lib/training-data.mjs";
import FilterSelect from "../filter-select";

export const metadata = { title: "Data Belajar" };

function pick(value, choices, fallback = "") {
  return choices.includes(value) ? value : fallback;
}

export default async function DataBelajar({ searchParams }) {
  const params = await searchParams;
  const { columns, rows, modules, periods } = trainingData();
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 24) : "";
  const moduleFilter = pick(params.modul, modules);
  const periodFilter = pick(params.periode, periods);
  const risk = pick(params.risiko, ["0", "1"]);
  const order = pick(params.urut, ["asc", "desc"], "asc");
  const size = Number(pick(params.jumlah, ["25", "50", "100"], "25"));
  const filters = { q: search, modul: moduleFilter, periode: periodFilter, risiko: risk, urut: order, jumlah: size };
  const filtered = rows.filter((row) => (!search || row.id.includes(search))
    && (!moduleFilter || row.code_module === moduleFilter)
    && (!periodFilter || row.code_presentation === periodFilter)
    && (!risk || row.at_risk === risk));
  if (order === "desc") filtered.reverse();
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const requestedPage = Number(params.halaman);
  const page = Number.isSafeInteger(requestedPage) ? Math.max(1, Math.min(pageCount, requestedPage)) : 1;
  const offset = (page - 1) * size;
  const pageRows = filtered.slice(offset, offset + size);
  const pageLink = (number) => `/data-belajar${dataQuery(filters, { halaman: number })}`;
  const detailQuery = dataQuery(filters, { halaman: page });

  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <header className="page-intro">
        <div><h1>Data belajar</h1><p>Telusuri {integer.format(rows.length)} catatan. Setiap baris mewakili satu catatan mahasiswa dalam satu modul dan periode.</p></div>
        <a className="button button-outline" href="/api/data-belajar/unduh" download>Unduh CSV lengkap <span aria-hidden="true">↓</span></a>
      </header>
      <section className="panel explorer" aria-labelledby="explorer-title">
        <h2 id="explorer-title">Jelajahi catatan</h2>
        <form className="filter-form" action="/data-belajar" method="get" key={detailQuery}>
          <label>Cari ID<input name="q" defaultValue={search} placeholder="Contoh 131" inputMode="numeric" maxLength={24} /></label>
          <FilterSelect name="modul" label="Modul" initialValue={moduleFilter} options={[["", "Semua modul"], ...modules.map((name) => [name, name])]} />
          <FilterSelect name="periode" label="Periode" initialValue={periodFilter} options={[["", "Semua periode"], ...periods.map((name) => [name, name])]} />
          <FilterSelect name="risiko" label="Penanda risiko" initialValue={risk} options={[["", "Semua status"], ["1", "Ditandai berisiko"], ["0", "Tidak ditandai"]]} />
          <FilterSelect name="urut" label="Urutan" initialValue={order} options={[["asc", "ID terkecil"], ["desc", "ID terbesar"]]} />
          <FilterSelect name="jumlah" label="Baris per halaman" initialValue={size} options={["25", "50", "100"].map((count) => [count, count])} />
          <div className="filter-actions"><button className="button button-primary" type="submit">Terapkan filter</button><Link className="text-link" href="/data-belajar">Hapus filter</Link></div>
        </form>
        <div className="table-status">
          <strong>{integer.format(filtered.length)} catatan ditemukan</strong>
          <span>Buka satu ID untuk melihat semua {columns.length} kolom.</span>
        </div>
        {pageRows.length ? <>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabel data belajar">
            <table className="data-table" aria-labelledby="explorer-title">
              <thead><tr><th scope="col">ID catatan</th><th scope="col">Modul</th><th scope="col">Periode</th><th scope="col">Hari aktif</th><th scope="col">Pengumpulan tugas</th><th scope="col">Penanda risiko</th></tr></thead>
              <tbody>{pageRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row"><Link href={`/data-belajar/${encodeURIComponent(row.id)}${detailQuery}`} prefetch={false}>{row.id}</Link></th>
                  <td>{row.code_module}</td><td>{row.code_presentation}</td>
                  <td>{hasActivity(row) ? row.active_days : "Belum tercatat"}</td><td>{taskLabel(row.no_submission_by_cutoff)}</td>
                  <td><span className="risk-tag" data-risk={row.at_risk}>{riskLabel(row.at_risk)}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Halaman catatan">
            <span>Baris {integer.format(offset + 1)}–{integer.format(offset + pageRows.length)} dari {integer.format(filtered.length)}</span>
            <div className="pagination-links">
              {page > 1 && <><Link href={pageLink(1)}>Awal</Link><Link href={pageLink(page - 1)}>Sebelumnya</Link></>}
              {page < pageCount && <><Link href={pageLink(page + 1)}>Berikutnya</Link><Link href={pageLink(pageCount)}>Akhir</Link></>}
            </div>
            {pageCount > 1 && <form action="/data-belajar" method="get" className="page-jump" key={page}>
              {Object.entries(filters).filter(([, value]) => value).map(([key, value]) => <input type="hidden" key={key} name={key} value={value} />)}
              <label>Halaman <input name="halaman" type="number" min={1} max={pageCount} defaultValue={page} required /> dari {integer.format(pageCount)}</label>
              <button type="submit">Buka</button>
            </form>}
          </nav>
        </> : <p className="empty-state">Filter ini belum menemukan catatan. Coba ID lain atau hapus salah satu filter.</p>}
      </section>
    </main>
  );
}
