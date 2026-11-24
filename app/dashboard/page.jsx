import Link from "next/link";
import { integer, percent, trainingData } from "../../lib/training-data.mjs";

export const metadata = { title: "Ringkasan" };

function Breakdown({ items, title, description, note, filter }) {
  return (
    <section className="panel chart-panel">
      <h2>{title}</h2>
      <p>{description}</p>
      <ul className="chart-list">
        {items.map((item) => (
          <li key={String(item.key)}>
            <div className="bar-caption">
              {filter ? <Link href={filter(item.key)}>{item.label ?? item.key}</Link> : <strong>{item.label ?? item.key}</strong>}
              <b>{percent.format(item.rate)}</b>
            </div>
            <div className="chart-track" aria-hidden="true"><span style={{ width: `${item.rate * 100}%` }} /></div>
            <span className="chart-count">{integer.format(item.risk)} dari {integer.format(item.total)} catatan ditandai</span>
          </li>
        ))}
      </ul>
      {note && <p className="fine-print">{note}</p>}
    </section>
  );
}

export default function Dashboard() {
  const { summary, modules, periods, byModule, byTask, byActivity } = trainingData();
  const metrics = [
    [integer.format(summary.total), "Catatan belajar", "Satu catatan per mahasiswa, modul, dan periode."],
    [percent.format(summary.rate), "Ditandai berisiko", `${integer.format(summary.risk)} catatan dengan penanda risiko.`],
    [modules.length, "Modul", `Tersebar dalam ${periods.length} periode belajar.`],
  ];
  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <header className="page-intro">
        <div><h1>Ringkasan belajar</h1><p>Lihat bagaimana penanda risiko tersebar dalam data belajar menurut modul, pengumpulan tugas, dan aktivitas di platform.</p></div>
        <Link className="button button-outline" href="/data-belajar">Telusuri data</Link>
      </header>
      <div className="three-columns metric-grid">
        {metrics.map(([value, label, detail], index) => (
          <div key={label} className={`panel metric ${["step-blue", "step-yellow", "step-mint"][index]}`}><strong>{value}</strong><span>{label}</span><p>{detail}</p></div>
        ))}
      </div>
      <section className="panel risk-overview">
        <h2>Sebaran penanda risiko</h2>
        <div className="stacked-risk" aria-hidden="true"><span style={{ flex: summary.risk }} /><span style={{ flex: summary.other }} /></div>
        <div className="chart-legend">
          <Link href="/data-belajar?risiko=1"><i /> Ditandai berisiko <b>{integer.format(summary.risk)}</b></Link>
          <Link href="/data-belajar?risiko=0"><i /> Tidak ditandai <b>{integer.format(summary.other)}</b></Link>
        </div>
      </section>
      <div className="dashboard-grid">
        <Breakdown items={byModule} title="Penanda per modul" description="Porsi catatan yang ditandai dari semua catatan dalam setiap modul." filter={(key) => `/data-belajar?modul=${encodeURIComponent(key)}`} />
        <div className="dashboard-side">
          <Breakdown items={byTask.map((item, index) => ({ ...item, label: ["Belum mengumpulkan", "Status pengumpulan lain"][index] }))} title="Pengumpulan tugas" description="Porsi catatan yang ditandai pada tiap kelompok pengumpulan." note="Kelompok lain mencakup catatan tanpa penanda belum mengumpulkan pada waktu pencatatan." />
          <Breakdown items={byActivity.map((item, index) => ({ ...item, label: ["Belum ada aktivitas tercatat", "Ada aktivitas tercatat"][index] }))} title="Aktivitas di platform belajar" description="Porsi catatan yang ditandai pada tiap kelompok aktivitas." note="Data sumber memakai pola angka pengganti saat aktivitas belum tercatat." />
        </div>
      </div>
      <p className="page-note">Grafik merangkum penanda pada data belajar. Perbedaan antarkelompok membantu mengarahkan peninjauan tutor.</p>
    </main>
  );
}
