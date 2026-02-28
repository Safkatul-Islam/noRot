import { jsx as _jsx } from "react/jsx-runtime";
/**
 * VoiceOrb — the visual personification of noRot's AI coach.
 * Three.js point-cloud sphere. Responds to audio amplitude, cursor proximity, severity.
 * Used in the todo overlay bottom bar and inline (daily setup AI interaction).
 */
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
function createDotTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
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
export function VoiceOrb({ paused = false, detail = 14, interactive = true }) {
    const severity = useScoreStore((s) => s.currentSeverity);
    const band = useMemo(() => SEVERITY_BANDS[severity], [severity]);
    const mountRef = useRef(null);
    const materialRef = useRef(null);
    const shaderRef = useRef(null);
    const canvasRef = useRef(null);
    const pausedRef = useRef(paused);
    const interactiveRef = useRef(interactive);
    // Shared refs so the mount-only effect and the detail effect can talk to each other
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const pointsRef = useRef(null);
    const textureRef = useRef(null);
    const cursorResetRef = useRef(false);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        interactiveRef.current = interactive;
    }, [interactive]);
    // ── Effect 1: mount-only — scene, camera, renderer, animation loop, resize ──
    // Runs once when the component mounts. The canvas stays alive until unmount,
    // so toggling the sidebar never destroys/recreates the WebGL context.
    useEffect(() => {
        const container = mountRef.current;
        if (!container)
            return;
        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        // Camera
        const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
        camera.position.z = 3.0;
        cameraRef.current = camera;
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
        // Start invisible — flip to visible after first render frame (prevents white flash)
        renderer.domElement.style.opacity = '0';
        renderer.domElement.style.transition = 'opacity 0.05s ease';
        canvasRef.current = renderer.domElement;
        rendererRef.current = renderer;
        container.appendChild(renderer.domElement);
        // Create dot texture once — reused across detail changes
        const texture = createDotTexture();
        textureRef.current = texture;
        // rAF loop
        let smoothedAmplitude = 0;
        let rafId = 0;
        let firstFrame = true;
        // Cursor pull state (plain JS — no React re-renders)
        const mouseNdc = new THREE.Vector2(0, 0);
        let cursorActiveTarget = 0;
        let smoothedCursorActive = 0;
        const cursorTarget = new THREE.Vector3(0, 0, 1);
        const smoothedCursorPos = new THREE.Vector3(0, 0, 1);
        const _invMatrix = new THREE.Matrix4();
        const _raycaster = new THREE.Raycaster();
        const _hitPoint = new THREE.Vector3();
        const _raySphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.0);
        let lastDebugLog = 0;
        const animate = () => {
            rafId = requestAnimationFrame(animate);
            if (pausedRef.current)
                return;
            if (cursorResetRef.current) {
                cursorResetRef.current = false;
                smoothedCursorActive = 0;
                cursorActiveTarget = 0;
            }
            const time = performance.now() * 0.001;
            const { isSpeaking, amplitude, analyserGetter } = useVoiceStatusStore.getState();
            let target = 0;
            if (isSpeaking) {
                // Try reading the AnalyserNode directly for 60fps amplitude (main window only).
                let liveAmplitude = 0;
                const analyser = analyserGetter?.();
                if (analyser) {
                    const buf = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(buf);
                    let sum = 0;
                    for (let i = 0; i < buf.length; i++)
                        sum += buf[i];
                    liveAmplitude = sum / (buf.length * 255);
                }
                if (liveAmplitude > 0.001) {
                    target = Math.min(1, liveAmplitude * 2.2);
                }
                else if (amplitude > 0.001) {
                    target = Math.min(1, amplitude * 2.2);
                }
                else {
                    const { lastWordBoundaryAt } = useVoiceStatusStore.getState();
                    const msSinceBoundary = Date.now() - lastWordBoundaryAt;
                    if (lastWordBoundaryAt > 0 && msSinceBoundary < 1000) {
                        const pulse = Math.exp(-(msSinceBoundary / 1000) * 5);
                        target = 0.15 + 0.35 * pulse;
                    }
                    else {
                        const syllable = Math.sin(time * 4.1 + time * 0.07) * 0.5 + 0.5;
                        const word = Math.sin(time * 1.7 + 2.3) * 0.5 + 0.5;
                        const breath = Math.sin(time * 0.4 + 5.1) * 0.5 + 0.5;
                        target = 0.18 + 0.24 * syllable * (0.6 + 0.4 * word) + 0.08 * breath;
                    }
                }
            }
            smoothedAmplitude = smoothedAmplitude * 0.9 + target * 0.1;
            const shader = shaderRef.current;
            if (shader) {
                shader.uniforms.time.value = time;
                shader.uniforms.amplitude.value = smoothedAmplitude;
            }
            const pts = pointsRef.current;
            if (pts) {
                // Keep transforms up to date BEFORE doing cursor math.
                pts.rotation.y += 0.0026;
                pts.rotation.x += 0.0014;
                const scale = 1 + smoothedAmplitude * 0.15;
                pts.scale.setScalar(scale);
                pts.updateMatrixWorld(true);
            }
            // ── Cursor detection + direction ──
            if (interactiveRef.current && cursorActiveTarget > 0 && pts) {
                // Match shader radius: geometry is projected to dynRadius, then the whole Points is scaled.
                const a = smoothedAmplitude;
                const dynRadius = 1.0 + a * 0.18;
                const worldRadius = pts.scale.x * dynRadius;
                // Compute the sphere silhouette radius in NDC so detection matches what you see.
                const camDist = camera.position.distanceTo(_raySphere.center);
                const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
                const denom = Math.sqrt(Math.max(0.0001, camDist * camDist - worldRadius * worldRadius));
                const sphereNdcRadius = (worldRadius / denom) / tanHalfFov;
                const detectionRadius = sphereNdcRadius * 3.0;
                const ndcDist = mouseNdc.length();
                if (ndcDist < detectionRadius) {
                    const t = 1.0 - (ndcDist / detectionRadius);
                    cursorActiveTarget = t;
                    _raySphere.radius = worldRadius;
                    _raycaster.setFromCamera(mouseNdc, camera);
                    // Prefer true surface intersection; fall back to the closest approach direction.
                    const hit = _raycaster.ray.intersectSphere(_raySphere, _hitPoint);
                    _invMatrix.copy(pts.matrixWorld).invert();
                    if (hit) {
                        _hitPoint.applyMatrix4(_invMatrix);
                        _hitPoint.normalize();
                        cursorTarget.copy(_hitPoint);
                    }
                    else {
                        _raycaster.ray.closestPointToPoint(_raySphere.center, _hitPoint);
                        _hitPoint.applyMatrix4(_invMatrix);
                        _hitPoint.normalize();
                        cursorTarget.copy(_hitPoint);
                    }
                }
                else {
                    cursorActiveTarget = 0;
                }
            }
            // Asymmetric: snappy ramp-up, slow relaxation (feels physical)
            const cursorAlpha = cursorActiveTarget > smoothedCursorActive ? 0.25 : 0.10;
            smoothedCursorActive += (cursorActiveTarget - smoothedCursorActive) * cursorAlpha;
            if (smoothedCursorActive < 0.005)
                smoothedCursorActive = 0;
            smoothedCursorPos.lerp(cursorTarget, 0.18);
            smoothedCursorPos.normalize();
            // Debug: throttled log every 500ms when cursor is near the orb
            if (smoothedCursorActive > 0.05 && time - lastDebugLog > 0.5) {
                lastDebugLog = time;
                console.log('[VoiceOrb] cursor:', {
                    target: cursorActiveTarget.toFixed(3),
                    smoothed: smoothedCursorActive.toFixed(3),
                    ndcDist: mouseNdc.length().toFixed(3),
                    shaderConnected: !!shader,
                });
            }
            if (shader) {
                shader.uniforms.cursorPos.value = smoothedCursorPos;
                shader.uniforms.cursorActive.value = smoothedCursorActive;
            }
            renderer.render(scene, camera);
            // Fade canvas in after the first real frame so no white flash is visible
            if (firstFrame) {
                firstFrame = false;
                renderer.domElement.style.opacity = '1';
            }
        };
        animate();
        const onResize = () => {
            const rw = container.clientWidth || 160;
            const rh = container.clientHeight || 160;
            camera.aspect = rw / rh;
            camera.updateProjectionMatrix();
            renderer.setSize(rw, rh);
        };
        const resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(container);
        const onMouseMove = (e) => {
            if (!interactiveRef.current)
                return;
            const rect = renderer.domElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                return;
            const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            if (Math.abs(ndcX) < 3 && Math.abs(ndcY) < 3) {
                mouseNdc.set(ndcX, ndcY);
                cursorActiveTarget = 1;
            }
            else {
                cursorActiveTarget = 0;
            }
        };
        const onMouseLeave = () => { cursorActiveTarget = 0; };
        document.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseleave', onMouseLeave);
        return () => {
            resizeObserver.disconnect();
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseleave', onMouseLeave);
            cancelAnimationFrame(rafId);
            // Clean up any remaining points
            const pts = pointsRef.current;
            if (pts) {
                scene.remove(pts);
                pts.geometry.dispose();
                pts.material.dispose();
                pointsRef.current = null;
            }
            texture.dispose();
            textureRef.current = null;
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer.dispose();
            renderer.forceContextLoss();
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            materialRef.current = null;
            shaderRef.current = null;
            canvasRef.current = null;
        };
    }, []);
    // ── Effect 2: detail-dependent — geometry & material swap ──
    // When `detail` changes (sidebar toggle), this only rebuilds the geometry and
    // material inside the existing scene. The canvas/renderer stay alive — no flash.
    useEffect(() => {
        const scene = sceneRef.current;
        const texture = textureRef.current;
        if (!scene || !texture)
            return;
        // Remove the old points mesh if one exists
        const oldPoints = pointsRef.current;
        if (oldPoints) {
            scene.remove(oldPoints);
            oldPoints.geometry.dispose();
            oldPoints.material.dispose();
            materialRef.current = null;
            shaderRef.current = null;
        }
        cursorResetRef.current = true;
        // Build new geometry + material at the requested detail level
        const geometry = new THREE.IcosahedronGeometry(1, detail);
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
            const s = shader;
            s.uniforms.time = { value: 0 };
            s.uniforms.radius = { value: 1.0 };
            s.uniforms.amplitude = { value: 0.0 };
            s.uniforms.noiseStrength = { value: 0.28 };
            // Keep these values small because Three.js applies size attenuation:
            // gl_PointSize *= (scale / -mvPosition.z)
            s.uniforms.particleSizeMin = { value: 0.01 };
            s.uniforms.particleSizeMax = { value: 0.08 };
            s.uniforms.cursorPos = { value: new THREE.Vector3(0, 0, 1) };
            s.uniforms.cursorActive = { value: 0.0 };
            s.vertexShader = `
uniform float time;
uniform float radius;
uniform float amplitude;
uniform float noiseStrength;
uniform float particleSizeMin;
uniform float particleSizeMax;
uniform vec3 cursorPos;
uniform float cursorActive;
${NOISE_GLSL}
${s.vertexShader}
`;
            s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `
vec3 p = position;
float a = clamp(amplitude, 0.0, 1.0);

float n1 = snoise(vec3(p.x * 0.60 + time * 0.35, p.y * 0.40 + time * 0.45, p.z * 0.20 + time * 0.25));
float n2 = snoise(vec3(p.x * 1.15 - time * 0.22, p.y * 0.95 + time * 0.18, p.z * 0.85 - time * 0.14));
float n = (n1 * 0.65 + n2 * 0.35);

// Distort points, then re-project onto a sphere.
p += n * noiseStrength * (0.7 + a * 1.2);
float dynRadius = radius * (1.0 + a * 0.18);
float len = max(length(p), 0.0001);
p *= dynRadius / len;

// ── Cursor bulge (Gaussian radial displacement) ──
vec3 sphereNormal = normalize(p);
float distToCursor = distance(sphereNormal, cursorPos);

// Gaussian falloff — sigma=0.40 gives a ~55° arc bump
float sigma = 0.65;
float gaussian = exp(-(distToCursor * distToCursor) / (2.0 * sigma * sigma));

// Push particles outward — inverted voice coupling: strongest when silent
float bulgeHeight = 0.55;
p += sphereNormal * gaussian * bulgeHeight * cursorActive * (1.0 - a * 0.15);

// Point size — base from noise/amplitude, 30% bonus at bump apex
float n01 = clamp(n * 0.5 + 0.5, 0.0, 1.0);
float s = mix(particleSizeMin, particleSizeMax, n01) * (1.0 + a * 0.35);
s *= (1.0 + gaussian * cursorActive * 0.3);

vec3 transformed = vec3(p.x, p.y, p.z);
`);
            s.vertexShader = s.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = s;');
            shaderRef.current = s;
        };
        material.needsUpdate = true;
        materialRef.current = material;
        const points = new THREE.Points(geometry, material);
        scene.add(points);
        pointsRef.current = points;
        // Update glow filter for the current detail level
        if (canvasRef.current) {
            const glowA = detail < 14 ? 4 : 10;
            const glowB = detail < 14 ? 8 : 18;
            canvasRef.current.style.filter = `drop-shadow(0 0 ${glowA}px ${band.color}55) drop-shadow(0 0 ${glowB}px ${band.color}33)`;
        }
        return () => {
            scene.remove(points);
            geometry.dispose();
            material.dispose();
            pointsRef.current = null;
            materialRef.current = null;
            shaderRef.current = null;
        };
    }, [detail]);
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.color.set(band.color);
        }
        if (canvasRef.current) {
            const glowA = detail < 14 ? 4 : 10;
            const glowB = detail < 14 ? 8 : 18;
            canvasRef.current.style.filter = `drop-shadow(0 0 ${glowA}px ${band.color}55) drop-shadow(0 0 ${glowB}px ${band.color}33)`;
        }
    }, [band.color, detail]);
    return _jsx("div", { ref: mountRef, style: { width: '100%', height: '100%' } });
}
