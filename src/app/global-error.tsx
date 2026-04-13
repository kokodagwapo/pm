"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String(error.message || "")
      : "";

  if (!msg) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <title>SmartStartPM</title>
        </head>
        <body />
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - SmartStartPM</title>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
          background: "#f9fafb",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 12px rgba(0,0,0,.08)",
            maxWidth: "24rem",
            width: "100%",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1.25rem" }}>
            {msg || "An unexpected error occurred."}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Try Again
            </button>
            <a
              href="/auth/signin"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                background: "#4f46e5",
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.8rem",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Sign In
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
