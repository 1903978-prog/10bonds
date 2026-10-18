import { TERMS_SECTIONS, TERMS_VERSION } from "@/lib/terms";

export default function TermsText({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "space-y-4 text-xs leading-relaxed" : "space-y-6 text-[15px] leading-relaxed"}>
      <p className="text-mute">Version {TERMS_VERSION}</p>
      {TERMS_SECTIONS.map((s) => (
        <section key={s.title}>
          <h2 className="font-semibold">{s.title}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-2">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
