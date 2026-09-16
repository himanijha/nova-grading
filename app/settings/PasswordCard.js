"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Change your own password. Every grader has one, admin or not. */
export default function PasswordCard({ grader }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (password.length < 8) return setErr("New password must be at least 8 characters.");
    if (password !== confirm) return setErr("The new passwords do not match.");

    setBusy(true);
    const res = await fetch("/api/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Could not change your password.");

    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    setMsg("Password changed. It's the one you'll use next time you sign in.");
    // Clears the "set a new password" banner once mustReset is off.
    router.refresh();
  }

  return (
    <section className="card">
      <h3>Change password</h3>

      {grader.mustReset && (
        <div className="err" style={{ marginBottom: 16 }}>
          You are still on the temporary password an admin gave you. Choose your
          own below.
        </div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="cur">Current password</label>
          <input
            id="cur"
            className="inp"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="new">New password</label>
          <input
            id="new"
            className="inp"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="count-note">At least 8 characters.</div>
        </div>

        <div className="field">
          <label htmlFor="new2">Confirm new password</label>
          <input
            id="new2"
            className="inp"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        {err && <div className="err">{err}</div>}

        <div className="btn-row">
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
        <div className="save-note">{msg}</div>
      </form>
    </section>
  );
}
