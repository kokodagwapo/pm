"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (!error?.message) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "#f9fafb" }}>
      <div style={{ maxWidth: "28rem", width: "100%", background: "#fff", borderRadius: "0.75rem", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "0.5rem" }}>Something Went Wrong</h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>{error.message}</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onClick={() => reset()} style={{ padding: "0.5rem 1.25rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}>
            Try Again
          </button>
          <a href="/" style={{ padding: "0.5rem 1.25rem", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "0.5rem", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
