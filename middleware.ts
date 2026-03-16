import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "nectere_access";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ログイン画面とAPI、認証成功画面はそのまま
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/success")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // 認証されていなければログインへ
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 認証済みであればそのまま表示
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
