/**
 * Landing layout - Coastal Glassmorphism design
 * Uses Playfair Display for headings, Montserrat for body
 */

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen font-[var(--font-montserrat)] antialiased">
      {children}
    </div>
  );
}
