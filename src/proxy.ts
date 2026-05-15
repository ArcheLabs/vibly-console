// Next.js 16 renamed `middleware.ts` to `proxy.ts`. We use it as the
// central route protection layer for the multi-tenant Console:
//
// - Private pages (for now `/requests/*` and `/onboarding/*`) require a
//   signed-in session and redirect to `/login?callbackUrl=…` when the
//   user is not signed in.
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

  const isPrivatePage = pathname.startsWith("/requests") || pathname.startsWith("/onboarding");
  if (!isPrivatePage) return;

  if (req.auth) return;

  const loginUrl = new URL("/login", nextUrl);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
  return Response.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/requests/:path*",
    "/onboarding/:path*",
  ],
};
