from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import verify_password, hash_password, create_access_token
from app.db.mongo import get_db
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

@router.post("/signup")
async def signup(user_in: UserCreate, db = Depends(get_db)):
    existing = await db["users"].find_one({"email": user_in.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_doc = {
        "name": user_in.name,
        "email": user_in.email,
        "passwordHash": hash_password(user_in.password),
        "role": "RM",
        "status": "Active"
    }
    res = await db["users"].insert_one(user_doc)
    user_doc["_id"] = res.inserted_id
    
    access_token = create_access_token(data={"sub": user_doc["email"]})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": str(user_doc["_id"]),
            "name": user_doc["name"],
            "email": user_doc["email"],
            "role": user_doc["role"]
        }
    }

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }
