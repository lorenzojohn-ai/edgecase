# EdgeCase v0.1 — MCF AI Bootcamp Launchpad

**Build it. Break it. Make it better.** An evidence-first testing workbench for student web developers.

## Quick start

Prerequisites: Node.js 20.9+ and npm, with internet access for the first dependency install.

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:3000**.

**No API key is required.** Without one, `Generate test plan` returns fixed, clearly labeled *sample templates*, not generated AI output. These templates are optimized for the included Student Club Registration Portal demo. To generate AI tests for other apps, set the server-side environment variables below.

## Optional AI integration

Edit `.env.local`:

```ini
AI_API_KEY=your_provider_api_key_here
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

Restart `npm run dev` after editing. EdgeCase sends prompts to an OpenAI-compatible Chat Completions API with JSON-mode support. The model/provider must support `response_format: {"type":"json_object"}`. API calls may incur provider charges. Never commit `.env.local` or expose the key to browser code. If the service fails or returns invalid test data, the app returns **explicitly labeled demo templates** rather than pretending they came from AI.

**Important:** AI configuration must be controlled by the deployment owner. `AI_BASE_URL` is a server-side setting; use only providers you trust. If you deploy this publicly, implement authentication and rate limiting before enabling a paid API key. The v0.1 endpoints are not abuse-protected or production-ready.

## What is included

- Responsive Next.js + React + TypeScript application
- `POST /api/generate-tests`: input validation, optional server-side LLM call, schema validation, fallback templates
- Test case editor: title, category, priority, steps, expected outcome
- Evidence-first execution: untested / passed / failed / blocked, with manual observations and notes
- A failed test requires a written observed result
- `POST /api/explain-failure`: AI explanations or labeled generic offline tips
- Browser `localStorage` persistence (no account, no database)
- Results dashboard and downloadable HTML and JSON reports
- Controlled, deliberately buggy Student Club Registration Portal

**Not implemented:** Playwright automation, automatic bug reproduction, screenshots, user authentication, secure hosted storage, arbitrary URL scanning, GitHub integration. The dashboard never claims tests were automatically verified.

## Demo walkthrough

1. Go to **Buggy demo app**, register with a normal fictional name, email, and grade.
2. Return to **Test workspace**, keep the prefilled requirements, and generate a plan.
3. Select **Reject a blank required email** and run its steps in the buggy demo.
4. In **Observed result**, write e.g. `Submission was accepted even though the email was blank; a new record appeared.`
5. Choose **Failed**. The result is explicitly a *user-recorded observation*, not an automated verified finding.
6. Select **Explain** for debugging guidance. View **Results dashboard**, export HTML report.
7. Test duplicated email, grade 14, long name, and keyboard-only submission.

## Known seeded defects in the demo

- Blank email accepted
- Duplicate email accepted
- Grades 13/14 accepted
- Long names may visually overflow the record list
- Mouse-only submit control is not keyboard operable
- Invalid email formats accepted (extra visible failure case)

These defects are **intentional and isolated** in a local-only practice form; use synthetic data only. All records are kept in browser storage and may be cleared. Never enter real student data.

## Architecture

```text
Browser UI (app/page.tsx)
    ├── localStorage: project / manual evidence
    ├── DemoRegistration: isolated buggy form and local records
    ├── POST /api/generate-tests
    │     ├── Zod intake validation
    │     ├── AI provider (optional, key is server-only)
    │     └── Zod plan validation / labeled fixed templates
    └── POST /api/explain-failure
          └── AI or labeled offline guidance
```

### Core directories

- `app/page.tsx` — main UI, editing, evidence, reports, persistence
- `app/globals.css` — responsive styling
- `app/api/` — server-only model integrations
- `components/DemoRegistration.tsx` — purposely broken practice form
- `lib/schema.ts` — types and Zod contracts
- `lib/demo.ts` — deterministic example test scenarios
- `lib/ai.ts` — provider and model output handling

## Build / deploy

```bash
npm run typecheck
npm run build
npm run start
```

For Vercel, import the GitHub repository, use the Next.js framework preset, and optionally configure `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` in the project environment settings. You can also keep AI disabled for a no-cost demonstration.

## Data, security and limitations

- **Evidence semantics:** `failed` means a human *reported* a failure; it does not mean EdgeCase independently reproduced it. `untested` means no observation. `blocked` means execution could not be completed.
- Local data is unencrypted and scoped to the browser origin; it is not suitable for private or sensitive data.
- An AI call transmits the supplied app description, requirements or recorded failure details to the configured provider. Do not input secrets or personal data.
- API responses are parsed and checked against schemas; no generated scripts are executed.
- Client-side data is not trusted as external proof. There is no authentication or tamper-resistant audit log.
- The buggy form is intentionally insecure and not a reusable production example.
- Provider failures, JSON-mode differences, or rate limits may require model-specific adjustments.

## Verification note

The project was authored in a container that could not reach npm's registry. **Dependencies could not be installed and an actual Next.js build was not executed in that environment.** Run `npm install`, `npm run typecheck`, and `npm run build` on a machine with npm access before presenting or deploying.

MIT-style educational prototype. Built for the Mark Cuban Foundation AI Bootcamp Launchpad project; not affiliated with or endorsed by the Foundation.
