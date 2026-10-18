import type { Metadata } from "next";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { requirePageRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="festival-ground min-h-[70vh] pt-[calc(var(--header-h)+80px)]">
        <div className="shell max-w-2xl">
          <h1 className="display-l text-sticker">Admin</h1>
          <p className="mt-6 text-[1.1rem] text-cream-100">
            The admin dashboard needs Supabase. Follow the setup steps in the README, then sign in with the account you made admin.
          </p>
        </div>
      </div>
    );
  }
  const session = await requirePageRole("admin", "/admin");
  return (
    <div className="bg-burgundy-950 pb-24 pt-[calc(var(--header-h)+40px)]">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="display-m text-sticker">Admin</h1>
          <p className="text-[0.95rem] font-bold text-cream-100">Signed in as {session.user.email}</p>
        </div>
        <div className="mt-6">
          <AdminTabs />
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
