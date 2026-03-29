import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/swipe") {
    const mode = searchParams.get("mode");
    if (mode === "quiz") {
      return NextResponse.redirect(new URL("/quiz", request.url), 308);
    }
    if (mode === "visualize") {
      return NextResponse.redirect(new URL("/visualize", request.url), 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/swipe"],
};
