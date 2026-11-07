import type { Test } from "./agent-schema";

type Evidence = { passed: boolean; observed: string; steps: string[] };
type Command = { test?: Test; token: string };

function runInFrame({ test, token }: Command) {
  const reply = (payload: unknown) => parent.postMessage({ token, payload }, "*");
  const describe = (element: Element) => {
    const label = element instanceof HTMLInputElement ? element.labels?.[0]?.textContent : "";
    return [element.tagName.toLowerCase(), element.id && "#" + CSS.escape(element.id), element.getAttribute("name"), element.getAttribute("type"), (label || element.textContent || "").trim().slice(0, 90)].filter(Boolean).join(" ").slice(0, 300);
  };
  window.addEventListener("load", async () => {
    const steps: string[] = [];
    try {
      if (!test) {
        reply({ controls: Array.from(document.querySelectorAll("input:not([type=hidden]), button, textarea, select, [role=status], [role=alert], [id]")).slice(0, 50).map(describe) });
        return;
      }
      const find = (selector: string) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length !== 1) throw Error("Expected one match for " + selector + ", found " + elements.length);
        const element = elements[0];
        if (!(element instanceof HTMLElement) || element.closest("[hidden]") || getComputedStyle(element).visibility === "hidden" || getComputedStyle(element).display === "none") throw Error("Target is hidden: " + selector);
        return element;
      };
      for (const action of test.actions) {
        const element = find(action.selector);
        if (element.matches(":disabled")) throw Error("Target is disabled: " + action.selector);
        if (action.kind === "fill") {
          if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || element.matches("[readonly], [type=file], [type=hidden], [type=checkbox], [type=radio], [type=password]")) throw Error("Unsupported fill target: " + action.selector);
          element.focus();
          element.value = action.value;
          if (element.value !== action.value) throw Error("The control rejected the requested value: " + action.selector);
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          steps.push("Fill " + action.selector + " with " + JSON.stringify(action.value));
        } else {
          element.click();
          steps.push("Click " + action.selector);
        }
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      await new Promise(resolve => setTimeout(resolve, 450));
      const observed = find(test.assertion.selector).innerText.trim().slice(0, 5000);
      const present = observed.includes(test.assertion.text);
      reply({ passed: present === test.assertion.present, observed: observed.slice(0, 1000), steps });
    } catch (error) {
      reply({ error: error instanceof Error ? error.message : "Browser check failed", steps });
    }
  }, { once: true });
}

export function openFrame(host: HTMLElement, source: string, test?: Test): Promise<Evidence | { controls: string[] }> {
  const token = crypto.randomUUID();
  const iframe = document.createElement("iframe");
  iframe.title = "Isolated EdgeCase test form";
  iframe.setAttribute("sandbox", "allow-scripts allow-forms");
  iframe.referrerPolicy = "no-referrer";
  iframe.style.cssText = "width:100%;height:240px;border:1px solid #d9dfeb;border-radius:8px;background:white;pointer-events:none";
  const template = document.createElement("template");
  template.innerHTML = source;
  template.content.querySelectorAll("meta[http-equiv], base, iframe, object, embed, link").forEach(element => element.remove());
  const csp = document.createElement("meta");
  csp.httpEquiv = "Content-Security-Policy";
  csp.content = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'";
  const bootstrap = document.createElement("script");
  const data = JSON.stringify({ test, token }).replace(/</g, "\\u003c");
  bootstrap.textContent = "(" + runInFrame.toString() + ")(" + data + ");";
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error("Browser check timed out or the form navigated away.")), 4500);
    const finish = (error?: Error, result?: Evidence | { controls: string[] }) => {
      clearTimeout(timer);
      window.removeEventListener("message", receive);
      if (error) reject(error);
      else if (result) resolve(result);
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || event.origin !== "null" || event.data?.token !== token) return;
      const payload = event.data.payload;
      if (typeof payload?.error === "string") finish(new Error(payload.error));
      else if (test && typeof payload?.passed === "boolean" && typeof payload.observed === "string" && Array.isArray(payload.steps)) finish(undefined, payload);
      else if (!test && Array.isArray(payload?.controls)) finish(undefined, payload);
    };
    window.addEventListener("message", receive);
    iframe.srcdoc = "<!doctype html><html><head>" + csp.outerHTML + bootstrap.outerHTML + "</head><body>" + template.innerHTML + "</body></html>";
    host.replaceChildren(iframe);
  });
}
