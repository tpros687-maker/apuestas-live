import { NextResponse, type NextRequest } from "next/server";

// Protección simple: si APP_PASSWORD está definida, el navegador pide usuario/contraseña.
// /api/check queda afuera porque lo llama el cron con su propio secreto.
export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD;
  if (!pass || req.nextUrl.pathname.startsWith("/api/check")) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, given] = atob(auth.slice(6)).split(":");
    if (given === pass) return NextResponse.next();
  }
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="TIMBA"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
