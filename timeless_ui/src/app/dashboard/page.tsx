"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectCard {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  discussion_state: string | null;
  requirements_count: number;
  epics_count: number;
  scenarios_count: number;
}

interface GherkinStep {
  keyword: string;
  text: string;
}

interface GherkinScenario {
  title: string;
  steps: GherkinStep[];
}

interface GherkinFeature {
  feature: string;
  description?: string;
  scenarios: GherkinScenario[];
}

interface Epic {
  title: string;
  description?: string;
  features?: string[];
}

interface MindMapNode {
  label?: string;
  name?: string;
  children?: MindMapNode[];
  [key: string]: unknown;
}

interface ProjectDetail {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  discussion_state: string | null;
  transcriptions: string[];
  requirements: string;
  notebook_summary: string;
  epics: Epic[];
  mind_map: MindMapNode | Record<string, unknown>;
  gherkin: GherkinFeature[];
  project_code_path: string;
  project_files: Record<string, string>;
}

type TabId = "overview" | "conversation" | "requirements" | "notes" | "epics" | "gherkin" | "code";

const API = "http://localhost:8082/api/v0";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function stateBadgeColor(state: string | null): string {
  if (!state) return "#94a3b8";
  const s = state.toLowerCase();
  if (s.includes("concept"))     return "#7c3aed";
  if (s.includes("requirement")) return "#0284c7";
  if (s.includes("design"))      return "#b45309";
  if (s.includes("implement"))   return "#16a34a";
  if (s.includes("test"))        return "#ea580c";
  if (s.includes("deploy"))      return "#dc2626";
  return "#64748b";
}

// ── Gherkin keyword colouring ─────────────────────────────────────────────────

function gherkinKeywordColor(kw: string): string {
  const k = kw.trim().toLowerCase();
  if (k === "given") return "#7c3aed";
  if (k === "when") return "#0ea5e9";
  if (k === "then") return "#16a34a";
  if (k === "and") return "#d97706";
  if (k === "but") return "#dc2626";
  return "#94a3b8";
}

// ── Mind map tree renderer ────────────────────────────────────────────────────

