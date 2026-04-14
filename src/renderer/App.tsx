export default function App() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">TASK-001</p>
        <h1>Yulora</h1>
        <p className="description">
          Electron shell, preload bridge, and React renderer are wired up. No editor features
          are enabled yet.
        </p>
        <p className="meta">Preload bridge status: {window.yulora.platform}</p>
      </section>
    </main>
  );
}
