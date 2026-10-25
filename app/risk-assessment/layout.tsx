import AdminOnlyBanner from "@/components/AdminOnlyBanner";
import { requireAdmin } from "@/lib/adminOnly";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <><AdminOnlyBanner />{children}</>;
}
