import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  FileText,
  Filter,
  LayoutDashboard,
  ListTodo,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Users,
  Volume2,
  X,
} from "lucide-react";

const STORAGE_KEY = "digiplus-workspace-v1";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const initialMeetings = [
  {
    id: "m-1",
    title: "Q3 product planning",
    date: "2026-10-30",
    time: "10:00 AM",
    attendees: ["SC", "JM", "AK", "RL"],
    category: "Product",
    notes:
      "The team agreed to prioritize the onboarding refresh for the next release. Design will share updated flows by November 4. Engineering will estimate the analytics integration by next Wednesday. We need to confirm the launch date with customer success.",
    summary: "",
  },
  {
    id: "m-2",
    title: "Customer success weekly",
    date: "2026-10-29",
    time: "2:30 PM",
    attendees: ["JM", "RL", "DP"],
    category: "Customer success",
    notes:
      "Reviewed onboarding feedback from the latest customer cohort. The team decided to add a guided checklist. Riley will collect top support themes and share them Friday.",
    summary: "",
  },
  {
    id: "m-3",
    title: "Platform reliability review",
    date: "2026-10-28",
    time: "11:00 AM",
    attendees: ["AK", "SC", "DP"],
    category: "Engineering",
    notes:
      "Reviewed the current incident response process. The team will document ownership for each service and revisit alert thresholds during next week's review.",
    summary: "",
  },
];

const initialTasks = [
  { id: "t-1", title: "Share updated onboarding flows", project: "Onboarding refresh", owner: "Sophie Chen", initials: "SC", due: "2026-11-04", status: "In progress", priority: "High", meetingId: "m-1" },
  { id: "t-2", title: "Estimate analytics integration", project: "Q3 product planning", owner: "Alex Kim", initials: "AK", due: "2026-11-05", status: "To do", priority: "High", meetingId: "m-1" },
  { id: "t-3", title: "Collect top support themes", project: "Customer success", owner: "Riley Lee", initials: "RL", due: "2026-10-31", status: "In progress", priority: "Medium", meetingId: "m-2" },
  { id: "t-4", title: "Confirm launch date with CS", project: "Onboarding refresh", owner: "Omkumar Sirmalwad", initials: "OS", due: "2026-11-03", status: "To do", priority: "Medium", meetingId: "m-1" },
  { id: "t-5", title: "Document service ownership", project: "Platform reliability", owner: "Dev Patel", initials: "DP", due: "2026-10-29", status: "To do", priority: "Low", meetingId: "m-3" },
];

const navGroups = [
  { title: "WORKSPACE", items: [{ label: "Overview", icon: LayoutDashboard }, { label: "Meetings", icon: CalendarDays }, { label: "AI Meeting Assistant", icon: Mic }, { label: "My tasks", icon: ListTodo }] },
  { title: "YOUR TEAM", items: [{ label: "Knowledge base", icon: BookOpen }, { label: "Handovers", icon: ArrowDownRight }] },
];

function readWorkspace() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.tasks) && Array.isArray(stored.meetings)) {
      return { ...stored, documents: Array.isArray(stored.documents) ? stored.documents : [] };
    }
  } catch (error) {
    console.error("Could not read the saved DigiPlus workspace.", error);
  }
  return { tasks: initialTasks, meetings: initialMeetings, documents: [] };
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "??";
}

function shortDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function dueLabel(value) {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((date - today) / 86400000);
  if (difference < 0) return `${Math.abs(difference)}d overdue`;
  if (difference === 0) return "Due today";
  if (difference === 1) return "Due tomorrow";
  return `Due ${shortDate(value)}`;
}

async function readApiError(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    try {
      const body = await response.json();
      return body.message || body.detail || `The request failed (${response.status}).`;
    } catch (error) {
      console.error("Could not read the DigiPlus API error response.", error);
    }
  }
  if (response.status >= 500) {
    return "The DigiPlus backend is not responding at localhost:8081. Start the Spring Boot backend and retry.";
  }
  return `Request failed (${response.status} ${response.statusText}). Check the backend and try again.`;
}

async function workspaceRequest(method = "GET", workspace) {
  const response = await fetch(`${API_BASE_URL}/api/workspace`, {
    method,
    headers: workspace ? { "Content-Type": "application/json" } : undefined,
    body: workspace ? JSON.stringify(workspace) : undefined,
  });
  if (!response.ok) throw new Error(await readApiError(response));
  return response.json();
}

function normalizeWorkspace(value) {
  return {
    meetings: value.meetings.map((meeting) => ({ ...meeting, attendees: meeting.attendees || [], summary: meeting.summary || "" })),
    tasks: value.tasks.map((task) => ({ ...task, initials: task.initials || initials(task.owner), due: task.due || "" })),
    documents: value.documents || [],
  };
}

function IconButton({ label, children, onClick, className = "" }) {
  return <button aria-label={label} title={label} className={`icon-button ${className}`} onClick={onClick}>{children}</button>;
}

function Avatar({ name, color = "" }) {
  return <span className={`avatar ${color}`} title={name}>{initials(name)}</span>;
}

