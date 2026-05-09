export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 600 }}>
      <h1>tally-bridge</h1>
      <p>Webhook bridge between Tally.so and Claude Code sessions.</p>
      <p style={{ color: "#666", fontSize: 14 }}>
        See <code>POST /api/webhook</code> and <code>GET /api/response/[id]</code>.
      </p>
    </main>
  );
}
