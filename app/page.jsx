import Link from "next/link";
import { integer, percent, trainingData } from "../lib/training-data.mjs";
import "../frontend/home-interactive.css";

const views = [
  ["ringkasan", "Ringkasan"],
  ["satu-id", "Satu ID"],
  ["unggah-csv", "Unggah CSV"],
];

function HomePreview({ summary, moduleCount, periodCount }) {
  return (
    <div className="hero-art home-hero-art">
      <div className="orbit orbit-large" aria-hidden="true" />
      <div className="orbit orbit-small" aria-hidden="true" />
      <div className="spark spark-top" aria-hidden="true">✦</div>
      <div className="spark spark-bottom" aria-hidden="true">✧</div>
      <div className="illustration home-preview">
        <div className="illustration-top">
          <span className="illustration-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>Buku catatan belajar</span>
        </div>
        <fieldset className="home-preview-field">
          <legend>Pilih tampilan</legend>
          {views.map(([id], index) => (
            <input key={id} type="radio" className="home-preview-radio" id={`home-view-${id}`}
              name="home-view" value={id} aria-controls={`home-panel-${id}`} defaultChecked={index === 0} />
          ))}
          <div className="home-preview-switch">
            {views.map(([id, label]) => <label key={id} htmlFor={`home-view-${id}`}>{label}</label>)}
          </div>

          <div className="home-preview-panels">
            <section className="home-preview-panel home-preview-summary" id="home-panel-ringkasan" aria-labelledby="home-preview-summary-title">
              <h2 id="home-preview-summary-title">{integer.format(summary.total)} catatan belajar</h2>
              <div className="home-preview-metrics">
                <div className="home-metric home-metric-blue"><strong>{moduleCount}</strong><span>Modul belajar</span></div>
                <div className="home-metric home-metric-yellow"><strong>{periodCount}</strong><span>Periode belajar</span></div>
              </div>
              <div className="home-risk">
                <div><span>Ditandai berisiko</span><strong>{percent.format(summary.rate)}</strong></div>
                <div className="home-risk-track" aria-hidden="true"><span style={{ width: `${summary.rate * 100}%` }} /></div>
              </div>
              <Link className="home-preview-link" href="/dashboard">Lihat sebaran risiko <span aria-hidden="true">↗</span></Link>
            </section>

            <section className="home-preview-panel home-preview-id" id="home-panel-satu-id" aria-labelledby="home-preview-id-title">
              <h2 id="home-preview-id-title">Analisis satu catatan</h2>
              <div className="home-preview-example home-metric-blue">
                <div className="art-icon art-sheet" aria-hidden="true"><i /></div>
                <div><span>Contoh ID catatan</span><strong>26092</strong></div>
              </div>
              <p>Gunakan ID untuk melihat skor prioritas, aktivitas belajar, dan langkah pendampingan.</p>
              <Link className="home-preview-link" href="/simulasi">Buka simulasi ID <span aria-hidden="true">↗</span></Link>
            </section>

            <section className="home-preview-panel home-preview-csv" id="home-panel-unggah-csv" aria-labelledby="home-preview-csv-title">
              <h2 id="home-preview-csv-title">Analisis beberapa catatan</h2>
              <div className="home-preview-example home-metric-yellow">
                <div className="art-icon art-sheet" aria-hidden="true"><i /></div>
                <div><span>Format berkas</span><strong>CSV</strong></div>
              </div>
              <p>Unggah satu berkas untuk meninjau hasil beberapa catatan sekaligus.</p>
              <Link className="home-preview-link" href="/analisis-csv">Buka analisis CSV <span aria-hidden="true">↗</span></Link>
            </section>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export default function Home() {
  const { summary, modules, periods } = trainingData();
  return (
    <main id="konten" tabIndex={-1}>
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">Kenali kebutuhan <span>belajar</span> lebih awal</h1>
          <p>Lihat pola aktivitas dan pengumpulan tugas, lalu analisis catatan belajar untuk membantu menentukan langkah pendampingan.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/simulasi">Coba simulasi <span aria-hidden="true">→</span></Link>
            <Link className="button button-outline" href="/analisis-csv">Unggah CSV</Link>
          </div>
        </div>
        <HomePreview summary={summary} moduleCount={modules.length} periodCount={periods.length} />
      </section>
      <section className="home-sections">
        <div className="shell">
          <h2>Mulai dari yang kamu perlukan</h2>
          <div className="three-columns">
            <article className="panel step-blue"><h3>Ringkasan</h3><p>Bandingkan penanda risiko antar modul dan lihat pola aktivitas serta pengumpulan tugas.</p><Link className="text-link" href="/dashboard">Buka ringkasan <span aria-hidden="true">→</span></Link></article>
            <article className="panel step-yellow"><h3>Data Belajar</h3><p>Telusuri semua {integer.format(summary.total)} catatan, buka detail per baris, atau unduh data lengkap.</p><Link className="text-link" href="/data-belajar">Telusuri data <span aria-hidden="true">→</span></Link></article>
            <article className="panel step-mint"><h3>Panduan Tutor</h3><p>Lihat cara membaca hasil simulasi dan mengubahnya menjadi percakapan dengan mahasiswa.</p><Link className="text-link" href="/panduan">Buka panduan <span aria-hidden="true">→</span></Link></article>
          </div>
        </div>
      </section>
    </main>
  );
}
