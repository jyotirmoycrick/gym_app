from fastapi import FastAPI, APIRouter, HTTPException, Request,Depends, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import qrcode
import io
import base64
import requests
from ai_utils import GPTChat
from datetime import timedelta

IST_OFFSET = timedelta(hours=5, minutes=30)

# Import models
from models import *
from auth_utils import *

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
import certifi

mongo_url = os.environ['MONGO_URL']
# Handle both local and Atlas MongoDB connections
if "mongodb+srv" in mongo_url or "mongodb.net" in mongo_url:
    # Atlas connection with SSL using certifi certificates
    client = AsyncIOMotorClient(
        mongo_url,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000
    )
else:
    # Local MongoDB connection
    client = AsyncIOMotorClient(mongo_url)
    
db_name = os.environ.get('DB_NAME', 'fitdesert')
db = client[db_name]

# Initialize Razorpay client (we'll use test mode for now)
# Note: User needs to provide RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'test_key')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'test_secret')

# Initialize Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="FitDesert API")

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== AUTHENTICATION ROUTES ====================

@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    """Register a new user with JWT authentication"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = await hash_password(user_data.password)
    
    # Create user document
    user_id = f"user_{datetime.utcnow().timestamp()}"
    user_doc = {
        "_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": user_data.role.value,
        "phone": user_data.phone,
        "picture": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{user_id}_{datetime.utcnow().timestamp()}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    return {
        "message": "User registered successfully",
        "session_token": session_token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role.value
        }
    }

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    """Login user with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not await verify_password(login_data.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{user_doc['_id']}_{datetime.utcnow().timestamp()}"
    session_doc = {
        "user_id": user_doc['_id'],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    return {
        "message": "Login successful",
        "session_token": session_token,
        "user": {
            "id": user_doc['_id'],
            "email": user_doc['email'],
            "name": user_doc['name'],
            "role": user_doc['role'],
            "picture": user_doc.get('picture')
        }
    }

@api_router.get("/auth/session-data")
async def get_session_data(x_session_id: str = Header(...)):
    """Get user data from Emergent OAuth session ID"""
    try:
        # Call Emergent auth service
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session_data = response.json()
        
        # Check if user exists
        user_doc = await db.users.find_one({"email": session_data['email']})
        
        if not user_doc:
            # Create new user (default to trainee role for OAuth users)
            user_id = f"user_{datetime.utcnow().timestamp()}"
            user_doc = {
                "_id": user_id,
                "email": session_data['email'],
                "name": session_data['name'],
                "picture": session_data.get('picture'),
                "role": UserRole.TRAINEE.value,
                "phone": None,
                "password": None,  # OAuth users don't have password
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(user_doc)
        
        # Create/update session
        session_token = session_data['session_token']
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.update_one(
            {"session_token": session_token},
            {
                "$set": {
                    "user_id": user_doc['_id'],
                    "session_token": session_token,
                    "expires_at": expires_at,
                    "created_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        return {
            "id": user_doc['_id'],
            "email": user_doc['email'],
            "name": user_doc['name'],
            "picture": user_doc.get('picture'),
            "session_token": session_token
        }
        
    except Exception as e:
        logger.error(f"OAuth session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user_info(request: Request):
    """Get current authenticated user info"""
    user = await get_current_user(request, db)
    return user

@api_router.post("/auth/logout")
async def logout_user(request: Request):
    """Logout user and delete session"""
    session_token = request.cookies.get('session_token')
    if not session_token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            session_token = auth_header.replace('Bearer ', '')
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    return {"message": "Logged out successfully"}

@api_router.post("/auth/change-password")
async def change_password(request: Request, old_password: str, new_password: str):
    """Change user password"""
    user = await get_current_user(request, db)
    
    # Get current user with password
    user_doc = await db.users.find_one({"_id": user.id})
    
    # Verify old password (skip for first-time users)
    if user_doc.get('password') and not user_doc.get('must_change_password'):
        if not await verify_password(old_password, user_doc['password']):
            raise HTTPException(status_code=400, detail="Incorrect old password")
    
    # Hash new password
    new_hashed = await hash_password(new_password)
    
    # Update password
    await db.users.update_one(
        {"_id": user.id},
        {"$set": {
            "password": new_hashed,
            "must_change_password": False
        }}
    )
    
    return {"message": "Password changed successfully"}


# ==================== GYM ROUTES ====================

@api_router.post("/gyms/create")
async def create_gym_by_admin(request: Request, gym_data: GymCreate, owner_email: str, password: str):
    """Create a gym for a user (Head Admin only)"""
    user = await get_current_head_admin(request, db)
    
    # Hash the password
    hashed_password = await hash_password(password)
    
    # Find or create gym owner
    owner = await db.users.find_one({"email": owner_email})
    if not owner:
        # Create gym manager account
        owner_id = f"user_{datetime.utcnow().timestamp()}"
        owner_doc = {
            "_id": owner_id,
            "email": owner_email,
            "name": gym_data.name + " Manager",
            "role": UserRole.GYM_MANAGER.value,
            "phone": gym_data.phone,
            "password": hashed_password,
            "picture": None,
            "created_at": datetime.now(timezone.utc),
            "must_change_password": False
        }
        await db.users.insert_one(owner_doc)
        owner_id = owner_id
    else:
        owner_id = owner['_id']
    
    # Generate QR code
    # Reuse gym_id if it already exists
    gym_id = f"gym_{datetime.utcnow().timestamp()}"

    # Generate QR data (static per gym)
    qr_data = f"fitdesert://gym/{gym_id}/attendance"

    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Create gym document
    gym_doc = {
        "_id": gym_id,
        "name": gym_data.name,
        "address": gym_data.address,
        "city": gym_data.city,
        "state": gym_data.state,
        "owner_id": owner_id,
        "qr_code": qr_code_base64,
        "kyc_verified": True,
        "is_active": True,
        "phone": gym_data.phone,
        "email": gym_data.email,
        "registration_date": datetime.now(timezone.utc),
        "subscription_plan": "premium",
        "subscription_expiry": datetime.now(timezone.utc) + timedelta(days=365)
    }
    
    await db.gyms.insert_one(gym_doc)
    
    return {
        "message": "Gym created successfully",
        "gym_id": gym_id,
        "owner_email": owner_email,
        "qr_code": qr_code_base64
    }

@api_router.post("/gyms/register")
async def register_gym(request: Request, gym_data: GymCreate):
    """Register a new gym (Gym Manager only)"""
    user = await get_current_gym_manager(request, db)
    
    # Check if user already has a gym
    existing_gym = await db.gyms.find_one({"owner_id": user.id})
    if existing_gym:
        raise HTTPException(status_code=400, detail="You already have a gym registered")
    
    # Generate QR code
    gym_id = f"gym_{datetime.utcnow().timestamp()}"
    qr_data = f"fitdesert://attendance/{gym_id}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Create gym document
    gym_doc = {
        "_id": gym_id,
        "name": gym_data.name,
        "address": gym_data.address,
        "city": gym_data.city,
        "state": gym_data.state,
        "owner_id": user.id,
        "qr_code": qr_code_base64,
        "kyc_verified": False,
        "is_active": True,
        "phone": gym_data.phone,
        "email": gym_data.email,
        "registration_date": datetime.now(timezone.utc),
        "subscription_plan": "basic",
        "subscription_expiry": datetime.now(timezone.utc) + timedelta(days=30)
    }
    
    await db.gyms.insert_one(gym_doc)
    
    return {
        "message": "Gym registered successfully",
        "gym_id": gym_id,
        "qr_code": qr_code_base64
    }

@api_router.get("/gyms/my-gym")
async def get_my_gym(request: Request):
    """Get gym for current gym manager"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    # Get stats
    total_members = await db.members.count_documents({"gym_id": gym['_id']})
    active_members = await db.members.count_documents({
        "gym_id": gym['_id'],
        "status": MembershipStatus.ACTIVE.value
    })
    
    # Get today's attendance
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_attendance = await db.attendance.count_documents({
        "gym_id": gym['_id'],
        "date": today
    })
    
    gym['_id'] = gym.pop('_id') if '_id' in gym else gym.get('id')
    gym['stats'] = {
        "total_members": total_members,
        "active_members": active_members,
        "today_attendance": today_attendance
    }
    
    return gym

@api_router.get("/gyms/all")
async def get_all_gyms(request: Request):
    """Get all gyms (Head Admin only)"""
    user = await get_current_head_admin(request, db)
    
    gyms = await db.gyms.find().to_list(1000)
    
    # Enrich with stats
    for gym in gyms:
        total_members = await db.members.count_documents({"gym_id": gym['_id']})
        active_members = await db.members.count_documents({
            "gym_id": gym['_id'],
            "status": MembershipStatus.ACTIVE.value
        })
        gym['id'] = gym.pop('_id')
        gym['stats'] = {
            "total_members": total_members,
            "active_members": active_members
        }
    
    return gyms

@api_router.get("/gyms/{gym_id}")
async def get_gym_details(request: Request, gym_id: str):
    """Get gym details"""
    user = await get_current_user(request, db)
    
    gym = await db.gyms.find_one({"_id": gym_id})
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    return gym

@api_router.put("/gyms/{gym_id}")
async def update_gym(request: Request, gym_id: str, gym_data: GymCreate):
    """Update gym details (Head Admin only)"""
    user = await get_current_head_admin(request, db)
    
    result = await db.gyms.update_one(
        {"_id": gym_id},
        {"$set": {
            "name": gym_data.name,
            "address": gym_data.address,
            "city": gym_data.city,
            "state": gym_data.state,
            "phone": gym_data.phone,
            "email": gym_data.email
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    return {"message": "Gym updated successfully"}

@api_router.put("/gyms/{gym_id}/subscription")
async def update_gym_subscription(request: Request, gym_id: str, plan: str, duration_days: int = 30):
    """Update gym subscription plan (Head Admin only)"""
    user = await get_current_head_admin(request, db)
    
    if plan not in ["basic", "pro", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    new_expiry = datetime.now(timezone.utc) + timedelta(days=duration_days)
    
    result = await db.gyms.update_one(
        {"_id": gym_id},
        {"$set": {
            "subscription_plan": plan,
            "subscription_expiry": new_expiry
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    return {"message": "Subscription updated successfully", "new_expiry": new_expiry}

@api_router.put("/gyms/{gym_id}/status")
async def toggle_gym_status(request: Request, gym_id: str, is_active: bool):
    """Activate or suspend gym (Head Admin only)"""
    user = await get_current_head_admin(request, db)
    
    result = await db.gyms.update_one(
        {"_id": gym_id},
        {"$set": {"is_active": is_active}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gym not found")
    
    status = "activated" if is_active else "suspended"
    return {"message": f"Gym {status} successfully"}

@api_router.delete("/gyms/{gym_id}")
async def delete_gym(request: Request, gym_id: str):
    """Permanently delete gym (Head Admin only)"""
    user = await get_current_head_admin(request, db)
    
    # Delete gym and all related data
    await db.gyms.delete_one({"_id": gym_id})
    await db.members.delete_many({"gym_id": gym_id})
    await db.attendance.delete_many({"gym_id": gym_id})
    await db.workout_plans.delete_many({"gym_id": gym_id})
    await db.diet_plans.delete_many({"gym_id": gym_id})
    await db.progress_logs.delete_many({"gym_id": gym_id})
    await db.payments.delete_many({"gym_id": gym_id})
    
    return {"message": "Gym and all related data deleted successfully"}


# ==================== MEMBER ROUTES ====================

@api_router.post("/members")
async def add_member(request: Request, member_data: MemberCreate):
    """Add a new member (Gym Manager only)"""
    user = await get_current_gym_manager(request, db)
    
    # Get gym
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found for this manager")
    
    # Check if member already exists
    existing_member = await db.users.find_one({"email": member_data.email})
    
    if existing_member:
        # Check if already a member of this gym
        existing_membership = await db.members.find_one({
            "user_id": existing_member['_id'],
            "gym_id": gym['_id']
        })
        if existing_membership:
            raise HTTPException(status_code=400, detail="User is already a member")
        user_id = existing_member['_id']
    else:
        # Create user account for trainee or trainer
        user_id = f"user_{datetime.utcnow().timestamp()}"
        hashed_password = await hash_password(member_data.password)
        
        role = UserRole.TRAINER.value if member_data.is_trainer else UserRole.TRAINEE.value
        
        user_doc = {
            "_id": user_id,
            "email": member_data.email,
            "name": member_data.name,
            "phone": member_data.phone,
            "role": role,
            "picture": member_data.photo,
            "password": hashed_password,
            "created_at": datetime.now(timezone.utc),
            "must_change_password": False
        }
        await db.users.insert_one(user_doc)
    
    # Calculate membership expiry
    try:
        plan_duration = int(member_data.plan_duration_months or 1)
    except Exception:
        plan_duration = 1  # default 1 month if conversion fails

    expiry_date = datetime.now(timezone.utc) + timedelta(days=plan_duration * 30)

    
    # Create member document
    member_id = f"member_{datetime.utcnow().timestamp()}"
    member_doc = {
        "_id": member_id,
        "user_id": user_id,
        "gym_id": gym['_id'],
        "role": role,
        "photo": member_data.photo,
        "contact_info": member_data.phone,
        "joining_date": datetime.now(timezone.utc),
        "membership_plan": member_data.membership_plan,
        "plan_duration_months": member_data.plan_duration_months,
        "membership_expiry": expiry_date,
        "goal": member_data.goal,
        "assigned_trainer_id": member_data.assigned_trainer_id,
        "status": MembershipStatus.ACTIVE.value,
        "height": member_data.height,
        "weight": member_data.weight,
        "age": member_data.age
    }
    
    await db.members.insert_one(member_doc)
    
    return {
        "message": "Member added successfully",
        "member_id": member_id,
        "user_id": user_id
    }



@api_router.get("/trainers")
async def get_all_trainers(request: Request):
    """Get all trainers for gym manager"""
    user = await get_current_gym_manager(request, db)

    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")

    trainers_cursor = db.members.find({"gym_id": gym["_id"], "role": UserRole.TRAINER.value})
    trainers = await trainers_cursor.to_list(100)

    for t in trainers:
        user_data = await db.users.find_one({"_id": t["user_id"]})
        if user_data:
            t["user_name"] = user_data["name"]
            t["user_email"] = user_data["email"]
        t["id"] = t.pop("_id")
    return trainers



@api_router.get("/members")
async def get_all_members(request: Request):
    """Get all members for gym manager"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    members = await db.members.find({"gym_id": gym['_id']}).to_list(1000)
    
    # Enrich with user data
    for member in members:
        user_data = await db.users.find_one({"_id": member['user_id']})
        if user_data:
            member['user_name'] = user_data['name']
            member['user_email'] = user_data['email']
        member['id'] = member.pop('_id')
    
    return members

@api_router.get("/members/my-profile")
async def get_my_profile(request: Request):
    """Get member profile for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        return {"message": "No membership found", "member": None}
    
    # Get gym details
    gym = await db.gyms.find_one({"_id": member['gym_id']})
    
    member['id'] = member.pop('_id')
    member['gym_name'] = gym['name'] if gym else None
    member['gym_qr'] = gym['qr_code'] if gym else None
    
    return member

@api_router.get("/members/{member_id}")
async def get_member_details(request: Request, member_id: str):
    """Allow gym managers and trainers"""
    user = await get_current_user(request, db)

    if user.role not in [UserRole.GYM_MANAGER, UserRole.TRAINER, UserRole.HEAD_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")

    member = await db.members.find_one({"_id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    user_data = await db.users.find_one({"_id": member['user_id']})
    if user_data:
        member['user_name'] = user_data['name']
        member['user_email'] = user_data['email']

    member['id'] = member.pop('_id')
    return member


@api_router.put("/members/{member_id}")
async def update_member(request: Request, member_id: str, member_data: MemberCreate):
    """Update member details"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    # Update member
    result = await db.members.update_one(
        {"_id": member_id, "gym_id": gym['_id']},
        {"$set": {
            "membership_plan": member_data.membership_plan,
            "plan_duration_months": member_data.plan_duration_months,
            "goal": member_data.goal,
            "assigned_trainer_id": member_data.assigned_trainer_id,
            "height": member_data.height,
            "weight": member_data.weight,
            "age": member_data.age
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"message": "Member updated successfully"}

@api_router.put("/members/{member_id}/assign-trainer")
async def assign_trainer(request: Request, member_id: str, trainer_id: str):
    """Assign trainer to member"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    result = await db.members.update_one(
        {"_id": member_id, "gym_id": gym['_id']},
        {"$set": {"assigned_trainer_id": trainer_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"message": "Trainer assigned successfully"}

@api_router.delete("/members/{member_id}")
async def delete_member(request: Request, member_id: str):
    """Delete member"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    # Get member to find user_id
    member = await db.members.find_one({"_id": member_id, "gym_id": gym['_id']})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Delete member and related data
    await db.members.delete_one({"_id": member_id})
    await db.attendance.delete_many({"member_id": member_id})
    await db.workout_plans.delete_many({"member_id": member_id})
    await db.diet_plans.delete_many({"member_id": member_id})
    await db.progress_logs.delete_many({"member_id": member_id})
    await db.payments.delete_many({"member_id": member_id})

    # 🚨 Also delete user from users collection if not part of another gym
    user_id = member["user_id"]
    other_memberships = await db.members.count_documents({"user_id": user_id})
    if other_memberships == 0:
        await db.users.delete_one({"_id": user_id})

    
    return {"message": "Member deleted successfully"}


# ==================== ATTENDANCE ROUTES ====================

@api_router.post("/attendance/scan")
async def mark_attendance(request: Request):
    """
    Handles trainee attendance via QR scan.
    Extracts gym_id automatically from QR data (e.g., "fitdesert://gym/gym_12345/attendance").
    Detects check-in or check-out automatically.
    """
    user = await get_current_user(request, db)

    try:
        body = await request.json()
        qr_code = body.get("qr_code")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body format")

    if not qr_code:
        raise HTTPException(status_code=400, detail="QR code missing")

    # Extract gym_id (works for both "fitdesert://gym/gym_1234/attendance" and old formats)
    import re
    match = re.search(r"gym_(\d+(?:\.\d+)?)", qr_code)
    gym_id = f"gym_{match.group(1)}" if match else None

    if not gym_id:
        raise HTTPException(status_code=400, detail="Invalid QR code format")

    # ✅ Rest of your logic remains the same
    gym = await db.gyms.find_one({"_id": gym_id})
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")

    if user.role == UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Trainers cannot mark attendance")

    member = await db.members.find_one({"user_id": user.id, "gym_id": gym_id})
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this gym")

    if member["status"] != MembershipStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Membership inactive")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.attendance.find_one({
        "member_id": member["_id"],
        "gym_id": gym_id,
        "date": today
    })
    
    if not existing:
        attendance_id = f"att_{datetime.utcnow().timestamp()}"
        await db.attendance.insert_one({
            "_id": attendance_id,
            "member_id": member["_id"],
            "gym_id": gym_id,
            "check_in_time": datetime.now(timezone.utc) + IST_OFFSET,
            "check_out_time": None,
            "date": today
        })
        return {"message": "Checked in successfully", "type": "check_in"}

    elif existing.get("check_out_time") is None:
        await db.attendance.update_one(
            {"_id": existing["_id"]},
            {"$set": {"check_out_time": datetime.now(timezone.utc)+ IST_OFFSET }}
        )
        return {"message": "Checked out successfully", "type": "check_out"}

    else:
        raise HTTPException(status_code=400, detail="Already checked in and out for today")


@api_router.get("/attendance/my-history")
async def get_my_attendance_history(request: Request):
    """Get attendance history for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    attendance_records = await db.attendance.find({
        "member_id": member['_id']
    }).sort("check_in_time", -1).limit(30).to_list(30)
    
    for record in attendance_records:
        record['id'] = record.pop('_id')
    
    return attendance_records

# @api_router.get("/gym-stats" ,response_model=None)
# def gym_stats(date: Optional[str] = None, current_user=Depends(get_current_user)):
#     if date:
#         target_date = datetime.strptime(date, "%Y-%m-%d").date()
#     else:
#         target_date = datetime.now().date()

#     today_records = db.query(Attendance).filter(
#         Attendance.gym_id == current_user.gym_id,
#         Attendance.check_in_time >= datetime.combine(target_date, datetime.min.time()),
#         Attendance.check_in_time <= datetime.combine(target_date, datetime.max.time())
#     ).all()

#     week_start = target_date - timedelta(days=target_date.weekday())
#     week_end = week_start + timedelta(days=6)
#     week_count = db.query(Attendance).filter(
#         Attendance.gym_id == current_user.gym_id,
#         Attendance.check_in_time >= datetime.combine(week_start, datetime.min.time()),
#         Attendance.check_in_time <= datetime.combine(week_end, datetime.max.time())
#     ).count()

#     return {
#         "today_count": len(today_records),
#         "today_records": [r.to_dict() for r in today_records],
#         "week_count": week_count,
#     }


@api_router.get("/attendance/gym-stats")
async def get_gym_attendance_stats(request: Request, date: Optional[str] = None):
    """
    Get attendance stats for gym manager (supports ?date=YYYY-MM-DD)
    """
    user = await get_current_gym_manager(request, db)

    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")

    # 🗓 Handle date filtering correctly
    try:
        if date:
            # Parse provided date to match DB format
            target_date_obj = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            start_of_day = target_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
        else:
            # Default: today's date range
            start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # ✅ Filter attendance by datetime range (works even if stored as datetime)
    today_records = await db.attendance.find({
        "gym_id": gym["_id"],
        "check_in_time": {"$gte": start_of_day, "$lt": end_of_day}
    }).to_list(1000)

    # 📆 Weekly stats
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_records = await db.attendance.find({
        "gym_id": gym["_id"],
        "check_in_time": {"$gte": week_ago}
    }).to_list(1000)

    print(f"📅 Final filter range: {start_of_day} → {end_of_day}")
    print(f"✅ Found {len(today_records)} records")

    return {
        "selected_date": date or start_of_day.strftime("%Y-%m-%d"),
        "today_count": len(today_records),
        "week_count": len(week_records),
        "today_records": today_records,
    }
@api_router.put("/members/{member_id}/extend")
async def extend_member_subscription(request: Request, member_id: str, extra_days: int = 30):
    """Extend a member's subscription manually"""
    user = await get_current_gym_manager(request, db)

    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")

    member = await db.members.find_one({"_id": member_id, "gym_id": gym["_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    new_expiry = (
        member.get("membership_expiry", datetime.now(timezone.utc)) + timedelta(days=extra_days)
    )

    await db.members.update_one(
        {"_id": member_id},
        {"$set": {"membership_expiry": new_expiry}}
    )

    return {"message": "Membership extended", "new_expiry": new_expiry}

@api_router.get("/payments/gym/all")
async def get_gym_payments(request: Request):
    """Get all payments for gym manager"""
    user = await get_current_gym_manager(request, db)

    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")

    payments = await db.payments.find({"gym_id": gym["_id"]}).sort("created_at", -1).to_list(100)
    for p in payments:
        p["id"] = p.pop("_id")
    return payments

@api_router.get("/payments/gym-payments")
async def get_gym_payments(request: Request):
    """Get all successful payments for the gym manager"""
    user = await get_current_gym_manager(request, db)

    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")

    payments = await db.payments.find({
        "gym_id": gym["_id"],
        "status": PaymentStatus.SUCCESS.value
    }).sort("created_at", -1).limit(100).to_list(100)

    # attach member names
    for p in payments:
        member = await db.members.find_one({"_id": p["member_id"]})
        if member:
            user_doc = await db.users.find_one({"_id": member["user_id"]})
            p["member_name"] = user_doc["name"] if user_doc else "Unknown"
        p["id"] = p.pop("_id")

    return payments

@api_router.post("/attendance/checkout")
async def checkout_attendance(request: Request, gym_id: str):
    """Mark checkout time for trainees"""
    user = await get_current_user(request, db)

    # Prevent trainers
    if user.role == UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Trainers do not mark attendance")

    # Find today's attendance record
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    attendance = await db.attendance.find_one({
        "gym_id": gym_id,
        "member_id": f"member_{user.id}",
        "date": today
    })

    if not attendance:
        raise HTTPException(status_code=404, detail="No check-in record found for today")

    # Update with checkout time
    await db.attendance.update_one(
        {"_id": attendance["_id"]},
        {"$set": {"check_out_time": datetime.now(timezone.utc)}}
    )

    return {"message": "Checkout recorded successfully"}


# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/create-order")
async def create_payment_order(request: Request, payment_data: PaymentCreate):
    """Create Razorpay payment order"""
    user = await get_current_user(request, db)
    
    # Get member
    member = await db.members.find_one({"_id": payment_data.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Create payment record
    payment_id = f"pay_{datetime.utcnow().timestamp()}"
    payment_doc = {
        "_id": payment_id,
        "member_id": payment_data.member_id,
        "gym_id": member['gym_id'],
        "amount": payment_data.amount,
        "payment_type": payment_data.payment_type.value,
        "status": PaymentStatus.SUCCESS.value,
        "created_at": datetime.now(timezone.utc)
    }
    
    # For testing, we'll create a mock order
    # In production, use: razorpay_client.order.create({...})
    order_id = f"order_{datetime.utcnow().timestamp()}"
    payment_doc['razorpay_order_id'] = order_id
    
    await db.payments.insert_one(payment_doc)
    
    return {
        "order_id": order_id,
        "amount": payment_data.amount * 100,  # Convert to paise
        "currency": "INR",
        "payment_id": payment_id
    }

@api_router.post("/payments/verify")
async def verify_payment(
    payment_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str
):
    """Verify Razorpay payment"""
    # In production, verify signature using razorpay_client.utility.verify_payment_signature
    
    # Update payment record
    await db.payments.update_one(
        {"_id": payment_id},
        {
            "$set": {
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
                "status": PaymentStatus.SUCCESS.value,
                "payment_date": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "Payment verified successfully"}

@api_router.get("/payments/my-payments")
async def get_my_payments(request: Request):
    """Get payment history for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    payments = await db.payments.find({
        "member_id": member['_id']
    }).sort("created_at", -1).to_list(100)
    
    for payment in payments:
        payment['id'] = payment.pop('_id')
    
    return payments


# ==================== WORKOUT PLAN ROUTES ====================

@api_router.post("/plans/workout")
async def create_workout_plan(request: Request, plan_data: WorkoutPlanCreate):
    """Create workout plan (Gym Manager only for Phase 1)"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    # Verify member belongs to this gym
    member = await db.members.find_one({
        "_id": plan_data.member_id,
        "gym_id": gym['_id']
    })
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym")
    
    plan_id = f"workout_{datetime.utcnow().timestamp()}"
    plan_doc = {
        "_id": plan_id,
        "member_id": plan_data.member_id,
        "trainer_id": user.id,
        "gym_id": gym['_id'],
        "plan_name": plan_data.plan_name,
        "workout_days": [day.dict() for day in plan_data.workout_days],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.workout_plans.insert_one(plan_doc)
    
    return {
        "message": "Workout plan created successfully",
        "plan_id": plan_id
    }

@api_router.get("/plans/workout/my-plan")
async def get_my_workout_plan(request: Request):
    """Get workout plan for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    plan = await db.workout_plans.find_one({"member_id": member['_id']})
    if not plan:
        return {"message": "No workout plan found", "plan": None}
    
    plan['id'] = plan.pop('_id')
    return plan


# ==================== DIET PLAN ROUTES ====================

@api_router.post("/plans/diet")
async def create_diet_plan(request: Request, plan_data: DietPlanCreate):
    """Create diet plan (Gym Manager only for Phase 1)"""
    user = await get_current_gym_manager(request, db)
    
    gym = await db.gyms.find_one({"owner_id": user.id})
    if not gym:
        raise HTTPException(status_code=404, detail="No gym found")
    
    # Verify member belongs to this gym
    member = await db.members.find_one({
        "_id": plan_data.member_id,
        "gym_id": gym['_id']
    })
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your gym")
    
    plan_id = f"diet_{datetime.utcnow().timestamp()}"
    plan_doc = {
        "_id": plan_id,
        "member_id": plan_data.member_id,
        "trainer_id": user.id,
        "gym_id": gym['_id'],
        "plan_name": plan_data.plan_name,
        "daily_meals": [meal.dict() for meal in plan_data.daily_meals],
        "total_calories": plan_data.total_calories,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.diet_plans.insert_one(plan_doc)
    
    return {
        "message": "Diet plan created successfully",
        "plan_id": plan_id
    }

@api_router.get("/plans/diet/my-plan")
async def get_my_diet_plan(request: Request):
    """Get diet plan for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    plan = await db.diet_plans.find_one({"member_id": member['_id']})
    if not plan:
        return {"message": "No diet plan found", "plan": None}
    
    plan['id'] = plan.pop('_id')
    return plan


# ==================== PROGRESS TRACKING ROUTES ====================

@api_router.post("/progress")
async def log_progress(request: Request, progress_data: ProgressLogCreate):
    """Log progress for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    progress_id = f"prog_{datetime.utcnow().timestamp()}"
    progress_doc = {
        "_id": progress_id,
        "member_id": member['_id'],
        "gym_id": member['gym_id'],
        "weight": progress_data.weight,
        "body_fat_percentage": progress_data.body_fat_percentage,
        "measurements": progress_data.measurements,
        "photos": progress_data.photos,
        "notes": progress_data.notes,
        "logged_date": datetime.now(timezone.utc)
    }
    
    await db.progress_logs.insert_one(progress_doc)
    
    return {
        "message": "Progress logged successfully",
        "progress_id": progress_id
    }

@api_router.get("/progress/my-history")
async def get_my_progress(request: Request):
    """Get progress history for trainee"""
    user = await get_current_trainee(request, db)
    
    member = await db.members.find_one({"user_id": user.id})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    progress_logs = await db.progress_logs.find({
        "member_id": member['_id']
    }).sort("logged_date", -1).limit(50).to_list(50)
    
    for log in progress_logs:
        log['id'] = log.pop('_id')
    
    return progress_logs


# ==================== AI ASSISTANT ROUTES ====================

# ==================== AI ASSISTANT ROUTES ====================

@api_router.post("/ai/chat")
async def ai_chat(request: Request, chat_request: ChatRequest):
    """Chat with AI fitness assistant"""
    user = await get_current_user(request, db)

    try:
        chat = GPTChat()
        response = await chat.send_message(chat_request.message)

        # Save chat to DB (optional)
        await db.chat_messages.insert_many([
            {
                "_id": f"chat_{datetime.utcnow().timestamp()}",
                "user_id": user.id,
                "role": "user",
                "message": chat_request.message,
                "timestamp": datetime.now(timezone.utc)
            },
            {
                "_id": f"chat_{datetime.utcnow().timestamp()}_ai",
                "user_id": user.id,
                "role": "assistant",
                "message": response,
                "timestamp": datetime.now(timezone.utc)
            }
        ])

        return {"response": response, "timestamp": datetime.now(timezone.utc)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@api_router.get("/ai/chat-history")
async def get_chat_history(request: Request):
    """Get chat history for user"""
    user = await get_current_user(request, db)
    
    messages = await db.chat_messages.find({
        "user_id": user.id
    }).sort("timestamp", 1).limit(100).to_list(100)
    
    for msg in messages:
        msg['id'] = msg.pop('_id')
    
    return messages


# ==================== ROOT ROUTES ====================

@api_router.get("/")
async def root():
    return {
        "message": "FitDesert API",
        "version": "1.0.0",
        "status": "running"
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include router
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

