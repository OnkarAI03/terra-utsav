import { DiyaRow } from "@/components/art/DiyaArt";

export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-burgundy-950 pt-[var(--header-h)]" role="status">
      <div className="text-center">
        <DiyaRow count={3} className="mx-auto w-40" />
        <p className="mt-4 text-[1.05rem] font-bold text-cream-100">{label}</p>
      </div>
    </div>
  );
}
