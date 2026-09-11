"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    setSent(true);
    if (data.resetUrl) setLink(data.resetUrl);
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Reset password</h1>
        <p className="sub">
          Enter your email and we&rsquo;ll generate a reset link.
        </p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="inp"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div style={{ marginTop: 18 }}>
          <button className="btn primary wide" disabled={busy}>
            {busy ? "Working…" : "Send reset link"}
          </button>
        </div>

        {sent && (
          <>
            <div className="ok">
              If that email belongs to a grader, a reset link has been created.
            </div>
            {link && (
              <div style={{ marginTop: 12 }}>
                <div className="info-label">Your reset link</div>
                <a className="mono" href={link}>
                  {link}
                </a>
              </div>
            )}
          </>
        )}

        <div className="link-line">
          <Link href="/login">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}
