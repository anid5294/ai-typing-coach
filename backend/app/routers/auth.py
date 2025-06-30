from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from fastapi.security import OAuth2PasswordRequestForm

from .. import models, schemas, utils, database

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post(
    "/signup",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    user_in: schemas.UserCreate,
    db: Session = Depends(database.get_db)
):
    # 1) Check if the email is already registered
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # 2) Hash the password
    hashed_pw = utils.hash_password(user_in.password)

    # 3) Create & persist the new user
    new_user = models.User(
        email=user_in.email,
        password_hash=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)   # load the generated id

    # 4) Return the newly created user (Pydantic will serialize id & email)
    return new_user

@router.post(
    "/login", 
    response_model=schemas.Token
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not utils.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    token = utils.create_access_token(str(user.id))
    return schemas.Token(access_token=token, token_type="bearer")