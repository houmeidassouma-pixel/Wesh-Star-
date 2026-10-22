# Wesh Star IA — local independence status

## Core: local/self-hosted
The following components run on infrastructure controlled by the owner:

- Web application: Next.js container
- Database: PostgreSQL container + persistent local volume
- Authentication: Wesh Star IA application/session system
- Storage: local persistent Docker volume (`/app/storage`)
- Text generation: Ollama container
- Video generation: Wesh Star IA GPU worker + Wan model
- Video assembly: FFmpeg
- Payments: Wesh Star IA Direct/manual confirmation
- Autopilot trend fallback: bundled local topics

## First-time downloads
The ZIP cannot physically contain Docker base images or multi-GB AI model weights. The first deployment therefore downloads those assets once. After they are stored in persistent local Docker volumes, runtime generation does not call a hosted AI/video provider.

## Unavoidable external services
These are not hidden AI dependencies:

1. Public Internet/DNS/domain if the website must be reachable from the Internet.
2. Official APIs/OAuth of TikTok, YouTube, Instagram, Facebook, Snapchat, X, LinkedIn and Twitch when publishing to those platforms.
3. An email transport if Wesh Star IA must send email from the server (or a mail server operated by the owner).

The project intentionally does not pretend these platform-owned services can be replaced while still publishing to those platforms.
