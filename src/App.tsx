import { useCallback, useEffect, useRef, useState } from "react";
import { NeighborhoodMap } from "./components/NeighborhoodMap";

export default function App() {
  const mapRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void mapRef.current?.requestFullscreen();
    }
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Park Slope</h1>
        <p className="app__subtitle">Brooklyn, New York</p>
      </header>
      <main className="app__map" ref={mapRef}>
        <button
          type="button"
          className="app__fullscreen"
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
        >
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
        <NeighborhoodMap />
      </main>
    </div>
  );
}
