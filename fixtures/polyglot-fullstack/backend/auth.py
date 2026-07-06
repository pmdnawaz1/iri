# FastAPI backend (Python) — AUTH.LOGIN capability.
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_email(self, email: str):
        return self.db.query(User).filter(User.email == email).first()


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def login(self, email: str, password: str):
        user = self.user_repository.find_by_email(email)
        if user and user.password == password:
            return {"token": "jwt_token", "user_id": user.id}
        return None


@router.post("/login")
def login(email: str, password: str, auth_service: AuthService = Depends()):
    result = auth_service.login(email, password)
    if result:
        return result
    return {"error": "invalid credentials"}
