import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { LoginPage } from "./LoginPage";

interface SearchParams {
  callbackUrl?: string;
  error?: string;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) {
    redirect(callbackUrl ?? "/projects");
  }

  // Surface the active providers so the client form knows what to render.
  // We re-derive from `signIn`'s registered config rather than
  // duplicating env reads in the component.
  void signIn;
  const providers = collectProviders();
  return <LoginPage providers={providers} />;
}

function collectProviders(): { id: string; name: string }[] {
  const list: { id: string; name: string }[] = [];
  if (
    process.env.AUTH_OIDC_ISSUER &&
    process.env.AUTH_OIDC_CLIENT_ID &&
    process.env.AUTH_OIDC_CLIENT_SECRET
  ) {
    list.push({ id: "oidc", name: "Vibly OIDC" });
  }
  const devEnabled =
    process.env.AUTH_DEV_CREDENTIALS === "true" ||
    (process.env.NODE_ENV !== "production" && !process.env.AUTH_OIDC_ISSUER);
  if (devEnabled) {
    list.push({ id: "dev", name: "Dev sign-in" });
  }
  return list;
}
