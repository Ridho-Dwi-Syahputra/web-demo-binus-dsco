import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { parse } from "csv-parse/sync";
import { hasActivity } from "./training-data.mjs";

const artifacts = join(process.cwd(), "models", "next");
let examples;
let ensemble;
let testRecords;

function loadTestRecords() {
  if (testRecords) return testRecords;
  const features = JSON.parse(gunzipSync(readFileSync(join(artifacts, "test_features.json.gz"))));
  const rows = parse(readFileSync(join(process.cwd(), "data", "test.csv")), { columns: true, bom: true });
  if (rows.length !== features.ids.length || rows.length !== features.rows.length
      || rows.some((row, i) => row.id !== features.ids[i])
      || new Set(features.ids).size !== rows.length) {
    throw new Error("Data test dan fitur model tidak sesuai.");
  }
  testRecords = new Map(rows.map((row, i) => [row.id, { row, features: features.rows[i] }]));
  return testRecords;
}

export function predictTest(id) {
  const record = loadTestRecords().get(id);
  if (!record) return null;
  const { row, features } = record;
  const bundle = loadEnsemble();
  const { score } = predictFeatures(features, bundle);
  const noActivity = !hasActivity(row);
  return {
    id, score, needs_follow_up: score > bundle.threshold,
    signals: {
      module: row.code_module, period: row.code_presentation,
      active_days: noActivity ? null : Number(row.active_days),
      no_activity: noActivity,
      no_submission: row.no_submission_by_cutoff === "1",
      submitted_count: Number(row.submitted_count),
      has_score: row.has_score === "1",
    },
  };
}

function readExamples() {
  examples ??= JSON.parse(readFileSync(join(artifacts, "contoh.json"), "utf8"));
  return examples;
}

export function loadEnsemble() {
  if (!ensemble) {
    const data = JSON.parse(gunzipSync(readFileSync(join(artifacts, "ensemble.json.gz"))));
    if (data.version !== 1 || data.features !== 74) {
      throw new Error("Format ensemble tidak didukung.");
    }
    ensemble = data;
  }
  return ensemble;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function walkLightgbm(nodes, row) {
  let node = nodes[0];
  while (Array.isArray(node)) {
    const [feature, threshold, left, right, defaultLeft, missing] = node;
    const value = row[feature];
    let goLeft;
    if (Array.isArray(threshold)) {
      goLeft = value !== null && threshold.includes(value);
    } else if ((missing === 1 && value === null) || (missing === 2 && Math.abs(value ?? 0) <= 1e-35)) {
      goLeft = defaultLeft;
    } else {
      goLeft = (value ?? 0) <= threshold;
    }
    node = nodes[goLeft ? left : right];
  }
  return node;
}

function lightgbmScore(trees, row) {
  let margin = 0;
  for (const nodes of trees) margin += walkLightgbm(nodes, row);
  return sigmoid(margin);
}

function xgboostScore([base, trees], row) {
  let margin = Math.fround(Math.log(base / (1 - base)));
  for (const nodes of trees) {
    let node = nodes[0];
    while (Array.isArray(node)) {
      const [feature, threshold, left, right, defaultLeft] = node;
      const value = row[feature];
      const goLeft = value === null ? defaultLeft : value < Math.fround(threshold);
      node = nodes[goLeft ? left : right];
    }
    margin = Math.fround(margin + Math.fround(node));
  }
  return Math.fround(sigmoid(margin));
}

function catboostScore([scale, bias, trees], row) {
  let margin = 0;
  for (const [splits, leaves] of trees) {
    let index = 0;
    for (let bit = 0; bit < splits.length; bit++) {
      const [feature, border, missingRight] = splits[bit];
      const value = row[feature];
      if (value === null ? missingRight : value > Math.fround(border)) index |= 1 << bit;
    }
    margin += leaves[index];
  }
  return sigmoid(scale * margin + bias);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function predictFeatures(row, bundle = loadEnsemble()) {
  if (row.length !== bundle.features) throw new Error("Jumlah fitur berbeda.");
  const float32 = row.map((value) => value === null ? null : Math.fround(value));
  const families = {
    lightgbm: mean(bundle.lightgbm.map((model) => lightgbmScore(model, row))),
    xgboost: mean(bundle.xgboost.map((model) => xgboostScore(model, float32))),
    catboost: mean(bundle.catboost.map((model) => catboostScore(model, float32))),
  };
  return { score: mean(Object.values(families)), families };
}

export function listExamples() {
  return Object.fromEntries(Object.entries(readExamples()).map(([id, example]) => [id, example.signals]));
}

export function predictExample(id) {
  const cases = readExamples();
  if (!Object.hasOwn(cases, id)) return null;
  const example = cases[id];
  const bundle = loadEnsemble();
  const { score } = predictFeatures(example.features, bundle);
  return {
    case_id: id,
    score,
    needs_follow_up: score > bundle.threshold,
    signals: example.signals,
  };
}
