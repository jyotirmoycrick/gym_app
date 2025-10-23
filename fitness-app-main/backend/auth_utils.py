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
    """Get the current authenticated user from session token"""
    # Try to get session token from cookie first
    session_token = request.cookies.get('session_token')
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_token = auth_header.replace('Bearer ', '')
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session = await db.user_sessions.find_one({"session_token": session_token})
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if session is expired
    expires_at = session['expires_at']
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one({"_id": session['user_id']})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Map _id to id for Pydantic
    user_doc['id'] = user_doc.pop('_id')
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
