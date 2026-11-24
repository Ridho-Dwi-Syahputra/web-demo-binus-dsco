import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { CSV_REQUIRED_COLUMNS } from "../../../lib/csv-model.mjs";

export const runtime = "nodejs";

export function GET() {
  const contextColumns = ["code_module", "code_presentation", "submitted_count", "late_submission_count"];
  const columns = ["id", ...contextColumns, ...CSV_REQUIRED_COLUMNS];
  const [example] = parse(readFileSync(join(process.cwd(), "data", "test.csv")), {
    columns: true, bom: true, to: 2,
  });
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const body = [columns.map(escape).join(","), columns.map((key) => escape(example[key])).join(",")].join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-data-belajar.csv"',
    },
  });
}
