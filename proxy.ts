import { NextResponse, type NextRequest } from "next/server";

// Rutas que exigen sesión. El chequeo acá es OPTIMISTA (solo presencia de
// cookie, sin tocar la DB). La verificación real la hace el DAL en cada página.
const PROTECTED = ["/predicciones", "/admin", "/cambiar-pin"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !req.cookies.has("polla_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Corre en todo menos assets, api e imágenes.
  matcher: ["/((?!api|_next/static|_next/image|icon.png|apple-icon.png|manifest.webmanifest).*)"],
};
