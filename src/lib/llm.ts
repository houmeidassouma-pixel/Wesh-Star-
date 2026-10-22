// Wesh Star IA local-only LLM adapter.
// Script generation runs on the owner's Ollama service. No hosted LLM API is
// called by this application.
export async function callLLM(system: string, userMessage: string, maxTokens = 1200): Promise<string> {
  const base = String(process.env.OLLAMA_URL || "http://ollama:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "llama3.2:3b";
  const res = await fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: { num_predict: maxTokens },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage }
      ]
    })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error("Local Ollama call failed (" + res.status + "): " + detail.slice(0, 300));
  }
  const data: any = await res.json();
  const text = String(data?.message?.content || "").trim();
  if (!text) throw new Error("Local Ollama returned empty output");
  return text;
}
