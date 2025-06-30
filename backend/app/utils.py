import os
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret")
ALGORITHM  = "HS256"
EXPIRY_MIN = 60

def hash_password(plain_password: str) -> str:
    salt    = bcrypt.gensalt()
    hashed  = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRY_MIN)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_access_token(token: str) -> str:
    data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return data.get("sub") 
