import { NextRequest } from "next/server";

import { getFileTextContent } from "@/lib/actions/preview.actions";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    const result = await getFileTextContent(fileId);

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    const status =
      message === "Forbidden"
        ? 403
        : message === "Unauthenticated"
        ? 401
        : message.includes("too large")
        ? 413
        : 400;

    return new Response(message, { status });
  }
}
