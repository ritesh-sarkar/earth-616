import { describe, expect, it, vi } from 'vitest';
import { ThermalTextureCache } from './thermalTextureCache';

function createTexture() {
  return { dispose: vi.fn() };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('ThermalTextureCache', () => {
  it('coalesces requests and reuses a cached texture', async () => {
    const response = deferred();
    const loadTexture = vi.fn(() => response.promise);
    const cache = new ThermalTextureCache({
      loadTexture,
      preloadAhead: 0,
      preloadBehind: 0,
    });

    const firstRequest = cache.requestFrame(12);
    const duplicateRequest = cache.requestFrame(12);
    const texture = createTexture();
    response.resolve(texture);

    await expect(firstRequest).resolves.toBe(texture);
    await expect(duplicateRequest).resolves.toBe(texture);
    await expect(cache.requestFrame(12)).resolves.toBe(texture);
    expect(loadTexture).toHaveBeenCalledTimes(1);

    cache.dispose();
    expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  it('retries one transient failure but does not retry a missing frame', async () => {
    const transientError = Object.assign(new Error('Temporary upstream failure.'), {
      retryable: true,
    });
    const permanentError = Object.assign(new Error('Frame does not exist.'), {
      retryable: false,
    });
    const texture = createTexture();
    const onLoadError = vi.fn();
    const loadTexture = vi.fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce(texture)
      .mockRejectedValueOnce(permanentError);
    const cache = new ThermalTextureCache({
      loadTexture,
      preloadAhead: 0,
      preloadBehind: 0,
      onLoadError,
    });

    await expect(cache.requestFrame(20)).resolves.toBe(texture);
    await expect(cache.requestFrame(21)).rejects.toBe(permanentError);
    expect(loadTexture).toHaveBeenCalledTimes(3);
    expect(onLoadError).toHaveBeenCalledTimes(1);
    expect(onLoadError).toHaveBeenCalledWith(permanentError, 21, false);

    cache.dispose();
    expect(texture.dispose).toHaveBeenCalledTimes(1);
  });

  it('does not retry or report an optional prefetch failure', async () => {
    const texture = createTexture();
    const prefetchError = Object.assign(new Error('Prefetch timed out.'), {
      retryable: true,
    });
    const loadTexture = vi.fn((frameIndex) => (
      frameIndex === 30 ? Promise.resolve(texture) : Promise.reject(prefetchError)
    ));
    const onLoadError = vi.fn();
    const cache = new ThermalTextureCache({
      loadTexture,
      preloadAhead: 1,
      preloadBehind: 0,
      onLoadError,
    });

    await expect(cache.setWindow(30)).resolves.toBe(texture);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadTexture).toHaveBeenCalledTimes(2);
    expect(onLoadError).not.toHaveBeenCalled();

    cache.dispose();
  });

  it('aborts obsolete frames and disposes textures that finish after supersession', async () => {
    const responses = new Map();
    const loadTexture = vi.fn((frameIndex, signal) => {
      const response = deferred();
      responses.set(frameIndex, { ...response, signal });
      return response.promise;
    });
    const cache = new ThermalTextureCache({
      loadTexture,
      concurrency: 1,
      preloadAhead: 0,
      preloadBehind: 0,
    });

    const obsoleteRequest = cache.setWindow(100);
    const obsoleteResult = obsoleteRequest.catch((error) => error);
    const latestRequest = cache.setWindow(150);
    const obsoleteTexture = createTexture();
    responses.get(100).resolve(obsoleteTexture);
    await Promise.resolve();
    await Promise.resolve();

    expect(responses.get(100).signal.aborted).toBe(true);
    expect(obsoleteTexture.dispose).toHaveBeenCalledTimes(1);
    expect(loadTexture).toHaveBeenLastCalledWith(150, expect.any(AbortSignal));

    const latestTexture = createTexture();
    responses.get(150).resolve(latestTexture);
    await expect(latestRequest).resolves.toBe(latestTexture);
    expect((await obsoleteResult).name).toBe('AbortError');
    expect(cache.get(150)).toBe(latestTexture);

    cache.dispose();
    expect(latestTexture.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the displayed frame and evicts least-recently-used textures within its bound', async () => {
    const loadTexture = vi.fn(async () => createTexture());
    const cache = new ThermalTextureCache({
      loadTexture,
      capacity: 2,
      preloadAhead: 0,
      preloadBehind: 0,
    });
    const first = await cache.requestFrame(1);
    const second = await cache.requestFrame(2);
    cache.setDisplayedFrame(1);
    cache.get(1);
    await cache.requestFrame(3);

    expect(cache.cache.size).toBe(2);
    expect(cache.get(1)).toBe(first);
    expect(cache.get(2)).toBeNull();
    expect(second.dispose).toHaveBeenCalledTimes(1);

    cache.dispose();
    expect(first.dispose).toHaveBeenCalledTimes(1);
  });

  it('limits concurrent requests to the configured preload window', async () => {
    let activeRequests = 0;
    let highestConcurrency = 0;
    const loadTexture = vi.fn(async () => {
      activeRequests += 1;
      highestConcurrency = Math.max(highestConcurrency, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return createTexture();
    });
    const cache = new ThermalTextureCache({
      loadTexture,
      concurrency: 2,
      preloadAhead: 2,
      preloadBehind: 1,
    });

    await cache.setWindow(40);
    await Promise.resolve();
    await Promise.resolve();

    expect(highestConcurrency).toBeLessThanOrEqual(2);
    expect(loadTexture.mock.calls.length).toBeLessThanOrEqual(4);
    cache.dispose();
  });
});
