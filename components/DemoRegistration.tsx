'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, UserPlus } from 'lucide-react';

type Entry = { id:string; name:string; email:string; grade:string };
const KEY='edgecase-demo-registrations';
export function DemoRegistration() {
 const [entries,setEntries]=useState<Entry[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [grade,setGrade]=useState('10');
 const [added,setAdded]=useState(false);
 useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))setEntries(v);}catch{}setLoaded(true);},[]);
 useEffect(()=>{if(loaded)localStorage.setItem(KEY,JSON.stringify(entries));},[entries,loaded]);
 function submit(){if(!name.trim())return;setEntries(old=>[{id:`${Date.now()}-${Math.random()}`,name,email,grade},...old]);setAdded(true);setTimeout(()=>setAdded(false),2500);}
 return <div className="sandbox-grid"><section className="panel sandbox-form"><div className="portal-head"><div className="portal-icon"><UserPlus size={22}/></div><div><h2>Club registration</h2><p>Join our student community</p></div></div><p className="sandbox-desc">Welcome! Complete the form to register for the fictional After School Code Club.</p><label className="field">Full name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Alex Example"/></label><label className="field">School email<input type="text" value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@example.edu"/></label><label className="field">Grade level<select value={grade} onChange={e=>setGrade(e.target.value)}>{['9','10','11','12','13','14'].map(n=><option key={n} value={n}>Grade {n}</option>)}</select></label>
 {/* BUG: inaccessible div button; keyboard Enter/Space does not work. This is deliberate in a labeled sandbox. */}
 <div role="button" aria-label="Submit buggy registration (intentionally mouse-only)" className="btn primary wide fake-submit" onClick={submit}><UserPlus size={17}/> Register now</div>
 {added && <div className="success-alert"><CheckCircle2 size={16}/> Registration accepted!</div>}
 <p className="footnote">This is a local, synthetic-data demonstration. No registrations are sent to a server.</p></section>
 <section className="panel sandbox-records"><div className="records-heading"><div><h2>Registration records <span>{entries.length}</span></h2><p>Saved in this browser only</p></div><button className="btn outline small" onClick={()=>{setEntries([]);setAdded(false)}}><RotateCcw size={15}/> Clear</button></div>{entries.length===0?<div className="records-empty">No registrations yet.<br/>Submit the form to add one.</div>:<div className="record-list">{entries.map((entry,i)=><div key={entry.id} className="registration-record"><div className="record-avatar">{entry.name.charAt(0).toUpperCase()}</div><div className="record-info"><strong>{entry.name}</strong><p>{entry.email || '(blank email)'}</p><small>Grade {entry.grade}</small></div><span className="record-no">#{entries.length-i}</span></div>)}</div>}</section></div>;
}
