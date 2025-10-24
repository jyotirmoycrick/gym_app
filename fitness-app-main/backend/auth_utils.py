from fastapi import HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timezone
import bcrypt
from models import User, UserRole

async def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    if not hashed_password:
        return False
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

async def get_current_user(request: Request, db: AsyncIOMotorDatabase) -> Optional[User]:
    """Get the current authenticated user from session token (header or cookie)."""
    session_token = None

    # 1️⃣ Try cookie first
    if request.cookies.get('session_token'):
        session_token = request.cookies.get('session_token')

    # 2️⃣ Then Authorization header
    if not session_token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.lower().startswith('bearer '):  # <-- handles lowercase too
            session_token = auth_header.split(' ', 1)[1].strip()

    # 3️⃣ If still nothing, reject
    if not session_token:
        print("🚫 No session token found in headers or cookies")
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 4️⃣ Validate session
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        print(f"🚫 Invalid session: {session_token}")
        raise HTTPException(status_code=401, detail="Invalid session")

    # 5️⃣ Check expiry
    expires_at = session.get('expires_at')
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        print("⚠️ Session expired and deleted")
        raise HTTPException(status_code=401, detail="Session expired")

    # 6️⃣ Get user info
    user_doc = await db.users.find_one({"_id": session["user_id"]})
    if not user_doc:
        print("🚫 User not found for session")
        raise HTTPException(status_code=404, detail="User not found")

    user_doc["id"] = user_doc.pop("_id")
    print(f"✅ Authenticated user: {user_doc['name']} ({user_doc['role']})")
    return User(**user_doc)

async def get_current_gym_manager(request: Request, db: AsyncIOMotorDatabase) -> User:
    """Get current user and verify they are a gym manager"""
    user = await get_current_user(request, db)
    if user.role != UserRole.GYM_MANAGER:
        raise HTTPException(status_code=403, detail="Only gym managers can access this")
    return user

async def get_current_trainee(request: Request, db: AsyncIOMotorDatabase) -> User:
    """Get current user and verify they are a trainee"""
    user = await get_current_user(request, db)
    if user.role != UserRole.TRAINEE:
        raise HTTPException(status_code=403, detail="Only trainees can access this")
    return user

async def get_current_trainer(request: Request, db: AsyncIOMotorDatabase) -> User:
    """Get current user and verify they are a trainer"""
    user = await get_current_user(request, db)
    if user.role != UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Only trainers can access this")
    return user

async def get_current_head_admin(request: Request, db: AsyncIOMotorDatabase) -> User:
    """Get current user and verify they are a head admin"""
    user = await get_current_user(request, db)
    if user.role != UserRole.HEAD_ADMIN:
        raise HTTPException(status_code=403, detail="Only head admins can access this")
    return user
