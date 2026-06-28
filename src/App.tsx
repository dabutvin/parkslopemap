import { NeighborhoodMap } from "./components/NeighborhoodMap";

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Park Slope</h1>
        <p className="app__subtitle">Brooklyn, New York</p>
      </header>
      <main className="app__map">
        <NeighborhoodMap />
      </main>
    </div>
  );
}
