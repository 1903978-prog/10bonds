import type { Guide } from "./store";
import { FIRST_WAVE, KC_SECTIONS, type KcSection } from "./knowledge";
import type { Locale } from "./locales";

// The public Knowledge Center: one page per language with Livio's six sections. It only links to pages that are
// public today; planned pages (guides in review, unpublished broker pages) are listed as "coming soon", unlinked.

export const KC_ORDER: KcSection[] = ["best", "government", "calculators", "brokers", "risk", "academy"];

type HubText = { title: string; description: string; h1: string; lead: string; soon: string; empty: string; sections: Record<KcSection, { name: string; intro: string }> };

export const KC_TEXT: Record<Locale, HubText> = {
  it: {
    title: "Sapere: guide, confronti e calcolatori sulle obbligazioni · 10BONDS",
    description: "Il centro di conoscenza di 10BONDS: migliori obbligazioni, BTP e titoli di Stato, calcolatori, broker e costi, rischio e rating, guide per iniziare.",
    h1: "Tutto sulle obbligazioni",
    lead: "Confronti aggiornati con i dati del giorno, calcolatori e guide scritte per capire i numeri prima di scegliere.",
    soon: "In preparazione",
    empty: "Le pagine di questa sezione sono in preparazione.",
    sections: {
      best: { name: "Migliori obbligazioni", intro: "Le obbligazioni in euro con il rendimento più alto per durata, rating e scadenza." },
      government: { name: "Titoli di Stato", intro: "BTP, OAT, Bund e altri titoli di Stato europei a confronto." },
      calculators: { name: "Calcolatori", intro: "Rendimento lordo e netto, prima di comprare." },
      brokers: { name: "Broker e costi", intro: "Quanto costa comprare un'obbligazione presso ogni broker." },
      risk: { name: "Rischio e rating", intro: "Rating, duration e rischio di credito spiegati in modo semplice." },
      academy: { name: "Accademia delle obbligazioni", intro: "Le basi per iniziare, passo dopo passo." },
    },
  },
  fr: {
    title: "Savoir : guides, comparatifs et calculateurs obligataires · 10BONDS",
    description: "Le centre de savoir de 10BONDS : meilleures obligations, OAT et emprunts d'État, calculateurs, courtiers et frais, risque et notation, guides pour débuter.",
    h1: "Tout savoir sur les obligations",
    lead: "Des comparatifs mis à jour chaque jour, des calculateurs et des guides pour comprendre les chiffres avant de choisir.",
    soon: "En préparation",
    empty: "Les pages de cette rubrique sont en préparation.",
    sections: {
      best: { name: "Meilleures obligations", intro: "Les obligations en euros au meilleur rendement par durée, notation et échéance." },
      government: { name: "Emprunts d'État", intro: "OAT, Bund, BTP et autres emprunts d'État européens comparés." },
      calculators: { name: "Calculateurs", intro: "Rendement brut et net, avant d'acheter." },
      brokers: { name: "Courtiers et frais", intro: "Ce que coûte l'achat d'une obligation chez chaque courtier." },
      risk: { name: "Risque et notation", intro: "Notation, duration et risque de crédit expliqués simplement." },
      academy: { name: "Académie obligataire", intro: "Les bases pour débuter, étape par étape." },
    },
  },
  de: {
    title: "Wissen: Ratgeber, Vergleiche und Rechner zu Anleihen · 10BONDS",
    description: "Das Wissenszentrum von 10BONDS: beste Anleihen, Bundesanleihen und Staatsanleihen, Rechner, Broker und Gebühren, Risiko und Rating, Ratgeber für den Einstieg.",
    h1: "Wissen rund um Anleihen",
    lead: "Täglich aktualisierte Vergleiche, Rechner und Ratgeber, um die Zahlen vor der Auswahl zu verstehen.",
    soon: "In Vorbereitung",
    empty: "Die Seiten dieses Bereichs sind in Vorbereitung.",
    sections: {
      best: { name: "Beste Anleihen", intro: "Euro-Anleihen mit der höchsten Rendite nach Laufzeit, Rating und Fälligkeit." },
      government: { name: "Staatsanleihen", intro: "Bundesanleihen, OAT, BTP und weitere europäische Staatsanleihen im Vergleich." },
      calculators: { name: "Rechner", intro: "Rendite brutto und nach Steuern, vor dem Kauf." },
      brokers: { name: "Broker und Gebühren", intro: "Was der Kauf einer Anleihe bei jedem Broker kostet." },
      risk: { name: "Risiko und Rating", intro: "Rating, Duration und Kreditrisiko einfach erklärt." },
      academy: { name: "Anleihen-Akademie", intro: "Die Grundlagen für den Einstieg, Schritt für Schritt." },
    },
  },
};

/** English names, for the international page and the admin. */
export const KC_EN = KC_SECTIONS;

const RISK = /rating|rischi|risque|risiko|default|duration|spread|insolv|ausfall/i;
const GOV = /btp|\boat\b|-oat|bund|stato|etat|état|staat|government|sovereign/i;

/** Section of a published guide: from the first-wave plan when listed there, otherwise from its slug and keyword. */
export function guideSection(g: Pick<Guide, "locale" | "slug" | "primaryKeyword">): KcSection {
  const planned = FIRST_WAVE.find((p) => p.kind === "guide" && p.market === g.locale && p.ref === g.slug);
  if (planned) return planned.section;
  const text = `${g.slug} ${g.primaryKeyword}`;
  return RISK.test(text) ? "risk" : GOV.test(text) ? "government" : "academy";
}

/** Section of a comparison page by its id. */
export function comparisonSection(id: string): KcSection | null {
  if (id.startsWith("gov-") || id.startsWith("issuers-")) return "government";
  if (id === "investment-grade" || id === "high-yield") return "risk";
  if (["best", "corporate"].includes(id) || /^(yield|duration|maturity)-/.test(id)) return "best";
  return null;
}

export type HubItem = { title: string; href: string | null; note?: string };

