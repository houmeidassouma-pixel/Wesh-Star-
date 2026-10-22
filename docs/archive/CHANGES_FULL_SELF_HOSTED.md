# Wesh Star IA — self-hosted architecture

The production path uses Wesh Star IA's own PostgreSQL, local filesystem storage, local Ollama text generation, local FFmpeg and the self-hosted GPU video worker.

The application no longer requires hosted AI providers for generation or text.

External integrations remain only where the requested feature inherently targets an external service (social-network publishing, public DNS/domain, email delivery, etc.).
