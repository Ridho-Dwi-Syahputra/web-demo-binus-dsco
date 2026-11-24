"use client";

import { useEffect, useRef, useState } from "react";

const scoreFormat = new Intl.NumberFormat("id-ID", {
  style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1,
});

function recommendations(result) {
  const { signals } = result;
  const actions = [];
  if (signals.no_activity) {
    actions.push({
      title: "Periksa akses ke platform belajar",
      description: "Tanyakan apakah mahasiswa dapat masuk dan menemukan materi. Jika terkendala, bantu membuka materi pertama.",
    });
  }
  if (signals.no_submission) {
    actions.push({
      title: "Tanyakan kendala pengumpulan tugas",
      description: "Periksa tugas yang belum terkumpul pada waktu pencatatan, lalu sepakati langkah dan tenggat berikutnya bersama mahasiswa.",
    });
  }
  if (!signals.has_score) {
    actions.push({
      title: "Periksa ketersediaan nilai",
      description: "Nilai belum tercatat. Periksa apakah tugas belum jatuh tempo, belum dikumpulkan, atau masih menunggu penilaian.",
    });
  }
  if (!actions.length) {
    actions.push({
      title: result.needs_follow_up ? "Tinjau perkembangan bersama mahasiswa" : "Lanjutkan pemantauan rutin",
      description: result.needs_follow_up
        ? "Hubungi mahasiswa, tanyakan kesulitan belajar, dan sepakati dukungan yang sesuai."
        : "Periksa aktivitas dan pengumpulan tugas pada jadwal pemantauan berikutnya.",
    });
  }
  return actions;
}

export default function Demo() {
  const [id, setId] = useState("");
  const [view, setView] = useState({ state: "initial" });
  const pending = useRef(null);
  const resultPanel = useRef(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (view.state === "success" && window.matchMedia("(max-width: 700px)").matches) {
      resultPanel.current?.scrollIntoView({ block: "nearest" });
    }
  }, [view.state]);

  function changeId(event) {
    pending.current?.abort();
    pending.current = null;
    setId(event.target.value);
    setView({ state: "initial" });
  }

  async function runAnalysis(event) {
    event.preventDefault();
    const requestedId = id.trim();
    if (!/^\d{1,12}$/.test(requestedId)) {
      setView({ state: "error", message: "Masukkan ID berupa angka." });
      return;
    }
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setView({ state: "loading" });
    try {
      const response = await fetch("/api/analisis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestedId }), signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analisis belum bisa dijalankan. Coba lagi.");
      if (result.id !== requestedId || !Number.isFinite(result.score) || result.score < 0 || result.score > 1
          || typeof result.needs_follow_up !== "boolean" || !result.signals) {
        throw new Error("Hasil belum dapat dibaca. Coba lagi.");
      }
      if (pending.current === controller) setView({ state: "success", result });
    } catch (error) {
      if (pending.current === controller && !controller.signal.aborted) {
        setView({ state: "error", message: error.message || "Analisis belum bisa dijalankan. Coba lagi." });
      }
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  }

  const result = view.result;
  const loading = view.state === "loading";
  const score = result && scoreFormat.format(result.score);
  const decision = result && (result.needs_follow_up ? "Perlu tindak lanjut" : "Pemantauan rutin");
  const notice = loading ? "Catatan sedang dianalisis."
    : view.state === "error" ? view.message
    : result ? `${decision}. Skor prioritas ${score}.` : "";
  return (
    <div className="demo-grid">
      <form className="case-panel" onSubmit={runAnalysis} aria-busy={loading || undefined}>
        <h2 className="demo-step-title">Cari catatan mahasiswa</h2>
        <p>Masukkan ID dari data test untuk melihat hasil dan langkah pendampingan yang sesuai dengan catatannya.</p>
        <label className="simulation-id" htmlFor="student-id">ID catatan</label>
        <input id="student-id" name="id" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={12}
          autoComplete="off" placeholder="Misalnya 26092" value={id} onChange={changeId} required />
        <p className="input-help">ID tersedia dari 26092 sampai 32593.</p>
        <button type="submit" className="button button-primary analyze-button" disabled={loading}>
          {loading ? "Menganalisis…" : "Analisis catatan"} <span aria-hidden="true">→</span>
        </button>
        <noscript><p>Aktifkan JavaScript untuk menjalankan analisis.</p></noscript>
        {result && <section className="record-summary">
          <h2 className="demo-step-title">Catatan {result.id}</h2>
          <dl className="signals" aria-label="Catatan belajar">
            <div><dt>Modul dan periode</dt><dd>{result.signals.module} · {result.signals.period}</dd></div>
            <div><dt>Hari aktif di platform</dt><dd>{result.signals.no_activity ? "Belum tercatat" : `${result.signals.active_days} hari`}</dd></div>
            <div><dt>Pengumpulan tugas</dt><dd>{result.signals.no_submission ? "Belum mengumpulkan saat batas cek" : `${result.signals.submitted_count} tugas terkumpul`}</dd></div>
          </dl>
          <p className="input-help">{result.signals.has_score ? "Nilai tercatat." : "Nilai belum tercatat."}</p>
        </section>}
      </form>
      <section className="result-panel" ref={resultPanel} aria-labelledby="result-title">
        <h2 id="result-title" className="demo-step-title">Hasil dan tindak lanjut</h2>
        <p className="result-announcement" role="status" aria-atomic="true">{notice}</p>
        {view.state === "initial" && <div className="result-placeholder"><span className="placeholder-icon" aria-hidden="true" /><p>Masukkan ID untuk melihat hasil dan langkah pendampingan.</p></div>}
        {loading && <p className="result-loading">Sedang menganalisis catatan…</p>}
        {view.state === "error" && <div className="result-error"><p>{view.message}</p><button type="button" className="button button-outline" onClick={runAnalysis}>Coba lagi</button></div>}
        {result && <>
          <div className="result-score">
            <div><span className="score-label">Skor prioritas · ID {result.id}</span><strong>{score}</strong></div>
            <span className="decision" data-follow-up={result.needs_follow_up}>{decision}</span>
          </div>
          <meter min={0} max={1} value={result.score} aria-label="Skor prioritas" />
          <p className="score-context">Gunakan hasil untuk menentukan prioritas, lalu konfirmasi kebutuhan mahasiswa melalui percakapan.</p>
          <div className="action-list">
            {recommendations(result).map((action) => (
              <div className="recommendation" key={action.title}>
                <span className="recommendation-label">Langkah pendampingan</span>
                <strong>{action.title}</strong><p>{action.description}</p>
              </div>
            ))}
          </div>
        </>}
      </section>
    </div>
  );
}
