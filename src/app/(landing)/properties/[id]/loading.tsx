import { LandingHeader } from "@/components/landing/LandingHeader";
import { PagePreloader } from "@/components/ui/preloader";

export default function PropertyDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <LandingHeader />
      <PagePreloader className="pt-32" />
    </div>
  );
}
