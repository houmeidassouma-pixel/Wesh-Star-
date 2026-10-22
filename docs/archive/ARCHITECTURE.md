# Wesh Star IA — current self-hosted architecture

```text
Browser
  │
  ▼
Wesh Star IA Next.js app ───── PostgreSQL (local Docker volume)
  │  │
  │  └────────────────────── local filesystem storage
  │
  ├── Ollama (local text AI)
  │
  └── GPU Worker (local NVIDIA GPU)
          │
          ├── Wan 2.1 model (persistent local model volume)
          └── FFmpeg / generated video (local volume)
```

The core runtime does not require Supabase, Stripe, Replicate, Kling, Hailuo, Runway or Anthropic.

External platform APIs are only used for features that inherently target an external platform, especially automatic publishing and OAuth account linking.
