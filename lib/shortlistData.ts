import { loadBondsByIsin } from "./bonds";
import { importedFor } from "./bondImportDb";
import { detailOf } from "./shortlist";
import type { Shortlist } from "./shortlistDb";

/** Admin only: a shortlist with every bond's figures, the averages, and what the imported spreadsheets hold for its ISINs. */
export async function shortlistDetail(list: Shortlist) {
  const [found, imported] = await Promise.all([loadBondsByIsin(list.isins), importedFor(list.isins)]);
  return { ...list, ...detailOf(list.isins, found, list.bids), imported };
}
