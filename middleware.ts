import { NextResponse, type NextRequest } from "next/server";

// Si no hay sesión, las páginas mandan a /login. Las rutas de la API validan la sesión por su cuenta.
const PUBLIC = ["/login", "/api/", "/sw.js", "/icon", "/apple-touch-icon.png", "/manifest.webmanifest"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (req.cookies.get("timba_session")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
