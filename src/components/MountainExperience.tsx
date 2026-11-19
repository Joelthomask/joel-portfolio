import { useEffect, useRef } from "react";
import "./MountainExperience.css";
import DeferredSunlightVolume from "./DeferredSunlightVolume";

/* HOME PARALLAX CALIBRATION
   Change these values to tune the scene:
   - skyDepth / distantDepth / middleDepth / frontDepth: mouse travel in pixels
   - response: how quickly layers catch up (0.10 smooth, 0.18 balanced, 0.25 quick)
   - verticalFactor: reduce vertical movement relative to horizontal
   - overscan: slight zoom that prevents image edges showing during movement
*/
const PARALLAX_TUNING = {
  skyDepth: 3,
  distantDepth: 15,
  middleDepth: 30,
  frontDepth: 44,
  response: 0.20,
  verticalFactor: 0.35,
  overscan: 1.06,
} as const;

/* Sun placement follows the mountain artwork's cover fit and responsive hero bounds. */
const REF_ASPECT = 16 / 9;
const SUN_FROM_BOTTOM = 0.47; // sun height above the bottom edge on a 16:9 screen (unscaled), fraction of height
function sunAnchor(w: number, h: number) {
  const aspect = w / h;
  if (aspect >= REF_ASPECT) {
    // width-bound: image scales with width, bottom-anchored
    const d = SUN_FROM_BOTTOM * (w / REF_ASPECT);
    return { x: 0.5, y: (1.16 * d - 0.08 * h) / h, xScale: 1 };
  }
  // height-bound: image scales with height, cropped left/right around the centre
  return { x: 0.5, y: 1.16 * SUN_FROM_BOTTOM - 0.08, xScale: REF_ASPECT / aspect };
}

export default function MountainExperience() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const renderShaderRef = useRef<
    ((sunX: number, sunY: number, intensity: number) => void) | null
  >(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const layers = Array.from(
      scene.querySelectorAll<HTMLElement>(".scene-layer")
    );
    const depths = layers.map((layer) => Number(layer.dataset.depth || 1));
    const sunCore = scene.querySelector<HTMLElement>(".sunlight-source");
    const valleyWash = scene.querySelector<HTMLElement>(".valley-light-wash");

    // Mobile and touch-first devices use the static composition: no pointer parallax.
    const mobileOrTouch = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
    if (mobileOrTouch) {
      // Keep the original static sun placement; do not register mouse listeners or animate layers.
      return;
    }

    let raf = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;

    let width = scene.clientWidth || window.innerWidth;
    let height = scene.clientHeight || window.innerHeight;
    let rect = scene.getBoundingClientRect();

    const updateBounds = () => {
      rect = scene.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      applySun(false);
      requestRender();
    };

    const onMouseMove = (event: MouseEvent) => {
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        targetX = 0;
        targetY = 0;
        return;
      }

      targetX = ((event.clientX - rect.left) / width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / height - 0.5) * 2;
      requestRender();
    };

    const onMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      requestRender();
    };

    let frameActive = false;

    const requestRender = () => {
      if (frameActive) return;
      frameActive = true;
      scene.classList.add("is-moving");
      raf = window.requestAnimationFrame(render);
    };

    const applySun = (moveDom = true) => {
      // Neutral pointer position starts at low sunlight (~0.12); moving right
      // progressively reveals the stronger golden peak lighting.
      const sunAmount = Math.min(1, Math.max(0, (x + 0.14) / 1.14));
      const skyParallaxDx = (x * 14) / width;
      const skyParallaxDy = (y * 14 * 0.35) / height;

      const anchor = sunAnchor(width, height);
      const sunX = anchor.x + (0.62 - 0.5 - sunAmount * 0.015 + skyParallaxDx) * anchor.xScale;
      const sunY = anchor.y - skyParallaxDy;

      if (moveDom && sunCore) {
        sunCore.style.setProperty(
          "transform",
          `translate3d(${sunX * width}px, ${(1 - sunY) * height}px, 0) translate(-50%, -50%)`,
          "important"
        );
      }

      if (moveDom && valleyWash) {
        valleyWash.style.setProperty(
          "transform",
          `translate3d(${(skyParallaxDx - sunAmount * 0.036) * width}px, ${skyParallaxDy * height}px, 0)`,
          "important"
        );
        valleyWash.style.opacity = `${0.08 + sunAmount * 0.50}`;
      }

      renderShaderRef.current?.(sunX, sunY, sunAmount);
    };

    const render = () => {
      const diffX = targetX - x;
      const diffY = targetY - y;
      const moving = Math.abs(diffX) > 0.0001 || Math.abs(diffY) > 0.0001;

      if (moving) {
        x += diffX * PARALLAX_TUNING.response;
        y += diffY * PARALLAX_TUNING.response;

        for (let i = 0; i < layers.length; i++) {
          const depth = depths[i];
          layers[i].style.setProperty(
            "transform",
            `translate3d(${x * depth}px, ${y * depth * PARALLAX_TUNING.verticalFactor}px, 0) scale(${PARALLAX_TUNING.overscan})`,
            "important"
          );
        }

        applySun();
      }

      if (Math.abs(targetX - x) > 0.0001 || Math.abs(targetY - y) > 0.0001) {
        raf = window.requestAnimationFrame(render);
      } else {
        frameActive = false;
        scene.classList.remove("is-moving");
      }
    };

    // Place the sun immediately (otherwise it stays off-screen until the first mouse move).
    applySun(false);
    window.addEventListener("resize", updateBounds, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.cancelAnimationFrame(raf);
      layers.forEach((layer) => layer.style.removeProperty("transform"));
    };
  }, []);

  return (
    <div className="mountain-scene" ref={sceneRef}>
      <img
        src="/assets/sky.webp"
        className="scene-layer sky"
        data-depth={PARALLAX_TUNING.skyDepth}
        alt=""
        decoding="async"
        draggable="false"
      />

      <div className="sunlight-behind" aria-hidden="true">
        <div className="sunlight-source" />
      </div>
      <DeferredSunlightVolume renderShaderRef={renderShaderRef} />

      <img
        src="/assets/Mountain4.webp"
        className="scene-layer mountain-back"
        data-depth={PARALLAX_TUNING.distantDepth}
        alt=""
        decoding="async"
        draggable="false"
      />
      <img
        src="/assets/Mountain3.webp"
        className="scene-layer mountain-mid"
        data-depth={PARALLAX_TUNING.middleDepth}
        alt=""
        decoding="async"
        draggable="false"
      />

      <div className="valley-light-wash" aria-hidden="true" />

      <img
        src="/assets/Mountain2.webp"
        className="scene-layer mountain-front"
        data-depth={PARALLAX_TUNING.frontDepth}
        alt=""
        decoding="async"
        draggable="false"
      />
    </div>
  );
}
