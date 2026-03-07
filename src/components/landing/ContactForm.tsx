"use client";

import { useState } from "react";

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    propertyInterest: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setForm({ name: "", email: "", phone: "", message: "", propertyInterest: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors";
  const labelClass = "block text-slate-700 text-sm font-medium mb-2";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-6"
    >
      <div>
        <label className={labelClass}>Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className={inputClass}
          placeholder="Your name"
        />
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className={inputClass}
          placeholder="Your email"
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputClass}
          placeholder="Your phone"
        />
      </div>
      <div>
        <label className={labelClass}>Message *</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder="Your message"
        />
      </div>
      <div>
        <label className={labelClass}>Property Interest</label>
        <input
          type="text"
          value={form.propertyInterest}
          onChange={(e) => setForm({ ...form, propertyInterest: e.target.value })}
          className={inputClass}
          placeholder="e.g. Vanderbilt Beach Condo"
        />
      </div>
      {status === "success" && (
        <p className="text-emerald-600 text-sm font-medium">
          Thank you! We&apos;ll be in touch soon.
        </p>
      )}
      {status === "error" && (
        <p className="text-red-500 text-sm font-medium">
          Something went wrong. Please try again.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
