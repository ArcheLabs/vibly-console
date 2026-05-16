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

  const isPrivatePage = pathname.startsWith("/requests");
  if (!isPrivatePage) return;

  if (req.auth) return;

  return Response.redirect(new URL("/", nextUrl));
});

export const config = {
  matcher: [
    "/requests/:path*",
  ],
};
