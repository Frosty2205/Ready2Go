const socket = io();
const video = document.getElementById('video-local');
const statusDisp = document.getElementById('status');
const canvas = document.getElementById('snapshot');
const context = canvas.getContext('2d');

// Parámetros del cliente
const urlParams = new URLSearchParams(window.location.search);
const client_name = urlParams.get('name') || `user_${Math.floor(Math.random() * 1000)}`; // En caso de que no lo encuentre, asignará uno
const client_role = urlParams.get('role')

// Ni idea de cómo va esto, de momento pa probar se queda así
// const CAPTURE_INTERVAL = 3000
const FRAME_RATE = 500;

let socketReady = true;

async function init() {
    socket.emit("register", client_name, client_role);

    // Actualizamos la condición para aceptar nuestras dos nuevas cámaras
    if (client_role === "frontal" || client_role === "cenital") {
        startCamera();
    } else {
        startMonitor();
    }
}

async function startCamera() {
    console.log("Initializing camera...")
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;
        video.play();
        // setInterval(checkConnection, 5000);
        setInterval(() => {
            if (!socketReady || video.paused || video.ended) return;

            // Bloqueamos el envío de frames
            socketReady = false;

            // Mirar si cuando el movil está en vertical se puede hacer para que se vea bien en el pc
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video, 0, 0, canvas.width, canvas.height)

            const imageData = canvas.toDataURL('image/jpeg', 0.5);

            socket.emit("streaming-frame", imageData, () => {
                // Debloqueamos el envío de frames
                socketReady = true;
            });

        }, FRAME_RATE);
    } catch (err) {
        console.log(err);
    }
}

function startMonitor() {

    video.style.display = "none";
    statusDisp.innerText = "Monitor activo - Esperando cámaras...";

    socket.on("play-frame", ({ from, imageData, userId }) => {
        let img = document.getElementById(`cam-${from}`);
        if (!img) {
            img = document.createElement('img');
            img.id = `cam-${from}`;
            img.className = "remote-stream";
            document.querySelector('.camera-container').appendChild(img);
        }
        img.src = imageData;
    });

    socket.on("broadcaster-disconnected", (id) => {
        const img = document.getElementById(`cam-${id}`);
        if (img) img.remove();
    });
}

async function checkConnection() {
    try {
        // Buscar una forma de no hardcodear la URL cada vez
        const response = await fetch('https://9159-79-146-110-225.ngrok-free.app/camera-client/camera.html');

        if (!response.ok) throw new Error();

        console.log("Conexión estable...");
    } catch (err) {
        console.error("Túnel cerrado");

        // Detenemos el hardware de la cámara
        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Limpiamos la pantalla
        video.srcObject = null;
        statusDisp.innerText = "SESIÓN FINALIZADA: El túnel se ha cerrado.";
        statusDisp.style.color = "red";
    }
}

// ESCUCHADOR EXCLUSIVO DE LA CÁMARA CENITAL
socket.on("request-cenital-frame", ({ userId }) => {
    // Si somos la cámara cenital, tomamos una foto y la enviamos
    if (client_role === "cenital" && video.srcObject && !video.paused) {
        console.log("Servidor solicita frame cenital. Tomando foto...");
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Enviamos la foto al servidor, devolviéndole el userId
        socket.emit("cenital-frame-result", { imageData, userId });
    }
});

init();
