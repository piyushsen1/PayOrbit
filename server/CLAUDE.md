# server/

Express + TypeScript + TypeORM (Postgres) API. Auth: JWT (no refresh token,
short-lived access token only). Validation: Zod. Docs: Swagger UI at
`/api-docs`, generated from JSDoc comments above each route.

## Adding a new entity/module

This is the fast path for standing up a new resource. `users/` (spread across
`entities/User.ts`, `services/auth.service.ts`, `controllers/auth.controller.ts`,
`routes/auth.routes.ts`) is the reference module — copy its shape rather than
inventing a new one.

1. **Add the entity** in `src/entities/<Name>.ts` (TypeORM decorators, same
   style as `User.ts`).
2. **Generate a migration**: with the DB running and `.env` pointing at it,
   run `npm run migration:generate -- src/migrations/<DescriptiveName>`.
   TypeORM diffs your entities against the live schema and writes the file —
   never hand-write or hand-edit a migration after it's generated; if it's
   wrong, add a new migration on top instead of editing an applied one.
3. **Apply it**: `npm run migration:run`.
4. **Copy the `users` module**: duplicate the entity's service/controller/route
   trio, rename `User` → `<Name>` throughout, and adjust the Zod schemas in
   the route file to match the new entity's fields.
5. **Wire the route** into `src/routes/index.ts` (`router.use('/<name>s', ...)`).
6. **Add guards as needed**:
   - `authGuard` — require a logged-in user.
   - `roleGuard(UserRole.ADMIN, ...)` — restrict to specific roles.
   - `canAccessOwnRecord(getOwnerId)` — owner-or-elevated-role access; don't
     reimplement this per controller, it's generic (see
     `src/middleware/canAccessOwnRecord.ts` for the resolver signature and an
     example).
7. **Add Swagger JSDoc** above each route (see `auth.routes.ts` for the
   pattern) — it's picked up automatically, nothing else to wire.
8. **Seed data**: extend `src/seed.ts` using the new entity's repository,
   same pattern as the `User` seeding — go through TypeORM, not raw SQL.
9. **Verify manually**: no automated test suite — hit the new routes via
   Swagger UI (`/api-docs`) or a REST client against a real migrated DB.
10. **Update the registry**: add the new routes to
    `.claude/registry/API_ENDPOINTS.md` and the new table to
    `.claude/registry/DB_SCHEMA.md`, in the same commit — check them first so
    you don't duplicate an existing route/table.

## Naming conventions

- Files: `<name>.entity.ts` is just `entities/<Name>.ts`; elsewhere it's
  `<name>.service.ts`, `<name>.controller.ts`, `<name>.routes.ts` (see `auth.*`).
- Entities: PascalCase class/file name, singular (`Contract`, not `Contracts`).
  Routes: plural, lowercase, kebab-case for multi-word (`/pay-runs`).
- DB columns: `snake_case` via `@Column({ name: '...' })`, entity properties stay
  `camelCase` — same split as `User.passwordHash` → `password_hash`.

## Roles

See root `CLAUDE.md` for the 5-role model (Employee, HR Manager, HR Payroll
User, HR Payroll Manager, Admin) and the known gap: `UserRole` here still only
has `user`/`admin`. Every new module's route guards should be written against
the 5-role table from the start, even before the enum is expanded — don't gate
new payroll/HR routes on `admin` as a stand-in.

## Notes

- `synchronize` is always `false` in `config/data-source.ts`. Schema changes
  only ever happen via migrations — never rely on auto-sync, even in dev.
- `JWT_SECRET` has no fallback; the server throws at startup if it's unset
  (`config/env.ts`). Don't add a default — that's the point.
- Error responses are always `{ error: { code, message } }`
  (`middleware/errorHandler.ts`); success responses are always `{ data }`
  (`middleware/responseFormatter.ts`, via `res.success(...)`). Postgres
  unique-violations (`23505`) are translated to `DUPLICATE_RESOURCE`, not
  leaked as raw driver errors.
- Error codes come from `@app/shared` (via `src/utils/error-codes.ts`) so
  server and client can never drift out of sync — add new codes there, not
  locally.
