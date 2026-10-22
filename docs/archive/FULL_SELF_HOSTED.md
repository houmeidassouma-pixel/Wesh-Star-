# Wesh Star IA — full self-hosted mode

Wesh Star IA's core application is designed to run on infrastructure controlled by the owner: PostgreSQL, authentication, file storage, Ollama, FFmpeg and the GPU video worker all run locally.

No Supabase, Stripe, Replicate, Kling, Hailuo, Runway or Anthropic account is required for core operation.

External platform APIs are only needed for features that inherently communicate with another platform, such as automatic publishing to TikTok/YouTube/Instagram/Facebook/Snapchat/X/LinkedIn/Twitch. These cannot be replaced by a local file because the destination platform controls its own account/API.
