"use client";

import { useEffect, useState } from "react";
import { User, Phone, Mail } from "lucide-react";
import {
  clearDemoLead,
  getDemoLeadFieldError,
  setDemoLead,
  type DemoLead,
} from "@/lib/demo-lead-storage";

type TFn = (key: string) => string;

interface DemoLeadFormProps {
  t: TFn;
  /** When set, show saved summary + change; otherwise show the form */
  savedLead: DemoLead | null;
  onSaved: (lead: DemoLead) => void;
  onCleared: () => void;
}

export function DemoLeadForm({ t, savedLead, onSaved, onCleared }: DemoLeadFormProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!savedLead) {
      setFullName("");
      setPhone("");
      setEmail("");
      setErrorKey(null);
    }
  }, [savedLead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    const field = getDemoLeadFieldError({ fullName, phone, email });
    if (field === "name") {
      setErrorKey("auth.signin.demoLead.errorName");
      return;
    }
    if (field === "phone") {
      setErrorKey("auth.signin.demoLead.errorPhone");
      return;
    }
    if (field === "email") {
      setErrorKey("auth.signin.demoLead.errorEmail");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/demo-lead/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.success) {
        setErrorKey("auth.signin.demoLead.errorSubmit");
        return;
      }
      const lead = setDemoLead({ fullName, phone, email });
      onSaved(lead);
    } catch {
      setErrorKey("auth.signin.demoLead.errorSubmit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeDetails = () => {
    clearDemoLead();
    setErrorKey(null);
    onCleared();
  };

  if (savedLead) {
    return (
      <div className="mb-5 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3">
        <p className="text-[11px] tracking-wide text-white/50" style={{ fontWeight: 300 }}>
          {t("auth.signin.demoLead.savedAs")}
        </p>
        <p className="mt-1 truncate text-sm text-white/85" style={{ fontWeight: 400 }}>
          {savedLead.fullName} · {savedLead.email}
        </p>
        <button
          type="button"
          onClick={handleChangeDetails}
          className="mt-2 text-[11px] tracking-wide text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
          style={{ fontWeight: 300 }}
        >
          {t("auth.signin.demoLead.changeDetails")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 space-y-3">
      <p
        className="w-full text-justify text-xs leading-relaxed tracking-wide text-white/55"
        style={{ fontWeight: 300 }}
      >
        {t("auth.signin.demoLead.intro")}
      </p>
      {errorKey && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          {t(errorKey)}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="demo-lead-name" className="block text-[11px] tracking-wide text-white/45" style={{ fontWeight: 300 }}>
          {t("auth.signin.demoLead.nameLabel")}
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            id="demo-lead-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("auth.signin.demoLead.namePlaceholder")}
            className="w-full min-h-[40px] pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/40 bg-white/5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:bg-white/10 transition-all"
            style={{ fontWeight: 300 }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="demo-lead-phone" className="block text-[11px] tracking-wide text-white/45" style={{ fontWeight: 300 }}>
          {t("auth.signin.demoLead.phoneLabel")}
        </label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            id="demo-lead-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("auth.signin.demoLead.phonePlaceholder")}
            className="w-full min-h-[40px] pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/40 bg-white/5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:bg-white/10 transition-all"
            style={{ fontWeight: 300 }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="demo-lead-email" className="block text-[11px] tracking-wide text-white/45" style={{ fontWeight: 300 }}>
          {t("auth.signin.demoLead.emailLabel")}
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            id="demo-lead-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.signin.demoLead.emailPlaceholder")}
            className="w-full min-h-[40px] pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/40 bg-white/5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/25 focus:bg-white/10 transition-all"
            style={{ fontWeight: 300 }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full min-h-[42px] rounded-xl border border-white/25 bg-white/10 py-2.5 text-sm tracking-wide text-white hover:bg-white/18 transition-all touch-manipulation disabled:opacity-60 disabled:pointer-events-none"
        style={{ fontWeight: 400 }}
      >
        {isSubmitting ? t("auth.signin.demoLead.saving") : t("auth.signin.demoLead.continue")}
      </button>
    </form>
  );
}
