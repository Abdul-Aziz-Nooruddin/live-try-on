import os
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LiveTry-Server")

app = FastAPI(title="LiveTry WebRTC Virtual Try-On")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DIST_DIR = Path(__file__).parent / "dist"

# Key pool management
ACTIVE_KEY_INDEX = 0

def get_decart_key_pool() -> list[str]:
    raw = os.environ.get("DECART_API_KEY", "")
    keys = []
    if raw:
        for chunk in raw.split(","):
            c = chunk.strip().strip("'").strip('"')
            if c and c.startswith("dct_"):
                keys.append(c)
    return keys

@app.api_route("/api/tryon/token", methods=["GET", "POST"])
async def api_get_decart_token(request: Request):
    global ACTIVE_KEY_INDEX
    keys = get_decart_key_pool()
    if not keys:
        return JSONResponse(
            status_code=500,
            content={
                "status": "missing_api_key",
                "message": "DECART_API_KEY not configured in Space secrets.",
                "configured": False,
                "total_keys": 0
            }
        )

    force_rotate = False
    try:
        if request.method == "POST":
            body = await request.json()
            if body.get("rotate") or body.get("reason") in ("insufficient_credits", "session_limit"):
                force_rotate = True
    except Exception:
        pass

    if force_rotate:
        ACTIVE_KEY_INDEX = (ACTIVE_KEY_INDEX + 1) % len(keys)
        logger.info(f"Client requested key rotation. Switching to Key #{ACTIVE_KEY_INDEX + 1}/{len(keys)}")

    attempts = 0
    errors = []

    while attempts < len(keys):
        key_idx = (ACTIVE_KEY_INDEX + attempts) % len(keys)
        candidate_key = keys[key_idx]
        masked = candidate_key[:10] + "..." + candidate_key[-4:]

        try:
            req = urllib.request.Request(
                "https://api.decart.ai/v1/client/tokens",
                data=b"{}",
                headers={
                    "X-API-KEY": candidate_key,
                    "Content-Type": "application/json",
                    "User-Agent": "LiveTry/1.0"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                ACTIVE_KEY_INDEX = key_idx
                logger.info(f"Successfully minted client token using Key #{key_idx + 1}/{len(keys)} ({masked})")
                return {
                    "status": "success",
                    "configured": True,
                    "key_index": key_idx + 1,
                    "total_keys": len(keys),
                    **data
                }
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")[:160]
            logger.warning(f"Key #{key_idx + 1} HTTP {e.code}: {err_body}")
            errors.append(f"Key #{key_idx + 1} HTTP {e.code}: {err_body}")
            attempts += 1
        except Exception as e:
            logger.error(f"Unexpected error minting token with Key #{key_idx + 1}: {e}")
            attempts += 1

    return JSONResponse(
        status_code=502,
        content={
            "status": "error",
            "message": "All Decart keys in pool failed or exhausted.",
            "errors": errors
        }
    )

@app.get("/api/tryon/config")
async def api_get_config():
    keys = get_decart_key_pool()
    return {
        "engine": "decart-webrtc",
        "decart_configured": len(keys) > 0,
        "total_keys": len(keys),
        "models": {
            "realtime": "lucy-vton-latest",
            "fps": 30
        }
    }

# Static assets
if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

if (DIST_DIR / "fixtures").exists():
    app.mount("/fixtures", StaticFiles(directory=str(DIST_DIR / "fixtures")), name="fixtures")

# Page routes
@app.get("/")
async def serve_index():
    return FileResponse(str(DIST_DIR / "index.html"))

@app.get("/pdp")
@app.get("/pdp/")
async def serve_pdp():
    return FileResponse(str(DIST_DIR / "pdp" / "index.html"))

@app.get("/collection")
@app.get("/collection/")
async def serve_collection():
    return FileResponse(str(DIST_DIR / "collection" / "index.html"))

@app.get("/styleguide")
@app.get("/styleguide/")
async def serve_styleguide():
    return FileResponse(str(DIST_DIR / "styleguide" / "index.html"))

# Catch-all for files in root of dist
@app.get("/{file_path:path}")
async def serve_static_file(file_path: str):
    target = DIST_DIR / file_path
    if target.is_file():
        return FileResponse(str(target))
    # fallback to pdp or index
    return FileResponse(str(DIST_DIR / "pdp" / "index.html"))
