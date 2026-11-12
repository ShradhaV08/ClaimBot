# ClaimEase

ClaimEase is an employee expense-claims dashboard and AI assistant built with Next.js App Router, React, TypeScript, Tailwind CSS, Supabase, Gemini, and Zod.

## Features

- Overview and claims history backed by `GET /api/claims`
- Expense submission backed by `POST /api/claims`
- Policy checks for expense dates, employee grade/category limits, and receipt thresholds
- ClaimEase AI for employee profile, claim history, policy questions, and claim submission
- Passcode-protected pages and APIs

## Local setup

1. Use Node.js 20.9 or later and install dependencies with `npm install`.
2. Create a Supabase project for development. In its SQL editor, run `seed/ps5_expense_claims.sql`. **This script drops and recreates its ClaimEase tables**, so use only a disposable development project.
3. Copy `.env.example` to `.env.local` and set the team's passcode, Supabase URL and server-only secret key, and Gemini API key.
4. Start the app with `npm run dev`, then open `http://localhost:3000`.

The local passcode protects the demo but does not identify an employee. The application currently uses the server-side demo identity `E001`; do not treat this as production authentication.

## Routes and key files

| Path | Purpose |
| --- | --- |
| `/` | Overview, claims history, expense submission, and AI assistant |
| `/login` | Team passcode login |
| `GET /api/claims` | Current demo employee's 50 newest claims |
| `POST /api/claims` | Validates and submits an expense claim |
| `POST /api/agent` | Gemini assistant with visible tool activity |
| `/api/health` | Reports which required environment settings are present |

`lib/agent/tools.ts` contains the assistant's `getEmployee`, `listClaims`, `getPolicyRules`, and `submitClaim` tools. `lib/claim-policy.ts` contains the policy decisions shared by the claims API and the assistant.

## Verification

Run `npm run typecheck` and `npm run build`.

## Demo and production limitations

- The employee identity is fixed to `E001` until real employee authentication is implemented.
- Receipt handling records whether a receipt exists; it does not upload or store a receipt file.
- Claim submission requires explicit confirmation in the assistant conversation, guided by its system instructions.
- Use a dedicated demo database and rotate demo credentials before any production deployment.
