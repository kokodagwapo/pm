import { LandingHeader } from "@/components/landing/LandingHeader";

export default function PropertyDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <LandingHeader />
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="animate-pulse h-5 w-28 bg-slate-200 rounded mb-6" />
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0 space-y-6">
              <div className="aspect-[16/10] rounded-2xl bg-slate-200" />
              <div className="h-10 w-3/4 bg-slate-200 rounded" />
              <div className="h-5 w-1/2 bg-slate-200 rounded" />
              <div className="flex gap-6">
                <div className="h-5 w-24 bg-slate-200 rounded" />
                <div className="h-5 w-24 bg-slate-200 rounded" />
                <div className="h-5 w-16 bg-slate-200 rounded" />
              </div>
              <div className="rounded-2xl p-6 bg-slate-100 space-y-3">
                <div className="h-6 w-40 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-4/5 bg-slate-200 rounded" />
              </div>
              <div className="rounded-2xl p-6 bg-slate-100 space-y-3">
                <div className="h-6 w-28 bg-slate-200 rounded" />
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-8 w-20 bg-slate-200 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <aside className="lg:w-96 shrink-0">
              <div className="sticky top-28 rounded-2xl p-6 bg-white border border-slate-200 shadow-lg space-y-4">
                <div className="h-8 w-24 bg-slate-200 rounded" />
                <div className="h-12 w-full bg-slate-200 rounded-xl" />
                <div className="h-4 w-3/4 mx-auto bg-slate-200 rounded" />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
