from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.base import Base


class ProSubscription(Base):
    __tablename__ = "pro_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    granted_by = Column(String, nullable=True)  # "admin" or "promo_code"
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)  # Admin notes

    # Relationship
    user = relationship("User", backref="pro_subscription")
