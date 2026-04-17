import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHomeHero } from "@/components/landing/home/LandingHomeHero";
import { LandingHomeFeatures } from "@/components/landing/home/LandingHomeFeatures";
import { LandingHomePricing } from "@/components/landing/home/LandingHomePricing";
import { LandingHomeOperations } from "@/components/landing/home/LandingHomeOperations";
import { LandingHomeCta } from "@/components/landing/home/LandingHomeCta";

export function LandingHomePage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHomeHero />
        <LandingHomeFeatures />
        <LandingHomePricing />
        <LandingHomeOperations />
        <LandingHomeCta />
      </main>
    </>
  );
}
