from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from ..database import clients_collection, rows_collection
from ..auth import get_current_user
from ..schemas import ClientOut, RowOut, RowUpdateRequest, NON_EDITABLE_COLUMN_COUNT

router = APIRouter(prefix="/api/clients", tags=["clients"])


def serialize_client(doc) -> ClientOut:
    return ClientOut(id=str(doc["_id"]), name=doc["name"], columns=doc.get("columns", []))


def serialize_row(doc) -> RowOut:
    return RowOut(
        id=str(doc["_id"]),
        client_id=str(doc["client_id"]),
        data=doc.get("data", {}),
        last_edited_by=doc.get("last_edited_by"),
        last_edited_at=doc.get("last_edited_at"),
    )


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")


@router.get("", response_model=list[ClientOut])
async def list_clients(user: dict = Depends(get_current_user)):
    """Client tab list. Admin sees every client; business_user sees only assigned ones."""
    if user["role"] == "admin":
        cursor = clients_collection.find({})
    else:
        cursor = clients_collection.find({"name": {"$in": user.get("assigned_clients", [])}})
    return [serialize_client(doc) async for doc in cursor]


def _check_client_access(user: dict, client_name: str):
    if user["role"] != "admin" and client_name not in user.get("assigned_clients", []):
        raise HTTPException(status_code=403, detail="You do not have access to this client")


@router.get("/{client_id}/rows", response_model=list[RowOut])
async def get_rows(client_id: str, user: dict = Depends(get_current_user)):
    client_doc = await clients_collection.find_one({"_id": _oid(client_id)})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(user, client_doc["name"])

    cursor = rows_collection.find({"client_id": _oid(client_id), "deleted": {"$ne": True}})
    return [serialize_row(doc) async for doc in cursor]


@router.put("/{client_id}/rows/{row_id}", response_model=RowOut)
async def update_row(
    client_id: str,
    row_id: str,
    payload: RowUpdateRequest,
    user: dict = Depends(get_current_user),
):
    """Business users and admins can edit any column after the first
    NON_EDITABLE_COLUMN_COUNT columns of this client's column list."""
    client_doc = await clients_collection.find_one({"_id": _oid(client_id)})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(user, client_doc["name"])

    row_doc = await rows_collection.find_one(
        {"_id": _oid(row_id), "client_id": _oid(client_id), "deleted": {"$ne": True}}
    )
    if not row_doc:
        raise HTTPException(status_code=404, detail="Row not found")

    columns = client_doc.get("columns", [])
    editable_columns = set(columns[NON_EDITABLE_COLUMN_COUNT:])
    update_data = {k: v for k, v in payload.data.items() if k in editable_columns}
    if not update_data:
        raise HTTPException(status_code=400, detail="No editable fields provided")

    set_doc = {f"data.{k}": v for k, v in update_data.items()}
    set_doc["last_edited_by"] = user["username"]
    set_doc["last_edited_at"] = datetime.utcnow().isoformat()

    await rows_collection.update_one({"_id": row_doc["_id"]}, {"$set": set_doc})
    updated = await rows_collection.find_one({"_id": row_doc["_id"]})
    return serialize_row(updated)
