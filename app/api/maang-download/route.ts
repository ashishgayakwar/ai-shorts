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

  const hostedPdfUrl = process.env.MAANG_PDF_URL;
  if (hostedPdfUrl) {
    const response = NextResponse.redirect(hostedPdfUrl, 302);
    response.cookies.set({
      name: "maang_dl_token",
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const filePath = path.join(process.cwd(), "assets", "maang-interview-series.pdf");
  let file: Buffer;

  try {
    file = await readFile(filePath);
  } catch {
    return NextResponse.json({ ok: false, error: "PDF not found." }, { status: 404 });
  }

  // If deployment didn't fetch Git LFS objects, this file is just a tiny pointer text.
  const lfsPointerPrefix = "version https://git-lfs.github.com/spec/v1";
  const headText = file.subarray(0, 80).toString("utf8");
  if (headText.startsWith(lfsPointerPrefix)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "PDF binary is not available on this deployment. Configure MAANG_PDF_URL or enable Git LFS in deploy.",
      },
      { status: 500 }
    );
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
