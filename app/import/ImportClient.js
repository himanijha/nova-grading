"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { FIELDS, autoMap } from "@/lib/mapping";

export default function ImportClient() {
  const router = useRouter();
  const [headers, setHeaders] = useState(null);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (out) => {
        const hs = (out.meta.fields || []).filter(Boolean);
        if (hs.length === 0) return setErr("That file has no header row.");
        setHeaders(hs);
        setRows(out.data);
        setMapping(autoMap(hs));
      },
      error: (e2) => setErr(e2.message),
    });
  }

  async function submit() {
    setErr("");
    setBusy(true);
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, mapping }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Import failed.");
    setResult(data);
    router.refresh();
  }

  return (
    <div className="page">
      <h1>Import applications</h1>
      <p className="sub">
        Upload the CSV exported from the Nova Google Form. Columns are matched
        automatically — check the mapping below and fix anything that&rsquo;s off
        before importing.
      </p>
      <p className="sub admin-only">
        Admins only. An import rewrites every application in the database, so
        graders cannot run one.
      </p>

      <div className="card">
        <input type="file" accept=".csv,text/csv" onChange={onFile} />
      </div>

      {err && <div className="err">{err}</div>}

      {headers && (
        <>
          <div className="card">
            <h3>Column mapping — {rows.length} rows found</h3>
            {FIELDS.map((f) => (
              <div className="map-row" key={f.key}>
                <span className="lbl">
                  {f.label} {f.required && <span className="req">*</span>}
                </span>
                <select
                  className="inp"
                  value={mapping[f.key] || ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                  }
                >
                  <option value="">— not imported —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {rows[0] && (
            <div className="card">
              <h3>First row preview</h3>
              <table className="tbl">
                <tbody>
                  {FIELDS.filter((f) => mapping[f.key]).map((f) => (
                    <tr key={f.key}>
                      <th style={{ width: 200 }}>{f.label}</th>
                      <td>{String(rows[0][mapping[f.key]] ?? "").slice(0, 300) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            className="btn primary"
            disabled={busy || !mapping.uclaEmail || !mapping.fullName}
            onClick={submit}
          >
            {busy ? "Importing…" : `Import ${rows.length} applications`}
          </button>
        </>
      )}

      {result && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Import complete</h3>
          <p>
            {result.created} created, {result.updated} updated
            {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}.
          </p>
          {result.skipped.length > 0 && (
            <ul>
              {result.skipped.slice(0, 20).map((s) => (
                <li key={s.line}>
                  Line {s.line}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
