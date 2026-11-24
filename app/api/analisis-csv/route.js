import { parse } from "csv-parse/sync";
import { CSV_REQUIRED_COLUMNS, CsvInputError, prepareCsvRow, predictCsvRow } from "../../../lib/csv-model.mjs";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10000;

const invalid = (error, details = []) => Response.json({ error, details }, { status: 400 });

export async function POST(request) {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BYTES + 100000) return invalid("Ukuran file maksimal 5 MB.");
  let file;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch {
    return invalid("File belum dapat dibaca. Pilih file CSV.");
  }
  if (!file || typeof file === "string" || !file.name.toLowerCase().endsWith(".csv")) return invalid("Pilih file dengan ekstensi .csv.");
  if (!file.size || file.size > MAX_BYTES) return invalid("File kosong atau melebihi batas 5 MB.");
  let records;
  try {
    records = parse(await file.text(), { bom: true, skip_empty_lines: true, trim: true });
  } catch {
    return invalid("Format CSV tidak dapat dibaca. Periksa pemisah koma dan tanda petik.");
  }
  if (records.length < 2) return invalid("File belum berisi catatan. Isi minimal satu baris data.");
  if (records.length - 1 > MAX_ROWS) return invalid("File memuat lebih dari 10.000 catatan.");
  const [headers, ...data] = records;
  if (new Set(headers).size !== headers.length) return invalid("Ada nama kolom yang terulang. Gunakan satu kolom untuk setiap nama.");
  const missing = ["id", ...CSV_REQUIRED_COLUMNS].filter((column) => !headers.includes(column));
  if (missing.length) return invalid("Kolom wajib belum lengkap.", missing.map((column) => `Tambahkan kolom ${column}.`));
  const issues = [];
  const parsed = [];
  const ids = new Set();
  for (let index = 0; index < data.length; index++) {
    const values = data[index];
    const rowNumber = index + 1;
    if (values.length !== headers.length) {
      issues.push(`Catatan ${rowNumber}: jumlah nilai tidak sesuai jumlah kolom.`);
      continue;
    }
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    if (!row.id || row.id.length > 100) {
      issues.push(`Catatan ${rowNumber}: ID wajib diisi, maksimal 100 karakter.`);
      continue;
    }
    if (ids.has(row.id)) {
      issues.push(`Catatan ${rowNumber}: ID ${row.id} terulang.`);
      continue;
    }
    ids.add(row.id);
    for (const field of ["code_module", "code_presentation"]) {
      if (row[field] != null && row[field].length > 40) issues.push(`Catatan ${rowNumber} (ID ${row.id}): ${field} maksimal 40 karakter.`);
    }
    for (const field of ["submitted_count", "late_submission_count"]) {
      if (row[field] != null && row[field] !== "" && (!/^\d+$/.test(row[field]) || Number(row[field]) > 10000)) {
        issues.push(`Catatan ${rowNumber} (ID ${row.id}): ${field} harus bilangan bulat 0–10.000.`);
      }
    }
    try {
      prepareCsvRow(row);
      parsed.push(row);
    } catch (error) {
      if (!(error instanceof CsvInputError)) throw error;
      issues.push(`Catatan ${rowNumber} (ID ${row.id}): ${error.message}`);
    }
  }
  if (issues.length) {
    return invalid(`Ada ${issues.length} catatan yang perlu diperbaiki. Belum ada hasil yang dibuat.`, issues.slice(0, 30));
  }
  const results = parsed.map((row) => {
    const result = predictCsvRow(row);
    const weeklyInteractions = [1, 2, 3, 4].map((week) =>
      result.signals.no_activity ? 0 : Number(row[`week${week}_interactions`]));
    return {
      id: row.id,
      context: {
        module: row.code_module || "",
        period: row.code_presentation || "",
        submitted_count: row.submitted_count === "" || row.submitted_count == null ? null : Number(row.submitted_count),
        late_submission_count: row.late_submission_count === "" || row.late_submission_count == null ? null : Number(row.late_submission_count),
        attempts: Number(row.num_of_prev_attempts),
        credits: Number(row.studied_credits),
        avg_score: row.avg_score === "" || row.avg_score == null ? null : Number(row.avg_score),
      },
      ...result,
      signals: { ...result.signals, weekly_interactions: weeklyInteractions },
    };
  });
  return Response.json({ results });
}
