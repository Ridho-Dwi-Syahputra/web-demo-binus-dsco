import { readTrainingCsv } from "../../../../lib/training-data.mjs";

export const runtime = "nodejs";

export function GET() {
  return new Response(readTrainingCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="data-belajar.csv"',
    },
  });
}
