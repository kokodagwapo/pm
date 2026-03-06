/**
 * Contact Page - Glassmorphic contact form
 */

import { LandingHeader } from "@/components/landing/LandingHeader";
import { ContactForm } from "@/components/landing/ContactForm";
import { Mail, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <LandingHeader />

      <main className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h1
            className="font-[var(--font-playfair)] text-4xl md:text-5xl text-white mb-4"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
          >
            Contact Us
          </h1>
          <p className="text-white/70 mb-8">
            Have a question or ready to book? We&apos;d love to hear from you.
          </p>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <ContactForm />
            </div>
            <div className="md:w-64 shrink-0 space-y-4">
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <h3 className="font-[var(--font-playfair)] text-lg text-white mb-4">
                  Direct Contact
                </h3>
                <a
                  href="mailto:hi@smartstart.us"
                  className="flex items-center gap-3 text-white/90 hover:text-white mb-4"
                >
                  <Mail className="w-5 h-5 shrink-0" />
                  hi@smartstart.us
                </a>
                <a
                  href="tel:+12399446627"
                  className="flex items-center gap-3 text-white/90 hover:text-white"
                >
                  <Phone className="w-5 h-5 shrink-0" />
                  +1 (239) 944-6627
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
