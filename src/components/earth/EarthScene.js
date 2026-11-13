'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { ThermalTextureCache } from '@/src/lib/thermalTextureCache';

const SUN_DIRECTION = new THREE.Vector3(4, 2, 5).normalize();
const EARTH_NORMAL_SCALE = new THREE.Vector2(0.14, 0.14);

const NIGHT_LIGHTS_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const NIGHT_LIGHTS_FRAGMENT_SHADER = `
  uniform sampler2D uNightMap;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec3 nightTexture = texture2D(uNightMap, vUv).rgb;
    float brightness = max(max(nightTexture.r, nightTexture.g), nightTexture.b);
    float cityLights = smoothstep(0.08, 0.24, brightness);
    float daylight = dot(normalize(vWorldNormal), normalize(uSunDirection));
    float nightSide = 1.0 - smoothstep(-0.05, 0.2, daylight);
    float alpha = cityLights * nightSide * 0.88;

    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vec3(1.0, 0.76, 0.48), alpha);
    #include <colorspace_fragment>
  }
`;

const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uSunDirection;
  uniform vec3 uDayColor;
  uniform vec3 uNightColor;
  uniform float uIntensity;
  uniform float uPulse;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float limb = 1.0 - abs(dot(normal, viewDirection));
    float sunFacing = max(dot(normal, normalize(uSunDirection)), 0.0);
    float scattering = pow(smoothstep(0.42, 0.99, limb), 2.0)
      * (0.28 + 0.72 * sunFacing);
    float outerBand = exp(-pow((limb - 0.87) / 0.02, 2.0)) * 0.2;
    float middleBand = exp(-pow((limb - 0.77) / 0.025, 2.0)) * 0.16;
    float innerBand = exp(-pow((limb - 0.68) / 0.025, 2.0)) * 0.11;
    vec3 color = mix(uNightColor, uDayColor, smoothstep(0.05, 0.75, sunFacing));
    float alpha = (scattering * 0.4 + outerBand + middleBand + innerBand)
      * uIntensity * uPulse;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.48));
    #include <colorspace_fragment>
  }
