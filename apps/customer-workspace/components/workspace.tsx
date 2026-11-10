"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import dynamic from "next/dynamic";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronRight,
  Compass,
  FileText,
  GitBranch,
  Info,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  applyEvent,
  createRun,
  endRun,
  GRAPH_VERSION,
  NODE_IDS,
  RELEASE_BOUNDARY,
  type NodeId,
  type ScenarioId,
  type WorkspaceMessage,
} from "@/lib/contract";
import { NODE_INFO, SCENARIOS } from "@/lib/scenarios";
import { BrandMark } from "./brand-mark";
import { AccessReadiness } from "./access-readiness";
const WorkflowGraph = dynamic(() => import("./workflow-graph"), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading" role="status">
      Preparing the sample diagram…
    </div>
  ),
});
const stateLabel = {
  idle: "Ready to explore",
  waiting: "Starting sample",
  running: "Sample in progress",
  completed: "Sample complete",
  failed: "Sample interrupted",
  cancelled: "Sample stopped",
};

export function Workspace() {
  const [scenario, setScenario] = useState<ScenarioId>("research");
  const [input, setInput] = useState("");
  const [run, setRun] = useState(() => createRun());
  const [selected, setSelected] = useState<NodeId>("polaris");
  const [view, setView] = useState<"canvas" | "list">("canvas");
  const [showNotes, setShowNotes] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const requestRef = useRef({
    scenarioId: "research" as ScenarioId,
    runId: "",
  });
  const inputRef = useRef<HTMLTextAreaElement>(null),
    messagesRef = useRef<HTMLDivElement>(null),
    notesRef = useRef<HTMLDialogElement>(null),
    wasBusy = useRef(false);
  const [transport] = useState(
    () =>
      new DefaultChatTransport<WorkspaceMessage>({
        api: "/api/demo",
        headers: { "X-Ad-Astra-Preview": "workflow-v1" },
        credentials: "omit",
        prepareSendMessagesRequest: () => ({ body: { ...requestRef.current } }),
      }),
  );
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
    regenerate,
    clearError,
  } = useChat<WorkspaceMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-workflow")
        setRun((current) => applyEvent(current, part.data));
    },
    onError: () => setRun((current) => endRun(current, "failed")),
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (innerWidth < 760) setView("list");
  }, []);
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages]);
  useEffect(() => {
    if (wasBusy.current && !busy)
      setRun((current) => endRun(current, "failed"));
    wasBusy.current = busy;
  }, [busy]);
  useEffect(() => {
    if (showNotes) notesRef.current?.showModal();
    else notesRef.current?.close();
  }, [showNotes]);
  async function clearWorkspace() {
    await stop();
    setMessages([]);
    clearError();
    setRun(createRun());
    setInput("");
    setLastQuestion("");
    inputRef.current?.focus();
  }
  function chooseScenario(id: ScenarioId) {
    setScenario(id);
    setInput(SCENARIOS[id].prompt);
    inputRef.current?.focus();
  }
  function beginRun() {
    const runId = crypto.randomUUID();
    requestRef.current = { scenarioId: scenario, runId };
    setRun(createRun(runId, scenario));
    setSelected("intention");
    clearError();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    beginRun();
    setLastQuestion(question);
    setInput("");
    await sendMessage({ text: question });
  }
  async function retry() {
    if (busy || !lastQuestion) return;
    beginRun();
    await regenerate();
  }
  async function cancel() {
    setRun((current) => endRun(current, "cancelled"));
    await stop();
  }
  const completed = NODE_IDS.filter(
    (id) => run.nodes[id] === "completed",
  ).length;
  const activeScenario = SCENARIOS[run.scenarioId ?? scenario];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#conversation">
        Skip to conversation
      </a>
      <header className="workspace-header">
        <a
          className="brand"
          href="https://adastra.global/"
          aria-label="AD ASTRA public website"
        >
          <BrandMark />
          <span>AD ASTRA</span>
        </a>
        <div className="workspace-crumb">
          <span>Workspace</span>
          <ChevronRight size={12} />
          <strong>Discovery studio</strong>
        </div>
        <div className="header-actions">
          <span className="preview-badge">
            <i />
            Design preview
          </span>
          <button
            className="icon-button"
            onClick={() => setShowNotes(true)}
            aria-label="Preview boundaries and privacy"
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      <div className="workspace-body">
        <aside className="sidebar" aria-label="Workspace navigation">
          <button className="new-session" onClick={() => void clearWorkspace()}>
            <Plus size={16} />
            New conversation
          </button>
          <p className="nav-label">YOUR WORKSPACE</p>
          <a className="sidebar-link active" href="#conversation">
            <MessageSquare size={16} />
            Discovery studio<span>01</span>
          </a>
          <a className="sidebar-link" href="https://adastra.global/products/">
            <LayoutGrid size={16} />
            Product directions
            <ArrowUpRight size={13} />
          </a>
          <button className="sidebar-link" onClick={() => setShowNotes(true)}>
            <ShieldCheck size={16} />
            Preview boundaries
          </button>
          <div className="sidebar-note">
            <span className="mini-star">✦</span>
            <p>
              Human direction.
              <br />
              <strong>Connected possibilities.</strong>
            </p>
          </div>
          <div className="sidebar-bottom">
            <span className="session-avatar">A</span>
            <div>
              <strong>Local workspace</strong>
              <small>Browser memory only</small>
            </div>
          </div>
        </aside>
        <main className="studio" aria-label="AD ASTRA discovery workspace">
          <section
            className="conversation-panel"
            id="conversation"
            aria-labelledby="conversation-title"
          >
            <div className="panel-heading">
              <div className="assistant-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h1 id="conversation-title">Astra Polaris</h1>
                <p>Human-directed discovery</p>
              </div>
              <button
                className="icon-button"
                onClick={() => void clearWorkspace()}
                aria-label="Clear conversation"
              >
                <RotateCcw size={15} />
              </button>
            </div>
            <div
              className="conversation-scroll"
              ref={messagesRef}
              aria-label="Conversation messages"
              tabIndex={0}
            >
              {messages.length === 0 ? (
                <div className="welcome">
                  <span className="eyebrow">A SPACE TO THINK</span>
                  <h2>
                    A question.
                    <br />
                    <em>A new direction.</em>
                  </h2>
                  <p>
                    Explore a sample conversation, and follow the shape of its
                    workflow.
                  </p>
                  <div
                    className="scenario-cards"
                    aria-label="Choose a sample scenario"
                  >
                    {(Object.keys(SCENARIOS) as ScenarioId[]).map(
                      (id, index) => (
                        <button
                          key={id}
                          onClick={() => chooseScenario(id)}
                          className={scenario === id ? "chosen" : ""}
                        >
                          <span className="scenario-number">0{index + 1}</span>
                          <span>{SCENARIOS[id].label}</span>
                          <ArrowUpRight size={14} />
                        </button>
                      ),
                    )}
                  </div>
                  <p className="welcome-note">
                    <ShieldCheck size={13} />A fixed example. No live AI or
                    customer data.
                  </p>
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message message-${message.role}`}
                      aria-label={
                        message.role === "user"
                          ? "Your question"
                          : "Fixed sample response"
                      }
                    >
                      <span className="message-label">
                        {message.role === "user"
                          ? "YOU"
                          : "ASTRA POLARIS / SAMPLE"}
                      </span>
                      {message.parts
                        .filter((part) => part.type === "text")
                        .map((part, index) =>
                          part.type === "text" ? (
                            <p key={index}>{part.text}</p>
                          ) : null,
                        )}
                    </article>
                  ))}
                  {busy && (
                    <p className="stream-indicator" role="status">
                      <i />
                      Streaming the selected example…
                    </p>
                  )}
                </div>
              )}
              {(error || run.status === "failed") && (
                <div className="stream-error" role="alert">
                  <p>
                    The example could not be completed. No external action was
                    taken.
                  </p>
                  <button onClick={() => void retry()} disabled={busy}>
                    Retry sample
                  </button>
                </div>
              )}
              {run.status === "cancelled" && (
                <p className="stop-note" role="status">
                  Sample stopped. No model, message or account action was
                  executed.
                </p>
              )}
            </div>
            <form className="composer" onSubmit={(event) => void submit(event)}>
              <label className="sr-only" htmlFor="question">
                Your question — stays in this tab
              </label>
              <textarea
                id="question"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                maxLength={600}
                placeholder="A question worth exploring…"
                disabled={busy}
                aria-describedby="demo-privacy"
              />
              <div className="composer-actions">
                <label>
                  <span className="sr-only">Sample scenario</span>
                  <select
                    value={scenario}
                    disabled={busy}
                    onChange={(e) => setScenario(e.target.value as ScenarioId)}
                  >
                    {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
                      <option key={id} value={id}>
                        {SCENARIOS[id].short} example
                      </option>
                    ))}
                  </select>
                </label>
                {busy ? (
                  <button
                    type="button"
                    className="send-button stop-button"
                    onClick={() => void cancel()}
                    aria-label="Stop sample stream"
                  >
                    <Square size={14} />
                  </button>
                ) : (
                  <button
                    className="send-button"
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Preview selected scenario"
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>
              <p id="demo-privacy">
                Text stays in this tab. Only a scenario ID and temporary run ID
                are sent. Responses are fixed examples.
              </p>
            </form>
          </section>
          <section className="workflow-panel" aria-labelledby="workflow-title">
            <div className="workflow-top">
              <div>
                <p className="eyebrow">THE SHAPE OF THE WORK</p>
                <h2 id="workflow-title">Connected by intention.</h2>
                <p className="workflow-subtitle">
                  A read-only workflow, with you at the center.
                </p>
              </div>
              <div
                className="view-switch"
                role="group"
                aria-label="Workflow display"
              >
                <button
                  aria-pressed={view === "canvas"}
                  onClick={() => setView("canvas")}
                  aria-label="Show workflow canvas"
                >
                  <GitBranch size={15} />
                  <span>Canvas</span>
                </button>
                <button
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  aria-label="Show accessible workflow list"
                >
                  <List size={15} />
                  <span>List</span>
                </button>
              </div>
            </div>
            <div className="run-toolbar">
              <span className={`run-state run-${run.status}`} role="status">
                <i />
                {stateLabel[run.status]}
              </span>
              <span className="synthetic-label">
                SYNTHETIC SCENARIO · {completed}/7 STEPS
              </span>
            </div>
            <div className="canvas-area">
              {view === "canvas" ? (
                <WorkflowGraph
                  run={run}
                  selected={selected}
                  onSelect={setSelected}
                />
              ) : (
                <ol
                  className="workflow-list"
                  aria-label="Sample workflow steps"
                >
                  {NODE_IDS.map((id, index) => (
                    <li key={id} data-state={run.nodes[id]}>
                      <button
                        onClick={() => setSelected(id)}
                        aria-pressed={selected === id}
                      >
                        <span className="step-number">
                          {run.nodes[id] === "completed" ? (
                            <Check size={14} />
                          ) : (
                            String(index + 1).padStart(2, "0")
                          )}
                        </span>
                        <span>
                          <strong>{NODE_INFO[id].title}</strong>
                          <small>{NODE_INFO[id].subtitle}</small>
                        </span>
                        <span className="step-state">
                          {run.nodes[id] === "idle"
                            ? "Not started"
                            : run.nodes[id]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="workflow-inspector">
              <div className="inspector-icon">
                <Compass size={20} />
              </div>
              <div>
                <span className="eyebrow">SELECTED STEP</span>
                <h3>{NODE_INFO[selected].title}</h3>
                <p>{NODE_INFO[selected].detail}</p>
              </div>
              <span className={`inspector-state state-${run.nodes[selected]}`}>
                {run.nodes[selected] === "idle"
                  ? "Read-only"
                  : run.nodes[selected]}
              </span>
            </div>
            <div className="source-strip">
              <div>
                <FileText size={13} />
                <span>SAMPLE REFERENCE POINTS</span>
              </div>
              <div>
                {activeScenario.sources.map((source) => (
                  <span key={source}>{source}</span>
                ))}
              </div>
            </div>
            <footer className="workflow-footer">
              <span>
                <ShieldCheck size={12} />
                No private reasoning or live telemetry
              </span>
              <button onClick={() => setShowNotes(true)}>
                About this preview
                <ArrowUpRight size={11} />
              </button>
            </footer>
          </section>
        </main>
      </div>
      <dialog
        ref={notesRef}
        className="notes-dialog"
        onCancel={() => setShowNotes(false)}
        onClose={() => setShowNotes(false)}
        aria-labelledby="notes-title"
      >
        <div className="notes-head">
          <p className="eyebrow">PREVIEW BOUNDARIES</p>
          <button
            className="icon-button"
            onClick={() => setShowNotes(false)}
            aria-label="Close preview notes"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="notes-title">
          A design you can explore.
          <br />
          <em>Not a service activation.</em>
        </h2>
        <p>
          This isolated preview streams three fixed scenarios. It does not run a
          language model, retrieve real documents, store conversations or
          execute tools.
        </p>
        <ul>
          <li>
            Your typed text stays in this browser tab, in memory. Clearing or
            reloading removes it.
          </li>
          <li>
            The diagram shows sample workflow states, not a model’s private
            reasoning.
          </li>
          <li>
            Graph editing and live chat endpoints deny execution on the server.
          </li>
          <li>
            The Clerk session and tenant-scope boundary is implemented for QA.
            Customer sign-in, provider acceptance and database isolation remain
            gated.
          </li>
        </ul>
        <AccessReadiness />
        <p className="notes-version">
          Graph: {GRAPH_VERSION}
          <br />
          State: {RELEASE_BOUNDARY.eventBasis}
        </p>
        <a href="https://adastra.global/status/">
          View actual public product availability →
        </a>
      </dialog>
    </div>
  );
}
