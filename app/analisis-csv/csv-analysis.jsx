"use client";

import { useEffect, useRef, useState } from "react";

const integer = new Intl.NumberFormat("id-ID");
const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 });

function action(result) {
  const steps = [];
  if (result.signals.no_activity) steps.push("Periksa akses ke platform belajar");
  if (result.signals.no_submission) steps.push("Tanyakan kendala pengumpulan tugas");
  if (!result.signals.has_score) steps.push("Periksa jadwal tugas dan ketersediaan nilai");
  if (!steps.length) steps.push(result.needs_follow_up ? "Tinjau perkembangan bersama mahasiswa" : "Lanjutkan pemantauan rutin");
  return steps.join("; ");
}

function studentNote(row) {
  const profile = [];
  const context = row.context || {};
  if (context.module || context.period) profile.push([context.module, context.period].filter(Boolean).join(" · "));
  profile.push(row.signals.no_activity ? "Aktivitas platform belum tercatat" : `Aktif ${integer.format(row.signals.active_days)} hari`);
  if (context.submitted_count != null) profile.push(`${integer.format(context.submitted_count)} tugas terkumpul`);
  else profile.push(row.signals.no_submission ? "Belum ada pengumpulan saat batas cek" : "Ada pengumpulan tugas");
  if (context.late_submission_count > 0) profile.push(`${integer.format(context.late_submission_count)} terlambat`);
  profile.push(row.signals.has_score ? `Rata-rata nilai ${percent.format((context.avg_score ?? 0) / 100)}` : "Nilai belum tercatat");

  const questions = [];
  if (row.signals.no_activity) questions.push("Apakah ada kendala akses internet, akun, atau penggunaan platform?");
  else if (row.signals.active_days <= 3) questions.push("Apakah ada hambatan untuk belajar secara rutin?");
  if (row.signals.no_submission) questions.push("Apakah ada kendala memahami instruksi, waktu, atau proses pengumpulan tugas?");
  if (context.late_submission_count > 0) questions.push("Apa yang menyebabkan sebagian tugas terlambat?");
  if (!row.signals.has_score) questions.push("Apakah nilai belum tersedia, atau ada kendala menyelesaikan penilaian?");
  if (row.needs_follow_up && questions.length === 0) questions.push("Tanyakan kondisi belajar dan dukungan yang paling dibutuhkan saat ini.");
  if (questions.length === 0) questions.push("Tanyakan apakah pola belajar saat ini terasa cukup dan apakah ada bantuan yang dibutuhkan.");
  return { profile, questions };
}

