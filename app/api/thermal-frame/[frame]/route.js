import sharp from 'sharp';

const NASA_FRAME_BASE_URL = 'https://svs.gsfc.nasa.gov/vis/a000000/a005400/a005450/frames/4096x2048_2x1_30p/';

export async function GET(request, { params }) {
  const { frame } = await params;
  if (!/^\d{1,3}$/.test(frame)) {
    return Response.json({ error: 'NASA frame index must be between 0 and 899.' }, { status: 400 });
  }

  const frameIndex = Number(frame);
  if (frameIndex < 0 || frameIndex >= 900) {
    return Response.json({ error: 'NASA frame index must be between 0 and 899.' }, { status: 400 });
  }

  const filename = `2024GISTEMP_SOS${String(frameIndex).padStart(3, '0')}.png`;
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  const timeout = setTimeout(() => controller.abort(), 20000);
  request.signal.addEventListener('abort', abortRequest, { once: true });

  try {
    const upstream = await fetch(`${NASA_FRAME_BASE_URL}${filename}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!upstream.ok) {
      console.error(`NASA thermal frame request failed with status ${upstream.status}: ${filename}`);
      const status = upstream.status === 404 ? 404 : upstream.status === 429 ? 429 : 502;
      return Response.json({ error: 'NASA thermal map is temporarily unavailable.' }, { status });
    }

    const source = Buffer.from(await upstream.arrayBuffer());
    const image = await sharp(source)
      .resize({ width: 3072, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    return new Response(new Uint8Array(image), {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/webp',
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    console.error(`NASA thermal frame could not be loaded or optimized: ${filename}`, error);
    return Response.json({ error: 'NASA thermal map is temporarily unavailable.' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abortRequest);
  }
}
