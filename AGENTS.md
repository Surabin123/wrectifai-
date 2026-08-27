# Wrectifai Project Rules (AGENTS.md)

Guidelines for AI Coding Assistants working on this codebase.

## Tech Stack & Architecture
- **Backend API**: Node.js v22 (CommonJS bundled via Nx & esbuild), Express, and PostgreSQL.
- **Database Access**: Use raw SQL queries with the `query` helper exported from [database.ts](file:///c:/Users/vishn/PROJECT/wrectifai/apps/api/src/config/database.ts). Do not introduce ORMs (Drizzle/Prisma) unless explicitly requested.
- **Route Versioning**: Mount all routes under the `/api/v1` prefix in [routes/index.ts](file:///c:/Users/vishn/PROJECT/wrectifai/apps/api/src/routes/index.ts) (with `/api` fallback mapped to the same router).

## API & Response Conventions
- **Success Responses**: Always return responses using the standard success envelope helper:
  `success(res, data, statusCode, meta?)` -> `{ data, meta? }`
- **Error Responses**: Wrap exceptions using the standard error envelope helper:
  `error(res, message, errorCode, statusCode, details?)` -> `{ error: { code, message, details? } }`
- **Authentication**: Standardize endpoint authorization using the `authenticate` middleware in [auth.ts](file:///c:/Users/vishn/PROJECT/wrectifai/apps/api/src/middleware/auth.ts).
- **Strict RBAC**: Guard restricted endpoints with `requireRole(['user', 'garage', 'vendor', 'admin'])`. Map roles via the `user_roles` database junction table rather than inferring them from profiles.

## Permanent Development Rules for Data-Flow Trace
1. **Trace First**: Before making ANY change to fix a UI or data issue, trace the complete flow first:
   `DATABASE → DATABASE RELATIONSHIPS → BACKEND QUERY → API ENDPOINT → API RESPONSE → FRONTEND API CALL → FRONTEND FIELD MAPPING → UI RENDERING`
2. **Never Assume Endpoints/Fields**: Verify which endpoint the screen is calling and whether it is role-specific. Compare actual backend responses with frontend TypeScript interfaces.
3. **No Fallback Masking**: Do not use `N/A`, `₹0`, empty arrays, or fake values to mask missing database data. Find out why the data is missing.
4. **Data Isolation**: Keep Customer, Garage, and Admin data flows separated. Do not use customer endpoints for admin screens.
5. **Hide Only, Keep Internal IDs**: If requested to hide IDs from the UI, do so only in the visual rendering. Keep them in state, routing, database operations, and API payloads.
6. **E2E Verification**: Always verify fixes using real persisted database records in addition to successful TS builds. Verify the entire flow from DB to rendered UI.
7. **Surgical Scope**: Modify ONLY the requested functionality. Do not refactor or redesign unrelated elements.