function MindMapTree({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  const label = (node.label as string) || (node.name as string) || "";
  const children = (node.children as MindMapNode[]) || [];
  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div style={{ color: depth === 0 ? "#2563eb" : depth === 1 ? "#16a34a" : "#374151", padding: "2px 0", fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 13 }}>
        {depth > 0 && <span style={{ color: "#cbd5e1", marginRight: 6 }}>{"─".repeat(1)}</span>}
        {label}
      </div>
      {children.map((child, i) => (
        <MindMapTree key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Inline editable field ─────────────────────────────────────────────────────

function EditableField({
  sessionId, field, value, multiline, onSaved,
}: {
  sessionId: string;
  field: "name" | "requirements" | "notebook_summary";
  value: string;
  multiline?: boolean;
  onSaved: (newVal: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`${API}/projects/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: draft }),
      });
      onSaved(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [sessionId, field, draft, onSaved]);

  if (!editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ whiteSpace: "pre-wrap", color: "#374151", fontSize: 13, lineHeight: 1.7, wordBreak: "break-word" }}>
          {value || <em style={{ color: "#94a3b8" }}>—</em>}
        </div>
        <div>
          <button onClick={() => { setDraft(value); setEditing(true); }} style={btnStyle("#2563eb")}>Edit</button>
        </div>
      </div>
    );
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {multiline ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={10}
          style={textareaStyle}
        />
      ) : (
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          style={{ ...inputStyle }}
        />
      )}
      <span style={{ display: "flex", gap: 6 }}>
        <button onClick={save} disabled={saving} style={btnStyle("#16a34a")}>{saving ? "Saving…" : "Save"}</button>
        <button onClick={() => setEditing(false)} style={btnStyle("#94a3b8")}>Cancel</button>
      </span>
    </span>
  );
}

// ── File tree for code tab ────────────────────────────────────────────────────

function buildFileTree(files: Record<string, string>): Record<string, string[]> {
  const dirs: Record<string, string[]> = { ".": [] };
  for (const rel of Object.keys(files)) {
    const parts = rel.split(/[\\/]/);
    if (parts.length === 1) {
      dirs["."].push(rel);
    } else {
      const dir = parts.slice(0, -1).join("/");
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push(rel);
    }
  }
  return dirs;
}

// ── Styles (inline) ───────────────────────────────────────────────────────────

const btnStyle = (color: string): React.CSSProperties => ({
  background: "transparent",
  border: `1px solid ${color}`,
  color: color,
  borderRadius: 4,
  padding: "2px 10px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
});

const inputStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#1a1a2e",
  borderRadius: 4,
  padding: "6px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  fontFamily: "var(--font-jetbrains-mono), monospace",
  fontSize: 13,
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API}/projects`);
      if (res.ok) {
        setProjects(await res.json());
      } else {
        setFetchError(`Server returned ${res.status} — is the manager service running on port 8082?`);
      }
    } catch (e) {
      setFetchError(`Cannot reach backend at ${API} — make sure the manager service is running. (${e})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const selectProject = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    setActiveTab("overview");
    setSelectedFile(null);
    try {
      const res = await fetch(`${API}/projects/${id}`);
      if (res.ok) setDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`${API}/projects/${selectedId}`, { method: "DELETE" });
      setSelectedId(null);
      setDetail(null);
      await fetchProjects();
    } finally {
      setDeleting(false);
    }
  }, [selectedId, fetchProjects]);

  const patchDetail = useCallback((field: keyof ProjectDetail, val: string) => {
    setDetail(prev => prev ? { ...prev, [field]: val } : prev);
    setProjects(prev => prev.map(p =>
      p.id === selectedId ? { ...p, name: field === "name" ? val : p.name } : p
    ));
  }, [selectedId]);

  // ── Tab content ──────────────────────────────────────────────────────────────

  const renderTab = () => {
    if (!detail) return null;

    switch (activeTab) {
      case "overview":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section>
              <label style={labelStyle}>Name</label>
              <EditableField sessionId={detail.id} field="name" value={detail.name} onSaved={v => patchDetail("name", v)} />
            </section>
            <section>
              <label style={labelStyle}>Discussion State</label>
              <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 20, background: stateBadgeColor(detail.discussion_state), color: "#fff", fontSize: 12, fontWeight: 600 }}>
                {detail.discussion_state || "Unknown"}
              </span>
            </section>
            <section>
              <label style={labelStyle}>Created</label>
              <span style={{ color: "#64748b" }}>{fmtDate(detail.created_at)}</span>
            </section>
            <section>
              <label style={labelStyle}>Last Updated</label>
              <span style={{ color: "#64748b" }}>{fmtDate(detail.updated_at)}</span>
            </section>
            <section>
              <label style={labelStyle}>Stats</label>
              <div style={{ display: "flex", gap: 20 }}>
                <StatPill label="Requirements" value={detail.requirements.split("\n").filter(l => l.trim()).length} color="#2563eb" />
                <StatPill label="Epics" value={detail.epics.length} color="#16a34a" />
                <StatPill label="Gherkin Scenarios" value={detail.gherkin.reduce((a, f) => a + f.scenarios.length, 0)} color="#a855f7" />
                <StatPill label="Transcriptions" value={detail.transcriptions.length} color="#ffd60a" />
              </div>
            </section>
            {detail.project_code_path && (
              <section>
                <label style={labelStyle}>Project Path</label>
                <code style={{ color: "#2563eb", fontSize: 12, fontFamily: "var(--font-jetbrains-mono), monospace", background: "#eff6ff", padding: "2px 6px", borderRadius: 4 }}>{detail.project_code_path}</code>
              </section>
            )}
          </div>
        );

      case "conversation": {
        const lines = detail.transcriptions;
        const downloadConversation = (ext: "txt" | "md") => {
          const content = ext === "md"
            ? lines.map((t, i) => `**[${i + 1}]** ${t}`).join("\n\n")
            : lines.map((t, i) => `[${i + 1}] ${t}`).join("\n\n");
          const blob = new Blob([content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `conversation.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        };
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{lines.length} messages</span>
              <button onClick={() => downloadConversation("txt")} style={btnStyle("#2563eb")}>
                Download .txt
              </button>
              <button onClick={() => downloadConversation("md")} style={btnStyle("#16a34a")}>
                Download .md
              </button>
            </div>
            {lines.length === 0
              ? <em style={{ color: "#94a3b8" }}>No conversation recorded yet.</em>
              : lines.map((t, i) => (
                <div key={i} style={{ background: "#ffffff", border: "1px solid #e0e4ea", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <span style={{ color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 4 }}>#{i + 1}</span>
                  {t}
                </div>
              ))
            }
          </div>
        );
      }

      case "requirements":
        return (
          <div>
            <div style={{ marginBottom: 12 }}>
              <EditableField sessionId={detail.id} field="requirements" value={detail.requirements} multiline onSaved={v => patchDetail("requirements", v)} />
            </div>
            {!detail.requirements && <em style={{ color: "#94a3b8" }}>No requirements captured.</em>}
          </div>
        );

      case "notes":
        return (
          <div>
            <div style={{ marginBottom: 12 }}>
              <EditableField sessionId={detail.id} field="notebook_summary" value={detail.notebook_summary} multiline onSaved={v => patchDetail("notebook_summary", v)} />
            </div>
            {!detail.notebook_summary && <em style={{ color: "#94a3b8" }}>No notes captured.</em>}
          </div>
        );

      case "epics":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {detail.epics.length === 0
              ? <em style={{ color: "#94a3b8" }}>No epics generated yet.</em>
              : detail.epics.map((epic, i) => (
                <div key={i} style={{ background: "#ffffff", border: "1px solid #e0e4ea", borderRadius: 8, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ color: "#16a34a", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{epic.title}</div>
                  {epic.description && <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>{epic.description}</div>}
                  {epic.features && epic.features.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 20, color: "#374151", fontSize: 13, lineHeight: 1.8 }}>
                      {epic.features.map((f, j) => <li key={j}>{f}</li>)}
                    </ul>
                  )}
                </div>
              ))
            }
          </div>
        );

      case "gherkin":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {detail.gherkin.length === 0
              ? <em style={{ color: "#94a3b8" }}>No Gherkin features generated yet.</em>
              : detail.gherkin.map((feat, fi) => (
                <div key={fi} style={{ background: "#ffffff", border: "1px solid #e0e4ea", borderRadius: 8, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ color: "#2563eb", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    Feature: {feat.feature}
                  </div>
                  {feat.description && (
                    <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12, fontStyle: "italic" }}>{feat.description}</div>
                  )}
                  {feat.scenarios.map((sc, si) => (
                    <div key={si} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: "2px solid #e0e4ea" }}>
                      <div style={{ color: "#1a1a2e", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                        Scenario: {sc.title}
                      </div>
                      {sc.steps.map((step, sti) => (
                        <div key={sti} style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 12, lineHeight: 1.8, paddingLeft: 16 }}>
                          <span style={{ color: gherkinKeywordColor(step.keyword), fontWeight: 600, marginRight: 6 }}>{step.keyword}</span>
                          <span style={{ color: "#374151" }}>{step.text}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            }
          </div>
        );

      case "code": {
        const files = detail.project_files || {};
        const allFileKeys = Object.keys(files).sort();
        if (allFileKeys.length === 0) {
          return (
            <div>
              {detail.project_code_path
                ? <em style={{ color: "#94a3b8" }}>Project path set but no files loaded: <code style={{ color: "#64748b" }}>{detail.project_code_path}</code></em>
                : <em style={{ color: "#94a3b8" }}>No generated code available.</em>}
            </div>
          );
        }
        const activeFileContent = selectedFile ? files[selectedFile] : null;
        // Prefer source code files in the visible list; skip node_modules, .git, binary-ish extensions
        const SKIP_DIRS = ["node_modules/", ".git/", "__pycache__/", ".next/", "dist/", "build/"];
        const SKIP_EXT = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".zip", ".map"];
        const visibleKeys = allFileKeys.filter(k =>
          !SKIP_DIRS.some(d => k.includes(d)) && !SKIP_EXT.some(e => k.endsWith(e))
        ).slice(0, 500); // hard cap at 500 for performance
        return (
          <div style={{ display: "flex", height: "100%", minHeight: 0, gap: 0 }}>
            {/* File list */}
            <div style={{ width: 240, minWidth: 180, borderRight: "1px solid #e0e4ea", paddingRight: 8, overflowY: "auto", flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: "#64748b", padding: "4px 8px 8px", borderBottom: "1px solid #e0e4ea", marginBottom: 4 }}>
                {visibleKeys.length} of {allFileKeys.length} files
              </div>
              {visibleKeys.map(rel => (
                <div
                  key={rel}
                  onClick={() => setSelectedFile(rel)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: selectedFile === rel ? "#2563eb" : "#374151",
                    background: selectedFile === rel ? "#eff6ff" : "transparent",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 1,
                  }}
                  title={rel}
                >
                  {rel}
                </div>
              ))}
            </div>
            {/* File content */}
            <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingLeft: 16 }}>
              {activeFileContent != null ? (
                <pre style={{
                  margin: 0,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {activeFileContent}
                </pre>
              ) : (
                <em style={{ color: "#94a3b8" }}>Select a file from the list to view its content.</em>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "conversation", label: "Conversation" },
    { id: "requirements", label: "Requirements" },
    { id: "notes", label: "Notes" },
    { id: "epics", label: "Epics" },
    { id: "gherkin", label: "Gherkin" },
    { id: "code", label: "Code" },
  ];

  return (
    <div style={rootStyle}>
      {/* ── Header ── */}
      <header style={headerStyle}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="fa fa-arrow-left" />
          Back
        </a>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e", letterSpacing: 1 }}>
          Timeless Projects
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>
            {projects.length} saved
          </span>
          <button
            onClick={fetchProjects}
            disabled={loading}
            title="Refresh project list"
            style={{
              background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6,
              color: "#2563eb", fontSize: 13, padding: "4px 10px", cursor: "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <i className="fa fa-refresh" style={{ marginRight: 5 }} />
            Refresh
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={bodyStyle}>
        {/* ── Left: project list ── */}
        <aside style={sidebarStyle}>
          {loading ? (
            <div style={{ color: "#94a3b8", fontSize: 13, padding: 16 }}>Loading…</div>
          ) : fetchError ? (
            <div style={{ color: "#dc2626", fontSize: 12, padding: 16, lineHeight: 1.5 }}>
              <strong>Connection error</strong><br />{fetchError}
              <br /><br />
              <span
                style={{ cursor: "pointer", textDecoration: "underline", color: "#2563eb" }}
                onClick={fetchProjects}
              >Retry</span>
            </div>
          ) : projects.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 13, padding: 16, lineHeight: 1.6 }}>
              No sessions saved yet.
              <br /><br />
              Click the floppy-disk button in the main UI to save, then{" "}
              <span
                style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                onClick={fetchProjects}
              >
                refresh here
              </span>.
            </div>
          ) : (
            projects.map(p => (
              <div
                key={p.id}
                onClick={() => selectProject(p.id)}
                style={{
                  ...cardStyle,
                  borderColor: selectedId === p.id ? "#2563eb" : "#e0e4ea",
                  background: selectedId === p.id ? "#eff6ff" : "#ffffff",
                  boxShadow: selectedId === p.id ? "0 0 0 2px #2563eb22" : "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ color: "#1a1a2e", fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{fmtDate(p.updated_at)}</div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, background: stateBadgeColor(p.discussion_state), color: "#fff", fontSize: 10, fontWeight: 600 }}>
                    {p.discussion_state || "Unknown"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <MiniStat label="reqs" value={p.requirements_count} />
                  <MiniStat label="epics" value={p.epics_count} />
                  <MiniStat label="scenarios" value={p.scenarios_count} />
                </div>
              </div>
            ))
          )}
        </aside>

        {/* ── Right: detail panel ── */}
        <main style={mainStyle}>
          {!selectedId ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 15 }}>
              Select a project to view details
            </div>
          ) : detailLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 13 }}>
              Loading…
            </div>
          ) : !detail ? (
            <div style={{ color: "#dc2626", padding: 24 }}>Failed to load session.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              {/* Tab bar + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid #e0e4ea", marginBottom: 20, paddingBottom: 0, flexWrap: "wrap", flexShrink: 0 }}>
                <div style={{ display: "flex", flex: 1, gap: 0, flexWrap: "wrap" }}>
                  {tabs.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: activeTab === t.id ? "2px solid #2563eb" : "2px solid transparent",
                        color: activeTab === t.id ? "#2563eb" : "#64748b",
                        padding: "8px 14px",
                        cursor: "pointer",
                        fontSize: 13,
                        fontFamily: "inherit",
                        fontWeight: activeTab === t.id ? 600 : 400,
                        marginBottom: -1,
                        transition: "color 0.15s",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ ...btnStyle("#dc2626"), marginLeft: 12, marginBottom: 8 }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>

              {/* Tab content — fills remaining height and scrolls */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
                {renderTab()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", border: `1px solid ${color}55`, borderRadius: 8, padding: "10px 18px", minWidth: 80, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <span style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</span>
      <span style={{ color: "#888", fontSize: 11 }}>{label}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ fontSize: 10, color: "#999" }}>
      <span style={{ color: "#444", fontWeight: 600 }}>{value}</span> {label}
    </span>
  );
}

// ── Layout styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "#999",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
  fontWeight: 700,
};

const rootStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  background: "#f4f6f9",
  color: "#1a1a2e",
  fontFamily: "var(--font-space-grotesk), sans-serif",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "14px 24px",
  borderBottom: "1px solid #e0e4ea",
  background: "#ffffff",
  flexShrink: 0,
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const bodyStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const sidebarStyle: React.CSSProperties = {
  width: 280,
  minWidth: 220,
  borderRight: "1px solid #e0e4ea",
  overflowY: "auto",
  padding: "12px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "#ffffff",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  padding: "24px 28px",
  background: "#f4f6f9",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e0e4ea",
  borderRadius: 8,
  padding: "12px 14px",
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
  background: "#ffffff",
};
