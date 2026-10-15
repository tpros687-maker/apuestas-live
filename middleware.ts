import { NextResponse, type NextRequest } from "next/server";

// Protección simple: si APP_PASSWORD está definida, el navegador pide usuario/contraseña.
// /api/check queda afuera porque lo llama el cron con su propio secreto.
export function middleware(req: NextRequest) {
  const pass = process.env.APP_PASSWORD?.trim().replace(/^["']|["']$/g, "");
  if (!pass || req.nextUrl.pathname.startsWith("/api/check")) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      // Decodifica en UTF-8 (para ñ y tildes) y toma todo lo que va después del primer ":".
      const bytes = Uint8Array.from(atob(auth.slice(6).trim()), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const given = decoded.slice(decoded.indexOf(":") + 1).trim();
      if (given === pass) return NextResponse.next();
    } catch {
      /* encabezado mal formado: pedimos de nuevo */
    }
  }
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="TIMBA"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
