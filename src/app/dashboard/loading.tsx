import { Preloader } from "@/components/ui/preloader";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[300px] p-3 md:p-6">
      <Preloader size="lg" showPoweredBy />
    </div>
  );
}
