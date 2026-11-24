import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadEnsemble, predictExample, predictFeatures } from "../lib/model.mjs";

const bundle = loadEnsemble();
const cases = JSON.parse(readFileSync("models/next/contoh.json", "utf8"));
for (const [id, example] of Object.entries(cases)) {
  const prediction = predictExample(id);
  assert(Math.abs(prediction.score - example.expected[0]) < 1e-6, id);
  assert.equal(prediction.needs_follow_up, example.expected[1], id);
  console.log(id, prediction.score.toFixed(8));
}

const validationPath = process.argv[2];
if (validationPath) {
  const reference = JSON.parse(readFileSync(validationPath, "utf8"));
  const families = Object.keys(reference.probabilities);
  const maxError = Object.fromEntries(families.map((name) => [name, 0]));
  let differingLabels = 0;
  for (const [index, row] of reference.rows.entries()) {
    const actual = predictFeatures(row, bundle);
    let expectedBlend = 0;
    for (const name of families) {
      const expected = reference.probabilities[name][index];
      expectedBlend += expected / families.length;
      maxError[name] = Math.max(maxError[name], Math.abs(actual.families[name] - expected));
    }
    if ((expectedBlend > bundle.threshold) !== (actual.score > bundle.threshold)) differingLabels++;
  }
  console.log(JSON.stringify({ rows: reference.rows.length, maxError, differingLabels }));
  assert(Object.values(maxError).every((error) => error < 1e-5));
  assert.equal(differingLabels, 0);
}
