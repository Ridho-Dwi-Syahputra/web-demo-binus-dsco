import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

const csvPath = join(process.cwd(), "data", "train.csv");
export const integer = new Intl.NumberFormat("id-ID");
export const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 });
export const riskLabel = (value) => value === "1" ? "Ditandai berisiko" : "Tidak ditandai";
export const taskLabel = (value) => value === "1" ? "Belum mengumpulkan" : "Status pengumpulan lain";

// The original preprocessing uses this exact combination to fill absent activity.
export function hasActivity(row) {
  return !(row.interaction_volume === "182" && row.active_days === "10" && row.unique_sites === "20"
    && row.first_activity_day === "1" && row.last_activity_day === "26");
}

export function readTrainingCsv() {
  return readFileSync(csvPath);
}

function summarize(rows) {
  const risk = rows.reduce((count, row) => count + Number(row.at_risk === "1"), 0);
  return { total: rows.length, risk, other: rows.length - risk, rate: rows.length ? risk / rows.length : 0 };
}

let data;
export function trainingData() {
  if (data) return data;
  let columns;
  const rows = parse(readTrainingCsv(), {
    bom: true,
    columns: (header) => {
      columns = header;
      return header;
    },
  }).sort((left, right) => Number(left.id) - Number(right.id));
  const modules = [...new Set(rows.map((row) => row.code_module))].sort();
  const periods = [...new Set(rows.map((row) => row.code_presentation))].sort();
  data = {
    columns, rows, modules, periods,
    byId: new Map(rows.map((row) => [row.id, row])),
    summary: summarize(rows),
    byModule: modules.map((key) => ({ key, ...summarize(rows.filter((row) => row.code_module === key)) })),
    byTask: ["1", "0"].map((key) => ({ key, ...summarize(rows.filter((row) => row.no_submission_by_cutoff === key)) })),
    byActivity: [false, true].map((key) => ({ key, ...summarize(rows.filter((row) => hasActivity(row) === key)) })),
  };
  return data;
}

const filterKeys = ["q", "modul", "periode", "risiko", "urut", "jumlah", "halaman"];
export function dataQuery(params, changes = {}) {
  const values = new URLSearchParams();
  for (const key of filterKeys) {
    const value = Object.hasOwn(changes, key) ? changes[key] : params[key];
    if ((typeof value === "string" && value) || typeof value === "number") values.set(key, String(value));
  }
  const query = values.toString();
  return query ? `?${query}` : "";
}
