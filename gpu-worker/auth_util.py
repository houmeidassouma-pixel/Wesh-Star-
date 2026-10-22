import hmac, os
from typing import Optional

def token_ok(value: Optional[str]) -> bool:
    """Fail-closed constant-time bearer check (empty TOKEN never authorizes)."""
    token = os.getenv("WESH_GPU_WORKER_TOKEN", "")
    if not token or not value:
        return False
    return hmac.compare_digest(value.encode(), ("Bearer " + token).encode())
