export default function WatchNotFound() {
  return (
    <main className="generate-shell">
      <div className="generate-card">
        <h1>Run not found</h1>
        <p className="tagline">
          That share link has expired or never existed. Start a new run from the
          home page.
        </p>
        <a className="primary-button" href="/" style={{ textDecoration: "none" }}>
          Back to generate
        </a>
      </div>
    </main>
  );
}
