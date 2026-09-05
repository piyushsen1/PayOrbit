# PayOrbit

An integrated HR & Payroll platform. Employee is the central record; Contracts and
Working Schedules give it payroll context; Attendance and Time Off capture day-to-day
activity; Salary Structures/Rules define computation; Payruns turn eligible employees
into validated, printable/emailable Payslips. A Payroll Dashboard aggregates all of it.

Solo dev, working across up to 3 concurrent Claude Code chats: one in `client/`
(frontend), one in `server/` (backend), one for review/fixing. There's no orchestrator
dispatching work — each chat IS the right context, so read the `CLAUDE.md` for the area
you're in, not this whole repo.

## Non-negotiable rules

Check these before every Write/Bash action, not just once at session start:

- Never write, edit, or commit any `.env*` file (`.env`, `.env.local`, etc.) — only
  `.env.example` files are tracked. Never print real secret values into chat either.
- Never run `DROP DATABASE`, `DROP TABLE`, or `TRUNCATE` against any database.
- Never `rm -rf` (or equivalent bulk delete) on `client/src` or `server/src`.
- Never connect to, or run migrations/seeds against, anything with "prod" in a DB
  flag, host, or connection string.
- Migrations are generated, never hand-written or hand-edited after generation (see
  `server/CLAUDE.md`). If one is wrong, add a new migration on top.

## Workspace layout

npm workspaces: `client/` (Next.js), `server/` (Express API), `packages/shared`
(cross-cutting types/constants — currently just `ErrorCodes`). Root `package.json`
scripts (`dev:client`, `dev:server`, `build`, `test`) run per-workspace.

## Where to look before touching code

- `server/CLAUDE.md` — backend conventions, entity/module recipe, migration workflow.
- `client/CLAUDE.md` — frontend conventions, component/page pattern.
- `.claude/registry/*.md` — terse, tracked, Claude-facing indexes (API endpoints, DB
  schema, components). Check the relevant one before adding a route/table/component;
  update it in the same change. This is what stops the same thing being built twice
  across chats — cheaper than re-reading the repo.
- `docs/*.md` — gitignored, human-facing prep notes (project overview, user flows,
  screens, features, architecture, plain-English API/DB docs, dev guide, tracking log).
  Not build-blocking, not consulted to decide what to build — update as a report after
  something ships, not before.

## Roles & permissions

Five roles, each a strict superset in the HR→Payroll direction except Employee, which
is self-service only. Every route/controller/UI gate must be checked against this table
— it's the source of truth for `roleGuard`/`canAccessOwnRecord` usage and for which
nav items/actions render per role.

- **Employee** — view own employee details, attendance records, and leave balances;
  create own attendance entries and Time Off requests. No payroll or HR admin access.
- **HR Manager** — full CRUD on Employees, Attendance, Contracts, Working Schedules,
  Time Off (incl. approve/refuse requests). No payroll access.
- **HR Payroll User** — everything HR Manager has, plus create/read/update on Payruns
  and Payslips. Read-only on Salary Structures and Salary Rules.
- **HR Payroll Manager** — everything HR Payroll User has, plus full CRUD on Payruns,
  Payslips, Salary Structures, and Salary Rules. Full control over HR/payroll records
  and configuration.
- **Admin** — full access to every module and model. User management, role
  assignment, permission updates, system administration. Users must never be able to
  assign or elevate their own role.

**Resolved**: `UserRole` now has all five values (`employee`, `hr_manager`,
`hr_payroll_user`, `hr_payroll_manager`, `admin`) — migration
`ExpandUserRoles1788595954472`, applied. Signup/seed default to `employee`.
`roleGuard`/`canAccessOwnRecord` call sites are unchanged (still generic, take
`UserRole[]`) — new modules should call them with the roles from the table above.

## Cross-cutting conventions

- **Error codes** live in `packages/shared/src/error-codes.ts` — the single source of
  truth for both sides. Server sets `{ error: { code, message } }`; client maps codes to
  copy in `client/src/lib/errorMessages.ts`. Add a new code there first, then handle it
  on both ends.
- **Auth**: JWT, 15-minute access token, no refresh token. Role lives in the token
  (`{ sub, role }`). `authGuard` requires a valid token; `roleGuard(...)` restricts to
  specific roles; `canAccessOwnRecord(...)` is owner-or-elevated-role — reuse it, don't
  reimplement per module. In this product, "owner" mostly means "the Employee record
  linked to this user account," not the User row itself.
- **No automated test suite** (Jest was removed — not in use for this project). Verify
  manually: backend via Swagger UI (`/api-docs`) or a REST client, frontend by running
  the dev server and clicking through the flow.

## Team/session workflow

- Atomic commits: one logical change per commit (`feat: add contract entity`, `fix:
  payslip net total rounding`), not bundled dumps.
- Whoever finishes a piece updates the matching `.claude/registry/*.md` file in the
  same commit. Update the matching `docs/*.md` file too when convenient — not
  build-blocking, but don't let it drift far or the project becomes hard to explain.
- Keep responses terse: state what changed, don't narrate the process.
