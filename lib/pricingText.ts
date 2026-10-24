
// Words of the Plans page in each site language (the visitor's language cookie picks one; English otherwise).

export type PricingLang = "en" | "it" | "fr" | "de";
// extra: lines after the ones from the admin's feature table (lib/features.ts planLines).
type PlanText = { name: string; tagline: string; extra: string[]; cta: string };

const en = {
  title: "Simple plans",
  lead: "Start with a free account. Upgrade for more tools. Cancel anytime.",
  visitor: "Without an account you can try the search and see the top 3.",
  paid: "Thank you. Your payment went through; your plan is active within a minute (refresh if it still shows the old plan).",
  cancelled: "Payment cancelled. Nothing was charged.",
  pastDue: ["Your last payment failed. Please update your card on your ", "profile page", "."],
  endsOn: (d: string) => `Your subscription ends on ${d}.`,
  monthly: "Monthly", yearly: "Yearly", perMonth: "/month", perYear: "/year", billedMonthly: "Billed monthly",
  yearlyNote: (m: string) => `= ${m}/month, 20% less than monthly`,
  forPros: "For professionals",
  yourPlan: "Your plan", included: "Included", soon: "Coming soon", proRequest: "Request professional access", learnMore: "Learn more",
  freeFirst: "Create a free account first", changeOnProfile: "Change on your profile",
  terms: "Prices include VAT · cancel anytime · payments by Stripe.",
  promo: " Have a promo code? Enter it when you create your free account for 30 days of full access.",
  everything: { plus: "Everything in the free account", premium: "Everything in Plus", pro: "Everything in Premium" },
  limit: (n: number, k: "single" | "portfolio") => (k === "single" ? `${n} one-bond searches a week` : `${n} portfolio searches a week`),
  plans: {
    free: { name: "Free account", tagline: "Sign up with your email.", cta: "Create free account",
      extra: [] },
    plus: { name: "Plus", tagline: "The full shortlist, yours to shape.", cta: "Get Plus",
      extra: [] },
    premium: { name: "Premium", tagline: "See why, and stay on top.", cta: "Get Premium",
      extra: ["More features as they come"] },
    pro: { name: "Pro", tagline: "For professionals only.", cta: "Get Pro",
      extra: ["Client portfolio analysis", "Similar bonds with a higher return", "Approved professionals only"] },
  } as Record<"free" | "plus" | "premium" | "pro", PlanText>,
};
export type PricingText = typeof en;

const it: PricingText = {
  title: "Piani semplici",
  lead: "Inizia con un account gratuito. Passa a un piano a pagamento per più strumenti. Disdici quando vuoi.",
  visitor: "Senza account puoi provare la ricerca e vedere i primi 3.",
  paid: "Grazie. Il pagamento è andato a buon fine; il piano è attivo entro un minuto (ricarica la pagina se vedi ancora il piano precedente).",
  cancelled: "Pagamento annullato. Non è stato addebitato nulla.",
  pastDue: ["L'ultimo pagamento non è andato a buon fine. Aggiorna la carta nella ", "pagina profilo", "."],
  endsOn: (d: string) => `L'abbonamento termina il ${d}.`,
  monthly: "Mensile", yearly: "Annuale", perMonth: "/mese", perYear: "/anno", billedMonthly: "Addebito mensile",
  yearlyNote: (m: string) => `= ${m}/mese, il 20% in meno del mensile`,
  forPros: "Per professionisti",
  yourPlan: "Il tuo piano", included: "Incluso", soon: "In arrivo", proRequest: "Richiedi l'accesso professionale", learnMore: "Scopri di più",
  freeFirst: "Crea prima un account gratuito", changeOnProfile: "Modifica dal profilo",
  terms: "Prezzi IVA inclusa · disdici quando vuoi · pagamenti con Stripe.",
  promo: " Hai un codice promo? Inseriscilo quando crei l'account gratuito per 30 giorni di accesso completo.",
  everything: { plus: "Tutto dell'account gratuito", premium: "Tutto di Plus", pro: "Tutto di Premium" },
  limit: (n: number, k: "single" | "portfolio") => (k === "single" ? `${n} ricerche di singoli bond a settimana` : `${n} ricerche di portafoglio a settimana`),
  plans: {
    free: { name: "Account gratuito", tagline: "Registrati con la tua email.", cta: "Crea account gratuito",
      extra: [] },
    plus: { name: "Plus", tagline: "La selezione completa, da adattare a te.", cta: "Scegli Plus",
      extra: [] },
    premium: { name: "Premium", tagline: "Capisci il perché e resta aggiornato.", cta: "Scegli Premium",
      extra: ["Altre funzioni in arrivo"] },
    pro: { name: "Pro", tagline: "Solo per professionisti.", cta: "Scegli Pro",
      extra: ["Analisi dei portafogli dei clienti", "Obbligazioni simili con rendimento più alto", "Solo professionisti approvati"] },
  },
};

