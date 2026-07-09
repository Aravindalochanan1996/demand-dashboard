from fastapi import APIRouter, HTTPException, status

from ..database import users_collection
from ..auth import verify_password, create_access_token
from ..schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = await users_collection.find_one({"username": payload.username})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return LoginResponse(access_token=token, role=user["role"], username=user["username"])
