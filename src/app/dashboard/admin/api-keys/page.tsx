"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Key, Eye, EyeOff, Save, CheckCircle2, XCircle, Loader2,
  CreditCard, Bot, MessageSquare, Map, Mail, RefreshCw,
} from "lucide-react";
import { UserRole } from "@/types";

interface FieldState {
  value: string;
  editing: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  showValue: boolean;
}

interface ServiceConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    sensitive: boolean;
    type?: "text" | "number" | "toggle";
    hint?: string;
  }[];
  docUrl?: string;
}

const SERVICES: ServiceConfig[] = [
  {
    label: "Stripe",
    icon: <CreditCard className="h-5 w-5" />,
    color: "from-violet-500 to-purple-600",
    docUrl: "https://dashboard.stripe.com/apikeys",
    fields: [
      { key: "secretKey", label: "Secret Key", placeholder: "sk_live_...", sensitive: true, hint: "Server-side key. Never expose to users." },
      { key: "publishableKey", label: "Publishable Key", placeholder: "pk_live_...", sensitive: false, hint: "Safe to use in client-side code." },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", sensitive: true, hint: "From Stripe Dashboard → Webhooks → Signing secret." },
    ],
  },
  {
    label: "OpenAI",
    icon: <Bot className="h-5 w-5" />,
    color: "from-emerald-500 to-teal-600",
    docUrl: "https://platform.openai.com/api-keys",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "sk-...", sensitive: true },
      { key: "model", label: "Default Model", placeholder: "gpt-4o", sensitive: false, hint: "e.g. gpt-4o, gpt-4-turbo, gpt-3.5-turbo" },
    ],
  },
  {
    label: "Twilio SMS",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "from-rose-500 to-red-600",
    docUrl: "https://console.twilio.com",
    fields: [
      { key: "accountSid", label: "Account SID", placeholder: "AC...", sensitive: true },
      { key: "authToken", label: "Auth Token", placeholder: "••••••••", sensitive: true },
      { key: "fromNumber", label: "From Number", placeholder: "+1 (239) 555-0000", sensitive: false, hint: "Twilio phone number in E.164 format." },
    ],
  },
  {
    label: "Google Maps",
    icon: <Map className="h-5 w-5" />,
    color: "from-amber-500 to-orange-600",
    docUrl: "https://console.cloud.google.com/apis/credentials",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "AIza...", sensitive: true, hint: "Enable Maps JavaScript API and Geocoding API." },
    ],
  },
  {
    label: "Email (SMTP)",
    icon: <Mail className="h-5 w-5" />,
    color: "from-sky-500 to-blue-600",
    fields: [
      { key: "smtpHost", label: "SMTP Host", placeholder: "smtp.gmail.com", sensitive: false },
      { key: "smtpPort", label: "SMTP Port", placeholder: "587", sensitive: false, type: "number" },
      { key: "smtpUser", label: "Username / Email", placeholder: "you@example.com", sensitive: false },
      { key: "smtpPassword", label: "Password / App Password", placeholder: "••••••••", sensitive: true },
      { key: "fromEmail", label: "From Email", placeholder: "noreply@smartstart.us", sensitive: false },
      { key: "fromName", label: "From Name", placeholder: "SmartStartPM", sensitive: false },
    ],
  },
];

const SERVICE_KEY_MAP: Record<string, string> = {
  "Stripe": "stripe",
  "OpenAI": "openai",
  "Twilio SMS": "twilio",
  "Google Maps": "googleMaps",
  "Email (SMTP)": "email",
};

