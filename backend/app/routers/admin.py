from datetime import datetime
from io import BytesIO

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from openpyxl import load_workbook

from ..database import clients_collection, rows_collection, users_collection
from ..auth import require_admin, hash_password
from ..schemas import RowOut, CreateUserRequest, UserOut
from .clients import serialize_row

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Maps the header text you'd see in the spreadsheet to the field name stored in Mongo.
# Matching is case-insensitive and ignores extra whitespace.
HEADER_MAP = {
    "date": "date",
    "role": "role",
    "required positions": "required_positions",
    "profiles submitted": "profiles_submitted",
    "drop out profile": "drop_out_profile",
    "pending interview": "pending_interview",
    "interview round 1": "interview_round1",
    "interview round1": "interview_round1",
    "interview round 2": "interview_round2",
    "interview round2": "interview_round2",
    "selected": "selected",
}


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")


def _normalize_header(text: str) -> str:
    return " ".join(str(text).strip().lower().split())


@router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Please upload a .xlsx file")

    content = await file.read()
    wb = load_workbook(filename=BytesIO(content), data_only=True)

    summary = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows_iter = ws.iter_rows(values_only=True)
        try:
            header_row = next(rows_iter)
        except StopIteration:
            continue  # empty sheet

        col_fields = [HEADER_MAP.get(_normalize_header(h)) if h else None for h in header_row]
        if not any(col_fields):
            continue  # sheet doesn't look like a data table, skip it

        # Skip a "Total" row at the bottom, and skip fully blank rows
        parsed_rows = []
        for raw_row in rows_iter:
            if raw_row is None or all(v is None for v in raw_row):
                continue
            first_cell = str(raw_row[0]).strip().lower() if raw_row[0] is not None else ""
            if first_cell == "total":
                continue

            row_doc = {}
            for idx, field in enumerate(col_fields):
                if field is None or idx >= len(raw_row):
                    continue
                value = raw_row[idx]
                if field in ("date", "role"):
                    row_doc[field] = str(value) if value is not None else None
                else:
                    row_doc[field] = float(value) if isinstance(value, (int, float)) else value
            if row_doc:
                parsed_rows.append(row_doc)

        # Find or create the client for this sheet
        client_doc = await clients_collection.find_one({"name": sheet_name})
        if not client_doc:
            result = await clients_collection.insert_one({"name": sheet_name})
            client_id = result.inserted_id
        else:
            client_id = client_doc["_id"]

        # This upload replaces the *active* rows for this client with the sheet's contents.
        # Rows that were soft-deleted stay in the deleted-rows archive untouched.
        await rows_collection.delete_many({"client_id": client_id, "deleted": {"$ne": True}})

        now = datetime.utcnow().isoformat()
        for row_doc in parsed_rows:
            row_doc["client_id"] = client_id
            row_doc["deleted"] = False
            row_doc["last_edited_by"] = admin["username"]
            row_doc["last_edited_at"] = now
            await rows_collection.insert_one(row_doc)

        summary.append({"client": sheet_name, "rows_imported": len(parsed_rows)})

    return {"message": "Upload complete", "summary": summary}


@router.delete("/clients/{client_id}/rows/{row_id}", response_model=RowOut)
async def delete_row(client_id: str, row_id: str, admin: dict = Depends(require_admin)):
    row_doc = await rows_collection.find_one(
        {"_id": _oid(row_id), "client_id": _oid(client_id), "deleted": {"$ne": True}}
    )
    if not row_doc:
        raise HTTPException(status_code=404, detail="Row not found")

    await rows_collection.update_one(
        {"_id": row_doc["_id"]},
        {
            "$set": {
                "deleted": True,
                "deleted_by": admin["username"],
                "deleted_at": datetime.utcnow().isoformat(),
            }
        },
    )
    updated = await rows_collection.find_one({"_id": row_doc["_id"]})
    return serialize_row(updated)


@router.get("/clients/{client_id}/rows/deleted", response_model=list[RowOut])
async def get_deleted_rows(client_id: str, admin: dict = Depends(require_admin)):
    cursor = rows_collection.find({"client_id": _oid(client_id), "deleted": True})
    return [serialize_row(doc) async for doc in cursor]


@router.get("/last-edited")
async def last_edited(admin: dict = Depends(require_admin)):
    """Returns the most recent edit across all clients, plus per-client last edit."""
    cursor = rows_collection.find(
        {"deleted": {"$ne": True}, "last_edited_by": {"$ne": None}}
    ).sort("last_edited_at", -1)

    most_recent = None
    per_client = {}
    async for doc in cursor:
        client_doc = await clients_collection.find_one({"_id": doc["client_id"]})
        client_name = client_doc["name"] if client_doc else str(doc["client_id"])
        entry = {
            "client": client_name,
            "row_id": str(doc["_id"]),
            "edited_by": doc.get("last_edited_by"),
            "edited_at": doc.get("last_edited_at"),
        }
        if most_recent is None:
            most_recent = entry
        if client_name not in per_client:
            per_client[client_name] = entry

    return {"most_recent": most_recent, "per_client": list(per_client.values())}


@router.post("/users", response_model=UserOut)
async def create_user(payload: CreateUserRequest, admin: dict = Depends(require_admin)):
    if payload.role not in ("admin", "business_user"):
        raise HTTPException(status_code=400, detail="role must be 'admin' or 'business_user'")

    existing = await users_collection.find_one({"username": payload.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    await users_collection.insert_one(
        {
            "username": payload.username,
            "password_hash": hash_password(payload.password),
            "role": payload.role,
            "assigned_clients": payload.assigned_clients,
        }
    )
    return UserOut(username=payload.username, role=payload.role, assigned_clients=payload.assigned_clients)


@router.get("/users", response_model=list[UserOut])
async def list_users(admin: dict = Depends(require_admin)):
    cursor = users_collection.find({})
    return [
        UserOut(
            username=doc["username"],
            role=doc["role"],
            assigned_clients=doc.get("assigned_clients", []),
        )
        async for doc in cursor
    ]
