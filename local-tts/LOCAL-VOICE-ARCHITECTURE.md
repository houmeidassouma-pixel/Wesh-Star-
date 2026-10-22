# Wesh Star IA — Local voice architecture

- 98 selectable voice profiles
- 82 distinct Piper ONNX models
- multilingual catalog
- local synthesis through the existing `tts-worker`
- no TTS SaaS/API call at runtime
- models are downloaded once into `local-tts/models/`
- `core`, `popular`, and `all` installation packs

The web app keeps stable voice IDs for existing characters while adding the larger catalog.
