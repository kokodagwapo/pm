"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  Wrench,
  Sparkles,
  Home,
  Shield,
  FileText,
  type LucideIcon,
} from "lucide-react";

const services: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
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

export function ServicesSection() {
  return (
    <section
      id="services"
      className="relative py-20 md:py-28 px-4 md:px-8 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-[var(--font-playfair)] text-3xl md:text-4xl text-white mb-4 text-center animate-fade-in-up"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
        >
          Hands-on Local Care
        </h2>
        <p className="text-white/80 text-center max-w-2xl mx-auto mb-16 animate-fade-in-up">
          Your vacation property, our passion – we take care of every detail so
          you can truly relax.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {services.map((service, i) => (
            <div
              key={service.title}
              className="rounded-2xl p-6 transition-all duration-300 hover:border-white/30 hover:scale-[1.02] animate-fade-in-up"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <service.icon className="w-10 h-10 text-white/90 mb-4" />
              <h3 className="font-[var(--font-playfair)] text-lg text-white mb-2">
                {service.title}
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center animate-fade-in-up">
          <Link
            href="/contact"
            className="inline-block px-8 py-4 rounded-xl bg-white text-[var(--landing-navy)] font-semibold hover:bg-white/95 hover:scale-105 transition-all duration-300"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </section>
  );
}
