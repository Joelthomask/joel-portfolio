import { lazy, Suspense, useEffect, useState, type MutableRefObject } from "react";

const SunlightVolume = lazy(() => import("./SunlightVolume"));

type Props = {
  renderShaderRef: MutableRefObject<
    ((sunX: number, sunY: number, intensity: number) => void) | null
  >;
};

export default function DeferredSunlightVolume({ renderShaderRef }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Touch-first / narrow screens keep the CSS sun glow and skip the WebGL shader.
    const mobileQuery = window.matchMedia("(max-width: 700px), (pointer: coarse)");
    const update = () => setReady(!mobileQuery.matches);
    update();
    mobileQuery.addEventListener("change", update);
    return () => mobileQuery.removeEventListener("change", update);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <SunlightVolume renderShaderRef={renderShaderRef} />
    </Suspense>
  );
}
