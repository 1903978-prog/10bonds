import type { PublicBond } from "./types";

// SAMPLE DATA ONLY. Invented bonds used until the real daily copy is connected.
// Issuer names are real companies and governments, but the coupons, yields and codes are made up.
type Row = [issuer: string, country: string, coupon: number, maturity: string, rating: string, ytm: number, duration: number];

const ROWS: Row[] = [
  ["Germany", "DE", 2.2, "2028-04-15", "AAA", 2.05, 2.4],
  ["Germany", "DE", 2.6, "2033-08-15", "AAA", 2.55, 6.6],
  ["Germany", "DE", 2.9, "2038-05-15", "AAA", 2.85, 10.4],
  ["France", "FR", 3.0, "2030-11-25", "AA-", 2.75, 4.6],
  ["France", "FR", 3.25, "2036-05-25", "AA-", 3.3, 8.6],
  ["Italy", "IT", 3.45, "2029-07-01", "BBB+", 2.95, 2.9],
  ["Italy", "IT", 4.0, "2035-04-30", "BBB+", 3.75, 7.6],
  ["Italy", "IT", 4.45, "2040-09-01", "BBB+", 4.15, 11.2],
  ["Spain", "ES", 3.15, "2031-04-30", "A", 2.95, 4.9],
  ["Spain", "ES", 3.55, "2037-10-31", "A", 3.5, 9.4],
  ["Portugal", "PT", 2.9, "2032-06-15", "A-", 2.85, 5.6],
  ["Austria", "AT", 2.9, "2034-02-20", "AA+", 2.8, 6.8],
  ["European Union", "EU", 3.0, "2039-03-04", "AAA", 3.05, 11.0],
  ["KfW", "DE", 2.75, "2031-02-15", "AAA", 2.45, 4.3],
  ["EIB", "EU", 2.875, "2035-01-15", "AAA", 2.85, 7.8],
  ["Eni", "IT", 3.875, "2031-01-15", "A-", 3.4, 4.3],
  ["Telefonica", "ES", 4.25, "2030-06-01", "BBB-", 3.35, 3.6],
  ["BMW", "DE", 3.625, "2031-05-22", "A", 3.05, 4.5],
  ["ING", "NL", 4.0, "2030-02-12", "A-", 3.3, 3.4],
  ["Verizon", "US", 4.375, "2031-03-30", "BBB+", 3.55, 4.6],
  ["L'Oreal", "FR", 3.75, "2031-11-18", "AA", 2.95, 5.0],
  ["Siemens", "DE", 3.875, "2031-09-05", "AA-", 3.05, 4.9],
  ["Nestle", "CH", 3.625, "2030-12-03", "AA-", 2.85, 4.2],
  ["TotalEnergies", "FR", 3.875, "2031-05-12", "A+", 3.15, 4.6],
  ["Sanofi", "FR", 3.75, "2030-09-14", "AA", 2.85, 4.1],
  ["Enel", "IT", 4.125, "2033-07-17", "BBB", 3.65, 6.2],
  ["Iberdrola", "ES", 3.375, "2032-11-22", "BBB+", 3.25, 5.8],
  ["Allianz", "DE", 4.5, "2034-03-07", "AA", 3.6, 6.8],
  ["AXA", "FR", 3.625, "2033-01-10", "AA-", 3.35, 6.1],
  ["Volkswagen", "DE", 4.75, "2029-09-08", "BBB+", 3.6, 2.8],
  ["Volkswagen", "DE", 4.625, "2034-11-13", "BBB+", 4.2, 7.0],
  ["Stellantis", "NL", 4.25, "2032-06-16", "BBB", 4.05, 5.4],
  ["Deutsche Bank", "DE", 4.0, "2032-07-12", "A-", 3.85, 5.3],
  ["BNP Paribas", "FR", 3.875, "2031-02-23", "A+", 3.25, 4.3],
  ["Santander", "ES", 3.75, "2030-01-09", "A", 3.15, 3.3],
  ["UniCredit", "IT", 4.45, "2033-02-16", "BBB+", 3.95, 5.8],
  ["Orange", "FR", 3.5, "2035-09-19", "BBB+", 3.6, 7.9],
  ["Vodafone", "GB", 4.0, "2036-03-10", "BBB", 4.0, 8.2],
  ["AB InBev", "BE", 3.95, "2038-03-22", "A-", 3.85, 9.8],
  ["E.ON", "DE", 3.75, "2036-01-15", "BBB+", 3.7, 8.1],
  ["RWE", "DE", 4.125, "2035-02-13", "BBB", 4.0, 7.4],
  ["Engie", "FR", 3.875, "2040-12-06", "BBB+", 4.05, 11.4],
  ["Unibail-Rodamco", "FR", 4.125, "2030-12-11", "BBB+", 3.9, 4.2],
  ["Vonovia", "DE", 4.25, "2034-04-10", "BBB+", 4.15, 6.8],
  ["Heineken", "NL", 3.5, "2029-03-15", "BBB+", 2.95, 2.5],
  ["Air France-KLM", "FR", 4.625, "2029-05-23", "BB+", 4.35, 2.7],
  ["Renault", "FR", 4.75, "2031-07-06", "BB+", 4.6, 4.4],
  ["Teva", "IL", 4.375, "2030-05-09", "BB", 5.1, 3.6],
  ["Netflix", "US", 3.875, "2029-11-15", "BBB+", 3.1, 3.0],
  ["Apple", "US", 3.6, "2027-11-13", "AA+", 2.6, 1.1],
  ["Repsol", "ES", 3.625, "2028-05-26", "BBB+", 2.75, 1.6],
  ["Daimler Truck", "DE", 3.375, "2028-09-23", "A-", 2.8, 1.9],
];

// A few invented dollar bonds, so the currency toggle has something to show on sample data.
const USD_ROWS: Row[] = [
  ["United States", "US", 4.0, "2030-02-15", "AA+", 3.9, 3.8],
  ["United States", "US", 4.25, "2035-05-15", "AA+", 4.3, 7.9],
  ["Apple", "US", 4.1, "2032-08-08", "AA+", 4.45, 5.5],
  ["Microsoft", "US", 3.9, "2031-03-17", "AAA", 4.3, 4.6],
  ["JPMorgan", "US", 4.9, "2034-07-25", "A", 5.1, 7.0],
  ["Ford", "US", 6.1, "2032-08-19", "BB+", 6.3, 5.2],
];

// Minimum order (nominal): governments and some issues sell in 1,000s; many company bonds only in 100,000s.
const minOrderOf = (i: number, issuer: string): number =>
  /Germany|France|Italy|Spain|Portugal|Austria|European Union|United States/.test(issuer) ? 1_000 : i % 3 === 0 ? 100_000 : 1_000;

const toBond = (currency: string, offset: number) => ([issuer, country, coupon, maturity, rating, ytm, duration]: Row, i: number): PublicBond => ({
  isin: `SAMPLE${String(offset + i + 1).padStart(6, "0")}`,
  name: `${issuer} ${coupon}% ${maturity.slice(0, 4)}`,
  issuer,
  country,
  currency,
  coupon,
  maturity,
  ratingSp: rating,
  ratingMoodys: null,
  ratingFitch: null,
  ratingResolved: rating,
  grossYtm: ytm,
  modifiedDuration: duration,
  ytmAsOf: null,
  minOrder: minOrderOf(offset + i, issuer),
});

export const SAMPLE_BONDS: PublicBond[] = [...ROWS.map(toBond("EUR", 0)), ...USD_ROWS.map(toBond("USD", ROWS.length))];