function App() {
  const [workspace, setWorkspace] = useState(readWorkspace);
  const workspaceRef = useRef(workspace);
  const [activePage, setActivePage] = useState("Overview");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All tasks");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [notice, setNotice] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [briefError, setBriefError] = useState("");
  const [briefBusy, setBriefBusy] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState("");
  const [geminiConfigured, setGeminiConfigured] = useState(null);
  const [geminiStatusError, setGeminiStatusError] = useState("");
  const [geminiStatusBusy, setGeminiStatusBusy] = useState(false);

  const refreshGeminiStatus = useCallback(async () => {
    setGeminiStatusBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/status`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readApiError(response));
      const status = await response.json();
      setGeminiConfigured(status.configured === true);
      setGeminiStatusError("");
    } catch (error) {
      setGeminiConfigured(null);
      setGeminiStatusError(error.message);
    } finally {
      setGeminiStatusBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadWorkspace() {
      try {
        const saved = await workspaceRequest();
        const hasSavedData = saved.meetings?.length || saved.tasks?.length || saved.documents?.length;
        const loadedWorkspace = hasSavedData
          ? normalizeWorkspace(saved)
          : normalizeWorkspace(await workspaceRequest("PUT", workspaceRef.current));
        if (cancelled) return;
        workspaceRef.current = loadedWorkspace;
        setWorkspace(loadedWorkspace);
        setDatabaseReady(true);
        setDatabaseError("");
      } catch (error) {
        if (!cancelled) setDatabaseError(error.message);
      }
    }
    loadWorkspace();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void refreshGeminiStatus();
  }, [refreshGeminiStatus]);

  useEffect(() => {
    if (databaseReady) localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace, databaseReady]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const tasks = workspace.tasks;
  const meetings = workspace.meetings;
  const openTasks = tasks.filter((task) => task.status !== "Done");
  const completedTasks = tasks.filter((task) => task.status === "Done");
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !query || `${task.title} ${task.project} ${task.owner}`.toLowerCase().includes(query);
      const matchesFilter = filter === "All tasks" || (filter === "Open" && task.status !== "Done") || task.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [tasks, search, filter]);

  async function persistWorkspace(nextWorkspace, successMessage) {
    const previousWorkspace = workspaceRef.current;
    workspaceRef.current = nextWorkspace;
    setWorkspace(nextWorkspace);
    setDatabaseError("");
    try {
      const saved = normalizeWorkspace(await workspaceRequest("PUT", nextWorkspace));
      workspaceRef.current = saved;
      setWorkspace(saved);
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (error) {
      workspaceRef.current = previousWorkspace;
      setWorkspace(previousWorkspace);
      setDatabaseError(error.message);
      return false;
    }
  }

  function updateTask(id, changes) {
    const next = { ...workspaceRef.current, tasks: workspaceRef.current.tasks.map((task) => task.id === id ? { ...task, ...changes } : task) };
    void persistWorkspace(next, changes.status === "Done" ? "Task completed and saved to SQL" : "Task updated in SQL");
  }

  function addTask(task) {
    const next = { ...workspaceRef.current, tasks: [{ ...task, id: crypto.randomUUID() }, ...workspaceRef.current.tasks] };
    void persistWorkspace(next, "Task saved to SQL");
    setModal(null);
  }

  function addSuggestedTask(meeting, actionItem) {
    const title = (actionItem.description || "").trim();
    if (!title) {
      setNotice("This AI suggestion has no task description");
      return;
    }
    const exists = workspaceRef.current.tasks.some((task) => task.meetingId === meeting.id && task.title.trim().toLowerCase() === title.toLowerCase());
    if (exists) {
      setNotice("That action item is already a task for this meeting");
      return;
    }
    const owner = (actionItem.suggestedOwner || "").trim() || "Unassigned";
    const due = /^\d{4}-\d{2}-\d{2}$/.test(actionItem.dueDate || "") ? actionItem.dueDate : "";
    addTask({ title, project: meeting.title, owner, initials: initials(owner), due, status: "To do", priority: "Medium", meetingId: meeting.id });
  }

  function addMeeting(meeting) {
    const next = { ...workspaceRef.current, meetings: [{ ...meeting, id: crypto.randomUUID(), attendees: [], summary: "" }, ...workspaceRef.current.meetings] };
    void persistWorkspace(next, "Meeting saved to SQL");
    setModal(null);
  }

  async function saveMeetingMinutes(title, minutes, sourceFileName, existingId) {
    const today = new Date();
    const date = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const existing = workspaceRef.current.meetings.find((item) => item.id === existingId);
    const meeting = {
      id: existing?.id || crypto.randomUUID(),
      title: title.trim(),
      date: existing?.date || date,
      time: existing?.time || new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(today),
      attendees: existing?.attendees || [],
      category: existing?.category || "AI Meeting Assistant",
      notes: minutes.transcript.trim() || minutes.overview.trim(),
      summary: JSON.stringify({ ...minutes, sourceFileName }),
    };
    const next = {
      ...workspaceRef.current,
      meetings: existing
        ? workspaceRef.current.meetings.map((item) => item.id === existing.id ? meeting : item)
        : [meeting, ...workspaceRef.current.meetings],
    };
    return await persistWorkspace(next, "Reviewed meeting minutes saved to the database") ? meeting.id : "";
  }

  function addDocument(document) {
    const next = { ...workspaceRef.current, documents: [{ ...document, id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10) }, ...workspaceRef.current.documents] };
    void persistWorkspace(next, "Document saved to SQL");
    setModal(null);
  }

  async function saveSummary(meeting) {
    setAiBusy(true);
    setAiError("");
    try {
      if (geminiConfigured === false) {
        throw new Error("Gemini is not configured on the backend. Set GEMINI_API_KEY in the backend environment, then restart Spring Boot.");
      }
      const response = await fetch(`${API_BASE_URL}/api/ai/meeting-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: meeting.title, notes: meeting.notes }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const summary = await response.json();
      const next = { ...workspaceRef.current, meetings: workspaceRef.current.meetings.map((item) => item.id === meeting.id ? { ...item, summary: JSON.stringify(summary) } : item) };
      await persistWorkspace(next, "Gemini summary saved to SQL as a draft for review");
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function openBrief(type) {
    setBriefBusy(true);
    setBriefError("");
    setModal({ type, content: null, loading: true });
    try {
      if (geminiConfigured === false) {
        throw new Error("Gemini is not configured on the backend. Set GEMINI_API_KEY in the backend environment, then restart Spring Boot.");
      }
      const response = await fetch(`${API_BASE_URL}/api/ai/${type === "handover" ? "handover-brief" : "catch-up-brief"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetings: meetings.map(({ title, date, notes }) => ({ title, date, notes })),
          tasks: tasks.filter((task) => task.status !== "Done").map(({ title, owner, due, status }) => ({ title, owner, dueDate: due, status })),
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const content = await response.json();
      setModal((current) => current?.type === type ? { type, content, loading: false } : current);
    } catch (error) {
      setBriefError(error.message);
      setModal((current) => current?.type === type ? { type, content: null, loading: false } : current);
    } finally {
      setBriefBusy(false);
    }
  }

  function closeModal() {
    setModal(null);
    setBriefError("");
  }

  const currentMeeting = meetings.find((meeting) => meeting.id === selectedMeeting);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Command size={19} strokeWidth={2.6} /></div>
          <span>Digi<span className="brand-light">Plus</span></span>
          <button className="workspace-switch" aria-label="Switch workspace"><ChevronDown size={15} /></button>
        </div>
        <button className="workspace-pill"><span className="workspace-dot" /> Acme Studio <ChevronDown size={14} /></button>
        <div className="nav-groups">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-caption">{group.title}</p>
              {group.items.map(({ label, icon: Icon }) => (
                <button key={label} aria-label={label} className={`nav-item ${activePage === label ? "active" : ""}`} onClick={() => setActivePage(label)}>
                  <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
                  {label === "My tasks" && <span className="nav-count">{openTasks.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>Visit our help center</span></div><ChevronRight size={15} /></div>
        <div className="sidebar-profile">
          <Avatar name="Omkumar Sirmalwad" color="avatar-purple" />
          <div className="profile-copy"><strong>Omkumar Sirmalwad</strong><span>Product manager</span></div>
          <MoreHorizontal size={19} className="profile-menu" />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage}</strong></div>
          <div className="top-actions">
            <label className="searchbox"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label>
            <span className={`database-status ${databaseError ? "offline" : databaseReady ? "online" : "connecting"}`} title={databaseError || "SQL workspace storage"}><span />{databaseError ? "Database offline" : databaseReady ? "SQL connected" : "Connecting"}</span>
            <IconButton label="Notifications" className="notification-button"><Bell size={18} /><i /></IconButton>
            <button className="top-avatar" title="Omkumar Sirmalwad">OS</button>
          </div>
        </header>

        <div className="page-content">
          {databaseError && <div className="database-error" role="alert"><strong>Database connection required</strong><span>{databaseError}</span><button className="text-button" onClick={() => window.location.reload()}>Retry connection</button></div>}
          {geminiConfigured === false && <div className="database-error ai-config-warning" role="status"><strong>Gemini AI is not configured</strong><span>Set GEMINI_API_KEY in the backend environment and restart Spring Boot. Other workspace features and SQL storage remain available.</span><button className="text-button" onClick={refreshGeminiStatus} disabled={geminiStatusBusy}>{geminiStatusBusy ? "Checking..." : "Check again"}</button></div>}
          {geminiConfigured === null && geminiStatusError && <div className="database-error ai-config-warning" role="alert"><strong>Could not check Gemini status</strong><span>{geminiStatusError}</span><button className="text-button" onClick={refreshGeminiStatus} disabled={geminiStatusBusy}>{geminiStatusBusy ? "Checking..." : "Retry"}</button></div>}
          {activePage === "Overview" && <Overview
            tasks={tasks} openTasks={openTasks} completedTasks={completedTasks} meetings={meetings}
            onNavigate={setActivePage} onAddTask={() => setModal({ type: "task" })}
            onAddMeeting={() => setModal({ type: "meeting" })} onOpenMeeting={setSelectedMeeting}
            onBrief={openBrief} onUpdateTask={updateTask} search={search}
          />}
          {activePage === "My tasks" && <TasksPage tasks={filteredTasks} filter={filter} setFilter={setFilter} onAdd={() => setModal({ type: "task" })} onUpdateTask={updateTask} search={search} />}
          {activePage === "Meetings" && <MeetingsPage meetings={meetings} onAdd={() => setModal({ type: "meeting" })} onOpen={setSelectedMeeting} search={search} />}
          {activePage === "AI Meeting Assistant" && <MeetingAssistantPage onSave={saveMeetingMinutes} geminiConfigured={geminiConfigured} />}
          {activePage === "Knowledge base" && <KnowledgePage meetings={meetings} documents={workspace.documents} onAdd={() => setModal({ type: "document" })} onOpen={setSelectedMeeting} onViewDocument={(document) => setModal({ type: "view-document", document })} search={search} />}
          {activePage === "Handovers" && <HandoversPage onBrief={() => openBrief("handover")} tasks={openTasks} meetings={meetings} />}
        </div>
      </main>

      {currentMeeting && <MeetingDrawer meeting={currentMeeting} tasks={tasks.filter((task) => task.meetingId === currentMeeting.id)} aiBusy={aiBusy} aiError={aiError} geminiConfigured={geminiConfigured} onClose={() => { setSelectedMeeting(null); setAiError(""); }} onSummarize={() => saveSummary(currentMeeting)} onAddSuggestedTask={(item) => addSuggestedTask(currentMeeting, item)} />}
      {modal && <Modal modal={modal} error={briefError} busy={briefBusy} onRetry={() => openBrief(modal.type)} onClose={closeModal} onAddTask={addTask} onAddMeeting={addMeeting} onAddDocument={addDocument} />}
      {notice && <div className="toast"><Check size={16} />{notice}</div>}
    </div>
  );
}

function MeetingAssistantPage({ onSave, geminiConfigured }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMeetingId, setSavedMeetingId] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const saved = Boolean(savedMeetingId) && savedSnapshot === JSON.stringify({ title, draft });

  async function analyze(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose a meeting file to continue.");
      return;
    }
    if (file.size > 14 * 1024 * 1024) {
      setError("Meeting uploads are limited to 14 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("file", file);
    setBusy(true);
    setError("");
    setSavedMeetingId("");
    setSavedSnapshot("");
    setDraft(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/meeting-assistant`, { method: "POST", body: formData });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = await response.json();
      setDraft({
        transcript: result.transcript || "",
        overview: result.overview || "",
        discussionPoints: result.discussionPoints || [],
        decisions: result.decisions || [],
        actionItems: result.actionItems || [],
        risks: result.risks || [],
        openTasks: result.openTasks || [],
        questions: result.questions || [],
      });
      setSourceFileName(file.name);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function updateList(field, value) {
    setDraft((current) => ({ ...current, [field]: value.split("\n").map((line) => line.trim()).filter(Boolean) }));
  }

  async function saveReviewedMinutes() {
    setSaving(true);
    setError("");
    try {
      const savedId = await onSave(title, draft, sourceFileName, savedMeetingId);
      if (savedId) {
        setSavedMeetingId(savedId);
        setSavedSnapshot(JSON.stringify({ title, draft }));
      }
      else setError("The minutes could not be saved. Check the database connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="GEMINI-POWERED MEETING WORKFLOW" title="AI Meeting Assistant" description="Upload meeting notes or a recording to create reviewable, searchable minutes." />
      <section className="assistant-upload panel">
        <div className="assistant-section-heading"><div className="assistant-icon"><Mic size={19} /></div><div><h2>Upload a meeting source</h2><p>Gemini creates a transcript, summary, decisions, risks, and follow-ups for you to review.</p></div></div>
        <form className="assistant-form" onSubmit={analyze}>
          <label className="field-label">Meeting title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} disabled={busy} required placeholder="e.g. Project development review" />
          </label>
          <label className="assistant-file-picker">
            <input type="file" accept=".txt,.docx,.pdf,.mp3,.wav,.m4a,.aac,.ogg,.flac" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] || null); setError(""); setDraft(null); setSavedMeetingId(""); setSavedSnapshot(""); }} />
            <span className="assistant-file-icon"><FileText size={20} /></span>
            <span><strong>{file ? file.name : "Choose a meeting file"}</strong><small>TXT, DOCX, PDF or MP3, WAV, M4A, AAC, OGG, FLAC · up to 14 MB</small></span>
            <span className="button button-secondary">Browse files</span>
          </label>
          <div className="assistant-upload-footer">
            <p>Uploaded content is sent to Gemini for analysis. Only upload meeting material you are authorized to share.</p>
            <button className="button button-primary" type="submit" disabled={busy || !file || geminiConfigured === false}><Sparkles size={15} />{busy ? "Analyzing with Gemini..." : geminiConfigured === false ? "Gemini not configured" : "Generate minutes"}</button>
          </div>
        </form>
        {busy && <div className="assistant-processing" role="status"><span className="loading-dot" />Processing the meeting source. Audio transcription may take a little longer.</div>}
        {error && <div className="ai-error" role="alert">{error}</div>}
      </section>

      {draft && <section className="assistant-review panel">
        <div className="assistant-review-heading"><div><p className="eyebrow">AI-GENERATED DRAFT · REVIEW BEFORE SAVING</p><h2>{title}</h2><p>Source: {sourceFileName}. Edit the generated content before saving it to your workspace.</p></div><span className="review-badge"><Sparkles size={13} /> Needs review</span></div>
        <SpeechPlayer text={minutesSpeechText(draft)} />
        <label className="field-label">Executive summary<textarea rows="4" value={draft.overview} onChange={(event) => setDraft((current) => ({ ...current, overview: event.target.value }))} /></label>
        <label className="field-label">Full transcript / source text<textarea className="transcript-editor" rows="9" value={draft.transcript} onChange={(event) => setDraft((current) => ({ ...current, transcript: event.target.value }))} /></label>
        <MinutesListEditor label="Key discussion points" values={draft.discussionPoints} onChange={(value) => updateList("discussionPoints", value)} />
        <MinutesListEditor label="Decisions" values={draft.decisions} onChange={(value) => updateList("decisions", value)} />
        <div className="assistant-action-items">
          <div className="assistant-editor-heading"><strong>Action items</strong><span>Review owners and due dates before confirming.</span></div>
          {draft.actionItems.map((item, index) => <div className="assistant-action-row" key={index}>
            <label className="field-label">Task<input value={item.description || ""} onChange={(event) => setDraft((current) => ({ ...current, actionItems: current.actionItems.map((action, actionIndex) => actionIndex === index ? { ...action, description: event.target.value } : action) }))} /></label>
            <label className="field-label">Owner<input value={item.suggestedOwner || ""} placeholder="Not assigned" onChange={(event) => setDraft((current) => ({ ...current, actionItems: current.actionItems.map((action, actionIndex) => actionIndex === index ? { ...action, suggestedOwner: event.target.value } : action) }))} /></label>
            <label className="field-label">Due date<input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate || "") ? item.dueDate : ""} onChange={(event) => setDraft((current) => ({ ...current, actionItems: current.actionItems.map((action, actionIndex) => actionIndex === index ? { ...action, dueDate: event.target.value } : action) }))} /></label>
            <button className="icon-button" aria-label="Remove action item" onClick={() => setDraft((current) => ({ ...current, actionItems: current.actionItems.filter((_, actionIndex) => actionIndex !== index) }))}><X size={15} /></button>
          </div>)}
          <button className="text-button" onClick={() => setDraft((current) => ({ ...current, actionItems: [...current.actionItems, { description: "", suggestedOwner: "", dueDate: "" }] }))}><Plus size={14} /> Add action item</button>
        </div>
        <MinutesListEditor label="Risks and blockers" values={draft.risks} onChange={(value) => updateList("risks", value)} />
        <MinutesListEditor label="Open tasks" values={draft.openTasks} onChange={(value) => updateList("openTasks", value)} />
        <MinutesListEditor label="Unresolved questions" values={draft.questions} onChange={(value) => updateList("questions", value)} />
        <div className="assistant-review-footer">
          <span>{saved ? <span className="assistant-saved" role="status"><Check size={15} /> Saved to your meeting history</span> : "Generated notes are not saved until you confirm them."}</span>
          <button className="button button-primary" onClick={saveReviewedMinutes} disabled={saving || !draft.transcript.trim() && !draft.overview.trim()}><Check size={15} />{saving ? "Saving..." : saved ? "Save changes" : "Confirm and save minutes"}</button>
        </div>
      </section>}
    </>
  );
}

