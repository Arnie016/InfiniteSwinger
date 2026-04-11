import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRouteSoundResponseFromBody } from './services/routeSoundServer';

const readRequestBody = (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', reject);
  });

const writeWebResponse = async (response: Response, res: ServerResponse) => {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
};

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'route-sound-dev-endpoint',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url?.startsWith('/api/route-sound')) {
              next();
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Allow', 'POST');
              res.end('Method Not Allowed');
              return;
            }

            try {
              const bodyText = await readRequestBody(req);
              const response = await createRouteSoundResponseFromBody(
                bodyText,
                process.env.ELEVENLABS_API_KEY ?? null,
              );
              await writeWebResponse(response, res);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unknown route sound error';
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Route sound dev endpoint failed', detail: message }));
            }
          });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Infinite Swinger',
          short_name: 'Swinger',
          description: 'Arcade jungle swing runner with persistent progression.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
