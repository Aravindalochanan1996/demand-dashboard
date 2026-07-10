"""
Resume Builder - basic structure, inspired by Novoresume's flow: fill in
sections on the left (personal info, summary, experience, education, skills),
see a live formatted preview, save a draft. One draft per user for now.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ..database import resume_drafts_collection
from ..auth import get_current_user
from ..schemas import ResumeDraftIn, ResumeDraftOut, AiSuggestRequest
from ..ai_client import call_claude

router = APIRouter(prefix="/api/resume-builder", tags=["resume-builder"])


def serialize(doc) -> ResumeDraftOut:
    return ResumeDraftOut(
        id=str(doc["_id"]),
        full_name=doc.get("full_name"),
        title=doc.get("title"),
        summary=doc.get("summary"),
        experience=doc.get("experience", []),
        education=doc.get("education", []),
        skills=doc.get("skills", []),
        owner_username=doc["owner_username"],
    )


@router.get("", response_model=Optional[ResumeDraftOut])
async def get_draft(user: dict = Depends(get_current_user)):
    doc = await resume_drafts_collection.find_one({"owner_username": user["username"]})
    return serialize(doc) if doc else None


@router.put("", response_model=ResumeDraftOut)
async def save_draft(payload: ResumeDraftIn, user: dict = Depends(get_current_user)):
    doc = payload.dict()
    doc["owner_username"] = user["username"]
    await resume_drafts_collection.update_one(
        {"owner_username": user["username"]}, {"$set": doc}, upsert=True
    )
    updated = await resume_drafts_collection.find_one({"owner_username": user["username"]})
    return serialize(updated)


@router.post("/ai-suggest")
async def ai_suggest(payload: AiSuggestRequest, user: dict = Depends(get_current_user)):
    """Demonstrates the ANTHROPIC_API_KEY wiring: drafts a short suggestion for
    one resume section (e.g. summary) based on free-text context the user gives."""
    system = (
        "You write concise, professional resume content. Given a section name and "
        "rough context from the user, return only the polished text for that section "
        "with no preamble, no markdown, under 80 words."
    )
    user_message = f"Section: {payload.section}\nContext: {payload.context}"
    suggestion = await call_claude(system, user_message, max_tokens=300)
    return {"suggestion": suggestion}
