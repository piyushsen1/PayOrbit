# client/

Next.js (App Router) + TypeScript + Tailwind. See root `CLAUDE.md` for non-negotiable
rules, roles table, and error-code/auth conventions shared with `server/`.

## Folder placement

- `src/app/` — routes (App Router). One folder per route segment, `page.tsx` inside.
  Mark interactive pages `'use client'` at the top (see `app/login/page.tsx`).
- `src/components/ui/` — generic primitives (Button, Input, Card, Table, ...). Each is
  its own file, re-exported from `components/ui/index.ts`. Check
  `.claude/registry/COMPONENTS.md` before adding a new one — most needs are a variant
  of an existing primitive, not a new file.
- `src/components/layout/` — page chrome (`Container`, `Header`). Not reusable UI, just
  structure.
- `src/components/charts/` — `ChartWrapper` + `chartTheme`/`CHART_COLORS`, wraps
  Recharts with token-driven styling. Use these, don't hand-roll chart colors.
- `src/hooks/` — cross-page state, e.g. `useAuth` (context + hook in one file).
- `src/lib/` — framework-agnostic helpers: `api.ts` (axios client + token storage),
  `errorMessages.ts` (error-code → copy), `utils.ts` (`cn()` for class merging).
- `src/styles/` — `tokens.css` (CSS custom properties: colors, spacing — swap values
  once real brand arrives, don't hardcode colors in components) and `animations.ts`
  (framer-motion variants, if/when used).

## Component pattern

- Named exports, no default exports, for anything in `components/ui`.
- Props: `variant`/`size` unions where relevant (see `Button.tsx`), always accept and
  forward `className` merged via `cn(...)` so callers can override.
- Style with Tailwind utility classes referencing the tokens in `tokens.css` (e.g.
  `text-text`, `bg-surface`, `border-border`) — not raw hex/rgb values.
- New primitive → add the file, export it from `components/ui/index.ts`, add one line
  to `.claude/registry/COMPONENTS.md`.

## Page pattern

- Wrap page content in `<Container>` for consistent max-width/padding.
- Client-side data fetching goes through `api` from `lib/api.ts` (already attaches the
  JWT and redirects to `/login` on 401 — don't build a second axios instance).
- Form validation with `zod` schemas defined at the top of the page file (see
  `login/page.tsx`'s `credentialsSchema`) — validate client-side before the request,
  surface server validation errors via `getErrorMessage(code, message)`.
- Auth-gated pages read `user`/`isLoading` from `useAuth()`; don't re-implement token
  checks per page.

## Naming

- Components/files: `PascalCase.tsx` (matches the exported component name).
- Hooks: `useX.tsx` (camelCase, `use` prefix).
- Non-component modules (`lib/`, `styles/`): `camelCase.ts`.

## Auth pattern

`AuthProvider` (in `hooks/useAuth.tsx`) wraps the app in `app/layout.tsx`. It calls
`/auth/me` on mount if a token is stored, exposes `user`, `isLoading`, `login`,
`signup`, `logout`. Role-based UI (nav items, buttons) should branch on `user.role` —
once the 5-role model lands (see root `CLAUDE.md` known gap), gate accordingly rather
than just checking "is logged in."
