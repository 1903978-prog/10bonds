import { ratingText } from "./creditOverlay";

// Pure helpers (safe for the browser): the IR / BR text of a stored analysis row. Never calculated: a range as stored, a single value, or null.
type Scores = { issuerRatingMin: number | null; issuerRatingMax: number | null; issuerRating: number | null; bondRatingMin: number | null; bondRatingMax: number | null; bondRating: number | null };
export const irText = (r: Scores) => ratingText(r.issuerRatingMin, r.issuerRatingMax, r.issuerRating);
export const brText = (r: Scores) => ratingText(r.bondRatingMin, r.bondRatingMax, r.bondRating);
