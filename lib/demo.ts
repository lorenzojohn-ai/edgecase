import type { TestDraft } from './schema';

// Deterministic fallback is explicitly labeled as a template, NEVER AI-generated.
export const DEMO_DRAFTS: TestDraft[] = [
  { title: 'Reject a blank required email', category: 'validation', priority: 'high', steps: ['Enter a name and valid grade.', 'Leave the email blank.', 'Submit the registration form.'], expectedResult: 'The form refuses submission, shows an email required message, and stores no registration.' },
  { title: 'Reject duplicate email registrations', category: 'workflow', priority: 'high', steps: ['Register once using a valid email.', 'Submit another registration with the same email.'], expectedResult: 'The second registration is rejected and only one record is stored.' },
  { title: 'Restrict grade to supported values', category: 'validation', priority: 'high', steps: ['Enter a name and email.', 'Choose grade 14.', 'Submit the form.'], expectedResult: 'The form rejects unsupported grades outside 9 through 12.' },
  { title: 'Accept a valid registration', category: 'workflow', priority: 'high', steps: ['Enter a name and valid email.', 'Select a grade from 9 through 12.', 'Submit the form.'], expectedResult: 'The form confirms a successful registration and saves exactly one record.' },
  { title: 'Keep the layout usable with very long names', category: 'reliability', priority: 'medium', steps: ['Enter a name longer than 200 characters.', 'Submit the form and inspect the record list.'], expectedResult: 'The input is constrained or the record wraps without overflowing the layout.' },
  { title: 'Support keyboard-only form submission', category: 'accessibility', priority: 'high', steps: ['Navigate the page using only Tab and Shift+Tab.', 'Fill fields and attempt to submit using keyboard controls.'], expectedResult: 'All interactive form elements are keyboard reachable and operable.' },
  { title: 'Reject invalid email formats', category: 'validation', priority: 'medium', steps: ['Enter a name and grade.', 'Enter an email with no @ symbol.', 'Try to submit.'], expectedResult: 'The form rejects the malformed email with understandable feedback.' },
  { title: 'Avoid losing data after refresh', category: 'reliability', priority: 'low', steps: ['Submit a valid registration.', 'Refresh the browser page.', 'Inspect the saved registrations.'], expectedResult: 'Saved registrations remain available after refreshing.' }
];

export function demoTests(count: number): TestDraft[] {
  return Array.from({ length: count }, (_, i) => ({ ...DEMO_DRAFTS[i % DEMO_DRAFTS.length], steps: [...DEMO_DRAFTS[i % DEMO_DRAFTS.length].steps] }));
}
