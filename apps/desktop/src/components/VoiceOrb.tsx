import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SEVERITY_BANDS } from '@norot/shared';
import { useScoreStore } from '@/stores/score-store';
import { useVoiceStatusStore } from '@/stores/voice-status-store';

const NOISE_GLSL = `
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

function createDotTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function VoiceOrb() {
  const severity = useScoreStore((s) => s.currentSeverity);
  const band = useMemo(() => SEVERITY_BANDS[severity], [severity]);

  type OrbShader = {
    uniforms: {
      time: { value: number };
      radius: { value: number };
      amplitude: { value: number };
      noiseStrength: { value: number };
      particleSizeMin: { value: number };
      particleSizeMax: { value: number };
      [key: string]: { value: unknown };
    };
    vertexShader: string;
  };

  const mountRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const shaderRef = useRef<OrbShader | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    camera.position.z = 3.0;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const w = container.clientWidth || 160;
    const h = container.clientHeight || 160;
    renderer.setSize(w, h);
    renderer.domElement.style.background = 'transparent';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.filter = `drop-shadow(0 0 10px ${band.color}55) drop-shadow(0 0 18px ${band.color}33)`;
    canvasRef.current = renderer.domElement;
    container.appendChild(renderer.domElement);

    // Geometry + material
    const geometry = new THREE.IcosahedronGeometry(1, 14);
    const texture = createDotTexture();

    const material = new THREE.PointsMaterial({
      map: texture,
      color: band.color,
      transparent: true,
      opacity: 0.82,
      blending: THREE.NormalBlending,
      depthTest: false,
      depthWrite: false,
      size: 2.0,
      sizeAttenuation: true,
    });

    material.onBeforeCompile = (shader) => {
      const s = shader as unknown as OrbShader;
      s.uniforms.time = { value: 0 };
      s.uniforms.radius = { value: 1.0 };
      s.uniforms.amplitude = { value: 0.0 };
      s.uniforms.noiseStrength = { value: 0.28 };
      // Keep these values small because Three.js applies size attenuation:
      // gl_PointSize *= (scale / -mvPosition.z)
      s.uniforms.particleSizeMin = { value: 0.01 };
      s.uniforms.particleSizeMax = { value: 0.08 };

      s.vertexShader = `
uniform float time;
uniform float radius;
uniform float amplitude;
uniform float noiseStrength;
uniform float particleSizeMin;
uniform float particleSizeMax;
${NOISE_GLSL}
${s.vertexShader}
`;

      s.vertexShader = s.vertexShader.replace(
        '#include <begin_vertex>',
        `
vec3 p = position;
float a = clamp(amplitude, 0.0, 1.0);

float n1 = snoise(vec3(p.x * 0.60 + time * 0.35, p.y * 0.40 + time * 0.45, p.z * 0.20 + time * 0.25));
float n2 = snoise(vec3(p.x * 1.15 - time * 0.22, p.y * 0.95 + time * 0.18, p.z * 0.85 - time * 0.14));
float n = (n1 * 0.65 + n2 * 0.35);

// Distort points, then re-project onto a sphere.
p += n * noiseStrength * (0.7 + a * 1.2);
float dynRadius = radius * (1.0 + a * 0.18);
float l = dynRadius / max(length(p), 0.0001);
p *= l;

// Point size responds to both noise and voice amplitude.
float n01 = clamp(n * 0.5 + 0.5, 0.0, 1.0);
float s = mix(particleSizeMin, particleSizeMax, n01) * (1.0 + a * 0.35);

vec3 transformed = vec3(p.x, p.y, p.z);
`
      );

      s.vertexShader = s.vertexShader.replace(
        'gl_PointSize = size;',
        'gl_PointSize = s;'
      );

      shaderRef.current = s;
    };

    material.needsUpdate = true;
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // rAF loop
    let smoothedAmplitude = 0;
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);

      const time = performance.now() * 0.001;
      const { isSpeaking, amplitude } = useVoiceStatusStore.getState();
      const target = isSpeaking ? amplitude : 0;
      smoothedAmplitude = smoothedAmplitude * 0.9 + target * 0.1;

      const shader = shaderRef.current;
      if (shader) {
        shader.uniforms.time.value = time;
        shader.uniforms.amplitude.value = smoothedAmplitude;
      }

      points.rotation.y += 0.0026;
      points.rotation.x += 0.0014;
      const scale = 1 + smoothedAmplitude * 0.15;
      points.scale.setScalar(scale);

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      const rw = container.clientWidth || 160;
      const rh = container.clientHeight || 160;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);

      scene.remove(points);

      texture.dispose();
      geometry.dispose();
      material.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer.forceContextLoss();

      materialRef.current = null;
      shaderRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color.set(band.color);
    }
    if (canvasRef.current) {
      canvasRef.current.style.filter = `drop-shadow(0 0 10px ${band.color}55) drop-shadow(0 0 18px ${band.color}33)`;
    }
  }, [band.color]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
