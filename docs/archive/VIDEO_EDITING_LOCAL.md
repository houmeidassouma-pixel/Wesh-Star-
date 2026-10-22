# Wesh Star IA — Local Video Editing

## What was added

The Studio now contains **Modifier une vidéo avec l'IA**. A signed-in user can:

1. Upload their own video.
2. Upload a reference image (car, person, object, etc.).
3. Write an instruction such as `Ajoute cette voiture derrière moi`.
4. Run a self-hosted edit job.
5. Preview and download the edited video.

The current edit mode is **object behind subject**. A local human-segmentation model creates a foreground alpha mask, the reference object is composited between the original background and the foreground subject, and FFmpeg preserves the original audio.

## Self-hosting

- No Replicate, Runway, Kling, Supabase Storage, or other hosted video API is used.
- Input/output files stay in Wesh Star's local storage.
- The editor runs in the existing `gpu-worker` container.
- The first run downloads the configured local segmentation model into the worker cache.
- NVIDIA Container Toolkit is required for the existing local video-generation worker; the segmentation stage can use CPU if necessary.

## Important limitation

This version needs a **reference image** for the inserted object. A future text-to-object mode can generate the car/object image locally first, then feed it into this same compositor. The current implementation is deliberately deterministic and self-hosted rather than pretending a text-only generative editor is already present.

## New endpoints

- `POST /api/upload-video`
- `POST /api/video-edit`
- `GET /api/video-edit/status?jobId=...`
- GPU worker: `POST /v1/edit`
- GPU worker: `GET /v1/edit/{jobId}`
- GPU worker: `GET /v1/edit/{jobId}/video`
