"""Authentication: JWT (HS256) + password bcrypt."""
from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Role, User, UserRole

SECRET = os.getenv("JWT_SECRET", "please_change_me_to_a_long_random_string")
ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def get_user_roles(session: Session, user_id: int) -> List[str]:
    rows = session.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    ).scalars().all()
    return list(rows)


def user_to_dict(user: User, roles: List[str]) -> Dict[str, Any]:
    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "roles": roles,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan")
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token tidak valid atau kedaluwarsa")
    from .db import get_engine

    engine = get_engine()
    if engine is None:
        raise HTTPException(status_code=503, detail="Database belum dikonfigurasi")
    with Session(engine) as session:
        user = session.get(User, user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=401, detail="Akun tidak ditemukan atau nonaktif")
        roles = get_user_roles(session, user.id)
        data = user_to_dict(user, roles)
        data["_user"] = user
        return data


def require_admin(user: Optional[dict] = Depends(get_current_user)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan")
    if not any(r in ("Super Admin", "Admin") for r in user.get("roles", [])):
        raise HTTPException(status_code=403, detail="Perlu hak akses admin")
    return user
