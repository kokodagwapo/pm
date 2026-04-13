"use client";

interface GlobalErrorProps {
  error?: Error & { digest?: string };
  reset?: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const hasMessage =
    error instanceof Error
      ? Boolean(error.message)
      : error != null &&
        typeof error === "object" &&
        Object.keys(error as object).length > 0;

  if (!hasMessage) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>SmartStartPM</title>
        </head>
        <body />
      </html>
    );
  }

  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";

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
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
          background: "#f9fafb",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem",
          color: "#1f2937",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,.08)",
            maxWidth: "28rem",
            width: "100%",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
            {msg || "An unexpected error occurred."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => {
                try {
                  reset?.();
                } catch {
                  window.location.href = "/";
                }
              }}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.375rem",
                background: "#4f46e5",
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
