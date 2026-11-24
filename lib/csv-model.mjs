import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CSV_REQUIRED_COLUMNS = Object.freeze([
  "num_of_prev_attempts", "studied_credits", "has_score", "avg_score",
  "no_submission_by_cutoff", "interaction_volume", "active_days", "unique_sites",
  "first_activity_day", "last_activity_day",
  "week1_interactions", "week2_interactions", "week3_interactions", "week4_interactions",
]);

const VLE_DAYS = ["first_activity_day", "last_activity_day"];
const VLE_COUNTS = ["interaction_volume", "active_days", "unique_sites", ...CSV_REQUIRED_COLUMNS.slice(-4)];
const VLE_SENTINEL = {
  interaction_volume: 182, active_days: 10, unique_sites: 20,
  first_activity_day: 1, last_activity_day: 26,
};
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
let model;

export class CsvInputError extends Error {}

function number(raw, key, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = true, blank = false } = {}) {
  const rawValue = raw[key];
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  if (blank && (value == null || value === "")) return null;
  const numeric = typeof value === "number" || (typeof value === "string" && DECIMAL.test(value))
    ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric) || (integer && !Number.isSafeInteger(numeric)) || numeric < min || numeric > max) {
    throw new CsvInputError(`Nilai ${key} harus berupa ${integer ? "bilangan bulat" : "angka"} antara ${min} dan ${max}.`);
  }
  return numeric;
}

export function prepareCsvRow(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CsvInputError("Baris CSV tidak dapat dibaca.");
  }
  for (const key of CSV_REQUIRED_COLUMNS) {
    if (!Object.hasOwn(raw, key)) throw new CsvInputError(`Kolom ${key} harus tersedia.`);
  }
  const values = {
    num_of_prev_attempts: number(raw, "num_of_prev_attempts"),
    studied_credits: number(raw, "studied_credits"),
    has_score: number(raw, "has_score", { max: 1 }),
    no_submission_by_cutoff: number(raw, "no_submission_by_cutoff", { max: 1 }),
  };
  for (const key of VLE_COUNTS) values[key] = number(raw, key, key === "active_days" ? { max: 29 } : {});
  const noInteractions = values.interaction_volume === 0;
  if (noInteractions !== (values.active_days === 0)) {
    throw new CsvInputError("Hari aktif dan volume interaksi harus sama-sama nol saat belum ada aktivitas.");
  }
  if (noInteractions && VLE_COUNTS.some((key) => values[key] !== 0)) {
    throw new CsvInputError("Jumlah situs dan interaksi mingguan harus nol saat belum ada aktivitas.");
  }
  for (const key of VLE_DAYS) values[key] = number(raw, key, { max: 28, blank: noInteractions });
  if (values.first_activity_day != null && values.last_activity_day != null
      && values.first_activity_day > values.last_activity_day) {
    throw new CsvInputError("Hari aktivitas pertama tidak boleh setelah hari aktivitas terakhir.");
  }
  const noActivity = noInteractions || Object.entries(VLE_SENTINEL).every(([key, value]) => values[key] === value);
  if (noActivity) {
    for (const key of VLE_COUNTS) values[key] = 0;
    for (const key of VLE_DAYS) values[key] = null;
  }
  const submittedScore = number(raw, "avg_score", { max: 100, integer: false, blank: !values.has_score });
  values.avg_score = values.has_score ? submittedScore : null;
  values.vle_none = Number(noActivity);
  return {
    features: [...CSV_REQUIRED_COLUMNS.map((key) => values[key]), values.vle_none],
    signals: {
      active_days: values.active_days,
      no_activity: noActivity,
      no_submission: Boolean(values.no_submission_by_cutoff),
      has_score: Boolean(values.has_score),
    },
  };
}

export function loadCsvModel() {
  if (!model) {
    const path = join(process.cwd(), "models", "next", "csv-four-week.json");
    const nextModel = JSON.parse(readFileSync(path, "utf8"));
    const columns = [...CSV_REQUIRED_COLUMNS, "vle_none"];
    if (nextModel.version !== 1 || nextModel.type !== "lightgbm-four-week"
        || !Array.isArray(nextModel.feature_columns) || nextModel.feature_columns.length !== columns.length
        || !columns.every((column, idx) => column === nextModel.feature_columns[idx])
        || !Array.isArray(nextModel.trees) || nextModel.trees.length === 0
        || !Number.isFinite(nextModel.threshold) || nextModel.threshold <= 0 || nextModel.threshold >= 1) {
      throw new Error("Artefak model CSV tidak sesuai.");
    }
    model = nextModel;
  }
  return model;
}

export function csvModelInfo() {
  const { metrics, evaluation } = loadCsvModel();
  return { metrics, evaluation };
}

function leafFor(tree, features) {
  let node = tree[0];
  while (Array.isArray(node)) {
    const [index, split, left, right, defaultLeft, missing] = node;
    const value = features[index];
    const missingSplit = (missing === 1 && value === null)
      || (missing === 2 && Math.abs(value ?? 0) <= 1e-35);
    const goLeft = missingSplit ? defaultLeft : (value ?? 0) <= split;
    node = tree[goLeft ? left : right];
  }
  return node;
}

export function predictCsvRow(raw, bundle = loadCsvModel()) {
  const { features, signals } = prepareCsvRow(raw);
  let margin = 0;
  for (const tree of bundle.trees) margin += leafFor(tree, features);
  const score = 1 / (1 + Math.exp(-margin));
  if (!Number.isFinite(score)) throw new Error("Skor model CSV tidak valid.");
  return { score, needs_follow_up: score >= bundle.threshold, signals };
}
