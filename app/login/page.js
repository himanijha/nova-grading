"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Sign in failed");
    router.push("/grading");
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Nova Grading</h1>
        <p className="sub">Sign in to grade applications.</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="inp"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="inp"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {err && <div className="err">{err}</div>}

        <div style={{ marginTop: 18 }}>
          <button className="btn primary wide" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <div className="link-line">
          <Link href="/forgot">Forgot your password?</Link>
        </div>
      </form>
    </div>
  );
}
