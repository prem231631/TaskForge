
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, value):
        if not isinstance(value, str):
            return value

        value = value.strip()

        if len(value) < 2:
            raise ValueError("Full name must contain at least 2 characters.")

        return value


class UserPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RegistrationResponse(BaseModel):
    message: str
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
