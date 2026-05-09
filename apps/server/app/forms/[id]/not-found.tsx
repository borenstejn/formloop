export default function FormNotFound() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 32,
        textAlign: "center",
        gap: 16,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>
        Form not found
      </h1>
      <p style={{ color: "#6b7280", maxWidth: 480 }}>
        Ce formulaire a expiré ou n&apos;existe plus. Demande à Claude d&apos;en
        générer un nouveau.
      </p>
    </main>
  );
}
