"use strict";

const byId = (id) => document.getElementById(id);
const form = byId("case-form");
const analyze = byId("analyze");
const setupMessage = byId("case-loading");
const setupRetry = byId("retry-setup");
const signalsBox = byId("signals");
const resultPanel = byId("result-panel");
const announcement = byId("result-announcement");
const scoreFormat = new Intl.NumberFormat("id-ID", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const resultViews = {
  initial: byId("result-placeholder"),
  loading: byId("result-loading"),
  error: byId("result-error"),
  success: byId("result"),
};

let profiles = null;
let activeRequest = null;

function selectedCase() {
  return form.elements.case_id.value;
}

function showResult(state, message = "") {
  for (const [name, element] of Object.entries(resultViews)) {
    element.hidden = name !== state;
  }
  announcement.textContent = message;
}

function showSignals(signals) {
  signalsBox.hidden = !signals;
  if (!signals) return;
  byId("signal-module").textContent = signals.module;
  byId("signal-activity").textContent = `${signals.active_days} hari`;
  byId("signal-assessment").textContent = signals.missed_assessment ? "Tenggat terlewat" : "Tidak ditandai terlewat";
}

function validSignals(signals) {
  return signals && typeof signals.module === "string"
    && Number.isInteger(signals.active_days) && signals.active_days >= 0
    && typeof signals.no_vle_activity === "boolean"
    && typeof signals.missed_assessment === "boolean";
}

function syncSelection() {
  if (activeRequest) {
    activeRequest.abort();
    activeRequest = null;
  }
  const signals = profiles?.[selectedCase()];
  showSignals(signals);
  showResult("initial");
  analyze.disabled = !signals;
  form.removeAttribute("aria-busy");
}

async function loadCases() {
  setupRetry.hidden = true;
  setupMessage.hidden = false;
  setupMessage.textContent = "Menyiapkan data contoh…";
  try {
    const response = await fetch("/api/examples");
    if (!response.ok) throw new Error("Data contoh tidak tersedia");
    const data = await response.json();
    const choices = Array.from(form.elements.case_id, (input) => input.value);
    if (!choices.every((id) => validSignals(data.examples?.[id]))) {
      throw new Error("Data contoh belum lengkap");
    }
    profiles = data.examples;
    setupMessage.hidden = true;
    syncSelection();
  } catch {
    setupMessage.textContent = "Data contoh belum bisa dimuat.";
    setupRetry.hidden = false;
  }
}

function recommendation(result) {
  if (result.needs_follow_up && result.signals.missed_assessment) {
    return ["Hubungi mahasiswa dalam 48 jam", "Tanyakan kendala pengumpulan dan sepakati langkah untuk asesmen berikutnya."];
  }
  if (result.needs_follow_up && result.signals.no_vle_activity) {
    return ["Cek akses ke VLE", "Tanyakan apakah mahasiswa dapat masuk dan menemukan materi. Tawarkan bantuan untuk mulai belajar."];
  }
  if (result.needs_follow_up) {
    return ["Tinjau kondisi mahasiswa", "Periksa catatan belajar bersama tutor dan tentukan bantuan yang sesuai."];
  }
  return ["Lanjutkan pemantauan rutin", "Pantau aktivitas belajar dan pengumpulan asesmen berikutnya."];
}

function renderResult(result) {
  const formattedScore = scoreFormat.format(result.score);
  const decision = result.needs_follow_up ? "Perlu tindak lanjut" : "Pemantauan rutin";
  const [title, detail] = recommendation(result);
  byId("score").textContent = formattedScore;
  byId("score-meter").value = result.score;
  byId("decision").textContent = decision;
  byId("decision").dataset.followUp = String(result.needs_follow_up);
  byId("action-title").textContent = title;
  byId("action-detail").textContent = detail;
  showSignals(result.signals);
  showResult("success", `${decision}. Skor model ${formattedScore}. ${title}.`);
  if (window.matchMedia("(max-width: 700px)").matches) {
    resultPanel.scrollIntoView({ block: "nearest" });
  }
}

async function runAnalysis() {
  const caseId = selectedCase();
  if (!profiles?.[caseId] || activeRequest) return;
  const controller = new AbortController();
  activeRequest = controller;
  analyze.disabled = true;
  form.setAttribute("aria-busy", "true");
  showResult("loading", "Model sedang menganalisis contoh.");
  try {
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Inferensi gagal");
    const result = await response.json();
    if (result.case_id !== caseId || !Number.isFinite(result.score) || result.score < 0 || result.score > 1
        || typeof result.needs_follow_up !== "boolean" || !validSignals(result.signals)) {
      throw new Error("Respons model tidak valid");
    }
    if (activeRequest === controller) renderResult(result);
  } catch {
    if (activeRequest === controller) showResult("error", "Analisis belum bisa dijalankan. Coba lagi.");
  } finally {
    if (activeRequest === controller) {
      activeRequest = null;
      analyze.disabled = false;
      form.removeAttribute("aria-busy");
    }
  }
}

form.addEventListener("change", syncSelection);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  runAnalysis();
});
setupRetry.addEventListener("click", loadCases);
byId("retry-analysis").addEventListener("click", runAnalysis);
loadCases();
