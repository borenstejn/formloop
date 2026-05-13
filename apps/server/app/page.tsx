export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 640 }}>
      <h1>formloop</h1>
      <p>
        A thin layer between an LLM agent and a human in the loop. Generates
        Typeform-quality forms on the fly to ask structured questions, then
        resumes execution when the form is submitted.
      </p>
      <p style={{ color: "#666", fontSize: 14 }}>
        Endpoints: <code>POST /api/forms</code>,{" "}
        <code>GET /forms/[id]</code>, <code>POST /api/forms/[id]/submit</code>,{" "}
        <code>GET /api/forms/[id]/submissions</code>,{" "}
        <code>GET /api/forms/[id]/export.csv</code>,{" "}
        <code>GET /api/response/[id]</code>.
      </p>
    </main>
  );
}
