from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from .api.v1 import chat, auth
from .api.v1 import auth

app = FastAPI(
    title="StudyWat API",
    description="AI-powered university guidance platform",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
#app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])

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