function MinutesListEditor({ label, values, onChange }) {
  return <label className="field-label">{label}<textarea rows={Math.min(5, Math.max(2, values.length))} value={values.join("\n")} onChange={(event) => onChange(event.target.value)} placeholder="Add one item per line" /></label>;
}

function minutesSpeechText(minutes) {
  return [
    minutes.overview,
    minutes.discussionPoints?.length ? `Key discussion points. ${minutes.discussionPoints.join(". ")}` : "",
    minutes.decisions?.length ? `Decisions. ${minutes.decisions.join(". ")}` : "",
    minutes.actionItems?.length ? `Action items. ${minutes.actionItems.map((item) => `${item.description}${item.suggestedOwner ? `, assigned to ${item.suggestedOwner}` : ""}${item.dueDate ? `, due ${item.dueDate}` : ""}`).join(". ")}` : "",
    minutes.risks?.length ? `Risks and blockers. ${minutes.risks.join(". ")}` : "",
    minutes.questions?.length ? `Unresolved questions. ${minutes.questions.join(". ")}` : "",
  ].filter(Boolean).join("\n\n");
}

function splitSpeechText(text) {
  let remaining = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  while (remaining.length > 1800) {
    let splitAt = Math.max(remaining.lastIndexOf(". ", 1800), remaining.lastIndexOf("? ", 1800), remaining.lastIndexOf("! ", 1800));
    if (splitAt < 1100) splitAt = remaining.lastIndexOf(" ", 1800);
    if (splitAt < 1) splitAt = 1800;
    chunks.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function SpeechPlayer({ text }) {
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState("1");
  const [provider, setProvider] = useState("browser");
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  const [speechifyStatus, setSpeechifyStatus] = useState("checking");
  const [speechifyBusy, setSpeechifyBusy] = useState(false);
  const [speechifyError, setSpeechifyError] = useState("");
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioIndex, setAudioIndex] = useState(0);
  const playbackId = useRef(0);
  const audioRef = useRef(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/ai/speechify/status`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json();
      })
      .then((status) => { if (!cancelled) setSpeechifyStatus(status.configured ? "ready" : "unconfigured"); })
      .catch(() => { if (!cancelled) setSpeechifyStatus("unavailable"); });
    if (!supported) return () => { cancelled = true; };
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      cancelled = true;
      playbackId.current += 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, [supported]);

  useEffect(() => () => audioChunks.forEach((url) => URL.revokeObjectURL(url)), [audioChunks]);

  useEffect(() => {
    playbackId.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setAudioChunks([]);
    setAudioIndex(0);
  }, [text, supported]);

  useEffect(() => {
    const audio = audioRef.current;
    if (provider !== "speechify" || !audioChunks.length || !audio) return;
    audio.play().catch(() => setSpeechifyError("Press play in the audio controls to start listening."));
  }, [audioChunks, audioIndex, provider]);

  function stop() {
    if (provider === "speechify") {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setPlaying(false);
      setPaused(false);
      return;
    }
    playbackId.current += 1;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  }

  async function generateSpeechifyAudio() {
    if (text.length > 12000) {
      setSpeechifyError("Speechify playback is limited to 12,000 characters per meeting. Use browser speech to listen to longer notes.");
      return;
    }
    const chunks = splitSpeechText(text);
    if (!chunks.length) return;
    setSpeechifyBusy(true);
    setSpeechifyError("");
    setAudioChunks([]);
    setAudioIndex(0);
    const generatedUrls = [];
    try {
      for (const chunk of chunks) {
        const response = await fetch(`${API_BASE_URL}/api/ai/speechify/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk }),
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const audio = await response.blob();
        if (!audio.size || !audio.type.startsWith("audio/")) {
          throw new Error("Speechify returned an invalid audio file.");
        }
        generatedUrls.push(URL.createObjectURL(audio));
      }
      setAudioChunks(generatedUrls);
      setPlaying(true);
    } catch (requestError) {
      generatedUrls.forEach((url) => URL.revokeObjectURL(url));
      setSpeechifyError(requestError.message);
      setPlaying(false);
    } finally {
      setSpeechifyBusy(false);
    }
  }

  function playBrowserSpeech() {
    if (!supported) {
      setError("Text-to-speech is not supported by this browser.");
      return;
    }
    const chunks = splitSpeechText(text);
    if (!chunks.length) return;
    const id = ++playbackId.current;
    window.speechSynthesis.cancel();
    setError("");
    setPaused(false);
    setPlaying(true);
    let index = 0;
    const speakNext = () => {
      if (playbackId.current !== id) return;
      if (index >= chunks.length) {
        setPlaying(false);
        setPaused(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      const voice = voices.find((candidate) => candidate.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
      utterance.rate = Number(rate);
      utterance.onend = speakNext;
      utterance.onerror = (event) => {
        if (playbackId.current === id && event.error !== "canceled" && event.error !== "interrupted") {
          setError("Speech playback stopped unexpectedly. Try playing the notes again.");
          setPlaying(false);
          setPaused(false);
        }
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }

  function pauseOrResume() {
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function handleAudioEnded() {
    if (audioIndex + 1 < audioChunks.length) {
      setAudioIndex((index) => index + 1);
    } else {
      setPlaying(false);
      setPaused(false);
    }
  }

  return <section className="speech-player" aria-label="Listen to meeting minutes">
    <div className="speech-player-title"><Volume2 size={17} /><div><strong>Listen to meeting minutes</strong><span>{provider === "speechify" ? "Speechify generates downloadable-quality speech. API usage may be billed." : "Speech uses voices available on this device; no API usage."}</span></div></div>
    <div className="speech-provider-toggle" role="group" aria-label="Speech provider">
      <button className={`button ${provider === "browser" ? "button-primary" : "button-secondary"}`} onClick={() => { stop(); setProvider("browser"); setSpeechifyError(""); }}>Browser voice · free</button>
      <button className={`button ${provider === "speechify" ? "button-primary" : "button-secondary"}`} onClick={() => { stop(); setProvider("speechify"); setError(""); }} disabled={speechifyStatus !== "ready"}>Speechify AI {speechifyStatus === "checking" ? "(checking...)" : speechifyStatus === "unconfigured" ? "(not configured)" : speechifyStatus === "unavailable" ? "(backend unavailable)" : "· may be billed"}</button>
    </div>
    {provider === "speechify" ? <>
      {speechifyBusy && <div className="assistant-processing" role="status"><span className="loading-dot" />Generating Speechify audio ({audioChunks.length + 1} of {splitSpeechText(text).length})...</div>}
      {audioChunks.length > 0 && <div className="speech-audio">
        <audio ref={audioRef} controls src={audioChunks[audioIndex]} onPlay={() => { setPlaying(true); setPaused(false); }} onPause={() => { if (!audioRef.current?.ended) { setPlaying(false); setPaused(true); } }} onEnded={handleAudioEnded} onError={() => setSpeechifyError("The generated audio could not be played by this browser.")} />
        <span>Audio part {audioIndex + 1} of {audioChunks.length}</span>
      </div>}
      <div className="speech-player-controls"><button className="button button-primary" onClick={generateSpeechifyAudio} disabled={!text.trim() || speechifyBusy || speechifyStatus !== "ready"}><Play size={14} />{audioChunks.length ? "Regenerate audio" : "Generate Speechify audio"}</button><span className="speech-cost-note">Up to 12,000 characters per meeting.</span></div>
      {speechifyError && <p className="speech-error" role="alert">{speechifyError}</p>}
    </> : <>
    <div className="speech-player-controls">
      <button className="button button-primary" onClick={playBrowserSpeech} disabled={!text.trim() || !supported}><Play size={14} />Play</button>
      <button className="button button-secondary" onClick={pauseOrResume} disabled={!playing || !supported}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "Resume" : "Pause"}</button>
      <button className="button button-secondary" onClick={stop} disabled={!playing || !supported}><Square size={13} />Stop</button>
      <button className="button button-secondary" onClick={playBrowserSpeech} disabled={!text.trim() || !supported}><RotateCcw size={14} />Restart</button>
      <label className="speech-select">Speed<select value={rate} onChange={(event) => setRate(event.target.value)}><option value="0.75">0.75x</option><option value="1">1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option></select></label>
      <label className="speech-select">Voice<select value={voiceURI} onChange={(event) => setVoiceURI(event.target.value)}><option value="">Default</option>{voices.map((voice) => <option value={voice.voiceURI} key={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select></label>
    </div>
    {error && <p className="speech-error" role="alert">{error}</p>}
    </>}
  </section>;
}

function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div><div className="heading-actions">{actions}</div></div>;
}

function Overview({ tasks, openTasks, completedTasks, meetings, onNavigate, onAddTask, onAddMeeting, onOpenMeeting, onBrief, onUpdateTask, search }) {
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  const upcoming = openTasks.slice().sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const visibleMeetings = meetings.filter((meeting) => !search || `${meeting.title} ${meeting.category}`.toLowerCase().includes(search.toLowerCase())).slice(0, 3);
  const progress = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  return (
    <>
      <PageHeading eyebrow={today} title="Good morning, Jordan" description="Here's what's happening across your workspace." actions={<><button className="button button-secondary" onClick={onAddMeeting}><Plus size={16} /> New meeting</button><button className="button button-primary" onClick={onAddTask}><Plus size={16} /> Create task</button></>} />
      <section className="welcome-card">
        <div className="welcome-text"><div className="sparkle-label"><Sparkles size={14} /> YOUR TEAM, IN SYNC</div><h2>Make room for the work<br />that matters.</h2><p>Get a clear picture of decisions, next steps, and the people moving them forward.</p><button className="button button-light" onClick={() => onBrief("catchup")}>Create a catch-up brief <ArrowRight size={16} /></button></div>
        <div className="welcome-art" aria-hidden="true"><div className="art-glow" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-chip chip-one"><CheckCheck size={15} /><span>Decision captured</span></div><div className="art-chip chip-two"><Users size={15} /><span>Team in sync</span></div><div className="art-center"><Command size={30} /></div><div className="art-dot dot-one" /><div className="art-dot dot-two" /></div>
      </section>
      <section className="stat-grid">
        <StatCard label="Open tasks" value={openTasks.length} detail="Across your workspace" icon={ListTodo} tone="blue" trend={`${tasks.filter((task) => task.status === "In progress").length} in progress`} />
        <StatCard label="Meetings this week" value={meetings.length} detail="Notes ready to revisit" icon={CalendarDays} tone="violet" trend="View calendar" />
        <StatCard label="Completed tasks" value={completedTasks.length} detail="Nice work, team!" icon={CheckCheck} tone="green" trend={`${progress}% completion`} />
        <StatCard label="Team members" value="8" detail="Across 3 project teams" icon={Users} tone="amber" trend="All active" />
      </section>
      <div className="content-grid">
        <section className="panel tasks-panel">
          <div className="panel-heading"><div><h3>Up next</h3><p>Your team's most important follow-ups</p></div><button className="text-button" onClick={() => onNavigate("My tasks")}>View all <ArrowRight size={15} /></button></div>
          <div className="task-list">
            {upcoming.length ? upcoming.map((task) => <TaskRow key={task.id} task={task} onUpdateTask={onUpdateTask} />) : <EmptyState title="You're all caught up" copy="Create a task to keep the momentum going." />}
          </div>
        </section>
        <section className="panel meetings-panel">
          <div className="panel-heading"><div><h3>Recent meetings</h3><p>Pick up right where you left off</p></div><button className="icon-button subtle" onClick={onAddMeeting} aria-label="Add meeting"><Plus size={18} /></button></div>
          <div className="meeting-list">
            {visibleMeetings.length ? visibleMeetings.map((meeting) => <MeetingRow key={meeting.id} meeting={meeting} onClick={() => onOpenMeeting(meeting.id)} />) : <EmptyState title="No meetings found" copy="Try another search or add a meeting." />}
          </div>
          <button className="meeting-footer" onClick={() => onNavigate("Meetings")}>See all meetings <ArrowRight size={15} /></button>
        </section>
      </div>
      <section className="bottom-strip">
        <div className="bottom-icon"><Sparkles size={18} /></div><div className="bottom-copy"><strong>Every handover deserves the full picture.</strong><span>Bring decisions, open questions, and next steps together in one clear brief.</span></div><button className="text-button" onClick={() => onBrief("handover")}>Create a handover <ArrowRight size={15} /></button>
      </section>
    </>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone, trend }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div><div className={`stat-trend ${tone}`}><ArrowUpRight size={14} />{trend}</div></article>;
}

function TaskRow({ task, onUpdateTask }) {
  const overdue = task.status !== "Done" && task.due && new Date(`${task.due}T23:59:59`) < new Date();
  return <div className="task-row"><button className={`task-check ${task.status === "Done" ? "checked" : ""}`} aria-label={task.status === "Done" ? "Mark as open" : "Mark complete"} onClick={() => onUpdateTask(task.id, { status: task.status === "Done" ? "To do" : "Done" })}>{task.status === "Done" && <Check size={13} />}</button><div className="task-main"><strong className={task.status === "Done" ? "is-done" : ""}>{task.title}</strong><span>{task.project}</span></div><Avatar name={task.owner} /><span className={`task-due ${overdue ? "overdue" : ""}`}><Clock3 size={13} />{dueLabel(task.due)}</span><span className={`priority-dot ${task.priority.toLowerCase()}`} title={`${task.priority} priority`} /></div>;
}

function MeetingRow({ meeting, onClick }) {
  return <button className="meeting-row" onClick={onClick}><span className="meeting-date"><b>{new Date(`${meeting.date}T12:00:00`).getDate()}</b><small>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(`${meeting.date}T12:00:00`)).toUpperCase()}</small></span><span className="meeting-info"><strong>{meeting.title}</strong><small>{meeting.time} <span>·</span> {meeting.category}</small></span><span className="meeting-avatars">{meeting.attendees.slice(0, 3).map((person, index) => <span key={index} className={`mini-avatar color-${index % 4}`}>{person}</span>)}</span><ChevronRight size={16} className="meeting-chevron" /></button>;
}

function TasksPage({ tasks, filter, setFilter, onAdd, onUpdateTask, search }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const options = ["All tasks", "Open", "In progress", "To do", "Done"];
  return <><PageHeading eyebrow="YOUR WORKSPACE" title="My tasks" description="Keep the small details moving, and the big picture in sight." actions={<button className="button button-primary" onClick={onAdd}><Plus size={16} /> Create task</button>} /><section className="panel page-panel"><div className="panel-heading"><div><h3>All tasks <span className="count-pill">{tasks.length}</span></h3><p>{search ? "Search results from your workspace" : "Follow-ups linked to your team's meetings"}</p></div><div className="filter-wrap"><button className="button button-secondary filter-button" onClick={() => setFilterOpen((value) => !value)}><Filter size={15} />{filter}<ChevronDown size={14} /></button>{filterOpen && <div className="filter-menu">{options.map((option) => <button key={option} onClick={() => { setFilter(option); setFilterOpen(false); }}>{option}{filter === option && <Check size={14} />}</button>)}</div>}</div></div><div className="task-list large-list">{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} onUpdateTask={onUpdateTask} />) : <EmptyState title="No tasks match" copy="Try a different filter or search term." />}</div></section></>;
}

function MeetingsPage({ meetings, onAdd, onOpen, search }) {
  const visible = meetings.filter((meeting) => !search || `${meeting.title} ${meeting.category} ${meeting.notes}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeading eyebrow="TEAM CONTEXT" title="Meetings" description="Decisions and conversations, all in one place." actions={<button className="button button-primary" onClick={onAdd}><Plus size={16} /> Add meeting</button>} /><section className="panel page-panel"><div className="panel-heading"><div><h3>Meeting notes <span className="count-pill">{visible.length}</span></h3><p>Open a meeting to review notes, decisions, and follow-ups.</p></div><button className="icon-button subtle" aria-label="Previous meetings"><ChevronLeft size={17} /></button></div><div className="meeting-cards">{visible.map((meeting) => <button className="meeting-card" key={meeting.id} onClick={() => onOpen(meeting.id)}><div className="meeting-card-date"><CalendarDays size={15} />{shortDate(meeting.date)} <span>·</span> {meeting.time}</div><h3>{meeting.title}</h3><p>{meeting.notes}</p><div className="meeting-card-footer"><span className="category-tag">{meeting.category}</span><span className="card-attendees">{meeting.attendees.length} participants</span><ArrowRight size={16} /></div></button>)}{!visible.length && <EmptyState title="No meetings found" copy="Add a meeting to keep its context close at hand." />}</div></section></>;
}

function KnowledgePage({ meetings, documents, onAdd, onOpen, onViewDocument, search }) {
  const docs = [
    ...meetings.map((meeting) => ({ ...meeting, kind: "Meeting notes", description: meeting.summary ? "Summary and discussion notes" : meeting.notes })),
    ...documents.map((document) => ({ ...document, kind: "Document" })),
  ];
  const visible = docs.filter((doc) => !search || `${doc.title} ${doc.category} ${doc.description}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeading eyebrow="TEAM MEMORY" title="Knowledge base" description="A searchable home for the context behind your team's work." actions={<button className="button button-secondary" onClick={onAdd}><Plus size={16} /> Add document</button>} /><section className="panel page-panel"><div className="panel-heading"><div><h3>Recent knowledge <span className="count-pill">{visible.length}</span></h3><p>Meeting notes and decisions your team can build on</p></div><div className="knowledge-search-icon"><Search size={16} /></div></div><div className="knowledge-list">{visible.map((doc) => <button key={doc.id} className="knowledge-row" onClick={() => doc.kind === "Meeting notes" ? onOpen(doc.id) : onViewDocument(doc)}><div className="document-icon"><FileText size={18} /></div><div className="knowledge-copy"><strong>{doc.title}</strong><span>{doc.description}</span></div><span className="category-tag">{doc.category}</span><span className="knowledge-date">{shortDate(doc.date)}</span><ChevronRight size={16} /></button>)}{!visible.length && <EmptyState title="No documents found" copy="Try another search or add meeting notes." />}</div></section></>;
}

function HandoversPage({ onBrief, tasks, meetings }) {
  return <><PageHeading eyebrow="WORK CONTINUITY" title="Handovers" description="Help the next person pick up with confidence, not guesswork." actions={<button className="button button-primary" onClick={onBrief}><Sparkles size={16} /> Create handover</button>} /><section className="handover-hero"><div className="handover-icon"><ArrowDownRight size={22} /></div><div><p className="eyebrow">KEEP THE CONTEXT MOVING</p><h2>A good handover starts with the whole story.</h2><p>Bring together open responsibilities, important decisions, and unresolved questions before ownership changes.</p><button className="button button-primary" onClick={onBrief}>Build a handover brief <ArrowRight size={15} /></button></div><div className="handover-art"><div className="handover-node node-a"><CheckCheck size={16} /><span>Decisions</span></div><div className="handover-node node-b"><ListTodo size={16} /><span>{tasks.length} open tasks</span></div><div className="handover-node node-c"><BookOpen size={16} /><span>{meetings.length} meetings</span></div><div className="handover-lines" /></div></section><div className="handover-details"><article className="panel handover-detail"><div className="detail-icon purple"><ListTodo size={17} /></div><div><h3>Responsibilities to carry</h3><p>{tasks.length} open tasks are ready to include in a handover brief.</p></div></article><article className="panel handover-detail"><div className="detail-icon blue"><BookOpen size={17} /></div><div><h3>Decisions to remember</h3><p>Meeting notes are available to provide context for the incoming owner.</p></div></article></div></>;
}

function MeetingDrawer({ meeting, tasks, aiBusy, aiError, geminiConfigured, onClose, onSummarize, onAddSuggestedTask }) {
  const summary = meeting.summary ? JSON.parse(meeting.summary) : null;
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="meeting-drawer">
        <div className="drawer-top"><span className="category-tag">{meeting.category}</span><IconButton label="Close meeting" onClick={onClose}><X size={18} /></IconButton></div>
        <p className="drawer-date"><CalendarDays size={15} />{shortDate(meeting.date)} at {meeting.time}</p>
        <h2>{meeting.title}</h2>
        <div className="drawer-attendees"><div className="avatar-stack">{meeting.attendees.map((person, index) => <span key={index} className={`mini-avatar color-${index % 4}`}>{person}</span>)}</div><span>{meeting.attendees.length} participants</span></div>
        <div className="drawer-divider" />
        <div className="drawer-section-heading">
          <h3>Meeting notes</h3>
          <button className="text-button" onClick={onSummarize} disabled={aiBusy || !meeting.notes?.trim() || geminiConfigured === false}><Sparkles size={14} />{aiBusy ? "Gemini is thinking..." : summary ? "Refresh summary" : "Summarize with Gemini"}</button>
        </div>
        <p className="meeting-notes">{meeting.notes || "No notes have been added."}</p>
        {aiError && <p className="ai-error" role="alert">{aiError}</p>}
        {summary && <div className="summary-box">
          <div className="summary-heading"><Sparkles size={15} /><strong>Gemini summary draft</strong><span>Review before sharing</span></div>
          <p>{summary.overview}</p>
          {summary.discussionPoints?.length > 0 && <><h4>Discussion points</h4><ul>{summary.discussionPoints.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {summary.decisions?.length > 0 && <><h4>Decisions</h4><ul>{summary.decisions.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {summary.risks?.length > 0 && <><h4>Risks and blockers</h4><ul>{summary.risks.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {summary.openTasks?.length > 0 && <><h4>Open tasks</h4><ul>{summary.openTasks.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {summary.questions?.length > 0 && <><h4>Questions to confirm</h4><ul>{summary.questions.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {summary.actionItems?.length > 0 && <><h4>Suggested action items · Review before adding</h4><div className="suggested-actions">{summary.actionItems.map((item, index) => <div className="suggested-action" key={index}><span>{item.description}{item.suggestedOwner ? ` — ${item.suggestedOwner}` : ""}{item.dueDate ? `, due ${item.dueDate}` : ""}</span><button className="button button-secondary" onClick={() => onAddSuggestedTask(item)}>Add task</button></div>)}</div></>}
        </div>}
        <div className="drawer-divider" />
        <div className="drawer-section-heading"><h3>Action items</h3><span className="count-pill">{tasks.length}</span></div>
        {tasks.length ? tasks.map((task) => <div className="drawer-task" key={task.id}><span className={`priority-dot ${task.priority.toLowerCase()}`} /><div><strong>{task.title}</strong><span>{task.owner} · {dueLabel(task.due)}</span></div><span className={`status-tag ${task.status.toLowerCase().replace(" ", "-")}`}>{task.status}</span></div>) : <p className="muted-copy">No tasks are linked to this meeting yet.</p>}
      </aside>
    </div>
  );
}

function Modal({ modal, error, busy, onRetry, onClose, onAddTask, onAddMeeting, onAddDocument }) {
  if (modal.type === "catchup" || modal.type === "handover") return <BriefModal modal={modal} error={error} busy={busy} onRetry={onRetry} onClose={onClose} />;
  if (modal.type === "view-document") return <DocumentModal document={modal.document} onClose={onClose} />;
  return <FormModal type={modal.type} onClose={onClose} onAddTask={onAddTask} onAddMeeting={onAddMeeting} onAddDocument={onAddDocument} />;
}

function DocumentModal({ document, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card"><div className="modal-header"><div className="modal-title-icon"><FileText size={18} /></div><div><h2>{document.title}</h2><p>{document.category} · Added {shortDate(document.date)}</p></div><IconButton label="Close document" onClick={onClose}><X size={18} /></IconButton></div><p className="document-content">{document.description}</p><div className="modal-actions"><button className="button button-primary" onClick={onClose}>Done</button></div></section></div>;
}

function FormModal({ type, onClose, onAddTask, onAddMeeting, onAddDocument }) {
  const isTask = type === "task";
  const isDocument = type === "document";
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (isTask) {
      const owner = String(data.get("owner") || "").trim();
      onAddTask({ title: String(data.get("title")).trim(), project: String(data.get("project") || "General").trim(), owner: owner || "Unassigned", initials: initials(owner || "Unassigned"), due: String(data.get("due") || ""), status: "To do", priority: String(data.get("priority") || "Medium"), meetingId: "" });
    } else if (isDocument) {
      onAddDocument({ title: String(data.get("title")).trim(), category: String(data.get("category") || "Team notes").trim(), description: String(data.get("content")).trim() });
    } else {
      onAddMeeting({ title: String(data.get("title")).trim(), date: String(data.get("date")), time: String(data.get("time") || "9:00 AM"), category: String(data.get("category") || "General"), notes: String(data.get("notes") || "").trim() });
    }
  }
  const title = isTask ? "Create a task" : isDocument ? "Add a document" : "Add a meeting";
  const description = isTask ? "Give the next step a clear owner." : isDocument ? "Save a useful note for your team." : "Save the conversation and keep its context.";
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card">
        <div className="modal-header">
          <div className="modal-title-icon">{isTask ? <ListTodo size={18} /> : isDocument ? <FileText size={18} /> : <CalendarDays size={18} />}</div>
          <div><h2>{title}</h2><p>{description}</p></div>
          <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <form onSubmit={submit}>
          <label className="field-label">{isTask ? "Task name" : isDocument ? "Document title" : "Meeting title"}
            <input name="title" required autoFocus placeholder={isTask ? "e.g. Share updated designs" : isDocument ? "e.g. Launch checklist" : "e.g. Weekly project check-in"} />
          </label>
          {isTask ? <>
            <div className="form-row">
              <label className="field-label">Owner<input name="owner" placeholder="Team member" /></label>
              <label className="field-label">Due date<input name="due" type="date" /></label>
            </div>
            <div className="form-row">
              <label className="field-label">Project<input name="project" placeholder="Project name" /></label>
              <label className="field-label">Priority<select name="priority" defaultValue="Medium"><option>High</option><option>Medium</option><option>Low</option></select></label>
            </div>
          </> : isDocument ? <>
            <label className="field-label">Category<input name="category" placeholder="Team notes, Process..." /></label>
            <label className="field-label">Content<textarea name="content" rows="6" required placeholder="Add the information your team should be able to find later..." /></label>
          </> : <>
            <div className="form-row">
              <label className="field-label">Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
              <label className="field-label">Time<input name="time" type="time" defaultValue="10:00" /></label>
            </div>
            <label className="field-label">Category<input name="category" placeholder="Product, Engineering..." /></label>
            <label className="field-label">Meeting notes<textarea name="notes" rows="4" placeholder="Capture the discussion, decisions, and next steps..." /></label>
          </>}
          <div className="modal-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit"><Plus size={15} />{isTask ? "Create task" : isDocument ? "Save document" : "Save meeting"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BriefModal({ modal, error, busy, onRetry, onClose }) {
  const [copyMessage, setCopyMessage] = useState("");
  const content = modal.content;
  const handover = modal.type === "handover";
  async function copyBrief() {
    if (!content) return;
    const text = [`${handover ? "Handover" : "Catch-up"} brief`, content.overview, "Discussion points:", ...content.discussionPoints.map((line) => `- ${line}`), "Decisions:", ...content.decisions.map((line) => `- ${line}`), "Open tasks:", ...content.openTasks.map((line) => `- ${line}`), "Questions:", ...content.questions.map((line) => `- ${line}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Brief copied");
    } catch (error) {
      console.error("Could not copy the DigiPlus brief.", error);
      setCopyMessage("Clipboard access failed. Select and copy the brief text instead.");
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card brief-modal">
        <div className="modal-header">
          <div className="modal-title-icon purple"><Sparkles size={18} /></div>
          <div><h2>{handover ? "Handover brief" : "Catch-up brief"}</h2><p>{handover ? "A starting point for the next owner." : "A quick route back into the conversation."}</p></div>
          <IconButton label="Close brief" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="brief-notice"><Sparkles size={15} /> Gemini-generated draft from saved meeting notes and tasks. Review details before sharing.</div>
        {busy && <div className="ai-loading" role="status"><span className="loading-dot" />Gemini is preparing your brief...</div>}
        {error && <div className="ai-error" role="alert">{error}{!error.startsWith("Gemini is not configured") && <button className="text-button" onClick={onRetry}>Try again</button>}</div>}
        {content && <div className="brief-content">
          <h3>{handover ? "Handover overview" : "Catch-up overview"}</h3><p>{content.overview}</p>
          {content.discussionPoints.length > 0 && <><h3>Key discussions</h3><ul>{content.discussionPoints.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {content.decisions.length > 0 && <><h3>Decisions to know</h3><ul>{content.decisions.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {content.actionItems.length > 0 && <><h3>Suggested follow-ups</h3><ul>{content.actionItems.map((item, index) => <li key={index}>{item.description}{item.suggestedOwner ? ` — ${item.suggestedOwner}` : ""}{item.dueDate ? `, due ${item.dueDate}` : ""}</li>)}</ul></>}
          {content.openTasks.length > 0 && <><h3>Open responsibilities</h3><ul>{content.openTasks.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {content.questions.length > 0 && <><h3>Questions to confirm</h3><ul>{content.questions.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
        </div>}
        {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}
        <div className="modal-actions">{content && <button className="button button-secondary" onClick={copyBrief}>Copy brief</button>}<button className="button button-primary" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}

function EmptyState({ title, copy }) {
  return <div className="empty-state"><div><FileText size={18} /></div><strong>{title}</strong><span>{copy}</span></div>;
}

export default App;
