from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import RequestValidationError
from fastapi.exceptions import RequestValidationError
import logging
logger = logging.getLogger(__name__)
from .api.v1 import auth
from .api.v1 import program_lists
from .api.v1 import institution
from .api.v1 import program
from .api.v1 import orchestrator
from .api.v1 import profile
from mangum import Mangum

app = FastAPI(
    title="StudyWat API",
    description="AI-powered university guidance platform",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Only allow frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(program_lists.router, prefix="/api/v1/program-lists", tags=["program_lists"])
app.include_router(institution.router, prefix="/api/v1/institutions", tags=["institutions"])
app.include_router(program.router, prefix="/api/v1/programs", tags=["programs"])
app.include_router(orchestrator.router, prefix="/api/v1/orchestrator", tags=["orchestrator"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["profile"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to StudyWat API",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "StudyWat API"
    }

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Validation error:", exc)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# For AWS Lambda [run4]
handler = Mangum(app)