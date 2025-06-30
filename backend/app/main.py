from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, database, schemas, utils
from .routers import auth, typing
from .dependencies import get_current_user

app = FastAPI()

# 1) Mount sub-routers
app.include_router(auth.router)
app.include_router(typing.router)   

# a single, protected /users/{user_id} endpoint
@app.get("/users/{user_id}", response_model=schemas.UserOut)
def read_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
):
    # only allows users to fetch their own record
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return current_user
