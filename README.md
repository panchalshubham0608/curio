# Project Curio — Personal Discovery PWA (Phase 1 MVP)

> **Less scrolling. More discovering.**

Project Curio is a mobile-first, AI-powered personal discovery Progressive Web App built around **finite, engaging learning sessions** instead of endless social feeds.

## Architecture Overview

Curio follows a strict layered architecture designed for **execution-mode independence**:

```text
src/
  shared/          # Versioned Zod schemas (schemaVersion: 1), HTTPS URL validation, prompt sanitization, rate limiter, safe logger
  domain/          # Pure TypeScript domain rules (no React/Firebase/DOM): RankingEngine, ContentSelector, ContentNormalizer, ContentDeduplicator, FeedRules
  application/     # Port interfaces + Use cases: FeedOrchestrator, GenerateFeed, GetSession, GetFeed, UpdateSessionProgress, RecordInteraction, SavedLibrary, AskContentQuestion, Preferences
  infrastructure/  # OnDemandFeedExecutor, Firebase client, Firestore & Local repositories, GeminiProvider (Firebase AI Logic), LocalFallbackAIProvider, EvergreenSeedProvider, NasaContentProvider, RssContentProvider, VisualAssetService
  features/        # Editorial UI: Onboarding, Home, SessionPage + strict ComponentRegistry (8 registered cards), Explore, Saved Library, Profile
  app/             # Router, AppContainer (DI), ErrorBoundary, responsive AppShell
```

### Phase 1 vs. Phase 2 Execution Seam

- **Phase 1 (implemented):** `OnDemandFeedExecutor` implements `FeedExecutor` and runs `FeedOrchestrator` on demand while persisting full session lifecycle states (`pending | processing | ready | failed`) with `sessionId` idempotency.
- **Phase 2 (future):** Introduce `BackgroundFeedExecutor` implementing the same `FeedExecutor` interface and reusing `FeedOrchestrator`, domain ranking, and versioned schemas without changing any frontend contract.

## Getting Started

```bash
npm install
npm run dev
```

By default, Curio runs in **Local Ready Mode** (zero backend configuration required) with a 24-item curated evergreen discovery corpus across all 8 categories, local browser cache persistence, and grounded local AI explanations.

### Connecting Firebase, Firestore & Gemini (Firebase AI Logic)

1. Copy `.env.example` to `.env.local`.
2. Fill in your public Firebase Web App config (`VITE_FIREBASE_*`). **Never place private third-party API secrets in `VITE_*` variables.**
3. Deploy `firestore.rules` and `firebase.json` to your Firebase project for owner-scoped data rules and strict HTTP security headers.
4. Set `VITE_ENABLE_FIREBASE_AI=true` to activate Gemini via Firebase AI Logic (`firebase/ai`).

## Scripts

- `npm run dev` — Start local development server on `127.0.0.1:5173`
- `npm run dev:mobile` — Start dev server exposed on your local Wi-Fi network (`--host`) for testing on physical phones (use only on trusted private networks)
- `npm test` — Run unit, security/schema, error-mapping, orchestration, component registry, and end-to-end Vitest tests
- `npm run build` — Strict TypeScript typecheck (`tsc -b`) + production Vite build
- `npm run lint` — ESLint check across the codebase

## Security & Content Integrity Controls

- **Schema-driven rendering only:** AI outputs are validated with Zod (`validateAIEnrichmentSafely`, `AIAnswerSchema`) and rendered exclusively via registered React components (`RegisteredBlockRenderer`). Unknown/malformed blocks are omitted—never injected as HTML or JSX.
- **Zero unsafe DOM sinks:** No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`.
- **Strict URL allowlisting:** External source links enforce public `https://` URLs with `rel="noopener noreferrer"`; remote imagery enforces approved open/stock hosts with clean first-party SVG fallbacks.
- **Prompt-injection isolation:** External content is stripped to plain text and enclosed in sanitized `<untrusted_source_content>` boundaries before calling Gemini.
- **Least-privilege Firestore rules:** `firestore.rules` enforces per-user `request.auth.uid == userId` isolation and default-deny on all unmatched paths.
