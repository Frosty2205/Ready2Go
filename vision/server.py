from fastapi import FastAPI, UploadFile, File, Body
# from database import Database
import insightface
from insightface.app import FaceAnalysis
from dotenv import load_dotenv
from database import Database
import cv2
import numpy as np
import uvicorn
import os
import time

load_dotenv()

PORT = os.getenv("PORT", 8000)

app = FastAPI()

# Cargamos el modelo al iniciar el servidor
recognitionModel = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
recognitionModel.prepare(ctx_id=-1, det_size=(640, 640))

dbManager = Database.get_database()


@app.post("/recognize")
async def faceRecognition(file: UploadFile):
    content = await file.read()

    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    faces = recognitionModel.get(img)

    results = []

    for face in faces:
        results.append({
            "prob": float(face.det_score),
            "bbox": face.bbox.tolist(), 
            "embedding": face.embedding.tolist() 
        })

    return {
        "count": len(results),
        "faces": results
    }

@app.post("/identify")
async def identifyFace(embedding: list = Body(...)):
    start_time = time.perf_counter()

    db_start = time.perf_counter()

    users = await dbManager.getAllUsersWithEmbeddings() 
    db_end = time.perf_counter()
    
    if not users:
        return {"match": False, "user_id": None, "message": "Base de datos vacía"}

    best_user_id = None
    best_distance = float('inf')
    threshold = 0.9
    
    calc_start = time.perf_counter()
    input_vec = np.array(embedding)
    
    for user in users:
        candidate_vec = np.array(user["embedding"])
        
        distance = np.linalg.norm(input_vec - candidate_vec)
        
        if distance < best_distance:
            best_distance = distance
            best_user_id = user["id"]

    calc_end = time.perf_counter()
    end_time = time.perf_counter()
    
    db_ms = (db_end - db_start) * 1000
    calc_ms = (calc_end - calc_start) * 1000
    total_ms = (end_time - start_time) * 1000

    print(f"--- Reporte de Reconocimiento ---")
    print(f"Comparaciones: {len(users)} | DB: {db_ms:.2f}ms | Cálculo: {calc_ms:.2f}ms")
    print(f"---------------------------------")

    if best_distance < threshold:
        return {
            "match": True,
            "user_id": best_user_id,
            "distance": float(best_distance)
        }
    
    return {"match": False, "user_id": None, "distance": float(best_distance)}
    

if __name__ == "__main__":
    try:
        # dbManager = Database.get_database
        # db = dbManager.connect()
        uvicorn.run(app, host="0.0.0.0", port=int(PORT))
    except Exception as e:
        print("Could not connect to database")