const fr: PricingText = {
  title: "Des offres simples",
  lead: "Commencez avec un compte gratuit. Passez à une offre payante pour plus d'outils. Résiliable à tout moment.",
  visitor: "Sans compte, vous pouvez essayer la recherche et voir le top 3.",
  paid: "Merci. Votre paiement est passé ; votre offre est active en moins d'une minute (actualisez si l'ancienne offre s'affiche encore).",
  cancelled: "Paiement annulé. Rien n'a été débité.",
  pastDue: ["Votre dernier paiement a échoué. Mettez à jour votre carte sur votre ", "page profil", "."],
  endsOn: (d: string) => `Votre abonnement prend fin le ${d}.`,
  monthly: "Mensuel", yearly: "Annuel", perMonth: "/mois", perYear: "/an", billedMonthly: "Facturé chaque mois",
  yearlyNote: (m: string) => `= ${m}/mois, 20 % de moins qu'au mois`,
  forPros: "Pour les professionnels",
  yourPlan: "Votre offre", included: "Inclus", soon: "Bientôt", proRequest: "Demander l'accès professionnel", learnMore: "En savoir plus",
  freeFirst: "Créez d'abord un compte gratuit", changeOnProfile: "Modifier sur votre profil",
  terms: "Prix TTC · résiliable à tout moment · paiements par Stripe.",
  promo: " Un code promo ? Saisissez-le en créant votre compte gratuit pour 30 jours d'accès complet.",
  everything: { plus: "Tout le compte gratuit", premium: "Tout Plus", pro: "Tout Premium" },
  limit: (n: number, k: "single" | "portfolio") => (k === "single" ? `${n} recherches d'obligation par semaine` : `${n} recherches de portefeuille par semaine`),
  plans: {
    free: { name: "Compte gratuit", tagline: "Inscrivez-vous avec votre e-mail.", cta: "Créer un compte gratuit",
      extra: [] },
    plus: { name: "Plus", tagline: "La sélection complète, à votre main.", cta: "Choisir Plus",
      extra: [] },
    premium: { name: "Premium", tagline: "Comprendre le pourquoi, rester informé.", cta: "Choisir Premium",
      extra: ["D'autres fonctions à venir"] },
    pro: { name: "Pro", tagline: "Réservé aux professionnels.", cta: "Choisir Pro",
      extra: ["Analyse des portefeuilles clients", "Obligations similaires au rendement plus élevé", "Professionnels approuvés uniquement"] },
  },
};

const de: PricingText = {
  title: "Einfache Tarife",
  lead: "Starten Sie mit einem kostenlosen Konto. Upgraden Sie für mehr Werkzeuge. Jederzeit kündbar.",
  visitor: "Ohne Konto können Sie die Suche testen und die Top 3 sehen.",
  paid: "Danke. Ihre Zahlung ist eingegangen; Ihr Tarif ist innerhalb einer Minute aktiv (neu laden, falls noch der alte angezeigt wird).",
  cancelled: "Zahlung abgebrochen. Es wurde nichts abgebucht.",
  pastDue: ["Ihre letzte Zahlung ist fehlgeschlagen. Bitte aktualisieren Sie Ihre Karte auf Ihrer ", "Profilseite", "."],
  endsOn: (d: string) => `Ihr Abo endet am ${d}.`,
  monthly: "Monatlich", yearly: "Jährlich", perMonth: "/Monat", perYear: "/Jahr", billedMonthly: "Monatliche Abrechnung",
  yearlyNote: (m: string) => `= ${m}/Monat, 20 % günstiger als monatlich`,
  forPros: "Für Profis",
  yourPlan: "Ihr Tarif", included: "Enthalten", soon: "Demnächst", proRequest: "Profi-Zugang anfragen", learnMore: "Mehr erfahren",
  freeFirst: "Zuerst ein kostenloses Konto erstellen", changeOnProfile: "Im Profil ändern",
  terms: "Preise inkl. MwSt. · jederzeit kündbar · Zahlung über Stripe.",
  promo: " Sie haben einen Aktionscode? Geben Sie ihn beim Erstellen Ihres kostenlosen Kontos ein: 30 Tage voller Zugang.",
  everything: { plus: "Alles aus dem kostenlosen Konto", premium: "Alles aus Plus", pro: "Alles aus Premium" },
  limit: (n: number, k: "single" | "portfolio") => (k === "single" ? `${n} Einzelanleihe-Suchen pro Woche` : `${n} Portfolio-Suchen pro Woche`),
  plans: {
    free: { name: "Kostenloses Konto", tagline: "Mit Ihrer E-Mail registrieren.", cta: "Kostenloses Konto erstellen",
      extra: [] },
    plus: { name: "Plus", tagline: "Die volle Auswahl, nach Ihren Wünschen.", cta: "Plus wählen",
      extra: [] },
    premium: { name: "Premium", tagline: "Das Warum sehen, auf dem Laufenden bleiben.", cta: "Premium wählen",
      extra: ["Weitere Funktionen folgen"] },
    pro: { name: "Pro", tagline: "Nur für Profis.", cta: "Pro wählen",
      extra: ["Analyse von Kundenportfolios", "Ähnliche Anleihen mit höherer Rendite", "Nur zugelassene Profis"] },
  },
};

export const PRICING_TEXT: Record<PricingLang, PricingText> = { en, it, fr, de };
export const pricingLang = (v: string | undefined): PricingLang => (v === "it" || v === "fr" || v === "de" ? v : "en");
