# HoneyDo by Amber

A gentle, non-judgmental, and supportive to-do/reminder application designed for users who may have ADHD. The app's voice and personality are channeled through a supportive dog named Amber.

## Project Overview

- **Frontend:** Next.js (with App Router), React, TypeScript
- **UI:** ShadCN UI Components, Tailwind CSS
- **AI / Generative:** Genkit, utilizing Google AI (Gemini models)
- **Backend Services:** Firebase (specifically for Cloud Messaging)
- **Local Persistence:** `localStorage` (as a stand-in for a persistent database)

## Branch & Build Workflow

| Purpose | Branch | Script | Result |
| --- | --- | --- | --- |
| Live development (loads Vercel site) | `dev` | `npm run android:dev` | Builds the web bundle, writes `CAP_SERVER_URL=https://honeydobyamber500.vercel.app`, and opens the Android project pointing at production. |
| Offline bundle / APK prep | `release` | `npm run android:release` | Copies the static bundle into `android/app/src/main/assets/public/` so the shell runs offline. Follow with Android Studio → *Build → Generate Signed Bundle/APK…* to create a release APK (`npm run android:apk` runs the Gradle task for you). |

### Typical Flow

1. Everyday work happens on `dev` (use the live site).
2. When ready to ship, merge `dev` into `release`, run `npm run android:release`, and generate the signed APK.
3. Redeploy the web app with `vercel --prod`.

## Running the Web App Locally

```bash
npm install
npm run dev
# visit http://localhost:3000
```
