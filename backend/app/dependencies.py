from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models, utils
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# dependency that turns a valid JWT into a User instance
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    try:
        user_id = utils.verify_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.get(models.User, int(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user