"""
Thin wrapper around the Anthropic Messages API, shared by Resume Analyzer
(fully wired up) and Resume Builder's AI-suggestion stub. Reads the key from
ANTHROPIC_API_KEY in backend/.env - never exposed to the frontend.
"""
import httpx
from fastapi import HTTPException

from .config import settings

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


async def call_claude(system: str, user_message: str, max_tokens: int = 1024) -> str:
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not set in backend/.env - this feature needs it.",
        )

    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": settings.anthropic_model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user_message}],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(ANTHROPIC_URL, headers=headers, json=body)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {resp.text}")

    data = resp.json()
    text_blocks = [b["text"] for b in data.get("content", []) if b.get("type") == "text"]
    return "\n".join(text_blocks).strip()
