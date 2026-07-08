/* Lo comento por si acaso jajajja

import fs from 'node:fs'
import dotenv from 'dotenv'
import { Blob } from 'node:buffer'
import { type } from 'node:os';

dotenv.config();

// API config
const MODEL = "https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50"
const HF_TOKEN = process.env.HF_TOKEN;

// Procesamiento de imágenes
export const objectDetection = async (imgPath) => {
    const img = fs.readFileSync(imgPath);

    const blob = new Blob([img], { type: 'image/jpeg' });

    console.log(`Sending image to object recognition model: ${imgPath} (${(img.length / 1024).toFixed(2)} KB)`);

    try {
        const res = await fetch(MODEL, {
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "X-Wait-For-Model": "true"
            },
            method: "POST",
            body: blob,
        });

        if (!res.ok) {
            // const err = await res.json();
            const errText = await res.text();
            //console.log("Error with HuggingFaceInferenceAPI:", err.error);
            console.log("Error with HuggingFaceInferenceAPI:", errText.slice(0, 500));
            //return { error: true, status: res.status, res: err.error };

            return { error: true, status: res.status, res: errText.slice(0, 500) };
        }

        const data = await res.json()
        return { error: false, status: 200, res: data }

    } catch (error) {
        console.log("Error with ObjectRecognition:", error.message);
        return { error: true, status: 500, res: error.message };
    }

}; */

// IMPORTANTE: Según investigación (Gemini), el 90% de los modelos se entrenaro con la db de COCO
// Lo que pasa es que las llaves NO están incluidas
// Para ello, en vez usar un detector de objetos tradicional, usaremos un modelo de detección de objetos de tipo "zero-shot" (OWL-ViT) que es capaz de detectar objetos sin necesidad de haber sido entrenado específicamente para ellos
// Lo que lo hace ideal para nuestro caso donde queremos detectar objetos como llaves, paraguas, etc. sin depender de una base de datos específica
import { pipeline } from '@xenova/transformers';

// Variable global para guardar modelo en la RAM y no tener que cargarlo por cada petición
let detector = null;

// Inicializar modelo
const initModel = async () => {
    if (!detector) {
        console.log("Loading object detection model first time...");
        detector = await pipeline('zero-shot-object-detection', 'Xenova/owlvit-base-patch32');
        console.log("Model loaded successfully");
    }
    return detector;
};

// Procesamiento de imágenes en LOCAL
export const objectDetection = async (imgPath, requiredLabels) => {
    try {
        console.log(`Analizando objetos: ${requiredLabels.join(', ')}`);
        
        const detector = await initModel();

        const output = await detector(imgPath, requiredLabels, { 
            threshold: 0.04 // Me deprimo ya
        });

        // IMPRIMIMOS LO QUE VE LA IA PARA ESPIAR SUS PORCENTAJES
        console.log("--> PUNTUACIONES OWL-ViT:", output);

        const detected = [...new Set(output.map(item => item.label))];

        return { 
            error: false, 
            res: detected 
        };
    } catch (error) {
        console.error("Error en ObjectDetection:", error.message);
        return { error: true, res: [] };
    }
}