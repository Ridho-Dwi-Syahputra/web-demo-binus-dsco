import { predictExample } from "../../../lib/model.mjs";

export const runtime = "nodejs";
const MAX_BODY_LENGTH = 4096;

function badInput() {
  return Response.json({ error: "Pilih satu contoh yang valid." }, { status: 400 });
}

export async function POST(request) {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json" || Number(request.headers.get("content-length")) > MAX_BODY_LENGTH) {
    return badInput();
  }
  let data;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY_LENGTH) return badInput();
    data = JSON.parse(body);
  } catch {
    return badInput();
  }
  if (!data || typeof data !== "object" || Object.keys(data).length !== 1
      || typeof data.case_id !== "string" || !data.case_id.trim()) {
    return badInput();
  }

  try {
    const result = predictExample(data.case_id);
    if (!result) return Response.json({ error: "Contoh tidak ditemukan." }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    console.error("Analisis Pelita Belajar gagal", error);
    return Response.json({ error: "Analisis belum bisa dijalankan. Coba lagi." }, { status: 500 });
  }
}
