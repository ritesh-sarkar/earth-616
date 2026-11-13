function createAbortError() {
  const error = new Error('Thermal frame request was superseded.');
  error.name = 'AbortError';
  return error;
}

function disposeTexture(texture) {
  texture.dispose?.();
  texture.image?.close?.();
}

function waitForRetry(signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, 200);
    const handleAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', handleAbort);
      reject(createAbortError());
    };
    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

export class ThermalTextureCache {
  constructor({
    loadTexture,
    capacity = 5,
    concurrency = 2,
    preloadAhead = 2,
    preloadBehind = 1,
    maxFrameCount = 900,
    onLoadError = () => {},
  }) {
    this.loadTexture = loadTexture;
    this.capacity = Math.max(2, capacity);
    this.concurrency = concurrency;
    this.preloadAhead = preloadAhead;
    this.preloadBehind = preloadBehind;
    this.maxFrameCount = maxFrameCount;
    this.onLoadError = onLoadError;
    this.cache = new Map();
    this.pending = new Map();
    this.queue = [];
    this.activeCount = 0;
    this.accessCounter = 0;
    this.currentFrameIndex = null;
    this.displayedFrameIndex = null;
    this.wantedFrames = new Set();
    this.windowActive = false;
    this.disposed = false;
  }

  get(frameIndex) {
    const entry = this.cache.get(frameIndex);
    if (!entry) return null;

    entry.lastUsed = ++this.accessCounter;
    return entry.texture;
  }

  setDisplayedFrame(frameIndex) {
    this.displayedFrameIndex = frameIndex;
    this.evict();
  }

  activate() {
    this.disposed = false;
  }

  setWindow(frameIndex, enabled = true) {
    if (
      this.disposed
      || !enabled
      || !Number.isInteger(frameIndex)
      || frameIndex < 0
      || frameIndex >= this.maxFrameCount
    ) {
      this.currentFrameIndex = null;
      this.windowActive = false;
      this.wantedFrames.clear();
      this.cancelUnwantedRequests();
      return Promise.resolve(null);
    }

    this.currentFrameIndex = frameIndex;
    this.windowActive = true;
    this.wantedFrames = new Set(
      [
        frameIndex,
        ...Array.from({ length: this.preloadAhead }, (_, index) => frameIndex + index + 1),
        ...Array.from({ length: this.preloadBehind }, (_, index) => frameIndex - index - 1),
      ].filter((index) => index >= 0 && index < this.maxFrameCount),
    );
    this.cancelUnwantedRequests();
    const currentRequest = this.requestFrame(frameIndex, 0);

    this.wantedFrames.forEach((neighborFrame) => {
      if (neighborFrame === frameIndex) return;
      this.requestFrame(neighborFrame, 1)
        .catch(() => {
          // Prefetch is optional; an active frame request reports its own error.
        });
    });

    return currentRequest;
  }

  requestFrame(frameIndex, priority = 0) {
    if (this.disposed) return Promise.reject(createAbortError());
    if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= this.maxFrameCount) {
      return Promise.reject(new RangeError(`Thermal frame index must be between 0 and ${this.maxFrameCount - 1}.`));
    }

    const cachedTexture = this.get(frameIndex);
    if (cachedTexture) return Promise.resolve(cachedTexture);

    const existing = this.pending.get(frameIndex);
    if (existing) {
      existing.priority = Math.min(existing.priority, priority);
      this.sortQueue();
      return existing.promise;
    }

    let resolveRequest;
    let rejectRequest;
    const request = {
      frameIndex,
      priority,
      promise: new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      }),
      resolve: resolveRequest,
      reject: rejectRequest,
      settled: false,
      started: false,
      controller: null,
    };

    this.pending.set(frameIndex, request);
    this.queue.push(request);
    this.sortQueue();
    this.pump();
    return request.promise;
  }

  cancelUnwantedRequests() {
    for (const [frameIndex, request] of this.pending) {
      if (this.wantedFrames.has(frameIndex)) continue;

      this.pending.delete(frameIndex);
      if (request.started) {
        request.controller.abort();
      } else {
        this.queue = this.queue.filter((queuedRequest) => queuedRequest !== request);
        this.settle(request, 'reject', createAbortError());
      }
    }
  }

  sortQueue() {
    this.queue.sort((left, right) => left.priority - right.priority);
  }

  pump() {
    while (!this.disposed && this.activeCount < this.concurrency && this.queue.length > 0) {
      const request = this.queue.shift();
      if (this.pending.get(request.frameIndex) !== request) continue;
      if (this.windowActive && !this.wantedFrames.has(request.frameIndex)) {
        this.pending.delete(request.frameIndex);
        this.settle(request, 'reject', createAbortError());
        continue;
      }

      request.started = true;
      request.controller = new AbortController();
      this.activeCount += 1;
      this.loadRequest(request);
    }
  }

  async loadRequest(request) {
    let texture;
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          texture = await this.loadTexture(request.frameIndex, request.controller.signal);
          if (!texture) throw new Error(`NASA frame ${request.frameIndex} returned no texture.`);
          break;
        } catch (error) {
          const canRetry = error.name !== 'AbortError'
            && error.retryable !== false
            && request.priority === 0
            && attempt === 0
            && !request.controller.signal.aborted;
          if (!canRetry) throw error;
          await waitForRetry(request.controller.signal);
        }
      }

      const requestIsCurrent = this.pending.get(request.frameIndex) === request;
      const frameIsWanted = !this.windowActive || this.wantedFrames.has(request.frameIndex);
      if (this.disposed || request.controller.signal.aborted || !requestIsCurrent || !frameIsWanted) {
        disposeTexture(texture);
        texture = null;
        throw createAbortError();
      }

      this.cache.set(request.frameIndex, {
        texture,
        lastUsed: ++this.accessCounter,
      });
      this.evict();
      this.settle(request, 'resolve', texture);
    } catch (error) {
      if (request.priority === 0) {
        this.reportError(error, request.frameIndex, false);
      }
      this.settle(request, 'reject', error);
    } finally {
      if (this.pending.get(request.frameIndex) === request) {
        this.pending.delete(request.frameIndex);
      }
      this.activeCount -= 1;
      this.pump();
    }
  }

  settle(request, method, value) {
    if (request.settled) return;
    request.settled = true;
    request[method](value);
  }

  reportError(error, frameIndex, prefetch) {
    if (error.name === 'AbortError') return;
    this.onLoadError(error, frameIndex, prefetch);
  }

  evict() {
    while (this.cache.size > this.capacity) {
      let candidateIndex = null;
      let leastRecentlyUsed = Infinity;

      for (const [frameIndex, entry] of this.cache) {
        if (frameIndex === this.displayedFrameIndex || frameIndex === this.currentFrameIndex) continue;
        if (entry.lastUsed < leastRecentlyUsed) {
          candidateIndex = frameIndex;
          leastRecentlyUsed = entry.lastUsed;
        }
      }

      if (candidateIndex === null) return;
      const entry = this.cache.get(candidateIndex);
      this.cache.delete(candidateIndex);
      disposeTexture(entry.texture);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.wantedFrames.clear();

    for (const request of this.pending.values()) {
      if (request.started) {
        request.controller.abort();
      }
      this.settle(request, 'reject', createAbortError());
    }
    this.pending.clear();
    this.queue = [];

    for (const entry of this.cache.values()) {
      disposeTexture(entry.texture);
    }
    this.cache.clear();
  }
}
