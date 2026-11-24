import { predictTest } from "../../../lib/model.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json" || Number(request.headers.get("content-length")) > 4096) {
    return Response.json({ error: "Masukkan ID data test yang valid." }, { status: 400 });
  }
  try {
    const body = await request.text();
    if (body.length > 4096) return Response.json({ error: "Masukkan ID data test yang valid." }, { status: 400 });
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || Object.keys(data).length !== 1
        || typeof data.id !== "string" || !/^\d{1,12}$/.test(data.id)) {
      return Response.json({ error: "Masukkan ID data test yang valid." }, { status: 400 });
    }
    const result = predictTest(data.id);
    if (!result) return Response.json({ error: "ID tidak ditemukan pada data test." }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
    console.error("Analisis gagal", error);
    return Response.json({ error: "Analisis belum bisa dijalankan. Coba lagi." }, { status: 500 });
  }
}
