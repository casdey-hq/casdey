import type { Metadata } from "next";
import { Mark } from "@/components/mark";
import { GoogleSignIn } from "./google-sign-in";

export const metadata: Metadata = { title: "Sign in · Casdey admin", robots: { index: false, follow: false } };

const errors: Record<string, string> = {
  "not-allowed": "That Google account doesn't have access. Sign in with one of Casdey's admin accounts.",
  "sign-in-failed": "Sign-in didn't complete. Try again.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="login-card">
        <Mark className="login-mark" />
        <h1>Casdey admin</h1>
        <p>Signups, visitors and conversion, live.</p>
        {error && errors[error] ? <p className="msg error" role="alert">{errors[error]}</p> : null}
        <GoogleSignIn />
      </div>
    </main>
  );
}
