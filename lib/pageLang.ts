import { cookies } from "next/headers";
import { LANG_COOKIE } from "@/lib/seo/locales";

/** Language of a shared page: the footer link's ?lang=, otherwise the language picked in the header menu. */
export async function pickedLang(param: string | string[] | undefined): Promise<string | undefined> {
  const p = Array.isArray(param) ? param[0] : param;
  return p ?? (await cookies()).get(LANG_COOKIE)?.value;
}
