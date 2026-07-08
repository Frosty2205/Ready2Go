# ESTO NO DEBERIA USARSE

import cv2
import os
import numpy as np
from insightface.app import FaceAnalysis
from numpy.linalg import norm
import time


last = time.time()

app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])

app.prepare(ctx_id=-1, det_size=(640, 640))

prepareTime = time.time() - last

print("Precarga modelo: " + str(prepareTime))

def cargar_db(path_db):
    db = {}
    for archivo in os.listdir(path_db):
        if archivo.endswith(('.jpg', '.png', '.jpeg')):
            nombre = os.path.splitext(archivo)[0]
            ruta = os.path.join(path_db, archivo)
            img = cv2.imread(ruta)
            res = app.get(img)
            if res:
                db[nombre] = res[0].normed_embedding
    return db
last = time.time()

database = cargar_db('conocidos')

dbTime = time.time() - last

print("Carga caras conocidas: " + str(dbTime))

img = cv2.imread('foto.jpeg')
if img is None:
    raise ValueError("No se pudo cargar la imagen")

last = time.time()
faces = app.get(img)

faceTime = time.time() - last

print("Deteccion caras: " + str(faceTime))

last = time.time()

for face in faces:
    bbox = face.bbox.astype(int)
    embedding_desconocido = face.normed_embedding
    
    nombre_detectado = "Desconocido"
    similitud_maxima = -1

    for nombre, embedding_conocido in database.items():
        similitud = np.dot(embedding_desconocido, embedding_conocido)
        
        if similitud > similitud_maxima:
            similitud_maxima = similitud
            if similitud > 0.4:
                nombre_detectado = nombre

    cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
    cv2.putText(img, f"{nombre_detectado} ({similitud_maxima:.2f})", 
                (bbox[0], bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

analisisTime = time.time() - last

print("Analisis: " + str(analisisTime))

last = time.time()
cv2.imwrite('resultado.jpg', img)

saveTime = time.time() - last

print("Guardado: " + str(saveTime))
