// Import librería Google MediaPipe
import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js";

// Array con las prendas del armario
let wardrobe = [];
let index = 0;
const imgGarment = document.getElementById("imagen-prenda");

// Llamamos al servidor para obtener prendas
const loadWardrobeDB = async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        console.error("Error al encontrar al usuario en localStorage");
        return;
    }
    const url = window.location.protocol + "//" + window.location.host;
    try {
        const res = await fetch (`${url}/api/wardrobe/${username}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();

        if (data.error) {
            console.error("Error al cargar el armario:", data.error);
            return;
        }

        if (data.ropa && data.ropa.length > 0) {
            wardrobe = data.ropa.map(prenda => url + prenda.imagen);

            // Mostramos la primera prenda
            imgGarment.src = wardrobe[0];
            
        } else {
            console.warn("El armario está vacío");
            imgGarment.src = "img/abrigo.png"; // Imagen por defecto si no hay nada
        }
    } catch (error) {
        console.error("Error al cargar el armario:", error);
    }
};

// Variables para el reconocimiento de gestos
let handLandmarker;
let videoElement = document.getElementById("webcam");
let originX = 0;
let cooldown = false;
let originTime = 0;
let wait = null; // Esta variable es para que espere un ratito antes de detectar la mano por primera vez

// Inicializar MediaPipe HandLandmarker
const initializeHandLandmarker = async () => {
    console.log("Inicializando HandLandmarker...");

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU" 
        },
        runningMode: "VIDEO",
        numHands: 1
    });

    console.log("HandLandmarker inicializado.");
    encenderCamara();
};

// Encender la cámara y procesar el video
const encenderCamara = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        videoElement.addEventListener("loadeddata", predecirFotogramas);
    } catch (error) {
        console.error("Error al acceder a la cámara:", error);
    }
};

// Analisis del video para detectar gestos
const predecirFotogramas = async () => {
    // Esperamos en caso de que el modelo no esté listo
    if (!handLandmarker) {return;}

    let startTime = performance.now();
    const results = handLandmarker.detectForVideo(videoElement, startTime);

    // Detectamos la mano
    if (results.landmarks && results.landmarks.length > 0) {
        // Guardamos la muñeca para detectar el gesto de pasar la mano (es el punto 0)
        const wristX = results.landmarks[0][0].x;

        // Cuando se detecta la mano por primera vez, empezamos a contar
        if (wait === null) {
            wait = Date.now();
        }

        // Ya cuando pase medio segundo desde que se detectó la mano por primera vez, empezamos a detectar el gesto de pasar la mano
        if (Date.now() - wait < 500) {
            originX = wristX; 
            originTime = Date.now(); 
        }
        // Si no hay enfriamiento y la mano está en la pantalla, detectamos el gesto de pasar la mano
        else if (!cooldown) {
            // Guardamos la posición inicial de la mano
            if (originX === null) {
                originX = wristX;
                originTime = Date.now();
            } else {
                const timeLapsed = Date.now() - originTime;
                const distanceX = wristX - originX;

                // Umbral pantalla 15%
                const threshold = 0.15;

                // Si la mano se ha movido lo suficiente, cambiamos a la siguiente prenda
                if (Math.abs(distanceX) > threshold) {
                    if (distanceX > 0) {
                        console.log("Gesto detectado: Mover a la izquierda");
                        cambiarPrenda(-1); // Mover a la izquierda
                    } else {
                        console.log("Gesto detectado: Mover a la derecha");
                        cambiarPrenda(1); // Mover a la derecha
                    }

                    // Activamos el enfriamiento para evitar detecciones múltiples
                    activarEnfriamiento();
                    originX = null; // Reseteamos la posición inicial para la próxima detección
                }

                // Si pasa más de 800 milisegundos sin detectar un gesto, reseteamos la posición inicial para evitar detecciones erróneas
                if (timeLapsed > 800) {
                    originX = wristX;
                    originTime = Date.now();
                }
            }    
        } else {
            // Si no se detecta mano, reseteamos la posición anterior
            originX = null;
        }
    } else {
        // En caso de que saquemos la mano de la cámara, volvemos a empezar
        originX = null;
        wait = null; 
    }
    // Ejecutamos esto sin parar
    window.requestAnimationFrame(predecirFotogramas);
};

// Ponemos enfriamiento para que no se pueda pasar prendas a tutiplen
const activarEnfriamiento = () => {
    cooldown = true;
    originX = null; // Reseteamos la posición anterior para evitar detecciones erróneas
    setTimeout(() => {
        cooldown = false;
    }, 1000); // Enfriamiento de 1 segundo
};

// Cambiar prenda de la pantalla
const cambiarPrenda = (direccion) => {
    // En caso de que el usuario no tenga prendas, no hacemos nada
    if (wardrobe.length === 0) {
        console.warn("No hay prendas en el armario para mostrar.");
        return;
    }
    index += direccion;

    // Si llegamos al final que vuelva al principio y viceversa
    if (index >= wardrobe.length) {
        index = 0;
    } else if (index < 0) {
        index = wardrobe.length - 1;
    }

    // Actualizamos la imagen de la prenda
    imgGarment.src = wardrobe[index];

    // Esto es pa que quede chuli
    setTimeout(() => imgGarment.style.opacity = 1, 150);
};

// Esto lo dejo en caso de que falle la cámara y los gestos
document.getElementById("btn-izq").addEventListener("click", () => cambiarPrenda(-1));
document.getElementById("btn-der").addEventListener("click", () => cambiarPrenda(1));

// Inicializamos todo
initializeHandLandmarker();
loadWardrobeDB();