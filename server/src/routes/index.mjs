// Ruta de acceso
import { Router } from 'express';
import { Database } from '../utils/database.js';
import { getForecast, getWeather } from '../services/weather.service.mjs';
import jwt from 'jsonwebtoken';
import axios from 'axios'
import multer from 'multer';
import path from 'path'
import fs from 'node:fs'
import { fileURLToPath } from 'url';
import { getAuthUrl, getTokensFromCode} from '../services/googleAuth.service.mjs';
import { calendarService } from '../services/calendar.service.mjs';
import { authMiddleware } from '../../auth.middleware.mjs';
import { findObjectsInText } from '../utils/nlp.js';


const router = Router();
const dbManager = Database.getDatabase();
// El servidor de Python está en la misma VM, por eso se usa localhost
const VISION_URL = process.env.NODE_ENV === "docker" ? "http://vision:8000/recognize" : "http://localhost:8000/recognize";
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Las rutas las vamos poniendo aqui

router.post('/register', async (req, res) => {
    let filePath = "";
    let userId = null;
    let usernameSaved = null; // Para que no de error en el catch
    try {
        console.log("Registro recibido")
        console.log("Path faces:", __dirname)

        const { name, email, username, password, photo } = req.body;

        usernameSaved = username;

        if (!photo || typeof photo !== 'string') {
            console.log("Cuerpo recibido:", req.body); // Para debug
            return res.status(400).json({ mensaje: "No se recibió la foto o el formato es inválido" });
        }

        try {
            userId = await dbManager.createUser({
                name,
                email,
                username,
                password,
                embedding: null
            });

            await dbManager.addUsername(username);
        } catch (error) {
            if (error.code === 11000 || (error.writeErrors && error.writeErrors[0].code === 11000)) {
                return res.status(409).json({
                    mensaje: "El usuario ya existe",
                    campo: "username"
                });
            }
            throw error;
        }

        // Aqui hay que enviar la foto a vision y que nos devuelva el embedding, e insertar eso en la db
        const photoBase64 = photo.split(",")[1];
        const imgBuffer = Buffer.from(photoBase64, 'base64');

        const form = new FormData();

        const blob = new Blob([imgBuffer], { type: 'image/jpeg' });

        form.append('file', blob, 'user_photo.jpg');

        const visionRes = await axios.post(VISION_URL, form);

        const faces = visionRes.data.faces;
        if (!faces || faces.length != 1) {
            return res.status(400).json({ mensaje: "Error en la detección del rostro" });
        }

        const photo_embedding = faces[0].embedding;

        const filename = `${username}-${Date.now()}.jpg`;
        const facesDir = path.join(__dirname, '..', '..', 'faces');

        if (!fs.existsSync(facesDir)) {
            console.log("No se ha encontrado la carpeta faces, se va a crear");
            console.log("Path de la carpeta faces creado:", facesDir);
            fs.mkdirSync(facesDir, { recursive: true });
        }

        filePath = path.join(facesDir, filename)
        console.log("filePath:", filePath)
        console.log("facesDir:", facesDir)

        // Guardamos la foto en el servidor
        fs.writeFileSync(filePath, imgBuffer);
        console.log("Foto guardada en:", filePath)

        await dbManager.updateUser(userId, {
            embedding: photo_embedding,
            photoPath: `/faces/${filename}`
        });

        console.log("Se ha guardado el usuario en la db")

        // Iniciamos la sesión automáticamente al registrar
        const token = jwt.sign(
            { id: userId, nombre: name },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            mensaje: "Usuario registrado e identificado",
            token: token,
            photoPath: `/faces/${filename}`,
            username: username,
            userId: userId
        });

        // res.status(201).json({ mensaje: "Usuario registrado", id: userId });
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (userId) await dbManager.deleteUser(userId);
        if (usernameSaved) await dbManager.deleteUsername(usernameSaved);
        console.error(error);
        res.status(500).json({ mensaje: "Error al guardar el usuario" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await dbManager.checkUser(username, password);

        if (user) {
            const token = jwt.sign(
                { id: user._id, nombre: user.name },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.json({ token: token, photoPath: user.photoPath }); // Añadimos la ruta de la foto para que luego aparezca
        } else {
            res.status(401).json({ mensaje: "Usuario o clave incorrectos" });
        }
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

router.get('/auth/google', (req, res) => {
    const userId = req.query.userId; // Recibimos el userId del frontend
    const authUrl = getAuthUrl(userId);
    res.redirect(authUrl);
});

router.get('/auth/google/callback', async (req, res) => {
    const { code, state } = req.query; // A parte del code, recibimos también el JWT en el state
    try {
        const decodedState = jwt.verify(state, process.env.JWT_SECRET);
        const userId = decodedState.userId;

        const tokens = await getTokensFromCode(code);

        const result = await dbManager.saveGoogleTokens(userId, tokens);
        if (result.matchedCount > 0) {
            console.log(`Google vinculado con éxito para: ${userId}`);
            return res.redirect('/calendar.html');
        } else {
            console.error("Usuario no encontrado en la DB al volver de Google");
            return res.redirect('/ready2go.html?status=error&msg=user_not_found');
        }
    } catch (error) {
        console.error("Error en el callback de Google:", error);

        // Si el error es de JWT
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.redirect('/ready2go.html?status=error&msg=session_expired');
        }

        // Error genérico
        res.redirect('/ready2go.html?status=error');
    }
});


// Ruta para leer la ropa del armario
router.get('/wardrobe/:username', authMiddleware, async (req, res) => {
    try {
        const username = req.params.username;
        const clothes = await dbManager.getClothes(username);

        if (!clothes) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        return res.status(200).json({ ropa: clothes || [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en el servidor al cargar el armario" });
    }
});

// Ruta para añadir ropa al armario
// :username es un parámetro dinámico
// Permite que no tengamos que hacer una ruta por cada usuario
router.post('/wardrobe/:username', authMiddleware, async (req, res) => {
    try {
        const username = req.params.username;
        const { nombre, tipo, photo } = req.body;

        // Comprobación básica de que se ha recibido la foto
        if (!photo) {
            return res.status(400).json({ mensaje: "No se recibió la foto de la prenda" });
        }

        const clothesDir = path.join(__dirname, '..', '..', 'clothes');
        if (!fs.existsSync(clothesDir)) {
            fs.mkdirSync(clothesDir, { recursive: true});
        }

        const photoBase64 = photo.split(",")[1] || photo;
        const imgBuffer = Buffer.from(photoBase64, 'base64');

        const filename = `item-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const filePath = path.join(clothesDir, filename);

        fs.writeFileSync(filePath, imgBuffer);

        const publicPath = `/clothes/${filename}`;

        const newClothes = {
            nombre: nombre,
            tipo: tipo,
            imagen: publicPath
        };

        const clothes = await dbManager.addClothes(username, newClothes);

        if (!clothes) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        return res.status(200).json({ ropa: clothes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en el servidor al guardar ropa" });
    }
});

// Ruta del clima actual
router.get('/weather/:ciudad', authMiddleware, async (req, res) => {
    // Debug
    console.log(`Petición recibida para el clima de la ciudad: ${req.params.ciudad}`);
    try {
        const ciudad = req.params.ciudad;
        const results = await getWeather(ciudad);

        if (results.error) {
            return res.status(results.status || 400).json(results);
        }

        return res.status(200).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

// Ruta de la previsión clima
router.get('/forecast/:ciudad', authMiddleware, async (req, res) => {
    // Debug
    console.log(`Petición recibida para la previsión del clima de la ciudad: ${req.params.ciudad}`);
    try {
        const ciudad = req.params.ciudad;
        const results = await getForecast(ciudad);

        if (results.error) {
            return res.status(results.status || 400).json(results);
        }

        return res.status(200).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

// Ruta calendar
// Añade esta ruta donde tengas los demás endpoints de tu API
router.post('/calendar/event', authMiddleware, async (req, res) => {
    try {
        const { title, initDate, endDate, description } = req.body;
        console.log("Intentando crear evento:", title, "para el", initDate);

        const userId = req.userId;
        const auth = await dbManager.getGoogleTokens(userId);
        /* const selectedCalendar = user.calendarId || 'primary'; */

        console.log("-> DEBUG userId:", userId);
        console.log("-> DEBUG auth recibido:", auth);

        if (!auth || !auth.accessToken) {
            return res.status(400).json({ success: false, error: "Google no vinculado" });
        }
        const result = await calendarService.insertEvent(auth, {
            title: title,
            initDate: initDate,
            endDate: endDate,
            description: description
        });
        if (!result.success) {
            console.error("Error al crear el evento en el servicio de calendario:", result.error);
            return res.status(500).json({ success: false, error: "Error al crear el evento en el servicio de calendario" });
        }
        const googleEventId = result.data.id;

        res.status(200).json({ success: true, eventId: googleEventId, message: "Ruta conectada correctamente" });

    } catch (error) {
        console.error("Error en la ruta del calendario:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/save-objects', authMiddleware, async (req, res) => {
    try {
        const { objects } = req.body;
        const userId = req.userId;
        await dbManager.addObjects(userId, objects);
        res.status(200).json({ success: true, message: "Objetos guardados correctamente" });
    } catch (error) {
        console.error("Error en la ruta de guardar objetos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/get-objects', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const objects = await dbManager.getObjects(userId);
        res.status(200).json({ success: true, objects: objects || [] });
    } catch (error) {        console.error("Error en la ruta de obtener objetos:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/bind-voice-objects', authMiddleware, async (req, res) => {
    try {
        console.log("Se mete en la ruta de bind-voice-objects");
        const { text, eventId } = req.body;
        const userId = req.userId;

        // Lógica para vincular objetos de voz con un evento existente
        const objects = await dbManager.getObjectsList();
        const detectedObjects = await findObjectsInText(text, objects);
        await dbManager.addObjectsToEvent(userId, eventId, detectedObjects);

        res.status(200).json({ success: true, message: "Objetos vinculados correctamente" });
    } catch (error) {
        console.error("Error en la ruta de vincular objetos de voz:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/user/update-calendar', authMiddleware, async (req, res) => {
    try {
        const { calendarId } = req.body;
        const userId = req.userId;

        await dbManager.updateUser(userId, { calendarId: calendarId });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/calendar/list', authMiddleware, async (req, res) => {
    console.log("Petición recibida para listar calendarios del usuario");
    try {
        const userId = req.userId;
        const auth = await dbManager.getGoogleTokens(userId);

        if (!auth || !auth.accessToken) {
            return res.status(400).json({ success: false, error: "Google no vinculado" });
        }
        const calendars = await calendarService.getCalendarsFromUser(auth);
        console.log("Calendars obtenidos:", calendars);
        res.json({ success: true, calendars });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