function initField(): FieldState {
  return { value: "", editing: false, saving: false, saved: false, error: "", showValue: false };
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Record<string, Record<string, FieldState>>>({});
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) router.push("/dashboard");
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      const json = await res.json();
      if (json.success) {
        setRawData(json.data);
        const init: Record<string, Record<string, FieldState>> = {};
        for (const svc of SERVICES) {
          const svcKey = SERVICE_KEY_MAP[svc.label];
          init[svcKey] = {};
          for (const f of svc.fields) {
            init[svcKey][f.key] = initField();
          }
        }
        setFields(init);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (svcKey: string, fieldKey: string, patch: Partial<FieldState>) => {
    setFields((prev) => ({
      ...prev,
      [svcKey]: { ...prev[svcKey], [fieldKey]: { ...prev[svcKey][fieldKey], ...patch } },
    }));
  };

  const saveField = async (svcKey: string, fieldKey: string) => {
    const f = fields[svcKey]?.[fieldKey];
    if (!f || !f.value.trim()) return;
    setField(svcKey, fieldKey, { saving: true, error: "" });
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: svcKey, field: fieldKey, value: f.value.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setField(svcKey, fieldKey, { saving: false, saved: true, editing: false, value: "" });
        setTimeout(() => setField(svcKey, fieldKey, { saved: false }), 3000);
        fetchData();
      } else {
        setField(svcKey, fieldKey, { saving: false, error: json.error ?? "Save failed" });
      }
    } catch {
      setField(svcKey, fieldKey, { saving: false, error: "Network error" });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (session?.user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Key className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">API Keys & Integrations</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage third-party service credentials. Keys are stored securely in the database.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <strong>Note:</strong> These keys override environment variables at runtime. Environment variables in Replit Secrets are used as fallback if a field here is empty.
      </div>

      {SERVICES.map((svc) => {
        const svcKey = SERVICE_KEY_MAP[svc.label];
        const svcData = rawData?.[svcKey] ?? {};

        return (
          <div key={svc.label} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className={`flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${svc.color} text-white`}>
              {svc.icon}
              <span className="font-semibold">{svc.label}</span>
              {svc.docUrl && (
                <a
                  href={svc.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-white/80 hover:text-white underline underline-offset-2"
                >
                  Get keys →
                </a>
              )}
            </div>

            <div className="divide-y divide-border">
              {svc.fields.map((field) => {
                const fState = fields[svcKey]?.[field.key] ?? initField();
                const raw = svcData[field.key];
                const isConfigured = raw?.configured ?? (raw?.value !== undefined && raw?.value !== "");
                const displayVal = raw?.masked ?? raw?.value ?? "";

                return (
                  <div key={field.key} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{field.label}</span>
                          {isConfigured ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Configured
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <XCircle className="h-3 w-3" /> Not set
                            </span>
                          )}
                        </div>
                        {field.hint && (
                          <p className="text-xs text-muted-foreground mb-2">{field.hint}</p>
                        )}
                        {isConfigured && !fState.editing && (
                          <code className="text-xs text-muted-foreground font-mono">
                            {displayVal || "—"}
                          </code>
                        )}
                      </div>
                      {!fState.editing && (
                        <button
                          onClick={() => setField(svcKey, field.key, { editing: true, value: "", error: "" })}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
                        >
                          {isConfigured ? "Update" : "Set"}
                        </button>
                      )}
                    </div>

                    {fState.editing && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={field.sensitive && !fState.showValue ? "password" : "text"}
                              value={fState.value}
                              onChange={(e) => setField(svcKey, field.key, { value: e.target.value })}
                              placeholder={field.placeholder}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveField(svcKey, field.key);
                                if (e.key === "Escape") setField(svcKey, field.key, { editing: false, value: "" });
                              }}
                            />
                            {field.sensitive && (
                              <button
                                type="button"
                                onClick={() => setField(svcKey, field.key, { showValue: !fState.showValue })}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {fState.showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => saveField(svcKey, field.key)}
                            disabled={fState.saving || !fState.value.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                          >
                            {fState.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save
                          </button>
                          <button
                            onClick={() => setField(svcKey, field.key, { editing: false, value: "", error: "" })}
                            className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                        {fState.error && (
                          <p className="text-xs text-red-500">{fState.error}</p>
                        )}
                      </div>
                    )}

                    {fState.saved && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Saved successfully
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
