import os, uuid, threading, subprocess, hmac, json, tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import torch
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

MODEL_ID = os.getenv("WESH_VIDEO_MODEL", "Wan-AI/Wan2.1-T2V-1.3B-Diffusers")
# Reference target: NVIDIA CUDA GPU with roughly 24 GB VRAM for the bundled
# T2V model and CPU-offloaded optional I2V path.
I2V_MODEL_ID = os.getenv("WESH_I2V_MODEL", "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers")
TOKEN = os.getenv("WESH_GPU_WORKER_TOKEN", "")
if not TOKEN:
    raise RuntimeError("WESH_GPU_WORKER_TOKEN must be configured for the GPU worker")
OUT = Path(os.getenv("WESH_OUTPUT_DIR", "/outputs"))
OUT.mkdir(parents=True, exist_ok=True)
HOST = os.getenv("WESH_PUBLIC_BASE_URL", "http://localhost:8001").rstrip("/")
MAX_CONCURRENT = max(1, int(os.getenv("WESH_MAX_CONCURRENT", "1")))

app = FastAPI(title="Wesh IA Star GPU Engine", version="1.0.0")
jobs = {}
lock = threading.Lock()
STATE_FILE = Path(os.getenv("WESH_JOBS_STATE_FILE", str(OUT / "jobs-state.json")))
executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT)


def save_jobs_locked():
    """Atomically persist job metadata; caller must hold `lock`. Prompts are never stored."""
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix="jobs-state-", suffix=".tmp", dir=str(STATE_FILE.parent))
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(jobs, handle, ensure_ascii=False, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, STATE_FILE)
    except Exception as exc:
        # Job processing should not crash solely because state persistence failed.
        print(f"[job-state] persistence failed: {exc}", flush=True)


def load_jobs():
    """Restore status metadata after restart; in-flight diffusion jobs cannot resume mid-render."""
    try:
        raw = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return
        for job_id, value in raw.items():
            if not isinstance(job_id, str) or not all(c in "0123456789abcdef" for c in job_id.lower()) or not isinstance(value, dict):
                continue
            status = value.get("status")
            if status not in {"starting", "processing", "succeeded", "failed", "canceled"}:
                continue
            output = OUT / f"{job_id}.mp4"
            restored = {"status": status, "video_url": value.get("video_url"), "error": value.get("error")}
            if status in {"starting", "processing"}:
                if output.is_file() and output.stat().st_size > 0:
                    restored.update({"status": "succeeded", "video_url": f"{HOST}/v1/jobs/{job_id}/video", "error": None})
                else:
                    restored.update({"status": "failed", "video_url": None, "error": "Worker redémarré pendant le rendu; relance la génération."})
            elif status == "succeeded" and (not output.is_file() or output.stat().st_size == 0):
                restored.update({"status": "failed", "video_url": None, "error": "Fichier de sortie introuvable après redémarrage."})
            jobs[job_id] = restored
    except FileNotFoundError:
        return
    except Exception as exc:
        print(f"[job-state] restore failed: {exc}", flush=True)


load_jobs()
pipe = None
i2v_pipe = None
pipe_lock = threading.Lock()

class JobRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=12000)
    image_url: Optional[str] = None
    duration_seconds: int = Field(default=5, ge=3, le=10)
    width: int = Field(default=480, ge=256, le=1280)
    height: int = Field(default=832, ge=256, le=1280)
    fps: int = Field(default=16, ge=8, le=24)
    auto_image: bool = False