function downloadResults(rows, predictionsOnly = false) {
  const safe = (value) => {
    const text = String(value);
    return `"${(/^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  const lines = [predictionsOnly ? "id,at_risk" : "id,skor_prioritas,prediksi,langkah_pendampingan,ringkasan_catatan,hal_yang_perlu_ditanyakan"];
  for (const row of rows) {
    const fields = predictionsOnly
      ? [row.id, Number(row.needs_follow_up)]
      : [row.id, row.score.toFixed(6), Number(row.needs_follow_up), action(row), studentNote(row).profile.join("; "), studentNote(row).questions.join("; ")];
    lines.push(fields.map(safe).join(","));
  }
  const file = new Blob(["\uFEFF", lines.join("\r\n"), "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = predictionsOnly ? "prediksi-belajar.csv" : "hasil-analisis-belajar.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Bar({ label, value, total }) {
  const ratio = total ? value / total : 0;
  return <li><div className="bar-caption"><strong>{label}</strong><b>{percent.format(ratio)}</b></div>
    <div className="chart-track" aria-hidden="true"><span style={{ width: `${ratio * 100}%` }} /></div>
    <span className="chart-count">{integer.format(value)} dari {integer.format(total)} catatan</span></li>;
}

export default function CsvAnalysis() {
  const [file, setFile] = useState(null);
  const [view, setView] = useState({ state: "initial" });
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("upload");
  const [filters, setFilters] = useState({ id: "", result: "", activity: "", submission: "", score: "", size: "25" });
  const pending = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);

  function selectFile(event) {
    pending.current?.abort();
    pending.current = null;
    setFile(event.target.files?.[0] ?? null);
    setView({ state: "initial" });
    setPage(1);
    setSortOrder("upload");
    setFilters({ id: "", result: "", activity: "", submission: "", score: "", size: "25" });
  }

  async function analyze(event) {
    event.preventDefault();
    if (!file || pending.current) return;
    if (file.size > 5 * 1024 * 1024) {
      setView({ state: "error", error: "Ukuran file maksimal 5 MB.", details: [] });
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setView({ state: "loading" });
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/analisis-csv", { method: "POST", body: form, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) {
        if (pending.current === controller) setView({ state: "error", error: data.error || "File belum dapat dianalisis.", details: data.details || [] });
        return;
      }
      if (!Array.isArray(data.results) || !data.results.length) throw new Error("Hasil analisis tidak lengkap.");
      if (pending.current === controller) {
        setPage(1);
        setSortOrder("upload");
        setFilters({ id: "", result: "", activity: "", submission: "", score: "", size: "25" });
        setView({ state: "success", results: data.results });
      }
    } catch {
      if (!controller.signal.aborted && pending.current === controller) setView({ state: "error", error: "Analisis belum dapat dijalankan. Coba lagi.", details: [] });
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  const rows = [...(view.results || [])];
  if (sortOrder === "highest") rows.sort((left, right) => right.score - left.score);
  if (sortOrder === "lowest") rows.sort((left, right) => left.score - right.score);
  const filteredRows = rows.filter((row) => (!filters.id || row.id.toLowerCase().includes(filters.id.toLowerCase()))
    && (!filters.result || String(Number(row.needs_follow_up)) === filters.result)
    && (!filters.activity || String(Number(row.signals.no_activity)) === filters.activity)
    && (!filters.submission || String(Number(row.signals.no_submission)) === filters.submission)
    && (!filters.score || (filters.score === "high" ? row.score >= 0.5 : row.score < 0.5)));
  const total = filteredRows.length;
  const pageSize = Number(filters.size);
  const priority = rows.filter((row) => row.needs_follow_up).length;
  const noActivity = rows.filter((row) => row.signals.no_activity).length;
  const noSubmission = rows.filter((row) => row.signals.no_submission).length;
  const noScore = rows.filter((row) => !row.signals.has_score).length;
  const weeklyTotals = [0, 1, 2, 3].map((week) => rows.reduce((sum, row) => sum + row.signals.weekly_interactions[week], 0));
  const maxWeekly = Math.max(0, ...weeklyTotals);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const status = view.state === "loading" ? "Memeriksa dan menganalisis data. Tunggu sebentar."
    : view.state === "success" ? `${integer.format(total)} catatan berhasil dianalisis.`
    : view.state === "error" ? view.error : "";

  return <>
    <div className="csv-steps">
      <div className="csv-step"><strong>Siapkan format CSV</strong><p>Unduh template dan isi data empat minggu pertama.</p></div>
      <div className="csv-step"><strong>Unggah dan periksa</strong><p>Website memeriksa kolom serta nilai setiap baris.</p></div>
      <div className="csv-step"><strong>Baca hasil</strong><p>Lihat ringkasan mahasiswa, hal yang perlu ditanyakan, dan langkah pendampingan.</p></div>
    </div>
    <div className="upload-layout">
      <section className="panel upload-panel step-blue">
        <h2>Siapkan data belajar</h2>
        <p>Gunakan template agar nama kolom dan format sesuai. Baris di dalamnya menunjukkan cara pengisian.</p>
        <p className="upload-hint">Gunakan informasi yang tersedia hingga hari ke-28. Hapus baris contoh saat mengisi data sendiri.</p>
        <div><a className="button button-outline" href="/api/template-csv" download>Unduh template CSV ↓</a></div>
        <details className="csv-field-guide"><summary>Panduan mengisi kolom</summary>
          <dl>
            <div><dt>id</dt><dd>ID unik untuk setiap catatan.</dd></div>
            <div><dt>num_of_prev_attempts, studied_credits</dt><dd>Jumlah percobaan sebelumnya dan beban kredit studi.</dd></div>
            <div><dt>has_score, no_submission_by_cutoff</dt><dd>Isi 1 jika ya atau 0 jika tidak. Penanda pengumpulan dihitung hingga waktu pengecekan.</dd></div>
            <div><dt>avg_score</dt><dd>Nilai rata-rata dari 0 sampai 100. Boleh kosong jika nilai belum ada.</dd></div>
            <div><dt>interaction_volume, unique_sites</dt><dd>Jumlah interaksi dan halaman berbeda yang diakses.</dd></div>
            <div><dt>active_days</dt><dd>Jumlah hari aktif pada hari ke-0 sampai hari ke-28, maksimal 29.</dd></div>
            <div><dt>first_activity_day, last_activity_day</dt><dd>Hari aktivitas pertama dan terakhir antara 0 dan 28. Boleh kosong saat belum ada aktivitas.</dd></div>
            <div><dt>week1_interactions sampai week4_interactions</dt><dd>Jumlah interaksi pada masing-masing minggu pertama hingga keempat.</dd></div>
            <div><dt>code_module, code_presentation</dt><dd>Opsional. Kode modul dan periode untuk melengkapi kartu catatan mahasiswa.</dd></div>
            <div><dt>submitted_count, late_submission_count</dt><dd>Opsional. Jumlah tugas yang terkumpul dan terlambat; dipakai untuk konteks catatan, bukan sebagai fitur model.</dd></div>
          </dl>
        </details>
      </section>
      <section className="panel upload-panel">
        <h2>Unggah CSV</h2>
        <p>Pilih file yang sudah disiapkan. Ukuran maksimal 5 MB dan 10.000 catatan.</p>
        <form onSubmit={analyze} aria-busy={view.state === "loading" || undefined}>
          <div className="upload-drop">
            <label htmlFor="csv-file">Pilih file CSV</label>
            <input type="file" id="csv-file" accept=".csv,text/csv" onChange={selectFile} required />
            <span className="upload-hint">{file ? file.name : "File akan diperiksa sebelum analisis."}</span>
          </div>
          <button type="submit" className="button button-primary" disabled={!file || view.state === "loading"} style={{ marginTop: 14 }}>
            {view.state === "loading" ? "Sedang menganalisis…" : "Periksa dan analisis"} <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="upload-status" role="status" aria-live="polite">{status}</p>
        {view.state === "error" && <div className="upload-error"><strong>Periksa file</strong><p>{view.error}</p>
          {view.details?.length > 0 && <ul>{view.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}
        </div>}
      </section>
    </div>
    {view.state === "success" && <div className="csv-results" aria-label="Hasil analisis CSV">
      <header className="csv-results-head"><div><h2>Hasil analisis</h2><p>{integer.format(total)} catatan dari {file.name}</p></div>
        <div className="csv-downloads">
          <button type="button" className="button button-outline" onClick={() => downloadResults(rows)}>Unduh hasil lengkap ↓</button>
          <button type="button" className="button button-outline" onClick={() => downloadResults(rows, true)}>Unduh prediksi ↓</button>
        </div>
      </header>
      <div className="three-columns">
        <div className="panel csv-metric step-blue"><strong>{integer.format(total)}</strong><span>Catatan diperiksa</span><p>Jumlah baris yang berhasil dianalisis.</p></div>
        <div className="panel csv-metric step-yellow"><strong>{integer.format(priority)}</strong><span>Perlu tindak lanjut</span><p>{percent.format(priority / total)} dari catatan diperiksa.</p></div>
        <div className="panel csv-metric step-mint"><strong>{integer.format(total - priority)}</strong><span>Pemantauan rutin</span><p>Catatan untuk pemantauan berikutnya.</p></div>
      </div>
      <div className="csv-visuals">
        <section className="panel chart-panel"><h2>Prioritas pendampingan</h2><p>Hasil model pada data yang diunggah.</p>
          <ul className="chart-list"><Bar label="Perlu tindak lanjut" value={priority} total={total} /><Bar label="Pemantauan rutin" value={total - priority} total={total} /></ul>
          <div className="csv-read"><strong>Cara membaca.</strong> Persentase menunjukkan bagian dari seluruh catatan yang masuk ke masing-masing kelompok. Gunakan daftar di bawah untuk menentukan urutan peninjauan.</div>
        </section>
        <section className="panel chart-panel"><h2>Hal yang perlu diperiksa</h2><p>Penanda pada catatan yang diunggah.</p>
          <ul className="chart-list"><Bar label="Aktivitas belum tercatat" value={noActivity} total={total} /><Bar label="Belum mengumpulkan saat batas cek" value={noSubmission} total={total} /><Bar label="Nilai belum tercatat" value={noScore} total={total} /></ul>
          <div className="csv-read"><strong>Cara membaca.</strong> Satu catatan bisa muncul pada beberapa penanda. Periksa situasinya bersama mahasiswa untuk memilih bantuan yang tepat.</div>
        </section>
      </div>
      <section className="panel chart-panel">
        <h2>Aktivitas selama empat minggu</h2>
        <p>Jumlah interaksi di platform belajar dari seluruh catatan dalam file.</p>
        <ul className="chart-list">{weeklyTotals.map((value, index) => <li key={index}>
          <div className="bar-caption"><strong>Minggu {index + 1}</strong><b>{integer.format(value)} interaksi</b></div>
          <div className="chart-track" aria-hidden="true"><span style={{ width: `${maxWeekly ? value / maxWeekly * 100 : 0}%` }} /></div>
        </li>)}</ul>
        <div className="csv-read"><strong>Cara membaca.</strong> Bandingkan panjang batang untuk melihat perubahan jumlah interaksi tiap minggu. Jumlah ini dipengaruhi jumlah catatan yang diunggah.</div>
      </section>
      <section className="panel"><div className="csv-table-head"><div><h2>Daftar hasil</h2><p>Saring hasil untuk mencari catatan yang ingin ditinjau.</p></div></div>
        <form className="csv-filter-grid" onSubmit={(event) => { event.preventDefault(); setPage(1); }}>
          <label className="csv-filter-field">Cari ID
            <input type="search" placeholder="Masukkan ID" value={filters.id} onChange={(event) => { setFilters({ ...filters, id: event.target.value }); setPage(1); }} />
          </label>
          <label className="csv-filter-field">Hasil
            <select value={filters.result} onChange={(event) => { setFilters({ ...filters, result: event.target.value }); setPage(1); }}>
              <option value="">Semua hasil</option><option value="1">Perlu tindak lanjut</option><option value="0">Pemantauan rutin</option>
            </select>
          </label>
          <label className="csv-filter-field">Aktivitas platform
            <select value={filters.activity} onChange={(event) => { setFilters({ ...filters, activity: event.target.value }); setPage(1); }}>
              <option value="">Semua catatan</option><option value="1">Belum tercatat</option><option value="0">Sudah tercatat</option>
            </select>
          </label>
          <label className="csv-filter-field">Pengumpulan tugas
            <select value={filters.submission} onChange={(event) => { setFilters({ ...filters, submission: event.target.value }); setPage(1); }}>
              <option value="">Semua catatan</option><option value="1">Belum mengumpulkan</option><option value="0">Ada pengumpulan</option>
            </select>
          </label>
          <label className="csv-filter-field">Rentang skor
            <select value={filters.score} onChange={(event) => { setFilters({ ...filters, score: event.target.value }); setPage(1); }}>
              <option value="">Semua skor</option><option value="high">50% ke atas</option><option value="low">Di bawah 50%</option>
            </select>
          </label>
          <label className="csv-filter-field">Urutkan skor
            <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setPage(1); }}>
              <option value="upload">Urutan unggahan</option><option value="highest">Tertinggi ke terendah</option><option value="lowest">Terendah ke tertinggi</option>
            </select>
          </label>
          <label className="csv-filter-field">Baris per halaman
            <select value={filters.size} onChange={(event) => { setFilters({ ...filters, size: event.target.value }); setPage(1); }}>
              <option value="25">25 baris</option><option value="50">50 baris</option><option value="100">100 baris</option>
            </select>
          </label>
          <button type="button" className="button button-outline csv-clear-filter" onClick={() => { setFilters({ id: "", result: "", activity: "", submission: "", score: "", size: filters.size }); setSortOrder("upload"); setPage(1); }}>Hapus filter</button>
        </form>
        <p className="csv-filter-count">{integer.format(total)} catatan ditemukan dari {integer.format(rows.length)}</p>
        <div className="table-scroll csv-table-scroll" tabIndex={0} role="region" aria-label="Tabel hasil analisis">
          <table className="data-table"><thead><tr><th scope="col">ID</th><th scope="col">Skor prioritas</th><th scope="col">Hasil</th><th scope="col">Catatan mahasiswa</th><th scope="col">Langkah pendampingan</th></tr></thead>
            <tbody>{visibleRows.map((row) => { const note = studentNote(row); return <tr key={row.id}>
              <th scope="row">{row.id}</th><td>{percent.format(row.score)}</td><td><span className="risk-tag" data-risk={row.needs_follow_up ? "1" : "0"}>{row.needs_follow_up ? "Perlu tindak lanjut" : "Pemantauan rutin"}</span></td>
              <td><details className="student-note"><summary>Buka catatan</summary><div className="student-note-card">
                <h3>Catatan {row.id}</h3><div className="student-note-facts">
                  <div><span>Modul dan periode</span><strong>{[row.context?.module, row.context?.period].filter(Boolean).join(" · ") || "Tidak disediakan"}</strong></div>
                  <div><span>Hari aktif di platform</span><strong>{row.signals.no_activity ? "Belum tercatat" : `${integer.format(row.signals.active_days)} hari`}</strong></div>
                  <div><span>Pengumpulan tugas</span><strong>{row.context?.submitted_count == null ? (row.signals.no_submission ? "Belum tercatat saat batas cek" : "Ada pengumpulan") : `${integer.format(row.context.submitted_count)} tugas terkumpul`}</strong></div>
                  <div><span>Nilai rata-rata</span><strong>{row.signals.has_score ? `${integer.format(row.context?.avg_score ?? 0)} / 100` : "Belum tercatat"}</strong></div>
                  <div><span>Percobaan sebelumnya</span><strong>{integer.format(row.context?.attempts ?? 0)} kali</strong></div>
                  <div><span>Beban studi</span><strong>{integer.format(row.context?.credits ?? 0)} kredit</strong></div>
                  {row.context?.late_submission_count != null && <div><span>Tugas terlambat</span><strong>{integer.format(row.context.late_submission_count)} tugas</strong></div>}
                </div><h4>Hal yang perlu ditanyakan</h4><ul>{note.questions.map((question) => <li key={question}>{question}</li>)}</ul>
                <p className="student-note-caveat">Catatan ini merangkum kolom yang diunggah. Pertanyaan adalah bahan percakapan, bukan kesimpulan tentang penyebab kondisi mahasiswa.</p>
              </div></details></td><td>{action(row)}</td></tr>; })}</tbody>
          </table>
        </div>
        <div className="csv-pager"><span>Halaman {page} dari {pages}</span><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Sebelumnya</button><button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>Berikutnya</button></div>
        <p className="csv-result-note">Skor dan status berasal dari model untuk data empat minggu pertama. Catatan mahasiswa merangkum informasi yang tersedia dan menyarankan pertanyaan untuk percakapan tutor. File prediksi berisi kolom id dan at_risk sesuai urutan unggahan.</p>
      </section>
    </div>}
  </>;
}
