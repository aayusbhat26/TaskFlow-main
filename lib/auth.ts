import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, NextAuthOptions } from "next-auth";
import { db } from "./db";
import { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { generateFromEmail } from "unique-username-generator";
import { userService } from "./userService";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    error: "/sign-in",
    signIn: "/sign-in",
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      httpOptions: {
        timeout: 10000,
      },
      async profile(profile) {
        const username = generateFromEmail(profile.email, 5);
        return {
          id: profile.sub,
          username,
          name: profile.given_name ? profile.given_name : profile.name,
          surname: profile.family_name ? profile.family_name : "",
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      async profile(profile) {
        const username = generateFromEmail(profile.email, 5);
        const fullName = profile.name.split(" ");
        return {
          id: profile.id,
          username: profile.login ? profile.login : username,
          name: fullName.at(0),
          surname: fullName.at(1),
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "Username" },
        email: { label: "Email", type: "text", placeholder: "Email" },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password",
        },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Please enter email and password.");
        }

        try {
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          const response = await res.json();
          if (!res.ok || !response.user) {
            throw new Error(response.message || "Authentication failed");
          }
          const user = response.user;
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.firstName || user.username,
            surname: user.lastName || "",
            image: user.profileImage,
          };
        } catch (error) {
          // Fallback to database check for existing users
          const user = await db.user.findUnique({
            where: {
              email: credentials.email,
            },
          });
          console.log("[NextAuth] DB user:", user);

          if (!user || !user?.hashedPassword) {
            console.log("[NextAuth] User not found or missing password");
            throw new Error("User was not found, Please enter valid email");
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );
          console.log("[NextAuth] Password match:", passwordMatch);

          if (!passwordMatch) {
            console.log("[NextAuth] Incorrect password");
            throw new Error(
              "The entered password is incorrect, please enter the correct one."
            );
          }

          console.log("[NextAuth] Returning DB user:", user);
          return user;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.username = token.username;
        session.user.surname = token.surname;
        session.user.completedOnboarding = !!token.completedOnboarding;
        session.user.plan = token.plan as string | undefined;
      }

      const user = await db.user.findUnique({
        where: {
          id: token.id,
        },
      });

      if (user) {
        session.user.image = user.image;
        session.user.completedOnboarding = user.completedOnboarding;
        session.user.username = user.username;
        session.user.plan = user.plan;
      }

      return session;
    },
    async jwt({ token, user }) {
      const dbUser = await db.user.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!dbUser) {
        token.id = user!.id;
        return token;
      }

      return {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        picture: dbUser.image,
        plan: dbUser.plan,
      };
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
