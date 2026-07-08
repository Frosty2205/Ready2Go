import { objectDetection } from "./src/services/objectRecognition.service.mjs";

async function runTest() {
    console.log("--- Iniciando prueba de detección de objetos ---");

    // Cambia 'test-image.jpg' por el nombre real de tu imagen
    const imagePath = './images/prueba2.jpg';

    const result = await objectDetection(imagePath);

    if (result.error) {
        console.error("❌ Error en la prueba:", result.res);
    } else {
        console.log("✅ ¡Éxito! Objetos detectados:");
        console.log(JSON.stringify(result.res, null, 2));

        // Ejemplo de cómo leer los resultados:
        result.res.forEach(obj => {
            console.log(`- Detectado: ${obj.label} (Confianza: ${Math.round(obj.score * 100)}%)`);
        });
    }
}

runTest();