def auth(value: Optional[str]):
    if not value or not hmac.compare_digest(value.encode(), ("Bearer " + TOKEN).encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")

def load_pipeline():
    global pipe
    with pipe_lock:
        if pipe is None:
            if not torch.cuda.is_available():
                raise RuntimeError("No NVIDIA CUDA GPU is available")
            from diffusers import AutoencoderKLWan, WanPipeline
            vae = AutoencoderKLWan.from_pretrained(MODEL_ID, subfolder="vae", torch_dtype=torch.float32)
            pipe = WanPipeline.from_pretrained(MODEL_ID, vae=vae, torch_dtype=torch.bfloat16)
            pipe.enable_model_cpu_offload()
        return pipe

def load_i2v_pipeline():
    global i2v_pipe
    with pipe_lock:
        if i2v_pipe is None:
            if not torch.cuda.is_available():
                raise RuntimeError("No NVIDIA CUDA GPU is available")
            from diffusers import DiffusionPipeline
            i2v_pipe = DiffusionPipeline.from_pretrained(I2V_MODEL_ID, torch_dtype=torch.bfloat16)
            # Keep the larger I2V model usable on a 24 GB-class GPU by
            # offloading layers between CPU and CUDA instead of forcing the
            # whole pipeline into VRAM. It remains fully local/self-hosted.
            i2v_pipe.enable_model_cpu_offload()
        return i2v_pipe

def render(job_id: str, req: JobRequest):
    try:
        with lock:
            jobs[job_id]["status"] = "processing"
            save_jobs_locked()
        # Wan uses 4*k+1 frames. The reference worker intentionally uses a
        # short clip to keep VRAM requirements practical; long Wesh IA Star jobs
        # are assembled from these clips by the existing Node worker.
        seconds = min(req.duration_seconds, 10)
        frames = 4 * max(1, int(seconds * req.fps / 4)) + 1
        if req.image_url or req.auto_image:
            # Automatic natural-language generation first creates a local
            # storyboard/reference image, then feeds that image into the local
            # Wan I2V model. Uploaded images continue to work unchanged.
            if req.image_url:
                from diffusers.utils import load_image
                image = load_image(req.image_url)
            else:
                from asset_gen import generate_scene_image
                image = generate_scene_image(req.prompt, req.width, req.height)
            pipeline = load_i2v_pipeline()
            result = pipeline(
                image=image,
                prompt=req.prompt,
                height=req.height,
                width=req.width,
                num_frames=frames,
                guidance_scale=5.0,
                num_inference_steps=int(os.getenv("WESH_STEPS", "20")),
            )
        else:
            pipeline = load_pipeline()
            result = pipeline(
                prompt=req.prompt,
                height=req.height,
                width=req.width,
                num_frames=frames,
                guidance_scale=5.0,
                num_inference_steps=int(os.getenv("WESH_STEPS", "20")),
            )
        video_frames = result.frames[0]
        path = OUT / f"{job_id}.mp4"
        from diffusers.utils import export_to_video
        export_to_video(video_frames, str(path), fps=req.fps)
        with lock:
            jobs[job_id].update({
                "status": "succeeded",
                "video_url": f"{HOST}/v1/jobs/{job_id}/video",
                "error": None,
            })
            save_jobs_locked()
    except Exception as e:
        with lock:
            jobs[job_id].update({"status": "failed", "video_url": None, "error": str(e)[:1000]})
            save_jobs_locked()

@app.get("/health")
def health(authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    return {"ok": True, "gpu": torch.cuda.is_available(), "model": MODEL_ID, "i2v_model": I2V_MODEL_ID, "queue": len(jobs)}

@app.post("/v1/jobs")
def create_job(req: JobRequest, authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    job_id = uuid.uuid4().hex
    with lock:
        jobs[job_id] = {"status": "starting", "video_url": None, "error": None}
        save_jobs_locked()
    executor.submit(render, job_id, req)
    return {"id": job_id, "status": "starting"}

@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str, authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    with lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"id": job_id, **job}

@app.get("/v1/jobs/{job_id}/video")
def get_video(job_id: str, authorization: Optional[str] = Header(default=None)):
    auth(authorization)
    path = OUT / f"{job_id}.mp4"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video not ready")
    return FileResponse(path, media_type="video/mp4", filename=f"{job_id}.mp4")

# Local video editor: object/asset insertion behind the detected foreground subject.
# Kept in the same self-hosted GPU worker so no third-party video API is required.
from video_edit import register as register_video_editor
register_video_editor(app)
from asset_gen import register_asset_generator
register_asset_generator(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
