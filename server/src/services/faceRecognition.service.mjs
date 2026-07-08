import { Database } from "../utils/database.js";
import { performance } from 'perf_hooks';

const dbManager = Database.getDatabase();

function normalize(vector) {
    const norma = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / norma);
}
function euclideanDistance(vec1, vec2) {
    const v1 = normalize(vec1);
    const v2 = normalize(vec2);
    const sum = v1.reduce((acc, val, i) => acc + (val - v2[i]) ** 2, 0);
    return Math.sqrt(sum);
}

export const identifyFace = async (embedding) => {
    const startTime = performance.now();

    const dbStart = performance.now();


    const users = await dbManager.getAllUsersWithEmbeddings();

    const dbEnd = performance.now();
    
    let bestUser = null;
    let bestDistance = Infinity;
    const THRESHOLD = 0.9;
    
    const calcStart = performance.now();
    
    for (const user of users) {
        const distance = euclideanDistance(embedding, user.embedding);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestUser = user;
        }
    }

    const calcEnd = performance.now();
    const endTime = performance.now();
    const totalTime = (endTime - startTime).toFixed(2);

    console.log(`--- Reporte de Reconocimiento ---`);
    console.log(`Usuarios comparados: ${users.length}`);
    console.log(`Tiempo DB: ${(dbEnd - dbStart).toFixed(2)}ms`);
    console.log(`Tiempo Cálculo: ${(calcEnd - calcStart).toFixed(2)}ms`);
    console.log(`Tiempo Total: ${totalTime}ms`);
    console.log(`---------------------------------`);

    return bestDistance < THRESHOLD ? bestUser : null;
}