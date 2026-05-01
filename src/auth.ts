import NextAuth, { type NextAuthConfig, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
    };
  }
}

const oidcIssuer = process.env.AUTH_OIDC_ISSUER;
const oidcClientId = process.env.AUTH_OIDC_CLIENT_ID;
const oidcClientSecret = process.env.AUTH_OIDC_CLIENT_SECRET;
const devCredentialsEnabled =
  process.env.AUTH_DEV_CREDENTIALS === "true" ||
  (process.env.NODE_ENV !== "production" && !oidcIssuer);

const providers: NextAuthConfig["providers"] = [];

if (oidcIssuer && oidcClientId && oidcClientSecret) {
  providers.push({
    id: "oidc",
    name: "Vibly OIDC",
    type: "oidc",
    issuer: oidcIssuer,
    clientId: oidcClientId,
    clientSecret: oidcClientSecret,
  });
}

if (devCredentialsEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev sign-in",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        if (!email) return null;
        return { id: email, email, name: email };
      },
    }),
  );
}

const config: NextAuthConfig = {
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (user.id) token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
