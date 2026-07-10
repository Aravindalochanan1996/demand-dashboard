from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import ensure_indexes
from .routers import auth, clients, admin, ats, resume_builder, resume_analyzer

app = FastAPI(title="Demand Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(admin.router)
app.include_router(ats.router)
app.include_router(resume_builder.router)
app.include_router(resume_analyzer.router)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
