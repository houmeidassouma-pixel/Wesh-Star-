import json, os, re, subprocess, tempfile, hmac
from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel

app = FastAPI(title="Wesh Star IA Local TTS")
MODELS = json.loads(Path("/app/voice-models.json").read_text())
MODEL_DIR = Path(os.getenv("WESH_TTS_MODEL_DIR", "/models"))
OUT_DIR = Path(os.getenv("WESH_TTS_OUTPUT_DIR", "/outputs")); OUT_DIR.mkdir(parents=True, exist_ok=True)
TOKEN = os.getenv("WESH_GPU_WORKER_TOKEN", "")

if not TOKEN:
    raise RuntimeError("WESH_GPU_WORKER_TOKEN must be configured for the local TTS worker")

def require_token(authorization: str | None):
    if not authorization or not hmac.compare_digest(authorization.encode(), ("Bearer " + TOKEN).encode()):
        raise HTTPException(401, "Unauthorized")

class Synthesize(BaseModel):
    text: str
    voice: str
    speed: float = 1.0

@app.get("/health")
def health():
    return {"status":"ok","backend":"piper-local","voices":len(MODELS)}

@app.get("/v1/voices")
def voices(authorization: str | None = Header(default=None)):
    require_token(authorization)
    return {"voices": [{"id":k, **v, "installed":(MODEL_DIR / v["model"]).exists()} for k,v in MODELS.items()]}

@app.post("/v1/synthesize")
def synthesize(req: Synthesize, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if req.voice not in MODELS: raise HTTPException(400, "Unknown Wesh Star IA voice")
    if not req.text.strip(): raise HTTPException(400, "Text is empty")
    cfg = MODELS[req.voice]; model = MODEL_DIR / cfg["model"]
    if not model.exists(): raise HTTPException(503, f"Local voice model not installed: {cfg['model']}")
    fd, wav = tempfile.mkstemp(suffix=".wav", dir=OUT_DIR); os.close(fd)
    try:
        cmd=["piper","--model",str(model),"--output_file",wav]
        if req.speed and req.speed > 0: cmd += ["--length_scale", str(1.0/req.speed)]
        subprocess.run(cmd,input=req.text.encode(),check=True,timeout=300)
        return {"audio_url":"/v1/audio/"+Path(wav).name,"voice":req.voice,"backend":"local"}
    except Exception as e:
        try: os.unlink(wav)
        except: pass
        raise HTTPException(500, str(e))

@app.get("/v1/audio/{name}")
def get_audio(name: str, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if not re.fullmatch(r"[A-Za-z0-9_\-]+\.wav", name):
        raise HTTPException(400, "Invalid audio name")
    f = OUT_DIR / name
    if not f.is_file():
        raise HTTPException(404, "Audio not found")
    return FileResponse(str(f), media_type="audio/wav", background=BackgroundTask(lambda: f.unlink(missing_ok=True)))
