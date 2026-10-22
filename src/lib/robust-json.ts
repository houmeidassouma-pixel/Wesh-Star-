/** Conservative JSON recovery for provider/worker responses.
 * It never evaluates code. Recovery attempts are bounded and only return parsed JSON.
 */
export function parseRobustJson<T = unknown>(input: string): T {
  const raw = String(input ?? "").replace(/^\uFEFF/, "").trim();
  if (!raw) throw new Error("Empty JSON response");
  const candidates: string[] = [raw];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  // Extract the first balanced object/array without being confused by braces in strings.
  for (let start = 0; start < raw.length; start++) {
    if (raw[start] !== "{" && raw[start] !== "[") continue;
    const stack: string[] = [];
    let inString = false, escaped = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") {
        const last = stack.pop();
        if ((ch === "}" && last !== "{") || (ch === "]" && last !== "[")) break;
        if (stack.length === 0) { candidates.push(raw.slice(start, i + 1)); break; }
      }
    }
  }
  const tried = new Set<string>();
  for (const candidate of candidates) {
    const variants = [candidate, candidate.replace(/,\s*([}\]])/g, "$1")];
    for (const variant of variants) {
      if (tried.has(variant)) continue;
      tried.add(variant);
      try { return JSON.parse(variant) as T; } catch { /* try next safe variant */ }
    }
  }
  throw new Error("Worker returned invalid JSON");
}
