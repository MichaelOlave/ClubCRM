from fastapi import FastAPI

from src.config import get_settings
from src.presentation.http.routes.health import router as health_router

settings = get_settings()

app = FastAPI(title=settings.api_title)
app.include_router(health_router)
