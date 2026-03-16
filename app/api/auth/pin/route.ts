import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "nectere_access";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  const expectedPin = process.env.ACCESS_PIN ?? "";
  const token = process.env.ACCESS_TOKEN ?? "";

  if (!expectedPin || !token) {
    return NextResponse.json(
      { error: "認証が設定されていません" },
      { status: 500 }
    );
  }

  if (pin !== expectedPin) {
    return NextResponse.json(
      { error: "PINが正しくありません" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // maxAge / expires を指定しないことで、ブラウザを閉じると消えるセッションCookieにする
    path: "/",
  });

  return res;
}
