"use client";

import {
  CheckIcon,
  EyeIcon,
  PencilIcon,
  RotateCcwIcon,
  SaveIcon,
  Undo2Icon,
} from "lucide-react";
import {
  createContext,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ReportCopy,
  ReportCopyKey,
} from "@/lib/inclusion-report-copy";

import styles from "./page.module.css";

type EditorContextValue = {
  activeKey: ReportCopyKey | null;
  copy: ReportCopy;
  editing: boolean;
  revision: number;
  setActiveKey: (key: ReportCopyKey | null) => void;
  updateDraft: (key: ReportCopyKey, value: string, commit: boolean) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

function copiesMatch(left: ReportCopy, right: ReportCopy) {
  return Object.keys(left).every(
    (key) => left[key as ReportCopyKey] === right[key as ReportCopyKey],
  );
}

export function ReportCopyEditor({
  children,
  initialCopy,
}: {
  children: ReactNode;
  initialCopy: ReportCopy;
}) {
  const [copy, setCopy] = useState(initialCopy);
  const [savedCopy, setSavedCopy] = useState(initialCopy);
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeKey, setActiveKey] = useState<ReportCopyKey | null>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("Local draft");
  const draftRef = useRef(initialCopy);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCanEdit(
        window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "::1",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const updateDraft = useCallback(
    (key: ReportCopyKey, value: string, commit: boolean) => {
      const nextCopy = { ...draftRef.current, [key]: value };
      draftRef.current = nextCopy;
      setDirty(!copiesMatch(nextCopy, savedCopy));
      setStatus("Unsaved changes");
      if (commit) setCopy(nextCopy);
    },
    [savedCopy],
  );

  function resetSession() {
    draftRef.current = savedCopy;
    setCopy(savedCopy);
    setDirty(false);
    setActiveKey(null);
    setStatus("Changes undone");
    setRevision((current) => current + 1);
  }

  function resetActiveField() {
    if (!activeKey) return;
    const nextCopy = {
      ...draftRef.current,
      [activeKey]: savedCopy[activeKey],
    };
    draftRef.current = nextCopy;
    setCopy(nextCopy);
    setDirty(!copiesMatch(nextCopy, savedCopy));
    setStatus("Field reset");
    setRevision((current) => current + 1);
  }

  async function saveDraft() {
    setSaving(true);
    setStatus("Saving…");

    try {
      const response = await fetch("/api/inclusion-report-copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy: draftRef.current }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          result && typeof result === "object" && "error" in result
            ? String((result as { error: unknown }).error)
            : "The draft could not be saved.";
        throw new Error(message);
      }

      const nextSaved = draftRef.current;
      setSavedCopy(nextSaved);
      setCopy(nextSaved);
      setDirty(false);
      setStatus("Saved to the report source");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const contextValue = useMemo<EditorContextValue>(
    () => ({
      activeKey,
      copy,
      editing,
      revision,
      setActiveKey,
      updateDraft,
    }),
    [activeKey, copy, editing, revision, updateDraft],
  );

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
      {canEdit ? (
        <aside
          className={styles.copyEditor}
          data-editing={editing}
          aria-label="Local report copy editor"
        >
          <button
            className={styles.editorPrimary}
            type="button"
            onClick={() => {
              setEditing((current) => !current);
              setActiveKey(null);
              setStatus(
                editing ? "Preview mode" : "Click highlighted text to edit",
              );
            }}
          >
            {editing ? (
              <EyeIcon aria-hidden="true" />
            ) : (
              <PencilIcon aria-hidden="true" />
            )}
            {editing ? "Preview" : "Edit text"}
          </button>

          {editing ? (
            <div className={styles.editorActions}>
              <button
                type="button"
                disabled={!activeKey}
                onClick={resetActiveField}
              >
                <RotateCcwIcon aria-hidden="true" />
                Reset field
              </button>
              <button type="button" disabled={!dirty} onClick={resetSession}>
                <Undo2Icon aria-hidden="true" />
                Undo session
              </button>
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={saveDraft}
              >
                {saving ? (
                  <span className={styles.editorSpinner} aria-hidden="true" />
                ) : dirty ? (
                  <SaveIcon aria-hidden="true" />
                ) : (
                  <CheckIcon aria-hidden="true" />
                )}
                {saving ? "Saving" : "Save draft"}
              </button>
            </div>
          ) : null}

          <span className={styles.editorStatus} aria-live="polite">
            {status}
          </span>
        </aside>
      ) : null}
    </EditorContext.Provider>
  );
}

type EditableTag =
  | "blockquote"
  | "em"
  | "h2"
  | "h3"
  | "p"
  | "small"
  | "span";

export function EditableText({
  as: Tag = "span",
  className,
  copyKey,
}: {
  as?: EditableTag;
  className?: string;
  copyKey: ReportCopyKey;
}) {
  const editorContext = useContext(EditorContext);
  if (!editorContext) {
    throw new Error("EditableText must be rendered inside ReportCopyEditor");
  }
  const editor = editorContext;

  const value = editor.copy[copyKey];

  function readText(element: HTMLElement) {
    return element.innerText.replaceAll("\u00a0", " ").trim();
  }

  function handleInput(event: FormEvent<HTMLElement>) {
    editor.updateDraft(copyKey, readText(event.currentTarget), false);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    event.preventDefault();
    document.execCommand(
      "insertText",
      false,
      event.clipboardData.getData("text/plain"),
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
  }

  return (
    <Tag
      className={`${styles.editableText}${className ? ` ${className}` : ""}`}
      contentEditable={editor.editing ? "plaintext-only" : false}
      data-copy-empty={value.length === 0}
      data-copy-key={copyKey}
      key={`${copyKey}-${editor.revision}`}
      onBlur={(event) => {
        editor.updateDraft(copyKey, readText(event.currentTarget), true);
      }}
      onFocus={() => editor.setActiveKey(copyKey)}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      spellCheck={editor.editing}
      suppressContentEditableWarning
    >
      {value}
    </Tag>
  );
}
