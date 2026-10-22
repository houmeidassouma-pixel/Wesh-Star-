import os, subprocess, tempfile, uuid, threading, math
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import requests
from PIL import Image

OUT = Path(os.getenv("WESH_OUTPUT_DIR", "/outputs"))
OUT.mkdir(parents=True, exist_ok=True)
TOKEN = os.getenv("WESH_GPU_WORKER_TOKEN", "")
from auth_util import token_ok
HOST = os.getenv("WESH_PUBLIC_BASE_URL", "http://localhost:8001").rstrip("/")
MAX_CONCURRENT = max(1, int(os.getenv("WESH_MAX_CONCURRENT", "1")))

jobs = {}
lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT)


def auth(value: Optional[str]):
    if not token_ok(value):
        raise RuntimeError("Unauthorized")


def download(url: str, dest: Path):
    headers = {"Authorization": "Bearer " + TOKEN} if TOKEN else {}
    with requests.get(url, headers=headers, stream=True, timeout=120) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_content(1024 * 1024):
                if chunk:
                    f.write(chunk)


def run_ffmpeg(args):
    p = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or "ffmpeg failed")[-2000:])


def composite_subject_behind(input_video: Path, asset: Path, output: Path, x: float, y: float, scale: float):
    """Insert an asset between the original background and the foreground person.

    The local RMBG/rembg model creates an alpha matte for each frame. This is a
    deliberately self-hosted edit: no image/video leaves the machine.
    """
    try:
        from rembg import remove, new_session
    except Exception as e:
        raise RuntimeError("Local background-removal model is not installed: " + str(e))
    import cv2
    import numpy as np

    with tempfile.TemporaryDirectory(prefix="wesh-edit-") as td:
        td = Path(td)
        frames = td / "frames"; frames.mkdir()
        alpha = td / "alpha"; alpha.mkdir()
        out_frames = td / "out"; out_frames.mkdir()
        run_ffmpeg(["-i", str(input_video), "-vsync", "0", str(frames / "%08d.png")])

        first = cv2.imread(str(frames / "00000001.png"), cv2.IMREAD_COLOR)
        if first is None:
            raise RuntimeError("Could not decode input video")
        h, w = first.shape[:2]

        asset_rgba = Image.open(asset).convert("RGBA")
        # Scale asset relative to video width. Preserve aspect ratio.
        target_w = max(1, int(w * max(0.05, min(scale, 2.0))))
        target_h = max(1, int(target_w * asset_rgba.height / max(1, asset_rgba.width)))
        asset_rgba = asset_rgba.resize((target_w, target_h), Image.LANCZOS)
        asset_rgba.save(td / "asset.png")
        asset_np = np.array(asset_rgba)
        asset_rgb = asset_np[:, :, :3][:, :, ::-1].copy()
        asset_a = asset_np[:, :, 3].astype(np.float32) / 255.0

        session = new_session(os.getenv("WESH_RMBG_MODEL", "u2net_human_seg"))
        frame_files = sorted(frames.glob("*.png"))
        for idx, fp in enumerate(frame_files):
            frame = cv2.imread(str(fp), cv2.IMREAD_COLOR)
            if frame is None: continue
            rgba = remove(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), session=session)
            rgba_np = np.array(rgba)
            if rgba_np.shape[2] < 4:
                raise RuntimeError("Background removal did not return alpha")
            person_a = rgba_np[:, :, 3].astype(np.float32) / 255.0
            person_a = cv2.GaussianBlur(person_a, (0, 0), 1.2)

            canvas = frame.copy()
            px = int(max(-target_w, min(w, x * w)))
            py = int(max(-target_h, min(h, y * h)))
            x1, y1 = max(0, px), max(0, py)
            x2, y2 = min(w, px + target_w), min(h, py + target_h)
            if x2 > x1 and y2 > y1:
                ax1, ay1 = x1 - px, y1 - py
                ax2, ay2 = ax1 + (x2-x1), ay1 + (y2-y1)
                aa = asset_a[ay1:ay2, ax1:ax2]
                ar = asset_rgb[ay1:ay2, ax1:ax2]
                # Put the asset over the original background, then restore the person.
                base = canvas[y1:y2, x1:x2].astype(np.float32)
                aa3 = aa[:, :, None]
                base = ar.astype(np.float32) * aa3 + base * (1-aa3)
                canvas[y1:y2, x1:x2] = np.clip(base, 0, 255).astype(np.uint8)

            # Restore foreground subject with original pixels.
            pa3 = person_a[:, :, None]
            original = frame.astype(np.float32)
            edited = canvas.astype(np.float32)
            result = original * pa3 + edited * (1-pa3)
            cv2.imwrite(str(out_frames / fp.name), np.clip(result, 0, 255).astype(np.uint8))

            if idx % 20 == 0:
                with lock: jobs[current_job]["progress"] = int(idx * 100 / max(1, len(frame_files)))

        # Preserve source frame rate.
        fps = subprocess.check_output(["ffprobe", "-v", "0", "-of", "csv=p=0", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", str(input_video)], text=True).strip() or "30/1"
        run_ffmpeg(["-framerate", fps, "-i", str(out_frames / "%08d.png"), "-i", str(input_video), "-map", "0:v:0", "-map", "1:a?", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(output)])


def render(job_id: str, req: dict):
    global current_job
    current_job = job_id
    try:
        with lock: jobs[job_id]["status"] = "processing"
        with tempfile.TemporaryDirectory(prefix="wesh-edit-job-") as td:
            td = Path(td)
            src = td / "input.mp4"; asset = td / "asset.png"; out = OUT / f"{job_id}.mp4"
            download(req["video_url"], src)
            download(req["asset_url"], asset)
            mode = req.get("mode", "object_behind_subject")
            if mode != "object_behind_subject":
                raise RuntimeError("Unsupported edit mode")
            composite_subject_behind(src, asset, out, float(req.get("x", 0.58)), float(req.get("y", 0.42)), float(req.get("scale", 0.28)))
        with lock: jobs[job_id].update({"status":"succeeded", "progress":100, "video_url":f"{HOST}/v1/edit/{job_id}/video"})
    except Exception as e:
        with lock: jobs[job_id].update({"status":"failed", "error":str(e)[:2000]})


def register(app):
    from fastapi import Header, HTTPException
    from fastapi.responses import FileResponse
    from pydantic import BaseModel, Field

    class EditRequest(BaseModel):
        video_url: str
        asset_url: str
        instruction: str = Field(default="Ajoute l'objet derrière la personne")
        mode: str = "object_behind_subject"
        x: float = Field(default=0.58, ge=-1, le=1)
        y: float = Field(default=0.42, ge=-1, le=1)
        scale: float = Field(default=0.28, ge=0.05, le=2)

    @app.post("/v1/edit")
    def create_edit(req: EditRequest, authorization: Optional[str] = Header(default=None)):
        if not token_ok(authorization):
            raise HTTPException(status_code=401, detail="Unauthorized")
        job_id = uuid.uuid4().hex
        with lock: jobs[job_id] = {"status":"starting", "progress":0, "video_url":None, "error":None}
        executor.submit(render, job_id, req.model_dump())
        return {"id":job_id, "status":"starting"}

    @app.get("/v1/edit/{job_id}")
    def edit_status(job_id: str, authorization: Optional[str] = Header(default=None)):
        if not token_ok(authorization): raise HTTPException(status_code=401, detail="Unauthorized")
        with lock: job = jobs.get(job_id)
        if not job: raise HTTPException(status_code=404, detail="Job not found")
        return {"id":job_id, **job}

    @app.get("/v1/edit/{job_id}/video")
    def edit_video(job_id: str, authorization: Optional[str] = Header(default=None)):
        if not token_ok(authorization): raise HTTPException(status_code=401, detail="Unauthorized")
        path = OUT / f"{job_id}.mp4"
        if not path.exists(): raise HTTPException(status_code=404, detail="Video not ready")
        return FileResponse(path, media_type="video/mp4", filename=f"{job_id}.mp4")
