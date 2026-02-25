import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Rutas públicas — no proteger
  const publicPaths = [
    "/",
    "/login",
    "/login-admin",
    "/registro",
    "/catalogo",
    "/alquiler",
    "/api/auth",
    "/api/public",
    "/api/webhooks",
    "/api/supplier",
    "/scan",
    "/docs",
  ];

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) return NextResponse.next();

  // Rutas protegidas
  if (!isLoggedIn) {
    // API routes devuelven 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    // Páginas redirigen a login
    const loginUrl =
      pathname.startsWith("/admin") || pathname.startsWith("/portal-taller")
        ? "/login-admin"
        : "/login";
    return NextResponse.redirect(new URL(loginUrl, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
