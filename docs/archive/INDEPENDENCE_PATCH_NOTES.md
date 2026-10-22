# Wesh Star IA — independence patch

This patch makes the core runtime explicitly local-first.

### Changed
- Removed the Anthropic runtime fallback from the LLM adapter. Script/AI text generation now uses local Ollama only.
- Removed remote translation API calls. UI translation falls back to bundled dictionaries.
- Removed configurable remote trend API calls. Autopilot uses bundled local topics when no platform-owned trend feed is available.
- Removed active legacy Stripe database fields/table from the local schema.
- Added automatic Ollama model bootstrap to the self-hosted Docker stack.
- Strengthened `start-self-hosted.sh` so production secrets must be changed before startup.
- Added `SELF_HOSTED_INDEPENDENCE.md` documenting what is local and which integrations are inherently external.
- Replaced deployment documentation that instructed users to create/configure Supabase.

### Important
The ZIP cannot contain the physical GPU, Docker base images, or multi-GB model weights. Those are installed/downloaded once on the owner's machine.

Publishing to third-party social networks necessarily remains dependent on their official APIs/OAuth. A local application cannot publish into another company's platform without that platform's interface/authorization.
