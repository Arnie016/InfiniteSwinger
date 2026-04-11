type RouteSoundPayload = {
  text?: string;
  durationSeconds?: number;
  promptInfluence?: number;
  modelId?: string;
  outputFormat?: string;
};

const DEFAULT_MODEL_ID = 'eleven_text_to_sound_v2';
const DEFAULT_OUTPUT_FORMAT = 'mp3_22050_32';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const coerceNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const buildErrorResponse = (status: number, message: string, detail?: string) =>
  new Response(
    JSON.stringify({
      error: message,
      detail,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'x-route-sound-status': String(status),
      },
    },
  );

const parsePayload = (bodyText: string): RouteSoundPayload | null => {
  try {
    return JSON.parse(bodyText || '{}') as RouteSoundPayload;
  } catch {
    return null;
  }
};

export async function createRouteSoundResponseFromBody(
  bodyText: string,
  apiKey?: string | null,
): Promise<Response> {
  if (!apiKey) {
    return buildErrorResponse(503, 'Missing ElevenLabs API key', 'Set ELEVENLABS_API_KEY to enable route sounds.');
  }

  const payload = parsePayload(bodyText);
  if (!payload) {
    return buildErrorResponse(400, 'Invalid request body', 'Expected JSON payload for route sound generation.');
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (text.length < 6) {
    return buildErrorResponse(400, 'Missing sound prompt', 'Provide a short description for the sound effect.');
  }

  const durationSeconds = clamp(coerceNumber(payload.durationSeconds, 0.86), 0.5, 3);
  const promptInfluence = clamp(coerceNumber(payload.promptInfluence, 0.38), 0, 1);
  const modelId = typeof payload.modelId === 'string' && payload.modelId.trim().length > 0 ? payload.modelId.trim() : DEFAULT_MODEL_ID;
  const outputFormat =
    typeof payload.outputFormat === 'string' && payload.outputFormat.trim().length > 0
      ? payload.outputFormat.trim()
      : DEFAULT_OUTPUT_FORMAT;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/sound-generation?output_format=${encodeURIComponent(outputFormat)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        loop: false,
        duration_seconds: durationSeconds,
        prompt_influence: promptInfluence,
        model_id: modelId,
      }),
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return buildErrorResponse(upstream.status || 502, 'ElevenLabs generation failed', detail.slice(0, 500));
  }

  const headers = new Headers(upstream.headers);
  headers.set('Content-Type', headers.get('Content-Type') || 'audio/mpeg');
  headers.set('Cache-Control', 'no-store');
  headers.delete('content-encoding');
  headers.delete('content-length');
  headers.delete('transfer-encoding');
  headers.delete('connection');

  const audioBuffer = await upstream.arrayBuffer();
  return new Response(audioBuffer, {
    status: upstream.status,
    headers,
  });
}
