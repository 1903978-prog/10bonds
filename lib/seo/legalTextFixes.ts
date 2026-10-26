// Text fixes applied once to the guides stored in the database (the owner, 20 Oct 2026, legal review): the guides no longer
// say which rating agency the 10BONDS risk score is read from. The same pairs are applied to the seed files.
export const LEGAL_TEXT_FIXES: [from: string, to: string][] = [
  [
    "Su 10BONDS usiamo il rating risolto fornito con i dati quando disponibile, altrimenti quello di S&amp;P, poi Moody's, poi Fitch. Le obbligazioni senza rating non compaiono nei nostri elenchi.",
    "Su 10BONDS mostriamo invece un rischio da 1 a 10, una scala propria che non è un rating. Le obbligazioni senza rating non compaiono nei nostri elenchi.",
  ],
  [
    "10BONDS verwendet das mit den Daten gelieferte zusammengeführte Rating, sofern vorhanden, sonst das von S&amp;P, dann Moody's, dann Fitch. Anleihen ohne Rating erscheinen nicht in unseren Listen.",
    "10BONDS zeigt stattdessen ein Risiko von 1 bis 10, eine eigene Skala, die kein Rating ist. Anleihen ohne Rating erscheinen nicht in unseren Listen.",
  ],
  [
    "Sur 10BONDS, nous utilisons la note consolidée fournie avec les données lorsqu'elle existe, sinon celle de S&amp;P, puis de Moody's, puis de Fitch. Les obligations sans notation n'apparaissent pas dans nos listes.",
    "Sur 10BONDS, nous affichons plutôt un risque de 1 à 10, une échelle propre qui n'est pas une notation. Les obligations sans notation n'apparaissent pas dans nos listes.",
  ],
  [
    "On 10BONDS we use the resolved rating supplied with the data when available, otherwise S&amp;P's, then Moody's, then Fitch's. Bonds without a rating do not appear in our lists.",
    "On 10BONDS we show a risk score from 1 to 10 instead, our own scale, which is not a credit rating. Bonds without a rating do not appear in our lists.",
  ],
];
