import { Database } from "../utils/database.js";
import { getWeather, getObjectsByWeather } from "./weather.service.mjs";
import { calendarService } from "./calendar.service.mjs";
import { objectDetection } from "./objectRecognition.service.mjs";
import fs from 'node:fs';
import path from 'node:path';

// Diccionario de traducción Español -> Inglés (IA)
const dictionary = {
    'llaves': 'keys',
    'llaves': 'keychain',
    'cartera': 'wallet',
    'gafas': 'sunglasses',
    'movil': 'cell phone',
    'móvil': 'cell phone',
    'toalla': 'towel',
    'paraguas': 'umbrella',
    'mochila': 'backpack',
    'ordenador': 'laptop',
    'botella': 'bottle'
};


const dbManager = Database.getDatabase();
const CITY = "Leganés";

// Devuelve los objetos que faltan
// Recibe el objeto user entero de la db
export const missingObjects = async (user, frame) => {
    // Obtenemos los datos necesarios para el calendar
    const calendarId = user.calendarId || "primary";
    
    // Vamos a buscar los tokens de Google del usuario a la base de datos
    const auth = await dbManager.getGoogleTokens(user._id);

    const objectsFromCalendar = [];

    // Comprobamos si realmente tiene Google vinculado
    if (auth && auth.accessToken) {
        try {
            const events = await calendarService.getEventsFromCalendar(auth, calendarId);

            // Ahora hay que ver si alguno de esos eventos tiene objetos asociados
            for (const event of events) {
                const eventObjects = await dbManager.getObjectsForEvent(user._id, event.id);
                if (eventObjects && eventObjects.length > 0) {
                    objectsFromCalendar.push(...eventObjects);
                }
            }
        } catch (error) {
            console.error("Error al leer el calendario en el workflow:", error.message);
        }
    } else {
        console.log(`El usuario ${user.username} no tiene Google Calendar vinculado. Saltando revisión de eventos.`);
    }

    // Obtenemos lo necesario para el clima
    let objectsFromWeather = [];
    const weatherRes = await getWeather(CITY);
    if (!weatherRes.error) {
        objectsFromWeather = getObjectsByWeather(weatherRes.res);
    }

    // Obtenemos los objetos configurados por el usuario
    const userObjects = user.objects || [];

    const allObjects = [...objectsFromCalendar, ...objectsFromWeather, ...userObjects];
    // Comparamos los objetos de la base de datos con los objetos necesarios por el clima y el calendario
    const arrayObjects = [...new Set(allObjects.map(obj => obj.toLowerCase().trim()))];

    let detectedObjects = { error: true, res: [] };

    // Traducimos el array a inglés para la IA
    const arrayEnglish = arrayObjects.map(obj => {
        const cleanWord = obj.toLowerCase().trim();
        return dictionary[cleanWord] || cleanWord; // Si no está en el diccionario, la deja igual
    });

    // Guardar la imagen en disco temporalmente
    try {
        // Quitamos la cabecera "data:image/jpeg;base64," del string
        const base64Data = frame.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Creamos una ruta temporal para guardar la foto de la mesa
        const tempImagePath = path.join(process.cwd(), 'temp_cenital.jpg');
        
        // Guardamos la foto
        fs.writeFileSync(tempImagePath, imageBuffer);

        // Le pasamos la ruta del archivo a la función de tu compañero
        detectedObjects = await objectDetection(tempImagePath, arrayEnglish);
        console.log("----> DEBUG: Lo que la IA ve realmente:", detectedObjects);

        // Borramos la foto temporal para no llenar el disco duro
        /* if (fs.existsSync(tempImagePath)) {
            fs.unlinkSync(tempImagePath);
        } */
    } catch (err) {
        console.error("Error al procesar la imagen cenital para la IA:", err);
    }

    const detectedEnglish = detectedObjects.error ? [] : detectedObjects.res;
    
    // Comparamos cruzando el español con el inglés
    const detectedSpanish = [];
    const missing = arrayObjects.filter(obj => {
        const objEnglish = dictionary[obj.toLowerCase().trim()] || obj;
        const seenIA = detectedEnglish.includes(objEnglish);
        
        if (seenIA) {
            detectedSpanish.push(obj); // Lo guardamos en español para la pantalla
        }
        
        return !seenIA; // Si no lo ha visto, va a la lista de "missing"
    });

    // TODO: Esto se tiene que pasar para que la voz lo diga y se muestre una checklist en la pantalla. (OPCIONAL: que por voz el usuario pueda quitar objetos de esa checklist)
    return {
        success: missing.length === 0,
        missing: missing,
        detected: detectedSpanish, 
        required: arrayObjects
    };
}