// Next.js 16 renamed `middleware.ts` to `proxy.ts`. We use it as the
// central route protection layer for the multi-tenant Console:
//
// - Anything under `/projects/*` requires a signed-in session. Deep
//   links to `/projects/:id/*` are redirected to `/login?callbackUrl=…`
//   when the user is not signed in.
//
// - Anything under `/api/coordinator/*` is also gated; the route handler
//   itself re-validates the session, but blocking unauthenticated
//   requests at the edge avoids hitting the upstream Coordinator on
//   every drive-by probe.
//
// - `/login`, `/api/auth/*`, and Next internals are always allowed so
//   the sign-in UI itself can render.
import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  const isProjects = pathname.startsWith("/projects");
  if (!isProjects) return;

  if (req.auth) return;

  const loginUrl = new URL("/login", nextUrl);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
  return Response.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/projects/:path*",
  ],
};
