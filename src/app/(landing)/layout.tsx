import { FlickeringGridBackground } from "@/components/ui/flickering-grid-background";

/**
 * Landing layout - Coastal Glassmorphism design
 * Uses Playfair Display for headings, Montserrat for body
 * FlickeringGrid background for all landing pages
 */

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen font-[var(--font-montserrat)] antialiased">
      <FlickeringGridBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
