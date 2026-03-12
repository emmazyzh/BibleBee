from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os

app = FastAPI(title="Bible Bee API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data paths
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

# Models
class Verse(BaseModel):
    id: int
    reference: str
    referenceCN: str
    english: str
    chinese: str
    keywords: List[str]
    version: str
    category: str

class Collection(BaseModel):
    id: str
    name: str
    description: str
    count: int
    verses: List[int]
    color: str
    icon: str

class User(BaseModel):
    id: int
    email: str
    name: str
    avatar: Optional[str] = None

class MasteredVerse(BaseModel):
    verse_id: int
    date: str
    review_count: int

# Helper functions
def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to Bible Bee API", "version": "1.0.0"}

@app.get("/api/verses", response_model=List[Verse])
def get_verses():
    """Get all verses"""
    data = load_json("verses.json")
    return data.get("verses", [])

@app.get("/api/verses/{verse_id}", response_model=Verse)
def get_verse(verse_id: int):
    """Get a specific verse by ID"""
    data = load_json("verses.json")
    verses = data.get("verses", [])
    for verse in verses:
        if verse["id"] == verse_id:
            return verse
    raise HTTPException(status_code=404, detail="Verse not found")

@app.get("/api/verses/search/{query}", response_model=List[Verse])
def search_verses(query: str):
    """Search verses by keyword"""
    data = load_json("verses.json")
    verses = data.get("verses", [])
    results = []
    query_lower = query.lower()
    for verse in verses:
        if (query in verse["chinese"] or 
            query_lower in verse["english"].lower() or
            query in verse["referenceCN"] or
            query_lower in verse["reference"].lower()):
            results.append(verse)
    return results

@app.get("/api/collections", response_model=List[Collection])
def get_collections():
    """Get all verse collections"""
    data = load_json("collections.json")
    return data.get("collections", [])

@app.get("/api/collections/{collection_id}", response_model=Collection)
def get_collection(collection_id: str):
    """Get a specific collection by ID"""
    data = load_json("collections.json")
    collections = data.get("collections", [])
    for collection in collections:
        if collection["id"] == collection_id:
            return collection
    raise HTTPException(status_code=404, detail="Collection not found")

@app.get("/api/collections/{collection_id}/verses", response_model=List[Verse])
def get_collection_verses(collection_id: str):
    """Get all verses in a collection"""
    collection = get_collection(collection_id)
    data = load_json("verses.json")
    verses = data.get("verses", [])
    collection_verses = [v for v in verses if v["id"] in collection.verses]
    return collection_verses

# Leaderboard endpoint (mock data for now)
@app.get("/api/leaderboard")
def get_leaderboard():
    """Get leaderboard data"""
    return [
        {"id": 1, "name": "David Chen", "avatar": None, "mastered_count": 156},
        {"id": 2, "name": "Sarah Wang", "avatar": None, "mastered_count": 142},
        {"id": 3, "name": "John Liu", "avatar": None, "mastered_count": 128},
        {"id": 4, "name": "Emily Zhang", "avatar": None, "mastered_count": 115},
        {"id": 5, "name": "Michael Li", "avatar": None, "mastered_count": 98},
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
