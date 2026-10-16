import { createApp } from './app';
import { parsePort } from './parsePort';

const PORT = parsePort(process.env.PORT);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Theme Marketplace Integration listening on port ${PORT}`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
