"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) return setErr("Password must be at least 8 characters.");
    if (password !== confirm) return setErr("Passwords do not match.");

    setBusy(true);
    const res = await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Could not reset password.");
    router.push("/grading");
    router.refresh();
  }

  if (!token) {
    return (
      <div className="auth-card">
        <h1>Reset password</h1>
        <div className="err">This reset link is missing its token.</div>
        <div className="link-line">
          <Link href="/forgot">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Choose a new password</h1>
      <p className="sub">At least 8 characters.</p>

      <label htmlFor="pw">New password</label>
      <input
        id="pw"
        className="inp"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <label htmlFor="pw2">Confirm password</label>
      <input
        id="pw2"
        className="inp"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      {err && <div className="err">{err}</div>}

      <div style={{ marginTop: 18 }}>
        <button className="btn primary wide" disabled={busy}>
          {busy ? "Saving…" : "Set password & sign in"}
        </button>
      </div>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={<div className="auth-card">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
