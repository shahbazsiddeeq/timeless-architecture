from fastapi import FastAPI
import uvicorn
from transcribe_service import start_listening, stop_listening

app = FastAPI()

@app.get("/start-mic")
def start_mic():
    start_listening()
    return {"status": "mic started"}

@app.get("/stop-mic")
def stop_mic():
    stop_listening()
    return {"status": "mic stopped"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)
