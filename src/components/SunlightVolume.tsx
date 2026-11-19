import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 uResolution;
  uniform vec2 uSun;
  uniform float uIntensity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 uv = vUv;
    vec2 delta = uv - uSun;
    vec2 aspectDelta = vec2(delta.x * (uResolution.x / max(uResolution.y, 1.0)), delta.y);
    float dist = length(aspectDelta);

    // Molten white-gold core melting into fiery amber & warm peach mist
    float mist = noise(uv * vec2(4.0, 3.0));
    float tightCore = exp(-dist * 24.0) * (0.95 + uIntensity * 1.05);
    float moltenHalo = exp(-dist * 8.5) * 0.62;
    float outerScatter = exp(-dist * 3.8) * (0.85 + 0.15 * mist) * 0.24;

    vec3 pureWhite = vec3(1.0, 0.99, 0.92);
    vec3 moltenGold = vec3(1.0, 0.66, 0.18);
    vec3 deepEmber = vec3(0.96, 0.38, 0.16);

    vec3 color = mix(moltenGold, deepEmber, smoothstep(0.07, 0.34, dist));
    color = mix(color, pureWhite, clamp(tightCore * 0.88 + uIntensity * 0.25 * exp(-dist * 12.0), 0.0, 0.98));

    float totalLight = tightCore + moltenHalo + outerScatter;
    float alpha = clamp(totalLight * 0.88, 0.0, 0.94);

    gl_FragColor = vec4(color * totalLight, alpha);
  }
`;

type SunlightVolumeProps = {
  renderShaderRef: MutableRefObject<
    ((sunX: number, sunY: number, intensity: number) => void) | null
  >;
};

export default function SunlightVolume({ renderShaderRef }: SunlightVolumeProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let isVisible = true

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
    // 1x pixel ratio uses 75% less VRAM/RAM while keeping the soft glow identical
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "sunlight-volume-canvas";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uSun: { value: new THREE.Vector2(0.588, 0.505) },
        uIntensity: { value: 0.46 },
      },
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const draw = (sunX: number, sunY: number, intensity: number) => {
      if (!isVisible) return
      material.uniforms.uSun.value.set(sunX, sunY);
      material.uniforms.uIntensity.value = intensity;
      renderer.render(scene, camera);
    };

    renderShaderRef.current = draw;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width, height);
      draw(
        material.uniforms.uSun.value.x,
        material.uniforms.uSun.value.y,
        material.uniforms.uIntensity.value
      );
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible) {
        draw(
          material.uniforms.uSun.value.x,
          material.uniforms.uSun.value.y,
          material.uniforms.uIntensity.value
        )
      }
    }, { threshold: 0.01 })
    visibilityObserver.observe(host)
    resize()

    return () => {
      renderShaderRef.current = null;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [renderShaderRef]);

  return <div className="sunlight-volume" ref={hostRef} aria-hidden="true" />;
}
