import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountProfile from "@/components/AccountProfile";
import { currentUser } from "@/lib/currentUser";
import { proStatus } from "@/lib/pro";
import { stripeConfigured } from "@/lib/stripe";
import { newsletterLang } from "@/lib/newsletterText";
import { LANG_COOKIE } from "@/lib/seo/locales";

export const metadata: Metadata = { title: "Your profile · 10BONDS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Account() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const proApproved = user.isAdmin || (await proStatus(user).catch(() => "none")) === "approved";
  const live = user.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status) ? user.subscription : null;
  return (
    <AccountProfile
      email={user.email}
      username={user.username}
      storedPlan={user.storedPlan}
      premiumUntil={user.premiumUntil}
      subscription={live}
      hasBilling={Boolean(user.stripeCustomerId)}
      proApproved={proApproved}
      payOn={stripeConfigured()}
      newsletter={user.newsletter}
      lang={newsletterLang((await cookies()).get(LANG_COOKIE)?.value)}
    />
  );
}
