/**
 * Management Services - Hands-on Local Care
 */

import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import {
  ClipboardCheck,
  Wrench,
  Sparkles,
  Home,
  Shield,
  FileText,
} from "lucide-react";

const services = [
  {
    icon: ClipboardCheck,
    title: "Regular Inspections",
    description:
      "We schedule regular inspections with you, coordinate repairs, and oversee renovation projects to ensure your property remains a perfect retreat and retains its value.",
  },
  {
    icon: Wrench,
    title: "Repairs & Maintenance",
    description:
      "From check-in to check-out, including professional cleaning. We take care of every detail so you can truly relax.",
  },
  {
    icon: Sparkles,
    title: "Professional Cleaning",
    description:
      "We coordinate professional cleaning between guests and ensure your property is always immaculate.",
  },
  {
    icon: Home,
    title: "Rental Management",
    description:
      "Hands-on local care for your vacation property. We understand how important it is to have a reliable local contact.",
  },
  {
    icon: Shield,
    title: "Property Value",
    description:
      "We ensure your property remains not only a perfect retreat but also retains its value as a profitable long-term investment.",
  },
  {
    icon: FileText,
    title: "Sales & Portfolio",
    description:
      "Looking to sell or expand your portfolio? We offer tailored solutions to guide you through a successful process.",
  },
];

export default function ManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <LandingHeader />

      <main className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <h1
            className="font-[var(--font-playfair)] text-4xl md:text-5xl text-white mb-4"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
          >
            Hands-on Local Care
          </h1>
          <p className="text-white/80 text-lg mb-4 max-w-2xl">
            Do you own a vacation property in Naples and are looking for a
            trusted partner? As experienced real estate agents and owners of
            multiple properties, we understand how important it is to have a
            reliable local contact.
          </p>
          <blockquote
            className="text-white/90 italic text-xl mb-16 pl-6 border-l-4 border-white/30"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(8px)",
              padding: "1rem 1.5rem",
              borderRadius: "0 0.5rem 0.5rem 0",
            }}
          >
            &ldquo;Your vacation property, our passion – we take care of every
            detail so you can truly relax.&rdquo;
          </blockquote>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-2xl p-6 transition-all hover:border-white/30"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <service.icon className="w-10 h-10 text-white/90 mb-4" />
                <h2 className="font-[var(--font-playfair)] text-xl text-white mb-2">
                  {service.title}
                </h2>
                <p className="text-white/70 leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-white/80 mb-6">
              Ready to put your property in the best hands?
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-4 rounded-xl bg-white text-[var(--landing-navy)] font-semibold hover:bg-white/95 transition-all"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
