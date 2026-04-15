import NextAuth, { type NextAuthConfig } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import connectDB, { getMongoUri } from "./mongodb";
import User, { UserDocument } from "@/models/User";
import { UserRole } from "@/types";
import type { Provider } from "next-auth/providers";

const hasOAuthProviders = Boolean(
  (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
    (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
);

// MongoDB adapter is only required for OAuth account persistence.
// For local credentials + JWT sessions, eager adapter startup can break `/auth/signin`
// when Mongo isn't ready yet, so we avoid creating it unless OAuth is enabled.
const mongoUriForAdapter =
  hasOAuthProviders && process.env.NEXT_PHASE !== "phase-production-build"
    ? getMongoUri()
    : "";
const options = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
};

const clientPromise: Promise<MongoClient> | null = mongoUriForAdapter
  ? (() => {
      if (!global._mongoClientPromise) {
        const client = new MongoClient(mongoUriForAdapter, options);
        global._mongoClientPromise = client.connect();
      }
      return global._mongoClientPromise;
    })()
  : null;

// Create providers array conditionally
const providers: Provider[] = [];

// Add Google OAuth Provider if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          firstName: profile?.given_name || "",
          lastName: profile?.family_name || "",
          avatar: profile?.picture,
          role: UserRole.TENANT, // Default role for OAuth users
          isActive: true,
          emailVerified: new Date(profile?.email_verified ? Date.now() : 0),
        };
      },
    })
  );
}

// Add GitHub OAuth Provider if configured
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile?.id?.toString() ?? "",
          email: profile?.email ?? "",
          firstName: profile?.name?.split(" ")?.[0] || "",
          lastName: profile?.name?.split(" ")?.slice(1)?.join(" ") || "",
          avatar: profile?.avatar_url,
          role: UserRole.TENANT, // Default role for OAuth users
          isActive: true,
          emailVerified: profile?.email ? new Date() : null,
        };
      },
    })
  );
}

// Always add Credentials Provider
providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: {
        label: "Email",
        type: "email",
        placeholder: "Enter your email",
      },
      password: {
        label: "Password",
        type: "password",
        placeholder: "Enter your password",
      },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      try {
        await connectDB();

        // Fetch only the fields needed for auth + JWT population
        const user = (await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        }).select("+password firstName lastName avatar role isActive")) as UserDocument | null;

        if (!user || !user.isActive) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await user.comparePassword(
          credentials.password as string
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Fire-and-forget — don't block login on a timestamp write
        user.updateLastLogin().catch(() => {});

        return {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as UserRole,
          avatar: user.avatar,
          isActive: user.isActive,
        };
      } catch (error) {
        throw new Error("Authentication failed");
      }
    },
  })
);

export const authOptions: NextAuthConfig = {
  // @ts-expect-error - Type mismatch between @auth/mongodb-adapter and next-auth adapter types
  adapter: hasOAuthProviders && clientPromise ? MongoDBAdapter(clientPromise) : undefined,
  providers,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "smartstartpm-local-dev-secret-32chars!!"
      : undefined),

  // Trust host for development and production
  trustHost: true,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Cookie configuration for production
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, embed all profile fields into the JWT so the
      // session callback never needs a DB round-trip.
      if (user?.id) {
        token.userId = user.id;
        token.sub = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
        token.firstName = (user as any).firstName ?? "";
        token.lastName = (user as any).lastName ?? "";
        token.avatar = (user as any).avatar ?? "";
      }
      return token;
    },

    async session({ session, token }) {
      // Read entirely from the JWT — zero DB queries per request.
      // Profile changes take effect on the next sign-in (JWT re-issue).
      const userId = ((token.userId || token.sub) as string) ?? "";
      session.user.id = userId;
      session.user.role = (token.role as UserRole) ?? UserRole.TENANT;
      session.user.isActive = (token.isActive as boolean) ?? false;
      session.user.firstName = (token.firstName as string) ?? "";
      session.user.lastName = (token.lastName as string) ?? "";
      session.user.name =
        `${token.firstName || ""} ${token.lastName || ""}`.trim() ||
        session.user.email ||
        "";
      session.user.avatar = (token.avatar as string) ?? "";
      return session;
    },

    async signIn({ user, account }) {
      // Credentials were already validated in authorize() with DB access — avoid a second
      // connectDB() here so a transient DB blip cannot reject an otherwise valid login.
      if (account?.provider === "credentials") {
        return true;
      }

      try {
        await connectDB();

        // OAuth: create or update user (credentials handled above)
        const existingUser = await User.findOne({ email: user.email });

        if (existingUser) {
          existingUser.avatar = user.avatar || existingUser.avatar;
          existingUser.emailVerified =
            existingUser.emailVerified || new Date();
          await existingUser.save();
        } else {
          await User.create({
            email: user.email,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            avatar: user.avatar,
            role: UserRole.TENANT,
            isActive: true,
            emailVerified: new Date(),
          });
        }

        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },

    async redirect({ url, baseUrl }) {
      // Build the set of trusted hosts: baseUrl + NEXTAUTH_URL + AUTH_URL + CUSTOM_DOMAIN
      const trustedHosts = new Set<string>();
      try { trustedHosts.add(new URL(baseUrl).host); } catch {}
      for (const envKey of ["NEXTAUTH_URL", "AUTH_URL", "CUSTOM_DOMAIN"]) {
        const val = process.env[envKey];
        if (val) {
          try { trustedHosts.add(new URL(val.startsWith("http") ? val : `https://${val}`).host); } catch {}
        }
      }

      // Relative paths → prepend the origin the request came from
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      try {
        const u = new URL(url);
        // Allow redirect if destination host is trusted
        if (trustedHosts.has(u.host)) return url;
      } catch {}

      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  debug: false,
};

// Export NextAuth instance with auth, handlers, signIn, signOut
export const {
  auth,
  handlers,
  signIn: signInAction,
  signOut: signOutAction,
} = NextAuth(authOptions);

export {
  hasRole,
  isAdmin,
  isOwner,
  canManageProperties,
  canManageOwnProperties,
  canAccessTenantFeatures,
  hasCompanyAccess,
  canManageUsers,
  canViewAllData,
  canViewPropertyData,
  canManageCalendarEvents,
  canBlockDates,
} from "./auth-role-helpers";
