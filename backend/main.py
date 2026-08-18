from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os
import random
import time
import string

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "models/cooked_model.pkl"
model = None
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print("✅ ML Model loaded into memory.")

class UserAnswers(BaseModel):
    sleep_hours: int
    screen_time: int
    attendance: int
    assignments: int

class GenerateRequest(BaseModel):
    action: str
    score: int
    screen_time: int
    assignments: int

# --- NEW: Multiplayer Data Models ---
class JoinRoomRequest(BaseModel):
    nickname: str
    score: int
    category: str

# Our temporary in-memory database for rooms
rooms = {}

@app.get("/api/status")
async def get_status():
    return {"message": "The kitchen is open. Backend is perfectly cooked! 🔥"}

@app.post("/api/predict")
async def predict_cookedness(answers: UserAnswers):
    if model is None: return {"error": "ML Model not trained yet!"}
    input_data = pd.DataFrame([answers.dict()])
    prediction = model.predict(input_data)[0]
    return {"cooked_score": max(0, min(100, round(prediction)))}

@app.post("/api/generate")
async def generate_content(req: GenerateRequest):
    time.sleep(1.5) 
    if req.action == "roast":
        if req.score > 80: text = f"You have {req.screen_time} hours of screen time, {req.assignments} pending assignments, and a Cooked Score of {req.score}%. At this point, your study strategy is just positive thinking. Your academic comeback is officially delayed."
        elif req.score > 50: text = f"With {req.assignments} assignments pending, you're treating deadlines like they are polite suggestions. The procrastination is strong."
        else: text = f"Honestly? A score of {req.score}% isn't bad. But don't let it get to your head, you still spent {req.screen_time} hours staring at a screen today."
        return {"title": "🔥 NUCLEAR ROAST", "text": text}
    elif req.action == "save":
        text = f"YOUR 24-HOUR RECOVERY PLAN:\n1. Put your phone away for 45 straight minutes.\n2. Tackle exactly ONE of your {req.assignments} pending assignments.\n3. Drink water. You are a human, not a houseplant."
        return {"title": "🆘 EMERGENCY RECOVERY PLAN", "text": text}

# --- NEW: Multiplayer Routes ---

@app.post("/api/rooms/create")
async def create_room():
    # Generate a random 4-letter/number code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    rooms[code] = [] # Initialize empty room
    return {"room_code": code}

@app.post("/api/rooms/{room_code}/join")
async def join_room(room_code: str, player: JoinRoomRequest):
    if room_code not in rooms:
        return {"error": "Room not found"}
    
    # Check if player already exists, update score if they retook the test
    for p in rooms[room_code]:
        if p["nickname"] == player.nickname:
            p["score"] = player.score
            p["category"] = player.category
            return {"success": True}
            
    rooms[room_code].append({
        "nickname": player.nickname,
        "score": player.score,
        "category": player.category
    })
    return {"success": True}

@app.get("/api/rooms/{room_code}")
async def get_room(room_code: str):
    if room_code not in rooms:
        return {"error": "Room not found"}
    # Sort players from most cooked (highest) to least cooked
    sorted_players = sorted(rooms[room_code], key=lambda x: x['score'], reverse=True)
    return {"players": sorted_players}