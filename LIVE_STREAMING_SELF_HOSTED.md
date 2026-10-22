# Wesh Star — Live audio/video self-hosting

This patch adds a LiveKit SFU service and a signed-token endpoint for existing Wesh Star LIVE sessions. The existing Wesh Star database remains the authority for whether a room is live and whether a participant is blocked. The LiveKit token is issued only after those checks.

## Required configuration

Add to `.env`:

```dotenv
LIVEKIT_API_KEY=replace_with_random_key
LIVEKIT_API_SECRET=replace_with_at_least_32_random_bytes_hex
LIVEKIT_PUBLIC_URL=wss://live.your-domain.example
```

Generate a secret with `openssl rand -hex 32`. Configure DNS for the public hostname and terminate TLS using a reverse proxy or a supported TLS setup. Do not expose the server on a public domain without TLS and firewall rules. `LIVEKIT_PUBLIC_URL` must be reachable by browsers outside your local network; `localhost` only works for local testing.

## Network and media

The Compose service exposes LiveKit signaling on TCP 7880, optional ICE/TCP on 7881, UDP 7882 and UDP media range 50000–50100. Forward the ports through the host firewall/router and adjust the range in both `docker-compose.yml` and `livekit.yaml` to fit your network. For restrictive networks, configure a TURN relay with TLS and credentials before production; this project does not claim TURN relay has been provisioned automatically.

Start with `docker compose up -d --build`. Check `docker compose logs -f livekit wesh-ia-star`. The browser token endpoint is `/api/live/token`. The token expires after one hour. Do not use a short or default API secret in production.

## Scope and validation

The browser stage connects the camera/microphone to LiveKit, subscribes to other participants, and provides local mute/camera controls. Existing Wesh Star LIVE session state, guest approval, gifts and chests remain in the application database. Guest approval is not yet enforced as a LiveKit publish permission, so treat the multi-guest LIVE as a first integration version and test host/guest publishing permissions before public launch. Production validation must include two separate devices/networks, browser permissions, reconnects, firewall/NAT, TURN, load and abuse tests.
