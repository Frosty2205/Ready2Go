const socket = io();
const boton = document.getElementById('boton-activar');

//cooldown para que vaya poco a poco
let cooldown = false;

boton.addEventListener('click', async () => {
    //permiso deliphone
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            //permiso (ios necesita)
            const permiso = await DeviceOrientationEvent.requestPermission();
            if (permiso === 'granted') {
                iniciarTransmision();
            }
        } catch (error) {
            console.error(error);
        }
    } else {
        iniciarTransmision(); // los demas
    }
});

//api deviceorientationevent
function iniciarTransmision() {
    boton.style.display = 'none';
    // evento orientation
    window.addEventListener('deviceorientation', (evento) => {
        
        //beta es inclinacion hacia delante/atrás (Aceptar/Salir)
        const beta = evento.beta;

        //gamma es inclinación izquierda/derecha 
        const gamma = evento.gamma;

        let accion = null;

        //Lógica derecha izquierda
        if (gamma > 30) {
            accion = 'derecha';
        } else if (gamma < -30) {
            accion = 'izquierda';
        }
        // Lógica Aceptar
        else if (beta > 30) {
            accion = 'aceptar';
        }
        // Lógica Salir 
        else if (beta < -30) {
            accion = 'salir';
        }

        if (accion) {
            ejecutarAccion(accion);
        }
    });
}

function ejecutarAccion(lado) {
    if(!cooldown){
        cooldown = true;
        socket.emit('mando-gesto', { lado: lado });
        //cooldown de 1 segundooooooo
        setTimeout(() => {
            cooldown = false;
        }, 1000); 
    }
}