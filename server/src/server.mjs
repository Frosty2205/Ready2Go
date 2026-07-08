import { app } from './app.mjs';
import dotenv from 'dotenv';
import http, { get } from 'node:http';
import { Server } from 'socket.io';
import { Db, MongoClient, ObjectId } from "mongodb"
import { Database } from './utils/database.js'
import axios from 'axios';
import FormData from 'form-data';
import { identifyFace } from './services/faceRecognition.service.mjs';
import { missingObjects } from './services/workflow.service.mjs';


dotenv.config();
const client = new MongoClient(process.env.DB_CONNECTION)

const PORT = process.env.PORT || 3000;
const VISION_URL = process.env.NODE_ENV === "docker" ? "http://vision:8000/recognize" : "http://localhost:8000/recognize";

const sv = http.createServer(app);
const io = new Server(sv, {
    cors: { origin: "*" }
});

let cameras = {
    frontal: null,
    cenital: null
};

sv.on("listening", () => {
  console.log("Servidor en https://ready2go.garcalia.com")
})

const dbManager = Database.getDatabase();
// El punto y coma aqui es obligatorio
;(async () => {
    try {
        // Para que se cargue primero la base de datos y después se lance el servidor
        const db = await dbManager.connect();
        sv.listen(PORT);
        
    } catch (error) {
        console.error("Could not connect to database");
    }
})();


const users = {}
let broadcasters = {};
const userCooldowns = new Map();

io.on("connection", (socket) => {
    console.log("Socket connected: ", socket.id);

    // User register
    socket.on("register", (userId, role) => {
        users[userId] = socket.id;

        if (role === "frontal" || role === "cenital") {
            broadcasters[userId] = { socketId: socket.id , role: role, lock: false };
            console.log(`Cámara registrada: ${role} (Usuario: ${userId})`);
        }

        if (role === "frontal") cameras.frontal = socket.id;
        if (role === "cenital") cameras.cenital = socket.id;

        console.log("User registered: ", userId);
    });

    socket.on('mando-gesto', (datos) => {
        console.log(`Mando dice: Movimiento a la ${datos.lado}`);

        socket.broadcast.emit('mando-gesto', {
            lado: datos.lado
        });
    });


    // Both join room after accept
    socket.on("viewer-join", () => {
        if (Object.keys(broadcasters).length > 0) {
            const broadcaster = Object.keys(broadcasters)[0]?.socketId;
            if (broadcaster) {
                io.to(broadcaster).emit("new-viewer", { from: socket.id });
            }
        } else {
            socket.emit("error-msg", "There is no device streaming");
        }
    });

    socket.on("streaming-frame", async (imageData, ack) => {
        // Reenviamos el frame a todos menos al que lo envía (el emisor)
        socket.broadcast.emit("play-frame", {
            from: socket.id,
            imageData: imageData,
        });

        // Confirmamos al emisor que el frame se ha recibido bien
        if(ack) ack({ status: "ok" });

        const currentBroadcasterId = Object.keys(broadcasters).find(key => broadcasters[key].socketId === socket.id);
        const broadcaster = broadcasters[currentBroadcasterId];

        // Pasamos las caras solo si el frame viene de la cámara frontal
        if (broadcaster && broadcaster.role === "frontal" && !broadcaster.lock) {
            broadcaster.lock = true;
            try {
                //pasamos  la imagen a un buffer para enviarla a vision
                //lo mismo que hicimos en index.mjs para guardarlo
                const photoBase64 = imageData.split(",")[1];
                const imgBuffer = Buffer.from(photoBase64, 'base64');
                if (imgBuffer.length < 1000) { 
                    console.log("Frame demasiado pequeño, saltando...");
                    broadcaster.lock = false; 
                    return; 
                }
                const form = new FormData();

                form.append('file', imgBuffer, {
                    filename: 'frame.jpg',
                    contentType: 'image/jpeg'
                })
                console.log("Content-Length calculado:", form.getLengthSync());

                // LLamamos a vision
                const visionRes = await axios.post(VISION_URL, form,{
                    headers: form.getHeaders(),
                });
                const faces = visionRes.data.faces;
                // TODO: En algún momento habrá que gestionar cuando haya más de una cara, aunque lo ideal sería que no pasara
                if (faces && faces.length === 1) {
                    const photoEmbedding = faces[0].embedding;
                    // TODO: Para verificar cuanto tarda con Python, aquí habría que hacer un fetch a vision a /identify pasando el embedding como parámetro
                    // CUIDADO: El fetch devuelve un diccionario con información extra
                    const user = await identifyFace(photoEmbedding);
                    if (user) {
                        const now = Date.now();
                        const lastSeen = userCooldowns.get(user._id.toString()) || 0;
                        const COOLDOWN = 30000; // 30 segundos
                        if (now - lastSeen > COOLDOWN) {
                            console.log(`Usuario reconocido: ${user.username}`);
                            // Enviamos el usuario reconocido a los monitores
                            io.emit("recognized-user", {
                                username: user.username
                            });
                            // En caso de reconocer al usuario, le pedimos frame a cámara cenital
                            if (cameras.cenital) {
                                console.log("Pidiendo frame de cámara cenital");
                                io.to(cameras.cenital).emit("request-cenital-frame", { userId: user._id.toString() });
                            } else {
                                console.log("No hay cámara cenital conectada");
                            }
                        }
                    }
                }
            } catch(error){
                console.error("Error llamando a la IA", error.message);
            }
             finally {
                setTimeout(() => {
                    if (broadcasters[currentBroadcasterId]) {
                        broadcasters[currentBroadcasterId].lock = false;
                    }
                }, 10000);
            }
        }
    });

    // Receptor de la cámara cenital
    socket.on("cenital-frame-result", async ({ imageData, userId }) => {
        console.log("Frame cenital recibido");
        try {
            // Obtenemos usuario
            const user = await dbManager.getUserById(userId);

            if (user) {
                // Emitimos workflow
                const workflowResult = await missingObjects(user, imageData);
                // Emitimos resultado a las pantallas conectadas
                io.emit("workflow-result", workflowResult);
                console.log("Resultado enviado a la pantalla:", workflowResult);
            }
        } catch (error) {
            console.error("Error en el workflow:", error);
        }
    });

    // Cleanup
    socket.on("disconnect", () => {
        const disconnectedBroadcaster = Object.keys(broadcasters).find(key => broadcasters[key].socketId === socket.id);
        if (disconnectedBroadcaster) {
            const role = broadcasters[disconnectedBroadcaster].role;
            delete broadcasters[disconnectedBroadcaster];
            
            if (role === "frontal") cameras.frontal = null;
            if (role === "cenital") cameras.cenital = null;

            console.log(`Cámara ${role} desconectada: ${socket.id}`);
        }

        if (Object.keys(broadcasters).length === 0) {
            socket.broadcast.emit("error-msg", "The streaming device has disconnected");
        }
    });
});
