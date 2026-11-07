"use client";

import { useRef, useState } from "react";
import { Checks, type Test } from "@/lib/agent-schema";
import { openFrame } from "@/lib/browser-checks";

const DEMO = `<h2>Club registration</h2>
<form id="form">
  <label>Name <input id="name"></label>
  <label>Email <input id="email" type="email"></label>
  <button id="submit">Register</button>
</form>
<p id="result" role="status">Waiting for registration</p>
<script>
document.querySelector('#form').addEventListener('submit', event => {
  event.preventDefault();
  // Add a blank-email check here to fix the bug.
  document.querySelector('#result').textContent = 'Registration saved';
});
</script>`;

const DEMO_RULES = "A valid name and email should show Registration saved. A blank email must never show Registration saved.";
const DEMO_TESTS: Test[] = ["student@example.test", ""].map((email, index) => ({
  title: index ? "Reject blank email" : "Accept a valid registration",
  actions: [
    { kind: "fill", selector: "#name", value: "Alex Example" },
    { kind: "fill", selector: "#email", value: email },
    { kind: "click", selector: "#submit" },
  ],
  assertion: { selector: "#result", text: "Registration saved", present: !index },
}));

type Result = {
  test: Test;
  status: "Passed" | "Reproduced failure" | "Inconclusive" | "Blocked";
  observations: string[];
  steps: string[];
};

