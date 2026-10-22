import { cookies, headers } from "next/headers";
import { locales } from "./dictionaries";

const SUPPORTED: readonly string[] = locales;

// 1) Explicit user choice (cookie). 2) Browser Accept-Language (first visit,
// worldwide users see the app in their own language). 3) German default.
export function getLang(): string {
  const cookieLang = cookies().get("lang")?.value;
  if (cookieLang && SUPPORTED.includes(cookieLang)) return cookieLang;

  const accept = headers().get("accept-language") || "";
  for (const part of accept.split(",")) {
    const code = part.trim().split(";")[0].split("-")[0].toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }
  return "de";
}
