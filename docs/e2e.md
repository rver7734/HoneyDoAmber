# End-to-End Test Guide

This repository now ships with a Playwright spec that exercises the happiest reminder flow end-to-end: logging in, using the smart input, verifying the add form, checking the notification detail screen, and cleaning up the reminder.

## Prerequisites

1. Install Playwright dependencies (this repository already includes the package, but make sure the browsers are installed once per machine):
   ```bash
   npm install
   npx playwright install --with-deps
   ```
2. Start the app locally in another terminal (Turbopack works fine):
   ```bash
   npm run dev
   ```
3. (Optional) Override the base URL if you are not on `http://localhost:3000`:
   ```bash
   export E2E_BASE_URL="http://localhost:3000"
   ```

## Running the Test

Use the project-level Playwright config:
```bash
npm run test:e2e
```

The script logs each major step (account creation, smart input execution, form verification, detail view, completion, deletion). Each run generates a brand-new Firebase Auth user using a randomized email/password, so you don’t need to supply credentials. Look for 👍 `HoneyDo by Amber – full reminder lifecycle` in the final report.

> Tip: `playwright.config.ts` pins the run to Desktop Chrome, serialises tests via `workers: 1`, and retains traces/screenshots/videos on failure. A plain-text step log is appended to `test-results/e2e-run.log` on every execution. Override any defaults with the standard Playwright CLI flags when needed.

## What the Test Covers

- Authenticates through `/login` (skips if already signed in).
- Fills the smart input with a natural-language string and waits for the `/add` page.
- Asserts the reminder form is pre-filled (title, date, time) and submits it.
- Confirms the reminder appears on the dashboard and captures its ID.
- Visits the `/bark/<id>` page to verify the new detail view.
- Marks the reminder complete, then deletes it, ensuring cleanup leaves the UI tidy.

This “smoke” spec should catch regressions in the happy path. For additional journeys, copy `full-flow.spec.ts` and tweak the sequence to exercise other areas (Notification Lab, settings toggles, etc.).
