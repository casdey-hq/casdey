"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function GoogleSignIn() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
  }

  return (
    <button className="btn google" type="button" onClick={signIn} disabled={busy}>
      {busy ? "Opening Google" : "Continue with Google"}
    </button>
  );
}
