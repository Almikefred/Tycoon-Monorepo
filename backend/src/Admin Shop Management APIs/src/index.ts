import app from './app';

/**
 * Parse and validate the PORT environment variable.
 *
 * Returns a valid TCP port number in the range 1..65535. Throws a
 * descriptive error when the value is missing, non-numeric, or out of range
 * so the process fails fast instead of crashing later at bind time.
 */
export function parsePort(rawPort: string | undefined): number {
  const port = Number.parseInt(rawPort ?? '', 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT value: ${JSON.stringify(rawPort)}. Expected an integer between 1 and 65535.`,
    );
  }

  return port;
}

const PORT = parsePort(process.env.PORT);

const server = app.listen(PORT, () => {
  console.log(`Admin Shop Management APIs listening on port ${PORT}`);
});

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
