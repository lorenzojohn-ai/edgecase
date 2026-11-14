"use client";
import { useEffect, useState } from "react";
import { AutoRunner } from "./AutoRunner";
import { PythonRunner } from "./PythonRunner";

type Project = { id: string; name: string; language: "Python" | "HTML + JavaScript"; demo?: boolean };
const defaults: Project[] = [
  { id: "python-demo", name: "Hackathon scoring", language: "Python", demo: true },
  { id: "html-demo", name: "Club registration", language: "HTML + JavaScript", demo: true },
];

export function WorkspaceHome({ legacy }: { legacy: React.ReactNode }) {
  const [projects, setProjects] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<string>();
  const [opened, setOpened] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<Project["language"]>("Python");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("edgecase-workspaces");
      if (saved) setProjects(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem("edgecase-workspaces", JSON.stringify(projects));
  }, [projects, ready]);
  function open(id: string) {
    setOpened(ids => ids.includes(id) ? ids : [...ids, id]);
    setActive(id);
  }
  return <div className="app-shell project-shell">
    <aside className="sidebar">
      <div className="brand"><strong>EdgeCase</strong></div>
      <button className={active ? "nav-item" : "nav-item active"} onClick={() => setActive(undefined)}>Projects</button>
      {projects.map(project => <button key={project.id} className={active === project.id ? "nav-item active" : "nav-item"} onClick={() => open(project.id)}>{project.name}</button>)}
      <button className="nav-item" onClick={() => setActive("legacy")}>Original test workspace</button>
    </aside>
    <main className="main-content"><div className="content">
      {!active && <section className="workspace-home">
        <h1>Your projects</h1><p className="workspace-intro">Open a sample project or create a workspace for your own code.</p>
        <div className="python-grid">{projects.map(project => <button key={project.id} className="panel workspace-card" onClick={() => open(project.id)}><strong>{project.name}</strong><span>{project.language}</span></button>)}</div>
        <form className="panel setup-panel workspace-create" onSubmit={event => {
          event.preventDefault();
          if (!name.trim() || !ready) return;
          const project = { id: crypto.randomUUID(), name: name.trim(), language };
          setProjects(items => [...items, project]);
          setName("");
          open(project.id);
        }}>
          <h2>New workspace</h2>
          <label className="field">Project name<input value={name} maxLength={80} required onChange={event => setName(event.target.value)} /></label>
          <label className="field">Language<select value={language} onChange={event => setLanguage(event.target.value as Project["language"])}><option>Python</option><option>HTML + JavaScript</option></select></label>
          <button className="btn primary" disabled={!ready || !name.trim()}>Create workspace</button>
        </form>
      </section>}
      {projects.filter(project => opened.includes(project.id)).map(project => <div hidden={active !== project.id} key={project.id}>
        <h1>{project.name}</h1>
        {project.language === "Python" ? <PythonRunner workspaceId={project.id} demo={Boolean(project.demo)} /> : <AutoRunner workspaceId={project.id} demo={Boolean(project.demo)} />}
      </div>)}
      <div hidden={active !== "legacy"}>{legacy}</div>
    </div></main>
  </div>;
}
