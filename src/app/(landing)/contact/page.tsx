/**
 * Contact Page - Light theme
 */

import { LandingHeader } from "@/components/landing/LandingHeader";
import { ContactForm } from "@/components/landing/ContactForm";
import { Mail, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl text-slate-900 mb-4">
            Contact Us
          </h1>
          <p className="text-slate-500 mb-8">
            Have a question or ready to book? We&apos;d love to hear from you.
          </p>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <ContactForm />
            </div>
            <div className="md:w-64 shrink-0 space-y-4">
              <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200">
                <h3 className="font-[var(--font-playfair)] text-lg text-slate-900 mb-4">
                  Direct Contact
                </h3>
                <a
                  href="mailto:hi@smartstart.us"
                  className="flex items-center gap-3 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
                >
                  <Mail className="w-5 h-5 shrink-0 text-slate-400" />
                  hi@smartstart.us
                </a>
                <a
                  href="tel:+12399446627"
                  className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Phone className="w-5 h-5 shrink-0 text-slate-400" />
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
