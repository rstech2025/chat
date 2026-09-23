import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');

// Middleware
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Serve static assets from Vite production build
app.use(express.static(distPath));

// Health check endpoint for Cloud Run
app.get('/_health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// SPA fallback for client-side routing
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Determine port: try process.env.PORT, fallback to 3000 if in use
const initialPort = Number(process.env.PORT) || 3000;

function listen(targetPort: number) {
  const server = app.listen(targetPort, '0.0.0.0', () => {
    console.log(`Orbitto production server listening on port ${targetPort}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && targetPort !== 3000) {
      console.warn(`Port ${targetPort} is already in use (e.g. by Nginx proxy). Falling back to port 3000...`);
      listen(3000);
    } else {
      console.error(`Failed to listen on port ${targetPort}:`, err);
    }
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, closing server');
    server.close(() => process.exit(0));
  });
}

listen(initialPort);
