# Wesh Star IA — Local TTS voice packs

The TTS worker uses Piper locally. No hosted TTS API is required at runtime.

## Packs
- `./install-models.sh core` — compact French/German/English pack.
- `./install-models.sh popular` — large multilingual pack.
- `./install-models.sh all` — prints the complete catalog download list.

Models are downloaded once into `local-tts/models/`. After installation, synthesis runs on your own machine/server/GPU/CPU without calling a TTS SaaS.

The catalog contains many distinct Piper models across French, German, English (US/UK), Spanish, Italian, Portuguese, Dutch, Polish, Russian, Arabic, Hindi, Turkish, Chinese, Swahili and Vietnamese.

Review each model's license/attribution before commercial redistribution.
