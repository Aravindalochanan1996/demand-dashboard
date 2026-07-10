"""
Resume Analyzer - chatbot over uploaded resumes.

Business users and admins each upload their own set of PDF resumes; text is
extracted at upload time and stored. Asking a question (e.g. "which resume
has Java microservices, AI Engineering, and Prompt Engineering skills?")
sends all stored resume text + the question to Claude, which is instructed
to name the matching candidates.
"""
from datetime import datetime
from io import BytesIO

import pdfplumber
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from ..database import resume_files_collection
from ..auth import get_current_user
from ..schemas import ResumeFileOut, ResumeAskRequest
from ..ai_client import call_claude

router = APIRouter(prefix="/api/resume-analyzer", tags=["resume-analyzer"])

MAX_CHARS_PER_RESUME = 6000  # keep prompts a reasonable size


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")


def serialize(doc) -> ResumeFileOut:
    return ResumeFileOut(
        id=str(doc["_id"]),
        filename=doc["filename"],
        candidate_name=doc["candidate_name"],
        uploaded_at=doc["uploaded_at"],
    )


def _extract_text(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts).strip()


@router.post("/upload", response_model=list[ResumeFileOut])
async def upload_resumes(files: list[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    saved = []
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            continue  # silently skip non-PDFs, keep the rest processing
        content = await f.read()
        try:
            text = _extract_text(content)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not read {f.filename}: {exc}")

        candidate_name = f.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
        doc = {
            "owner_username": user["username"],
            "filename": f.filename,
            "candidate_name": candidate_name,
            "text": text[:20000],  # cap stored text per resume
            "uploaded_at": datetime.utcnow().isoformat(),
        }
        result = await resume_files_collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        saved.append(serialize(doc))

    if not saved:
        raise HTTPException(status_code=400, detail="No valid PDF files were uploaded")
    return saved


@router.get("/files", response_model=list[ResumeFileOut])
async def list_files(user: dict = Depends(get_current_user)):
    cursor = resume_files_collection.find({"owner_username": user["username"]})
    return [serialize(doc) async for doc in cursor]


@router.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    result = await resume_files_collection.delete_one(
        {"_id": _oid(file_id), "owner_username": user["username"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"deleted": True}


@router.post("/ask")
async def ask(payload: ResumeAskRequest, user: dict = Depends(get_current_user)):
    query = {"owner_username": user["username"]}
    if payload.file_ids:
        query["_id"] = {"$in": [_oid(fid) for fid in payload.file_ids]}

    cursor = resume_files_collection.find(query)
    resumes = [doc async for doc in cursor]
    if not resumes:
        raise HTTPException(status_code=400, detail="No uploaded resumes to search. Upload some PDFs first.")

    resume_blocks = []
    for r in resumes:
        text = r.get("text", "")[:MAX_CHARS_PER_RESUME]
        resume_blocks.append(f"### Candidate: {r['candidate_name']} (file: {r['filename']})\n{text}")

    system = (
        "You are a resume-screening assistant. You will be given several resumes and a "
        "question. Answer the question directly and, whenever the question is about which "
        "candidates match some criteria, start your answer with a short bulleted list of "
        "matching candidate names, then a one-line reason for each. If nobody matches, say "
        "so plainly. Only use information present in the resumes."
    )
    user_message = (
        f"Question: {payload.question}\n\n"
        + "\n\n".join(resume_blocks)
    )

    answer = await call_claude(system, user_message, max_tokens=1024)
    return {"answer": answer, "searched_resumes": [r["candidate_name"] for r in resumes]}
