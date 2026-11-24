import { listExamples } from "../../../lib/model.mjs";

export const runtime = "nodejs";

export function GET() {
  return Response.json({ examples: listExamples() });
}
