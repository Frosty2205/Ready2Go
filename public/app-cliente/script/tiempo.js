// Obtención de los ids
const inputCiudad = document.getElementById('input-ciudad');
const btnBuscar = document.getElementById('btn-buscar');
const divResultado = document.getElementById('resultado-tiempo');
const msgError = document.getElementById('mensaje-error');

// Capturamos los huecos del HTML donde pondremos los datos
const iconoTiempo = document.getElementById('icono-tiempo');
const textoCiudad = document.getElementById('texto-ciudad');
const textoDesc = document.getElementById('texto-desc');
const textoTemp = document.getElementById('texto-temp');
const textoSensacion = document.getElementById('texto-sensacion');
const textoHumedad = document.getElementById('texto-humedad');

// Función para llamar a weather.service.mjs y mostrar el resultado
const buscarTiempo = async (ciudad) => {
    // Escondemos cosas de búsquedas anteriores
    divResultado.style.display = 'none';
    msgError.style.display = 'none';

    if (!ciudad) return;

    try {
        // Variable para que no de problemas las tíldes
        const aux = encodeURIComponent(ciudad.trim());
        // Construción URL dinámica
        const urlBase = window.location.protocol + "//" + window.location.host;
        const endpoint = "/api/weather/" + aux;
        console.log("Llamando a:", urlBase + endpoint); // Para debug
        const response = await fetch(urlBase + endpoint);
        const data = await response.json();
        console.log("Respuesta recibida del servidor:", data); // Para debug

        if (data.error) {
            msgError.style.display = 'block';
            return;
        }

        const info = data.res;
        console.log("Información del tiempo recibida:", info); // Para debug

        // Ponemos los datos en la pantalla
        textoCiudad.innerText = info.ciudad;
        textoDesc.innerText = info.descripcion;
        textoTemp.innerText = `${Math.round(info.temperatura)}°C`; // Redondeamos para que quede más bonito
        textoSensacion.innerText = `${Math.round(info.sensacionTermica)}°C`;
        textoHumedad.innerText = `${info.humedad}%`;
        iconoTiempo.src = info.icono;

        // Mostramos
        divResultado.style.display = 'flex';

    } catch (error) {
        console.error("Error conectando con el servidor:", error);
        msgError.style.display = 'block';
    }
};

// Evento para el botón de buscar
btnBuscar.addEventListener('click', () => {
    buscarTiempo(inputCiudad.value);
});

// Evento para poder darle al Enter en el teclado
inputCiudad.addEventListener('keypress', (evento) => {
    if (evento.key === 'Enter') {
        buscarTiempo(inputCiudad.value);
    }
});