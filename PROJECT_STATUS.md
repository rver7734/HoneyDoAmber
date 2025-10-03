# HoneyDo by Amber — Project Journal

This single journal replaces the previous collection of status markdowns. It summarizes product goals, current capabilities, technical architecture, and a running log of milestone-level changes.

## 1. Snapshot (for everyone)
- HoneyDo by Amber is a calming task companion for creatives, voiced through Amber the supportive pup.
- The app guides users from task capture to celebration with encouraging language and gentle visuals.
- Core experience runs client-side in Next.js with local storage so the prototype is self-contained.
- Notifications are now 100% local: the browser schedules and displays reminder prompts on the user’s device, including automatic follow-ups for repeating reminders.
- AI assists with natural-language task entry and friendly reminder copy, but all delivery happens on-device.

## 2. Feature Summary
### Everyday experience (plain language)
- **Smart task input:** type or dictate natural phrases like “walk Amber tomorrow at 5” and the app fills in the structured reminder.
- **Agenda & celebration views:** upcoming reminders and “Awesome Finishes” pages provide gentle encouragement and quick actions.
- **Priority cues:** color and icon system keeps focus on what’s urgent without stress.
- **Soothing visuals:** illustrated cards, empty states, and forms reinforce Amber’s warm persona.
- **Local reminder pings:** when it’s time, the browser nudges the user with Amber-styled copy—no texts, emails, or external services required. Recurring reminders roll themselves forward once they fire or are marked complete, and upcoming cards list the next few occurrences at a glance.

### Under the hood (technical view)
- **Framework:** Next.js App Router, TypeScript, Tailwind CSS, ShadCN components.
- **State & storage:** React Context backed by `localStorage`; helpers handle serialization and hydration safeguards.
- **AI flows:** Google Genkit (Gemini) interprets free-form reminder text and drafts Amber-flavored messages; prompts are tuned for brevity and empathy.
- **Service worker:** `public/firebase-messaging-sw.js` keeps local notifications consistent even when the tab is backgrounded.
- **Testing surfaces:** dedicated routes (e.g., `/test-notifications`) exercise smart input, local notification scheduling, and UI regression checks.

## 3. Notification Architecture
- **Source of truth:** reminders live in browser storage; each reminder carries the scheduled timestamp, optional recurrence pattern, and metadata (priority, location, companions).
- **Scheduling:** when a reminder is saved, the client registers a timer using the Notification API and `setTimeout`/`AlarmManager` polyfills; timers survive reload via persisted queue reconciliation. Recurring reminders compute their next occurrence automatically on both web and native shells.
- **Delivery:** notifications render through the service worker so they appear even if the tab is inactive. Content uses the AI-authored copy with fallbacks for offline scenarios.
- **User consent:** the app requests notification permission up front, surfaces status in settings, and degrades gracefully when permission is denied.
- **Retired services:** Twilio/Mailgun SMS, remote Cloud Scheduler jobs, the OpenAI image callable, and Firestore-backed token registries are disabled or removed from source as of October 2025.

## 4. Milestone Timeline
- **Phase 1 – Foundation & UI polish (Q1 2025):** project scaffolding, Amber-themed design system, responsive grid cards, illustrated empty states, and app shell complete.
- **Phase 2 – AI assistance (Q2 2025):** Genkit flows for smart parsing and playful copy; voice input added to SmartInputBar.
- **Phase 3 – Local notification loop (Q3 2025):** service worker tuning, permission UX, consolidated `/test-notifications` page, and retirement of external messaging providers.
- **Phase 4 – Documentation cleanup (Sep 16 2025):** merged redundant status markdowns into this journal; updated narrative to reflect local-only notifications and current architecture.

## 5. Maintenance & Reference
- **Environment secrets:** historical markdowns exposed legacy API keys. Those files were removed; rotate any still-valid credentials stored outside source control.
- **Testing guidance:** run `npm run lint` and the notification demo routes before shipping UI or scheduling changes; verify Notification permission workflows on Chrome, Safari, and mobile PWA wrappers. For AI flows, confirm the Generative Language API remains enabled and the unrestricted API key is present in `.env`/Vercel before validating copy.
- **Backlog ideas:** optional account sync, shareable reminder packs, and richer AI suggestions remain candidates but are not active work streams.

## 6. Change Log
- **2025-10-02:** Migrated hosting to Vercel (`https://honeydobyamber500.vercel.app`) and updated Capacitor shells to opt into a remote URL only when `CAP_SERVER_URL` is set—bundled assets now work offline by default. Enabled Google Generative Language API for the `honeydo-by-amber` Firebase project and wired new AI prompt instructions so Amber speaks directly to Honey with context-aware quips; added fallback registration for browser notifications when `new Notification()` fails. Refreshed the add/reminder layout with a subtle centered illustration and replaced the Android splash artwork with a transparent logo to avoid stretching on launch.
- **2025-09-16:** Consolidated documentation into this single journal, removed Twilio/Mailgun references, and confirmed project commitment to local notifications only. (Conversation logged per request.)
- **2025-07-11:** CI/CD hardened via Firebase Hosting + GitHub Actions; streamlined `.firebase` artifacts handling.
- **2025-07-10:** Refined scheduled reminder data model and collection-group querying ahead of local-notification pivot; ensured flexible callable function payload handling.
- **2025-09-25:** Android shell now routes native and FCM notification taps to the new `/bark/<id>` detail screen; reminder cards and the bark flow schedule test alerts with deep links. Smart Input was tuned to produce concise titles, inferred dates/times, bullet-note context, and an optional Amber insight—with resilient fallbacks when Genkit hiccups. The “People” field (and related prompts) was retired, notification generation gained friendly defaults, and the add/edit form now renders notes as Amber-style bullets. Playwright e2e scaffold added (signup/login through reminder lifecycle); awaits backend-auth fix before it can run end-to-end.
- **2025-10-01:** Removed experimental image-generation code and OpenAI dependencies. Added recurring reminder support (daily, weekdays, custom weekly), in-app recurrence scheduling, and per-card “Repeats next” summaries. Smart input gained a busy-state overlay, the mic button was upsized, and cards now flex to fit their notes.
