// Single source of truth lives in packages/shared (see packages/shared/src/error-codes.ts).
// This file exists so server code imports from a stable local path, but the
// values themselves must never drift from @app/shared.
export * from '@app/shared';
