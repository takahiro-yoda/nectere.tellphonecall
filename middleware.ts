import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "nectere_access";
const JUST_SAW_AUTH_COOKIE = "nectere_just_saw_auth";

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

  // 認証済み：直前に認証画面を見た直後でなければ、一瞬認証画面を経由（自己満）
  const justSawAuth = request.cookies.get(JUST_SAW_AUTH_COOKIE)?.value;
  if (!justSawAuth) {
    const authSuccessUrl = new URL("/auth/success", request.url);
    authSuccessUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(authSuccessUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
