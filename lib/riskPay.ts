import { LOSS_GIVEN_DEFAULT } from "./expectedLoss";

// Risk Pay (Livio 25/10/2026, admin only):
//   Spread_bp       = 10,000 x (YTW_ask - Y_Bund)
//   ExpectedLoss_bp = 10,000 x PD_annual x LGD
//   RiskPay         = Spread_bp / ExpectedLoss_bp        (how many times the spread covers the expected default loss)
//   NetRiskPay      = Spread_bp - ExpectedLoss_bp
// PD_annual = the bond's cumulative default chance to maturity (10BONDS combined historical table, in %) / years left;
// LGD = 60%. It measures pay for expected default loss only, not the overall value of the bond.

export type RiskPay = { ratio: number | null; net: number; lossBp: number };

/** `pdPct`: cumulative default chance to maturity in %; `years`: years to maturity (the horizon of pd). Null without a spread. */
export function riskPay(spreadBp: number | null, pdPct: number | null | undefined, years: number | null | undefined): RiskPay | null {
  if (spreadBp === null || pdPct == null || years == null || !Number.isFinite(pdPct) || !Number.isFinite(years) || years <= 0) return null;
  const lossBp = (pdPct / years) * LOSS_GIVEN_DEFAULT * 100;
  return { ratio: lossBp > 0 ? spreadBp / lossBp : null, net: spreadBp - lossBp, lossBp };
}
