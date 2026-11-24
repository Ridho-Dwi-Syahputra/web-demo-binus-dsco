import Link from "next/link";
import { notFound } from "next/navigation";
import { dataQuery, hasActivity, riskLabel, taskLabel, trainingData } from "../../../lib/training-data.mjs";

export const metadata = { title: "Detail catatan" };

const groups = {
  "Profil dan periode belajar": {
    id: "ID catatan", code_module: "Kode modul", code_presentation: "Kode periode",
    gender: "Jenis kelamin", region: "Wilayah", highest_education: "Pendidikan terakhir",
    imd_band: "Kelompok indeks sosial wilayah", age_band: "Rentang usia", num_of_prev_attempts: "Upaya sebelumnya",
    studied_credits: "Beban kredit studi", disability: "Penanda disabilitas",
    module_presentation_length: "Lama periode modul (hari)", registration_days_from_start: "Hari pendaftaran relatif ke awal modul",
  },
  "Tugas dan nilai": {
    assessments_due_total: "Jumlah tugas jatuh tempo", assessments_due_Assessment_1: "Tenggat tugas 1", assessments_due_Assessment_2: "Tenggat tugas 2",
    submitted_count: "Jumlah tugas dikumpulkan", late_submission_count: "Jumlah pengumpulan terlambat",
    avg_score: "Rata-rata nilai", median_score: "Nilai tengah", max_score: "Nilai tertinggi", min_score: "Nilai terendah",
    score_std: "Sebaran nilai (simpangan baku)", avg_submission_delay: "Rata-rata selisih hari pengumpulan",
    median_submission_delay: "Median selisih hari pengumpulan", max_submission_delay: "Selisih hari pengumpulan terbesar",
    min_submission_delay: "Selisih hari pengumpulan terkecil", weighted_score_total: "Total nilai berbobot",
    score_trend: "Perubahan nilai", score_Assessment_2: "Nilai tugas 2", weighted_score_Assessment_2: "Nilai berbobot tugas 2",
    submission_delay_Assessment_2: "Selisih hari pengumpulan tugas 2", submitted_Assessment_2: "Penanda pengumpulan tugas 2",
    score_Assessment_1: "Nilai tugas 1", weighted_score_Assessment_1: "Nilai berbobot tugas 1",
    submission_delay_Assessment_1: "Selisih hari pengumpulan tugas 1", submitted_Assessment_1: "Penanda pengumpulan tugas 1",
    assessment_completion_rate_Assessment_2: "Tingkat penyelesaian tugas 2", assessment_completion_rate_Assessment_1: "Tingkat penyelesaian tugas 1",
    assessment_completion_rate: "Tingkat penyelesaian tugas", no_submission_by_cutoff: "Penanda belum mengumpulkan hingga waktu pencatatan",
    has_score: "Penanda nilai tercatat",
  },
  "Aktivitas di platform belajar": {
    interaction_volume: "Jumlah interaksi", active_days: "Hari aktif", unique_sites: "Jumlah halaman berbeda",
    unique_activity_types: "Jumlah jenis aktivitas", avg_daily_interactions: "Rata-rata interaksi harian",
    max_daily_interactions: "Interaksi harian tertinggi", interaction_variability: "Variasi interaksi", first_activity_day: "Hari aktivitas pertama",
    last_activity_day: "Hari aktivitas terakhir", week1_interactions: "Interaksi minggu 1", week2_interactions: "Interaksi minggu 2",
    week3_interactions: "Interaksi minggu 3", week4_interactions: "Interaksi minggu 4", interaction_trend: "Perubahan interaksi",
    early_interactions: "Interaksi bagian awal", late_interactions: "Interaksi bagian akhir",
    late_to_early_interactions_ratio: "Rasio interaksi akhir dan awal", avg_interactions_per_active_day: "Rata-rata interaksi per hari aktif",
    active_weeks: "Minggu aktif", avg_interactions_per_active_week: "Rata-rata interaksi per minggu aktif", activity_span_days: "Rentang hari beraktivitas",
  },
  "Penanda dalam data belajar": { at_risk: "Penanda risiko" },
};

export default async function Detail({ params, searchParams }) {
  const { id } = await params;
  const { byId, columns } = trainingData();
  const row = byId.get(id);
  if (!row) notFound();
  const backHref = `/data-belajar${dataQuery(await searchParams)}`;
  const displayed = new Set(Object.values(groups).flatMap(Object.keys));
  const unmapped = Object.fromEntries(columns.filter((column) => !displayed.has(column)).map((column) => [column, column]));
  const sections = Object.entries(groups);
  if (Object.keys(unmapped).length) sections.push(["Kolom lainnya", unmapped]);

  return (
    <main id="konten" tabIndex={-1} className="shell inner-page">
      <Link className="text-link back-link" href={backHref}>← Kembali ke data belajar</Link>
      <header className="page-intro">
        <div><h1>Catatan {row.id}</h1><p>Modul {row.code_module} · Periode {row.code_presentation} · {columns.length} kolom data</p></div>
        <span className="risk-tag" data-risk={row.at_risk}>{riskLabel(row.at_risk)}</span>
      </header>
      <div className="three-columns detail-summary">
        <div className="panel step-blue"><h2>Aktivitas belajar</h2><p>{hasActivity(row) ? `${row.active_days} hari aktif` : "Belum tercatat"}</p></div>
        <div className="panel step-yellow"><h2>Pengumpulan tugas</h2><p>{taskLabel(row.no_submission_by_cutoff)}</p></div>
        <div className="panel step-mint"><h2>Nilai</h2><p>{row.has_score === "1" ? "Tercatat" : "Belum tercatat"}</p></div>
      </div>
      <p className="page-note detail-note">Rincian berikut menampilkan nilai CSV. Saat aktivitas atau nilai belum tercatat, data sumber dapat menggunakan angka pengisi.</p>
      <div className="detail-sections">
        {sections.map(([title, fields]) => (
          <details className="panel detail-panel" key={title} open={title === "Profil dan periode belajar" || undefined}>
            <summary>{title} <span>{Object.keys(fields).length} kolom</span></summary>
            <dl className="field-grid">{Object.entries(fields).map(([field, label]) => (
              <div key={field}><dt>{label}</dt><dd>{field === "at_risk" ? `${riskLabel(row[field])} (${row[field]})` : row[field] || "—"}</dd></div>
            ))}</dl>
          </details>
        ))}
      </div>
    </main>
  );
}
