from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.base import Base

class Chart(Base):
    __tablename__ = "charts"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)
    title = Column(String, nullable=False)
    chart_type = Column(String, default="bar")  # 'bar', 'line', 'pie', etc.
    config = Column(JSON, nullable=True)  # Stores chart configuration (query, data, etc.)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    dashboard = relationship("Dashboard", back_populates="charts")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "chart_type": self.chart_type,
            "config": self.config,
            "dashboard_id": self.dashboard_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
