"""
Vercel Serverless Function Entry Point
This file serves as the main entry point for Vercel deployment.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

# Import routers
from src.main import router as api_router

app = FastAPI(title="Bible Bee API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Bible Bee API", "version": "1.0.0"}

# Mangum handler for Vercel
handler = Mangum(app)
