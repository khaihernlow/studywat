from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
import httpx
import os
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from ...clients.mongo_client import get_database

router = APIRouter()
security = HTTPBearer()

# Security settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Pydantic models
class GoogleTokenRequest(BaseModel):
    credential: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    try:
        # Convert string ID to ObjectId for MongoDB query
        object_id = ObjectId(user_id)
        db = get_database()
        user = await db.users.find_one({"_id": object_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except Exception as e:
        print(f"Error finding user: {str(e)}")
        raise HTTPException(status_code=401, detail="User not found")

# Create JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Verify Google token
async def verify_google_token(token: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
            )
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Invalid Google token: {response.text}")
            return response.json()
    except Exception as e:
        print(f"Error verifying Google token: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Token verification error: {str(e)}")

@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleTokenRequest):
    try:
        # Verify Google token
        google_user = await verify_google_token(request.credential)
        
        db = get_database()
        
        # Check if user exists in database
        existing_user = await db.users.find_one({"google_id": google_user["sub"]})
        
        if existing_user:
            # Update last login
            await db.users.update_one(
                {"google_id": google_user["sub"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )
            user = existing_user
        else:
            # Create new user
            user_data = {
                "google_id": google_user["sub"],
                "name": google_user["name"],
                "email": google_user["email"],
                "avatar": google_user.get("picture", ""),
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow()
            }
            result = await db.users.insert_one(user_data)
            user_data["_id"] = str(result.inserted_id)
            user = user_data
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["_id"])}, expires_delta=access_token_expires
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=str(user["_id"]),
                name=user["name"],
                email=user["email"],
                avatar=user["avatar"]
            )
        )
        
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        avatar=current_user["avatar"]
    )

@router.post("/logout")
async def logout():
    # In a more complex setup, you might want to blacklist the token
    # For now, we'll just return success
    return {"message": "Logged out successfully"}