export function AutoRunner() {
  const [code, setCode] = useState(DEMO);
  const [requirements, setRequirements] = useState(DEMO_RULES);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("");
  const [lastPlan, setLastPlan] = useState<{ tests: Test[]; label: string }>();
  const host = useRef<HTMLDivElement>(null);
  const [runInput, setRunInput] = useState<{ code: string; requirements: string }>();
  const [repair, setRepair] = useState<{
    code: string; cause: string; search: string; replacement: string; checks: Result[];
  }>();
  const [repairHistory, setRepairHistory] = useState<string[]>([]);

  async function execute(frameHost: HTMLDivElement, html: string, test: Test): Promise<Result> {
    const observations: string[] = [];
    let steps: string[] = [];
    let status: Result["status"] = "Blocked";
    try {
      const first = await openFrame(frameHost, html, test);
      if (!("passed" in first)) throw Error("No assertion result.");
      steps = first.steps;
      observations.push(first.observed || "(empty text)");
      status = first.passed ? "Passed" : "Inconclusive";
      if (!first.passed) {
        const again = await openFrame(frameHost, html, test);
        if (!("passed" in again)) throw Error("No result on the second attempt.");
        observations.push(again.observed || "(empty text)");
        if (!again.passed) status = "Reproduced failure";
      }
    } catch (problem) {
      observations.push(problem instanceof Error ? problem.message : "Check could not run.");
    }
    return { test, status, observations, steps };
  }

  const canDebug = Boolean(runInput && runInput.code === code && runInput.requirements === requirements &&
    results.some(result => result.status === "Reproduced failure"));

  async function debug() {
    if (!host.current || busy || !canDebug) return;
    const frameHost = host.current;
    const evidence = results.map(({ test, status, observations }) => ({ test, status, observations }));
    setBusy(true);
    setError("");
    setRepair(undefined);
    setRepairHistory([]);
    try {
      let previousAttempt: string | undefined;
      for (let attempt = 1; attempt <= 2; attempt++) {
        setProgress("Gemini is diagnosing the failure · attempt " + attempt + " of 2…");
        const response = await fetch("/api/debug-browser-checks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, requirements, evidence, previousAttempt }),
          signal: AbortSignal.timeout(22000),
        });
        const proposal = await response.json();
        if (!response.ok) throw Error(proposal.error || "Automatic debugging failed.");
        const { cause, search, replacement } = proposal as { cause: string; search: string; replacement: string };
        const location = code.indexOf(search);
        if (location < 0 || code.indexOf(search, location + 1) >= 0 || search === replacement) {
          previousAttempt = "The proposed edit was unchanged or its search text did not match exactly once.";
          setRepairHistory(history => [...history, "Attempt " + attempt + " · " + previousAttempt]);
          continue;
        }
        const candidate = code.slice(0, location) + replacement + code.slice(location + search.length);
        const checks: Result[] = [];
        for (const [index, item] of evidence.entries()) {
          setProgress("Testing candidate " + attempt + " · check " + (index + 1) + " of " + evidence.length + "…");
          checks.push(await execute(frameHost, candidate, item.test));
        }
        const summary = checks.map(check => check.test.title + ": " + check.status + " (" + check.observations.join(" / ") + ")").join("; ");
        setRepairHistory(history => [...history, "Attempt " + attempt + " · " + summary]);
        if (checks.every(check => check.status === "Passed")) {
          setRepair({ code: candidate, cause, search, replacement, checks });
          setProgress("Candidate passed all checks from the original run.");
          return;
        }
        previousAttempt = JSON.stringify({ search, replacement, summary }).slice(0, 2500);
      }
      setProgress("No candidate passed all checks. Original code is still in the editor.");
    } catch (problem) {
      setProgress("");
      setError(problem instanceof Error ? problem.message : "Automatic debugging failed.");
    } finally {
      setBusy(false);
    }
  }

  async function run(mode: "demo" | "ai" | "repeat") {
    if (!host.current || busy) return;
    const frameHost = host.current;
    setBusy(true);
    setResults([]);
    setError("");
    setSource("");
    setRunInput(undefined);
    setRepair(undefined);
    setRepairHistory([]);
    try {
      let tests: Test[];
      let label: string;
      if (mode === "demo") {
        tests = DEMO_TESTS;
        label = "Built-in browser checks";
      } else if (mode === "repeat" && lastPlan) {
        ({ tests, label } = lastPlan);
      } else {
        setProgress("Inspecting form controls…");
        const inventory = await openFrame(frameHost, code);
        if (!("controls" in inventory) || !inventory.controls.length) throw Error("No form controls were found.");
        setProgress("Gemini is selecting browser checks…");
        const response = await fetch("/api/plan-browser-checks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirements, controls: inventory.controls }),
          signal: AbortSignal.timeout(22000),
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "AI planning failed.");
        tests = Checks.parse(data).tests;
        label = "Gemini-selected browser checks";
      }
      setLastPlan({ tests, label });
      setSource(label);
      for (const [index, test] of tests.entries()) {
        setProgress(`Running check ${index + 1} of ${tests.length}…`);
        const result = await execute(frameHost, code, test);
        setResults(previous => [...previous, result]);
      }
      setRunInput({ code, requirements });
      setProgress("Run complete.");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The run failed.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel setup-panel" id="automated-runner">
    <div className="eyebrow">AUTOMATED BROWSER TESTING</div>
    <h2>Run browser checks</h2>
    <p>Paste a self-contained HTML form with inline JavaScript you trust. Use fictional data. Gemini receives the form control inventory and rules.</p>
    <label className="field">HTML and JavaScript
      <textarea rows={10} value={code} maxLength={60000} onChange={event => setCode(event.target.value)} disabled={busy} spellCheck={false} />
    </label>
    <label className="field">Rules and expected feedback
      <textarea rows={3} value={requirements} maxLength={2000} onChange={event => setRequirements(event.target.value)} disabled={busy} />
    </label>
    <div className="outcome-actions">
      <button className="btn primary" disabled={busy || !code.trim() || requirements.trim().length < 5} onClick={() => void run("ai")}>Run with Gemini</button>
      <button className="btn outline" disabled={busy || !code.trim()} onClick={() => void run("demo")}>Run built-in checks</button>
      <button className="btn outline" disabled={busy || !lastPlan || !code.trim()} onClick={() => void run("repeat")}>Rerun last checks</button>
      <button className="btn ghost" disabled={busy} onClick={() => { setCode(DEMO); setRequirements(DEMO_RULES); }}>Load buggy example</button>
    </div>
    <div className="bottom-actions">
      <button className="btn primary" disabled={busy || !canDebug} onClick={() => void debug()}>Auto-debug and test a fix</button>
    </div>
    <p className="footnote">After a reproduced failure, auto-debug sends the pasted code, rules, and test evidence to Gemini. Use code you can share.</p>
    <p role="status">{progress}</p>
    {repairHistory.length > 0 && <ul aria-label="Repair attempts">{repairHistory.map((entry, i) => <li key={i}>{entry}</li>)}</ul>}
    {repair && canDebug && <article className="expected">
      <h3>Candidate fix · {repair.checks.length} checks passed</h3>
      <p>{repair.cause}</p>
      <details><summary>Review the proposed edit</summary>
        <p>Before</p><pre style={{ whiteSpace: "pre-wrap" }}>{repair.search}</pre>
        <p>After</p><pre style={{ whiteSpace: "pre-wrap" }}>{repair.replacement}</pre>
      </details>
      <button className="btn primary" disabled={busy} onClick={() => {
        setCode(repair.code);
        setResults(repair.checks);
        setRunInput({ code: repair.code, requirements });
        setRepair(undefined);
        setProgress("Verified edit applied to the editor.");
      }}>Apply verified edit</button>
    </article>}
    {error && <p role="alert">{error}</p>}
    {source && <p className="muted">{source}</p>}
    <div ref={host} aria-label="Automated browser preview" />
    {results.map(({ test, status, observations, steps }, index) => <article className="expected" key={index}>
      <h3>{status} · {test.title}</h3>
      <p>Expected {test.assertion.selector} {test.assertion.present ? "to show" : "to omit"} {JSON.stringify(test.assertion.text)}.</p>
      {steps.length > 0 && <ol>{steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
      {observations.map((observation, i) => <p key={i}>Attempt {i + 1} · {observation}</p>)}
    </article>)}
  </section>;
}
