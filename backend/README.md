# Agentic support backend

Customer-support service for a Supabase store. The requirements are in `docs/SRS.md`. This directory is the foundation milestone. Later milestones extend the run steps below.

## Setup

1. Install Node.js 22.12 or newer, and stay below 23.
2. Copy `.env.example` to `.env` and fill in the values. `.env` stays on this machine.
3. From this directory, install dependencies:

```
npm ci
```

## Checks

```
npm run typecheck
npm run lint
npm test
```

`npm test` runs unit tests only. It does not need a network connection or Docker. `npm run test:integration` is for the local Supabase stack. `npm run test:live` calls NACE and runs only when `NACE_LIVE=1`.

## Run

`npm run dev` starts the HTTP server once `src/server.ts` is in place. `npm run build` compiles `src/` and `npm start` runs the result.

Database checks need Docker and the Supabase CLI:

```
npx supabase start
npx supabase db reset
npm run doctor
```

Until those scripts are implemented, `npm run doctor`, `npm run db:grants`, and `npm run db:set-role-password` exit with "not implemented yet".
