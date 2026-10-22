import os, uuid, threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from fastapi import Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

TOKEN = os.getenv("WESH_GPU_WORKER_TOKEN", "")
from auth_util import token_ok
OUT = Path(os.getenv("WESH_OUTPUT_DIR", "/outputs"))
OUT.mkdir(parents=True, exist_ok=True)
HOST = os.getenv("WESH_PUBLIC_BASE_URL", "http://localhost:8001").rstrip("/")
ASSET_MODEL_ID = os.getenv("WESH_ASSET_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
ASSET_STEPS = int(os.getenv("WESH_ASSET_STEPS", "25"))
MAX_ASSET_CONCURRENT = max(1, int(os.getenv("WESH_ASSET_MAX_CONCURRENT", "1")))
asset_jobs = {}
asset_lock = threading.Lock()
asset_executor = ThreadPoolExecutor(max_workers=MAX_ASSET_CONCURRENT)
asset_pipe = None
asset_pipe_lock = threading.Lock()

class AssetRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=1000)
    width: int = Field(default=768, ge=512, le=1024)
    height: int = Field(default=768, ge=512, le=1024)


def auth(value: Optional[str]):
    if not token_ok(value):
        raise HTTPException(status_code=401, detail="Unauthorized")


def load_asset_pipeline():
    global asset_pipe
    with asset_pipe_lock:
        if asset_pipe is None:
            import torch
            if not torch.cuda.is_available():
                raise RuntimeError("No NVIDIA CUDA GPU is available")
            from diffusers import StableDiffusionXLPipeline
            asset_pipe = StableDiffusionXLPipeline.from_pretrained(
                ASSET_MODEL_ID,
                torch_dtype=torch.float16,
                use_safetensors=True,
                variant="fp16",
            )
            asset_pipe.enable_model_cpu_offload()
        return asset_pipe


def remove_background(src: Path, dst: Path):
    # Local RMBG: the generated object is converted to transparent PNG so the
    # video editor can place it behind the detected foreground subject.
    from PIL import Image
    from rembg import remove
    image = Image.open(src).convert("RGBA")
    result = remove(image)
    result.save(dst, "PNG")


def generate_scene_image(prompt: str, width: int = 768, height: int = 1024):
    """Generate one local scene reference image and return its PIL image.
    Used by the automatic natural-language image->video pipeline.
    """
    pipe = load_asset_pipeline()
    full_prompt = (
        "Cinematic storyboard keyframe for a video scene. Show every requested visual element clearly, "
        "with consistent composition, natural interaction, coherent lighting, no text, no watermark. "
        + str(prompt)
    )
    negative = "text, watermark, duplicate subjects, missing objects, cropped objects, deformed, blurry"
    result = pipe(
        prompt=full_prompt,
        negative_prompt=negative,
        width=max(512, min(1024, int(width))),
        height=max(512, min(1024, int(height))),
        num_inference_steps=ASSET_STEPS,
        guidance_scale=7.0,
    )
    return result.images[0]


def render_asset(job_id: str, req: AssetRequest):
    try:
        with asset_lock:
            asset_jobs[job_id]["status"] = "generating"
        pipe = load_asset_pipeline()
        prompt = (
            "A single photorealistic isolated object, centered, full object visible, "
            "studio product photography, clean silhouette, no people, no text, no logo clutter. "
            + req.prompt
        )
        negative = "people, person, human, cropped, duplicate object, text, watermark, blurry, distorted"
        result = pipe(
            prompt=prompt,
            negative_prompt=negative,
            width=req.width,
            height=req.height,
            num_inference_steps=ASSET_STEPS,
            guidance_scale=7.0,
        )
        raw = OUT / f"{job_id}-raw.png"
        final = OUT / f"{job_id}.png"
        result.images[0].save(raw)
        remove_background(raw, final)
        try:
            raw.unlink()
        except OSError:
            pass
        with asset_lock:
            asset_jobs[job_id].update({
                "status": "succeeded",
                "image_url": f"{HOST}/v1/assets/{job_id}/image",
            })
    except Exception as exc:
        with asset_lock:
            asset_jobs[job_id].update({"status": "failed", "error": str(exc)[:1000]})


def register_asset_generator(app):
    @app.post("/v1/assets/generate")
    def create_asset(req: AssetRequest, authorization: Optional[str] = Header(default=None)):
        auth(authorization)
        job_id = uuid.uuid4().hex
        with asset_lock:
            asset_jobs[job_id] = {"status": "starting", "image_url": None, "error": None}
        asset_executor.submit(render_asset, job_id, req)
        return {"id": job_id, "status": "starting"}

    @app.get("/v1/assets/{job_id}")
    def get_asset(job_id: str, authorization: Optional[str] = Header(default=None)):
        auth(authorization)
        with asset_lock:
            job = asset_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Asset job not found")
        return {"id": job_id, **job}

    @app.get("/v1/assets/{job_id}/image")
    def get_asset_image(job_id: str, authorization: Optional[str] = Header(default=None)):
        auth(authorization)
        path = OUT / f"{job_id}.png"
        if not path.exists():
            raise HTTPException(status_code=404, detail="Image not ready")
        return FileResponse(path, media_type="image/png", filename=f"{job_id}.png")
