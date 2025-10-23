from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    HEAD_ADMIN = "head_admin"
    GYM_MANAGER = "gym_manager"
    TRAINER = "trainer"
    TRAINEE = "trainee"

class MembershipStatus(str, Enum):
    ACTIVE = "active"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    FROZEN = "frozen"

class PaymentType(str, Enum):
    NEW_MEMBERSHIP = "new_membership"
    RENEWAL = "renewal"
    PERSONAL_TRAINING = "personal_training"
    DIET_PLAN = "diet_plan"
    ADD_ON = "add_on"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"

# User Models
class User(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    picture: Optional[str] = None
    role: UserRole
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        use_enum_values = True

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: UserRole
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

# Gym Models
class Gym(BaseModel):
    id: str = Field(default_factory=lambda: f"gym_{datetime.utcnow().timestamp()}")
    name: str
    address: str
    city: str
    state: str
    owner_id: str  # User ID of gym manager
    qr_code: str  # Base64 encoded QR code
    kyc_verified: bool = False
    is_active: bool = True
    phone: str
    email: str
    registration_date: datetime = Field(default_factory=datetime.utcnow)
    subscription_plan: Optional[str] = "basic"  # basic, pro, premium
    subscription_expiry: Optional[datetime] = None

class GymCreate(BaseModel):
    name: str
    address: str
    city: str
    state: str
    phone: str
    email: str

# Member (Trainee) Models
class Member(BaseModel):
    id: str = Field(default_factory=lambda: f"member_{datetime.utcnow().timestamp()}")
    user_id: str  # Reference to User
    gym_id: str
    photo: Optional[str] = None  # Base64 encoded
    contact_info: str
    joining_date: datetime = Field(default_factory=datetime.utcnow)
    membership_plan: str  # Monthly, Quarterly, Yearly
    plan_duration_months: int
    membership_expiry: datetime
    goal: Optional[str] = None
    assigned_trainer_id: Optional[str] = None
    status: MembershipStatus = MembershipStatus.ACTIVE
    height: Optional[float] = None  # in cm
    weight: Optional[float] = None  # in kg
    age: Optional[int] = None

class MemberCreate(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    membership_plan: Optional[str] = None
    plan_duration_months: Optional[int] = 1
    goal: Optional[str] = None
    assigned_trainer_id: Optional[str] = None
    is_trainer: Optional[bool] = False
    height: Optional[float] = None
    weight: Optional[float] = None
    age: Optional[int] = None
    photo: Optional[str] = None


# Attendance Models
class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: f"att_{datetime.utcnow().timestamp()}")
    member_id: str
    gym_id: str
    check_in_time: datetime = Field(default_factory=datetime.utcnow)
    date: str  # YYYY-MM-DD format

# Payment Models
class Payment(BaseModel):
    id: str = Field(default_factory=lambda: f"pay_{datetime.utcnow().timestamp()}")
    member_id: str
    gym_id: str
    amount: float
    payment_type: PaymentType
    status: PaymentStatus = PaymentStatus.PENDING
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    invoice_number: Optional[str] = None
    gst_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    payment_date: Optional[datetime] = None

class PaymentCreate(BaseModel):
    member_id: str
    amount: float
    payment_type: PaymentType

# Workout Plan Models
class Exercise(BaseModel):
    name: str
    sets: int
    reps: int
    rest_seconds: int
    notes: Optional[str] = None

class WorkoutDay(BaseModel):
    day: str  # Monday, Tuesday, etc.
    exercises: List[Exercise]

class WorkoutPlan(BaseModel):
    id: str = Field(default_factory=lambda: f"workout_{datetime.utcnow().timestamp()}")
    member_id: str
    trainer_id: str
    gym_id: str
    plan_name: str
    workout_days: List[WorkoutDay]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WorkoutPlanCreate(BaseModel):
    member_id: str
    plan_name: str
    workout_days: List[WorkoutDay]

# Diet Plan Models
class Meal(BaseModel):
    meal_time: str  # Breakfast, Lunch, Dinner, Snack
    items: List[str]
    calories: Optional[int] = None
    notes: Optional[str] = None

class DietPlan(BaseModel):
    id: str = Field(default_factory=lambda: f"diet_{datetime.utcnow().timestamp()}")
    member_id: str
    trainer_id: str
    gym_id: str
    plan_name: str
    daily_meals: List[Meal]
    total_calories: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DietPlanCreate(BaseModel):
    member_id: str
    plan_name: str
    daily_meals: List[Meal]
    total_calories: Optional[int] = None

# Progress Tracking Models
class ProgressLog(BaseModel):
    id: str = Field(default_factory=lambda: f"prog_{datetime.utcnow().timestamp()}")
    member_id: str
    gym_id: str
    weight: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    measurements: Optional[dict] = None  # chest, waist, arms, etc.
    photos: Optional[List[str]] = None  # Base64 encoded progress photos
    notes: Optional[str] = None
    logged_date: datetime = Field(default_factory=datetime.utcnow)

class ProgressLogCreate(BaseModel):
    weight: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    measurements: Optional[dict] = None
    photos: Optional[List[str]] = None
    notes: Optional[str] = None

# AI Chat Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: f"chat_{datetime.utcnow().timestamp()}")
    user_id: str
    role: str  # user or assistant
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    message: str
    user_context: Optional[dict] = None  # user's goals, stats, etc.
