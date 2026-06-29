# FastAPI decorator routing (TSPEC-A021 parity).
from fastapi import APIRouter

router = APIRouter()


@router.post("/login")
def login(email: str):
    return {"token": "jwt", "email": email}


@router.get("/teams")
def list_teams():
    return []
