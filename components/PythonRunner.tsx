"use client";

import { useWorkspaceState } from "./useWorkspaceState";
import { useRef, useState } from "react";

const example = `def judge_average(scores):
    middle = sorted(scores)[1:-1]
    return sum(middle) / len(middle) if middle else None
`;
const sample = JSON.stringify([
  { args: [[70, 80, 90, 95, 100]], expected: 88.33333333333333 },
  { args: [[82, 94]], expected: 88 },
], null, 2);
type Result = { passed: boolean; actual?: unknown; expected: unknown; error?: string };

export function PythonRunner({ workspaceId = "legacy", demo = true }: { workspaceId?: string; demo?: boolean }) {
  const [code, setCode] = useWorkspaceState(workspaceId, "code", demo ? example : "");
  const [cases, setCases] = useWorkspaceState(workspaceId, "cases", demo ? sample : "[]");
  const [name, setName] = useWorkspaceState(workspaceId, "name", demo ? "judge_average" : "");
  const [results, setResults] = useWorkspaceState<Result[]>(workspaceId, "results", []);
  const [status, setStatus] = useWorkspaceState(workspaceId, "status", "");
  const [busy, setBusy] = useState(false);
  const [behavior, setBehavior] = useWorkspaceState(workspaceId, "behavior", demo ? "Accept a nonempty list of judge scores. With at least three scores, remove one highest and one lowest score and average the rest. With one or two scores, average all scores. Use test cases with exact whole-number averages." : "");
  const [planning, setPlanning] = useState(false);
  const [aiDraft, setAiDraft] = useWorkspaceState(workspaceId, "aiDraft", false);

  type Case = { args: unknown[]; expected: unknown };
  type Candidate = { code: string; summary: string; results: Result[] };
  const [candidate, setCandidate] = useWorkspaceState<Candidate | undefined>(workspaceId, "candidate", undefined);
  const [feedback, setFeedback] = useWorkspaceState(workspaceId, "feedback", "");
  const [reviewCases, setReviewCases] = useWorkspaceState<Case[]>(workspaceId, "reviewCases", []);

  async function request(path: string, input: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(42000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Gemini request failed.");
    return data;
  }

  const stop = useRef(() => {});
  function execute(source: string, tests: Case[]): Promise<Result[]> {
    return new Promise((resolve, reject) => {
      const worker = new Worker("/python-checks.worker.js");
      function cleanup() {
        clearTimeout(timer);
        worker.terminate();
        stop.current = () => {};
      }
      function fail(message: string) {
        cleanup();
        reject(Error(message));
      }
      const timer = setTimeout(() => fail("Python execution timed out."), 45000);
      stop.current = () => fail("Run stopped.");
      worker.onerror = () => fail("Could not load the Python runtime.");
      worker.onmessage = ({ data }) => {
        if (data.ready) return;
        if (Array.isArray(data.results)) {
          cleanup();
          resolve(data.results);
        } else fail(data.error || "Python execution failed.");
      };
      worker.postMessage({ code: source, name, tests });
    });
  }

  async function run(mode: "agent" | "manual" | "revise") {
    if (busy || planning) return;
    if (mode === "agent") {
      if (!code.trim()) { setStatus("Paste your Python code first."); return; }
      if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) { setStatus("Enter the function name exactly as it appears after def."); return; }
      if (behavior.trim().length < 15) { setStatus("Describe what the function should return in at least 15 characters."); return; }
    }
    setBusy(true);
    setPlanning(mode !== "manual");
    try {
      let tests: Case[];
      let original: Result[];
      let guidance = "";
      if (mode === "revise") {
        tests = reviewCases;
        original = results;
        guidance = JSON.stringify({ feedback, previous: candidate?.code }).slice(0, 3000);
      } else {
        setCandidate(undefined);
        setResults([]);
        if (mode === "agent") {
          setStatus("Gemini is generating test cases…");
          const plan = await request("/api/plan-python-checks", { name, behavior });
          tests = plan.cases;
          setCases(JSON.stringify(tests, null, 2));
          setAiDraft(true);
        } else {
          tests = JSON.parse(cases);
        }
        if (!Array.isArray(tests) || !tests.length || tests.length > 20 ||
            tests.some(test => !test || !Array.isArray(test.args) || !Object.hasOwn(test, "expected"))) {
          throw Error("Use 1–20 cases with an args array and an expected value.");
        }
        if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) throw Error("Enter a Python function name.");
        setStatus("Running checks on the original function…");
        original = await execute(code, tests);
        setResults(original);
        setReviewCases(tests);
        if (mode === "manual" || original.every(result => result.passed)) {
          setStatus(mode === "manual" ? "Run complete." : "All generated checks passed. No edit needed.");
          return;
        }
      }
      for (let attempt = 1; attempt <= 2; attempt++) {
        setStatus("Gemini is drafting a repair (" + attempt + " of 2)…");
        const proposal = await request("/api/repair-python", {
          code, name, behavior, evidence: tests.map((test, i) => ({ test, result: original[i] })), feedback: guidance,
        });
        setStatus("Running the same checks on the proposed change…");
        const checked = await execute(proposal.code, tests);
        if (checked.length === tests.length && checked.every(result => result.passed)) {
          setCandidate({ ...proposal, results: checked });
          setFeedback("");
          setStatus("The proposed change passed every generated check. Approve it or send feedback.");
          return;
        }
        guidance = JSON.stringify({ reviewerFeedback: feedback, previous: proposal.code, results: checked }).slice(0, 3000);
      }
      setStatus("Neither proposal passed all checks.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Python workflow failed.");
    } finally {
      setBusy(false);
      setPlanning(false);
    }
  }

  function clearReview() {
    setCandidate(undefined);
    setResults([]);
    setFeedback("");
    setStatus("");
  }

  return <section className="panel setup-panel python-studio">
    <div className="eyebrow">FUNCTION TESTING</div>
    <h2>Python workspace</h2>
    <p>Gemini generates checks and proposes repairs. EdgeCase runs both versions and waits for your approval. Repair requests send your code and test evidence to Gemini. Use code you trust and can share.</p>
    <label className="field">Intended behavior<textarea rows={3} maxLength={3000} value={behavior} onChange={e => { setBehavior(e.target.value); clearReview(); }} disabled={planning || busy} /></label>
    <div className="outcome-actions" style={{ marginBottom: 20 }}>
      <button className="btn outline" disabled={planning || busy} onClick={() => void run("agent")}>Run Gemini agent</button>
    </div>
    <div className="python-grid">
      <label className="field">Python code<textarea rows={12} maxLength={20000} value={code} disabled={busy} onChange={e => { setCode(e.target.value); clearReview(); }} spellCheck={false} /></label>
      <div>
        <label className="field">Function name<input value={name} disabled={busy} onChange={e => { setName(e.target.value); clearReview(); }} /></label>
        <label className="field">{aiDraft ? "Gemini-drafted cases (JSON)" : "Test cases (JSON)"}<textarea rows={8} maxLength={20000} value={cases} disabled={busy} onChange={e => { setCases(e.target.value); clearReview(); }} spellCheck={false} /></label>
      </div>
    </div>
    <div className="outcome-actions">
      <button className="btn primary" disabled={busy || planning} onClick={() => void run("manual")}>Run Python checks</button>
      {busy && !planning && <button className="btn outline" onClick={() => stop.current()}>Stop run</button>}
    </div>
    <p role="status">{status}</p>
    {candidate && <article className="python-result">
      <h3>Approve proposed change?</h3>
      <p>{candidate.summary}</p>
      <p>{results.filter(result => result.passed).length} of {results.length} passed before · {candidate.results.length} of {candidate.results.length} passed after</p>
      <details><summary>Review original and proposed code</summary>
        <strong>Original</strong><pre style={{ whiteSpace: "pre-wrap" }}>{code}</pre>
        <strong>Proposed</strong><pre style={{ whiteSpace: "pre-wrap" }}>{candidate.code}</pre>
      </details>
      <label className="field">Feedback for Gemini<textarea rows={2} maxLength={2000} value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)} /></label>
      <div className="outcome-actions">
        <button className="btn primary" disabled={busy} onClick={() => {
          setCode(candidate.code);
          setResults(candidate.results);
          setCandidate(undefined);
          setFeedback("");
          setStatus("Approved change applied to the editor.");
        }}>Approve and apply</button>
        <button className="btn outline" disabled={busy || !feedback.trim()} onClick={() => void run("revise")}>Send back to Gemini</button>
      </div>
    </article>}
    {results.map((result, index) => <article className="python-result" key={index}>
      <strong>{result.passed ? "Passed" : "Failed"} · Case {index + 1}</strong>
      <p>Expected <code>{JSON.stringify(result.expected)}</code></p>
      {result.error ? <p>{result.error}</p> : <p>Returned <code>{JSON.stringify(result.actual)}</code></p>}
    </article>)}
  </section>;
}
