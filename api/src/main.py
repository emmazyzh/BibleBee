"""
Main API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import json
import os

router = APIRouter()

# Load Bible data from JSON
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# Load data on startup
verses_data = load_json("verses.json")
collections_data = load_json("collections.json")

@router.get("/verses")
def get_verses():
    """Get all verses"""
    return verses_data.get("verses", [])

@router.get("/verses/{verse_id}")
def get_verse(verse_id: int):
    """Get a specific verse by ID"""
    verses = verses_data.get("verses", [])
    for verse in verses:
        if verse["id"] == verse_id:
            return verse
    raise HTTPException(status_code=404, detail="Verse not found")

@router.get("/verses/search/{query}")
def search_verses(query: str):
    """Search verses by keyword"""
    verses = verses_data.get("verses", [])
    results = []
    query_lower = query.lower()
    for verse in verses:
        if (query in verse["chinese"] or 
            query_lower in verse["english"].lower() or
            query in verse["referenceCN"] or
            query_lower in verse["reference"].lower()):
            results.append(verse)
    return results

@router.get("/collections")
def get_collections():
    """Get all verse collections"""
    return collections_data.get("collections", [])

@router.get("/collections/{collection_id}")
def get_collection(collection_id: str):
    """Get a specific collection by ID"""
    collections = collections_data.get("collections", [])
    for collection in collections:
        if collection["id"] == collection_id:
            return collection
    raise HTTPException(status_code=404, detail="Collection not found")

@router.get("/collections/{collection_id}/verses")
def get_collection_verses(collection_id: str):
    """Get all verses in a collection"""
    collection = get_collection(collection_id)
    verses = verses_data.get("verses", [])
    collection_verses = [v for v in verses if v["id"] in collection["verses"]]
    return collection_verses

@router.get("/leaderboard")
def get_leaderboard():
    """Get leaderboard data"""
    return [
        {"id": 1, "name": "David Chen", "avatar": None, "mastered_count": 156},
        {"id": 2, "name": "Sarah Wang", "avatar": None, "mastered_count": 142},
        {"id": 3, "name": "John Liu", "avatar": None, "mastered_count": 128},
        {"id": 4, "name": "Emily Zhang", "avatar": None, "mastered_count": 115},
        {"id": 5, "name": "Michael Li", "avatar": None, "mastered_count": 98},
    ]
