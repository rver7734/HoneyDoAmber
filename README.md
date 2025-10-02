# HoneyDo by Amber

A gentle, non-judgmental, and supportive to-do/reminder application designed for users who may have ADHD. The app's voice and personality are channeled through a supportive dog named Amber.

## Project Overview

- **Frontend:** Next.js (with App Router), React, TypeScript
- **UI:** ShadCN UI Components, Tailwind CSS
- **AI / Generative:** Genkit, utilizing Google AI (Gemini models)
- **Backend Services:** Firebase (specifically for Cloud Messaging)
- **Local Persistence:** `localStorage` (as a stand-in for a persistent database)

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Run the development server with `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

This project is configured for automatic deployment to Firebase Hosting via GitHub Actions. The deployment process includes:

1. Building the Next.js application
2. Deploying to Firebase Hosting
3. Configuring custom domain settings

To get started with development, take a look at src/app/page.tsx.