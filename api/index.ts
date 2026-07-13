// Vercel serverless entry point: wraps the existing Express app (built for a
// long-running server in artifacts/api-server) so it can run as a function.
// Express apps are already valid (req, res) => void handlers, so no adapter
// is needed — this file exists purely because Vercel's file-based routing
// requires a function under /api.
import app from "../artifacts/api-server/src/app";

export default app;
