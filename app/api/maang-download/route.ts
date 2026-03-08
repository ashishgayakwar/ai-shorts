import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

import { verifyMaangDownloadToken } from "@/lib/maang-download-token";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("maang_dl_token")?.value || "";

  if (!token || !verifyMaangDownloadToken(token)) {
    return NextResponse.json(
      { ok: false, error: "Please submit your details to download the PDF." },
      { status: 403 }
    );
  }

  const filePath = path.join(process.cwd(), "assets", "maang-interview-series.pdf");
  let file: Buffer;

  try {
    file = await readFile(filePath);
  } catch {
    return NextResponse.json({ ok: false, error: "PDF not found." }, { status: 404 });
  }

  const response = new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="maang-interview-series.pdf"',
      "Cache-Control": "no-store",
    },
  });

  response.cookies.set({
    name: "maang_dl_token",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}
