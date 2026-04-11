import { createRouteSoundResponseFromBody } from '../services/routeSoundServer';

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'POST',
      },
    });
  }

  const bodyText = await request.text();
  return createRouteSoundResponseFromBody(bodyText, process.env.ELEVENLABS_API_KEY ?? null);
}