`;

function configureTexture(texture, colorSpace) {
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
}

class EarthTextureLoader extends THREE.TextureLoader {
  load(url, onLoad, onProgress, onError) {
    return super.load(url, (texture) => {
      configureTexture(texture, THREE.SRGBColorSpace);
      onLoad?.(texture);
    }, onProgress, onError);
  }
}

class EarthDataTextureLoader extends THREE.TextureLoader {
  load(url, onLoad, onProgress, onError) {
    return super.load(url, (texture) => {
      configureTexture(texture, THREE.NoColorSpace);
      onLoad?.(texture);
    }, onProgress, onError);
  }
}

function createRequestError(message, { name = 'Error', retryable = true } = {}) {
  const error = new Error(message);
  error.name = name;
  error.retryable = retryable;
  return error;
}

function loadHTMLImage(blob, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createRequestError('Thermal image loading was aborted.', { name: 'AbortError' }));
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      signal.removeEventListener('abort', handleAbort);
      image.onload = null;
      image.onerror = null;
    };
    const handleAbort = () => {
      image.src = '';
      cleanup();
      reject(createRequestError('Thermal image loading was aborted.', { name: 'AbortError' }));
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(createRequestError('NASA thermal image could not be decoded.'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    image.src = objectUrl;
  });
}

async function loadThermalTexture(frameIndex, signal, maxAnisotropy) {
  const response = await fetch(`/api/thermal-frame/${frameIndex}`, {
    signal,
    cache: 'force-cache',
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw createRequestError(`NASA thermal frame ${frameIndex} returned HTTP ${response.status}.`, {
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  const blob = await response.blob();
  const image = typeof createImageBitmap === 'function'
    ? await createImageBitmap(blob, {
      imageOrientation: 'flipY',
      premultiplyAlpha: 'none',
    })
    : await loadHTMLImage(blob, signal);
  if (signal.aborted) {
    image.close?.();
    throw createRequestError('Thermal frame loading was superseded.', { name: 'AbortError' });
  }

  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function Earth({
  activeGlow,
  autoRotate,
  viewMode,
  frameIndex,
  frameDate,
  framePosition,
  onFrameStatusChange,
}) {
  const earthRef = useRef(null);
  const cloudsRef = useRef(null);
  const thermalMaterialRef = useRef(null);
  const atmosphereMaterialRef = useRef(null);
  const requestIdRef = useRef(0);
  const latestRequestRef = useRef({ viewMode, frameIndex });
  const [displayedThermal, setDisplayedThermal] = useState(null);
  const { gl } = useThree();
  const surfaceMap = useLoader(EarthTextureLoader, '/earth/earth-atmos-2048.jpg');
  const cloudMap = useLoader(EarthTextureLoader, '/earth/earth-clouds-1024.png');
  const normalMap = useLoader(EarthDataTextureLoader, '/earth/earth-normal-2048.jpg');
  const specularMap = useLoader(EarthDataTextureLoader, '/earth/earth-specular-2048.jpg');
  const nightLightsMap = useLoader(EarthTextureLoader, '/earth/earth-lights-2048.png');
  const atmosphereUniforms = useMemo(() => ({
    uSunDirection: { value: SUN_DIRECTION },
    uDayColor: { value: new THREE.Color('#b4e1ff') },
    uNightColor: { value: new THREE.Color('#5f99d1') },
    uIntensity: { value: 1 },
    uPulse: { value: 1 },
  }), []);
  const nightLightsUniforms = useMemo(() => ({
    uNightMap: { value: nightLightsMap },
    uSunDirection: { value: SUN_DIRECTION },
  }), [nightLightsMap]);
  const [textureCache] = useState(() => new ThermalTextureCache({
    loadTexture: (index, signal) => loadThermalTexture(
      index,
      signal,
      gl.capabilities.getMaxAnisotropy(),
    ),
    capacity: 6,
    concurrency: 2,
    preloadAhead: 2,
    preloadBehind: 1,
    onLoadError: (error, index, prefetch) => {
      console.warn(`NASA thermal ${prefetch ? 'prefetch' : 'frame'} ${index} failed:`, error);
    },
  }));

  useLayoutEffect(() => {
    latestRequestRef.current = { viewMode, frameIndex };
  }, [frameIndex, viewMode]);

  useLayoutEffect(() => {
    const material = thermalMaterialRef.current;
    if (!material) return;

    const texture = displayedThermal?.texture ?? null;
    if (material.map === texture) return;

    material.map = texture;
    material.color.set(texture ? '#ffffff' : '#20384f');
    material.needsUpdate = true;
  }, [displayedThermal]);

  useEffect(() => {
    textureCache.activate();
    return () => textureCache.dispose();
  }, [textureCache]);

  useEffect(() => {
    if (viewMode !== 'thermal' || frameIndex === null) {
      textureCache.setWindow(null, false);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    onFrameStatusChange?.({
      frameIndex,
      status: 'loading',
      message: '',
    });
    textureCache.setWindow(frameIndex, true).then((texture) => {
      const requestIsCurrent = requestIdRef.current === requestId
        && latestRequestRef.current.viewMode === 'thermal'
        && latestRequestRef.current.frameIndex === frameIndex;
      if (!requestIsCurrent) return;

      setDisplayedThermal({ frameIndex, texture });
      onFrameStatusChange?.({
        frameIndex,
        status: 'ready',
        message: '',
      });
    }).catch((error) => {
      const requestIsCurrent = requestIdRef.current === requestId
        && latestRequestRef.current.viewMode === 'thermal'
        && latestRequestRef.current.frameIndex === frameIndex;
      if (!requestIsCurrent || error.name === 'AbortError') return;

      onFrameStatusChange?.({
        frameIndex,
        status: 'error',
        message: `NASA map for ${frameDate} could not be loaded. The last available thermal frame is retained.`,
      });
    });

    return () => {
      if (requestIdRef.current === requestId) requestIdRef.current += 1;
    };
  }, [frameDate, frameIndex, onFrameStatusChange, textureCache, viewMode]);

  useEffect(() => {
    if (displayedThermal) {
      textureCache.setDisplayedFrame(displayedThermal.frameIndex);
    }
  }, [displayedThermal, textureCache]);

  useFrame((state, delta) => {
    if (earthRef.current && autoRotate) {
      earthRef.current.rotation.y += delta * 0.028;
    }
    if (cloudsRef.current && autoRotate) {
      cloudsRef.current.rotation.y += delta * 0.01;
    }

    const atmosphereMaterial = atmosphereMaterialRef.current;
    if (atmosphereMaterial) {
      atmosphereMaterial.uniforms.uIntensity.value = 0.92 + THREE.MathUtils.clamp(activeGlow, 0, 1) * 0.08;
      atmosphereMaterial.uniforms.uPulse.value = 0.985 + Math.sin(state.clock.elapsedTime * 0.3) * 0.015;
    }
  });

  return (
    <group ref={earthRef}>
      <mesh visible={viewMode === 'satellite'}>
        <sphereGeometry args={[1.62, 96, 96]} />
        <meshPhongMaterial
          map={surfaceMap}
          normalMap={normalMap}
          normalScale={EARTH_NORMAL_SCALE}
          specularMap={specularMap}
          specular="#203d52"
          shininess={10}
          emissive="#0b1520"
          emissiveIntensity={0.08 + activeGlow * 0.06}
        />
      </mesh>
      <mesh visible={viewMode === 'thermal'}>
        <sphereGeometry args={[1.623, 96, 96]} />
        <meshBasicMaterial
          ref={thermalMaterialRef}
          color="#20384f"
          toneMapped={false}
        />
      </mesh>
      <mesh visible={viewMode === 'satellite'}>
        <sphereGeometry args={[1.622, 96, 96]} />
        <shaderMaterial
          uniforms={nightLightsUniforms}
          vertexShader={NIGHT_LIGHTS_VERTEX_SHADER}
          fragmentShader={NIGHT_LIGHTS_FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.648, 96, 96]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent
          opacity={viewMode === 'thermal' ? 0.12 : 0.34}
          alphaTest={0.02}
          depthWrite={false}
          roughness={1}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.73, 64, 64]} />
        <shaderMaterial
          ref={atmosphereMaterialRef}
          uniforms={atmosphereUniforms}
          vertexShader={ATMOSPHERE_VERTEX_SHADER}
          fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function CameraDistance({ distance, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.setLength(distance);
    controlsRef.current?.update();
  }, [camera, controlsRef, distance]);

  return null;
}

export default function EarthScene({
  activeGlow = 0.5,
  playing = false,
  autoRotate = true,
  distance = 5.4,
  viewMode = 'satellite',
  frameIndex = null,
  frameDate = '',
  framePosition = '',
  frameIsNearest = false,
  selectedDate = '',
  onDistanceChange,
}) {
  const controlsRef = useRef(null);
  const [frameStatus, setFrameStatus] = useState(null);
  const handleFrameStatusChange = useCallback((status) => setFrameStatus(status), []);
  const selectedFrameStatus = frameStatus?.frameIndex === frameIndex ? frameStatus : null;
  const frameError = selectedFrameStatus?.status === 'error' ? selectedFrameStatus.message : '';
  const frameLoading = frameIndex !== null && selectedFrameStatus?.status !== 'ready'
    && selectedFrameStatus?.status !== 'error';

  return (
    <div className="earth-stage" aria-label="Interactive contextual Earth globe">
      <div className="earth-scene">
        <Canvas
          camera={{ position: [0, 0.1, 5.4], fov: 40 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
          fallback={<div className="earth-fallback">3D Earth needs WebGL; use the timeline and charts below.</div>}
        >
          <color attach="background" args={['#07111d']} />
          <Stars radius={52} depth={22} count={900} factor={1.8} saturation={0} fade speed={0.12} />
          <hemisphereLight args={['#b9d8f6', '#03070d', 0.16]} />
          <ambientLight intensity={0.33} />
          <directionalLight position={[4, 2, 5]} intensity={2.4} color="#fff4e2" />
          <Suspense fallback={null}>
            <Earth
              activeGlow={activeGlow}
              autoRotate={autoRotate}
              viewMode={viewMode}
              frameIndex={frameIndex}
              frameDate={frameDate}
              framePosition={framePosition}
              onFrameStatusChange={handleFrameStatusChange}
            />
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={3.7}
            maxDistance={7.8}
          />
          <CameraDistance distance={distance} controlsRef={controlsRef} />
        </Canvas>
      </div>
      <div className="earth-overlay">
        <div className="earth-caption">
          <span className="eyebrow">{viewMode === 'thermal' ? 'NASA TEMPERATURE ANOMALY' : 'SATELLITE VIEW'}</span>
          <span>
            {viewMode === 'thermal'
              ? frameIndex === null
                ? 'NASA anomaly map unavailable; the last thermal frame is retained.'
                : frameError || (frameLoading
                  ? `Loading NASA map for ${frameDate.slice(0, 4)}…`
                  : frameIsNearest
                    ? `NASA map · ${frameDate.slice(0, 4)} (nearest available; selected ${selectedDate})`
                    : `NASA map · ${frameDate.slice(0, 4)} frame ${framePosition} · approximate month position`)
              : 'Contextual satellite texture · not a date-matched observation'}
          </span>
        </div>
        <div className="earth-tools" aria-label="Earth view controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => onDistanceChange?.(Math.min(7.5, distance + 0.45))}
          >
            −
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => onDistanceChange?.(Math.max(3.9, distance - 0.45))}
          >
            +
          </button>
          <button
            type="button"
            className={`icon-button ${autoRotate ? 'is-selected' : ''}`}
            aria-label={autoRotate ? 'Pause Earth rotation' : 'Resume Earth rotation'}
            title={autoRotate ? 'Pause rotation' : 'Resume rotation'}
            onClick={() => onDistanceChange?.('toggle-rotation')}
          >
            {autoRotate ? 'Ⅱ' : '↻'}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Reset Earth view"
            title="Reset view"
            onClick={() => {
              controlsRef.current?.reset();
              onDistanceChange?.('reset');
            }}
          >
            ↺
          </button>
        </div>
      </div>
      <div className="earth-live-indicator">
        <span className={playing ? 'live-dot is-live' : 'live-dot'} />
        {playing ? 'SONIFICATION ACTIVE' : viewMode === 'thermal' ? 'GEOGRAPHIC ANOMALY MAP' : 'EARTH CONTEXT'}
      </div>
    </div>
  );
}
