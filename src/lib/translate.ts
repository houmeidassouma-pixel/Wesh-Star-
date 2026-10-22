// Wesh Star IA local-first translation hook.
// No hosted translation API is called. The UI uses its bundled dictionaries;
// unknown languages safely fall back to the supplied dictionary.
export async function autoTranslateUi(
  _lang: string,
  dict: Record<string, string>
): Promise<Record<string, string>> {
  return dict;
}
