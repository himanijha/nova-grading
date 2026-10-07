"use client";

import { useState } from "react";
import { GroupShape } from "./GroupBadge";
import { symbolMeta } from "@/lib/symbols";

const time = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/**
 * Event notes, each stamped with where it was written. Your own notes can be
 * edited or deleted; everyone else's are read-only. `mineOnly` drops the
 * author line when every note on screen is yours anyway. The list only draws
 * what it is given: the owner changes `notes` straight away and saves behind
 * it, through `onEdit(id, body)` and `onDelete(id)`.
 */
export default function NoteList({ notes, mineOnly = false, onEdit, onDelete }) {
  if (notes.length === 0) return null;
  return (
    <ul className="note-list">
      {notes.map((n) => (
        <NoteItem
          key={n.key || n.id}
          note={n}
          showAuthor={!mineOnly}
          editable={mineOnly || n.mine}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function NoteItem({ note, showAuthor, editable, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.body);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className={`note-item${note.mine ? " mine" : ""}`}>
      <div className="note-stamp">
        {showAuthor && <strong>{note.graderName}</strong>}
        {note.round != null ? (
          <span className="note-where">
            {note.group && <GroupShape color={note.group.color} shape={note.group.shape} size={12} />}
            Round {note.round}
            {note.group && ` · ${symbolMeta(note.group.color, note.group.shape).name}`}
          </span>
        ) : (
          <span className="note-where">General</span>
        )}
        <span>{time(note.at)}</span>
        {/* A note still on its way to the server has no id to edit or delete by yet. */}
        {note.pending && <span>Saving…</span>}
        {editable && !editing && !note.pending && (
          <span className="note-tools">
            <button
              type="button"
              onClick={() => {
                setText(note.body);
                setEditing(true);
              }}
            >
              Edit
            </button>
            {confirmDelete ? (
              <button type="button" className="danger-link" onClick={() => onDelete(note.id)}>
                Really delete?
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
          </span>
        )}
      </div>
      {editing ? (
        <div className="note-compose">
          <textarea className="inp" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="seg">
            <button
              type="button"
              onClick={() => {
                setText(note.body);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="on"
              disabled={!text.trim()}
              onClick={() => {
                setEditing(false);
                if (text.trim() !== note.body) onEdit(note.id, text.trim());
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="note-body">{note.body}</div>
      )}
    </li>
  );
}
