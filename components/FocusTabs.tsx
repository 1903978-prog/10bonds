import Link from "next/link";

/** Companies | Countries switch shown above both risk-assessment pages. */
export default function FocusTabs({ active }: { active: "companies" | "countries" }) {
  const item = (key: "companies" | "countries", href: string, label: string) => (
    <Link href={href} data-testid={`focus-${key}`} aria-current={active === key ? "page" : undefined}
      className={`rounded-full px-3 py-0.5 ${active === key ? "bg-white font-medium text-ink shadow-[0_1px_4px_rgba(0,0,0,0.1)]" : "text-mute hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <div className="inline-flex rounded-full bg-line/50 p-0.5 text-[12px]">
      {item("companies", "/risk-assessment", "Companies")}
      {item("countries", "/risk-assessment/countries", "Countries")}
    </div>
  );
}
