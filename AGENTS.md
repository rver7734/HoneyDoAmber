# Repository Guidelines

## Project Structure & Module Organization
Core web code lives in `src/`, with `app/` for Next.js routes, `components/` for ShadCN-based UI, `context/` and `hooks/` for shared state, and `ai/` for Genkit workflows. Static assets sit in `public/` (e.g., `/pawicon.png`). Firebase Cloud Functions reside in `functions/` with their own `package.json`. Native shells generated via Capacitor live under `ios/` and `android/`. Deployment helpers and infrastructure configs (Firebase, Vercel, Tailwind) are in the repository root.

## Build, Test, and Development Commands
`npm run dev` starts the Next.js app with Turbopack. `npm run genkit:dev` and `npm run genkit:watch` boot the Genkit developer server for AI flows. `npm run build` compiles the production bundle; follow with `npm run start` to serve it locally. `npm run lint` runs ESLint with the Next.js config, and `npm run typecheck` validates TypeScript types. Cloud functions can be emulated with `cd functions && npm run serve` or deployed via `npm run deploy` in that directory.

## Coding Style & Naming Conventions
Use TypeScript across the stack and prefer functional React components. Follow the repository’s default formatting: 2-space indentation, single quotes in modules, and semicolons where Next.js lint demands them. Co-locate UI with domain folders when possible, and keep Tailwind utility classes ordered from layout → spacing → color for readability. Shared utilities belong in `src/lib/`, and types should live in `src/types/`.

## Testing Guidelines
There is no formal automated test suite yet; linting and type checks act as guards. Before pushing, run `npm run lint` and `npm run typecheck`. For new logic, add focused unit tests with Vitest or Jest (place them alongside source as `*.test.ts`) and document manual verification steps in your PR. Exercise key flows—reminder creation, updates, and push notification triggers—before requesting review.

## Commit & Pull Request Guidelines
The distributed archive lacks git history, so use clear Conventional Commit messages (e.g., `feat: add recurring reminder scheduler`) to aid release tooling. Keep commits scoped to a single concern. PRs should describe intent, list testing performed, and link to any tracking issues. Include screenshots or screen recordings when UI changes affect visuals, and call out migrations or environment updates for reviewers.

## Mobile & Cloud Notes
After frontend changes that affect native shells, run `npm run capacitor:sync` to propagate updates, then open the relevant project with `npm run capacitor:open:ios` or `npm run capacitor:open:android`. For Firebase rule updates, modify `firestore.rules` and redeploy via `firebase deploy --only firestore:rules` before merging.
Android local reminders now use `@capacitor/local-notifications`; ensure the plugin stays installed and resync before opening Android Studio. The native shell schedules reminders on-device when notifications are enabled in Settings.
