"""
ATS Tracker - basic structure.

Modeled loosely after the job-tracking flow used by well-regarded tools like
Huntr and Teal (a simple Kanban of applications by status). Scoped per user:
each business_user/admin tracks their own applications.
"""
from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from ..database import ats_entries_collection
from ..auth import get_current_user
from ..schemas import AtsEntryIn, AtsEntryOut

router = APIRouter(prefix="/api/ats", tags=["ats"])

VALID_STATUSES = ["Applied", "Interview", "Offer", "Rejected"]


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")


def serialize(doc) -> AtsEntryOut:
    return AtsEntryOut(
        id=str(doc["_id"]),
        company=doc["company"],
        role=doc["role"],
        status=doc.get("status", "Applied"),
        applied_date=doc.get("applied_date"),
        notes=doc.get("notes"),
        owner_username=doc["owner_username"],
    )


@router.get("", response_model=list[AtsEntryOut])
async def list_entries(user: dict = Depends(get_current_user)):
    cursor = ats_entries_collection.find({"owner_username": user["username"]})
    return [serialize(doc) async for doc in cursor]


@router.post("", response_model=AtsEntryOut)
async def create_entry(payload: AtsEntryIn, user: dict = Depends(get_current_user)):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")
    doc = payload.dict()
    doc["owner_username"] = user["username"]
    doc["created_at"] = datetime.utcnow().isoformat()
    result = await ats_entries_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.put("/{entry_id}", response_model=AtsEntryOut)
async def update_entry(entry_id: str, payload: AtsEntryIn, user: dict = Depends(get_current_user)):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")
    existing = await ats_entries_collection.find_one(
        {"_id": _oid(entry_id), "owner_username": user["username"]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")

    await ats_entries_collection.update_one({"_id": existing["_id"]}, {"$set": payload.dict()})
    updated = await ats_entries_collection.find_one({"_id": existing["_id"]})
    return serialize(updated)


@router.delete("/{entry_id}")
async def delete_entry(entry_id: str, user: dict = Depends(get_current_user)):
    result = await ats_entries_collection.delete_one(
        {"_id": _oid(entry_id), "owner_username": user["username"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"deleted": True}
