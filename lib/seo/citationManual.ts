import { TEST_QUESTIONS } from "./testQuestions";

// Free manual citation check: Livio pastes the weekly prompt into ChatGPT and Claude, then pastes the answers
// back. Answers are split by their "Q<n>" markers and each one is checked for a link to or mention of 10bonds.com.

export const MANUAL_ASSISTANTS = [
  { id: "chatgpt", name: "ChatGPT", open: "https://chatgpt.com/" },
  { id: "claude", name: "Claude", open: "https://claude.ai/new" },
] as const;
export type ManualAssistant = (typeof MANUAL_ASSISTANTS)[number]["id"];

/** The prompt to paste, with the questions numbered so the answers can be matched back. */
export function manualPrompt(): string {
  return [
    "Please search the web and answer each of the following questions as you normally would for a private investor.",
    'Start each answer on a new line with its number, exactly like "Q1:", "Q2:" and so on.',
    "At the end of each answer, list the full URLs of the sources you used.",
    "",
    ...TEST_QUESTIONS.map((x, i) => `Q${i + 1}: ${x.q}`),
  ].join("\n");
}

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
};

export type ParsedAnswers = { answered: number; cited: number; answers: { market: string; q: string; cited: boolean; domains: string[] }[] };

/** Splits pasted text into answers by "Q<n>" and checks each for 10bonds.com. Questions without an answer are left out. */
export function parseManual(text: string): ParsedAnswers {
  const parts = new Map<number, string>();
  const re = /(?:^|\n)\s*(?:\*\*|#+\s*)?Q\s?(\d{1,2})\s*[:.)\-–]/gi;
  const marks = [...text.matchAll(re)];
  marks.forEach((m, i) => {
    const n = Number(m[1]);
    const end = i + 1 < marks.length ? marks[i + 1].index! : text.length;
    if (n >= 1 && n <= TEST_QUESTIONS.length) parts.set(n, (parts.get(n) ?? "") + text.slice(m.index!, end));
  });
  const answers = [...parts.entries()].sort(([a], [b]) => a - b).map(([n, body]) => {
    const domains = [...new Set([...body.matchAll(/https?:\/\/[^\s)\]>"']+/g)].map((u) => host(u[0])).filter((d): d is string => !!d))];
    return { market: TEST_QUESTIONS[n - 1].market, q: TEST_QUESTIONS[n - 1].q, cited: /10bonds/i.test(body), domains: domains.slice(0, 8) };
  });
  return { answered: answers.length, cited: answers.filter((a) => a.cited).length, answers };
}

/** ISO week label, e.g. "2026-W43", for keeping one manual result per week. */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
