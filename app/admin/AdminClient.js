"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminClient({ me, graders, stats }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", isAdmin: false });
  const [err, setErr] = useState("");
  const [links, setLinks] = useState({});
  const [busy, setBusy] = useState(false);

  async function call(body) {
    setErr("");
    setBusy(true);
    const res = await fetch("/api/graders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Something went wrong.");
      return null;
    }
    router.refresh();
    return data;
  }

  async function addGrader(e) {
    e.preventDefault();
    const ok = await call({ action: "create", ...form });
    if (ok) setForm({ name: "", email: "", password: "", isAdmin: false });
  }

  async function resetLink(id) {
    const data = await call({ action: "reset-link", graderId: id });
    if (data) setLinks((l) => ({ ...l, [id]: data.resetUrl }));
  }

  async function remove(id, name) {
    if (!confirm(`Remove ${name}? Their grades will be deleted too.`)) return;
    await call({ action: "delete", graderId: id });
  }

  return (
    <div className="page">
      <h1>Admin</h1>
      <p className="sub">Manage graders and check grading progress.</p>

      <div className="card">
        <h3>Progress</h3>
        <div className="info-grid">
          <div>
            <div className="info-label">Applicants</div>
            <div className="info-value">{stats.applicantCount}</div>
          </div>
          <div>
            <div className="info-label">Total reviews</div>
            <div className="info-value">{stats.gradeCount}</div>
          </div>
          <div>
            <div className="info-label">Not yet reviewed</div>
            <div className="info-value">{stats.ungraded}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Graders</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Reviews</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {graders.map((g) => (
              <tr key={g.id}>
                <td>
                  {g.name}
                  {g.id === me.id && " (you)"}
                </td>
                <td>{g.email}</td>
                <td>{g.isAdmin ? "Admin" : "Grader"}</td>
                <td>{g.gradeCount}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    className="btn"
                    style={{ padding: "6px 10px", marginRight: 6 }}
                    disabled={busy}
                    onClick={() => resetLink(g.id)}
                  >
                    Reset link
                  </button>
                  {g.id !== me.id && (
                    <button
                      className="btn"
                      style={{ padding: "6px 10px", borderColor: "var(--danger)", color: "var(--danger)" }}
                      disabled={busy}
                      onClick={() => remove(g.id, g.name)}
                    >
                      Remove
                    </button>
                  )}
                  {links[g.id] && (
                    <div className="mono" style={{ marginTop: 6, textAlign: "left" }}>
                      {links[g.id]}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card" onSubmit={addGrader}>
        <h3>Add a grader</h3>
        <div className="map-row">
          <span className="lbl">Name</span>
          <input
            className="inp"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="map-row">
          <span className="lbl">Email</span>
          <input
            className="inp"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="map-row">
          <span className="lbl">Temporary password</span>
          <input
            className="inp"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
        </div>
        <div className="map-row">
          <span className="lbl">Admin</span>
          <input
            type="checkbox"
            checked={form.isAdmin}
            onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
            style={{ justifySelf: "start" }}
          />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn primary" disabled={busy} style={{ marginTop: 10 }}>
          Add grader
        </button>
      </form>
    </div>
  );
}
