// Vercel serverless entry point: wraps the existing Express app (built for a
// long-running server in artifacts/api-server) so it can run as a function.
// Express apps are already valid (req, res) => void handlers, so no adapter
// is needed — this file exists purely because Vercel's file-based routing
// requires a function under /api.
//
// Imports the esbuild-bundled output (dist/app.mjs), not the raw TS source —
// Vercel's function compiler enforces explicit-extension ESM imports that the
// rest of this codebase doesn't follow, so the pre-bundled single-file output
// (already resolved by our own esbuild config) sidesteps that entirely.
// @ts-expect-error -- built by `pnpm --filter @workspace/api-server run build` before this function is bundled
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
