import { redirect } from "next/navigation";

// The separate page was removed: codes are entered at sign-up, or under "Have a code?" on the pricing page.
export default function Redeem() {
  redirect("/pricing");
}
