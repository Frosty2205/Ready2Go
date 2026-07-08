import dotenv from 'dotenv';

dotenv.config();

// Cargar API weather
const API_KEY = process.env.WEATHER_API_KEY || ""; // Esto ya lo cambiais cuando pongais la clave en .env del sv
console.log("API Key de OpenWeatherMap cargada:", API_KEY ? "✅ Cargada" : "❌ No encontrada");

// Ojo que los logs son publicos
// console.log(`🕵️‍♂️ PRUEBA DE CLAVE: --->${API_KEY}<--- (Asegúrate de que aquí dentro solo hay letras y números, sin espacios)`);

// Obtener el tiempo actual
export const getWeather = async (ciudad) => {
    // Cargamos URL de la ciudad
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudad)}&appid=${API_KEY}&units=metric&lang=es`

    // Debug
    console.log(`Obteniendo el tiempo para "${ciudad}" usando la URL: ${url}`);
    
    try {
        console.log('Probando que funcione la API del tiempo...');

        const res = await fetch(url);

        if (!res.ok) {
            const err = await res.text();
            console.log("Error with Weather API:", err.message);
            return { error: true, status: res.status, res: err.message };
        }

        const data = await res.json();

        // Datos
        const weatherData = {
            ciudad: data.name,
            temperatura: data.main.temp,
            sensacionTermica: data.main.feels_like,
            humedad: data.main.humidity,
            descripcion: data.weather[0].description,
            icono: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
        };
        return { error: false, status: res.status, res: weatherData };
        
    } catch (err) {
        console.error("Error fetching weather data:", err);
        return { error: true, status: null, res: err.message };
    }
}

// Obtener previsión del tiempo máximo 5 días
export const getForecast = async (ciudad) => {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(ciudad)}&appid=${API_KEY}&units=metric&lang=es`;
    console.log(`Buscando previsión para "${ciudad}"...`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const err = await res.text();
            return { error: true, status: res.status, res: res.message };
        }

        const data = await res.json();
        // La API devuelve una lista con el tiempo cada 3 horas
        // Limpiamos para obtener fecha/hora, temperatura y descripción
        const cleanList = data.list.map(tramo => ({
            fechaHora: tramo.dt_txt, // Esto es formato 2026-04-14 12:00:00
            temperatura: tramo.main.temp,
            descripcion: tramo.weather[0].description
        }));

        return { error: false, status: res.status, res: cleanList };
    } catch (err) {
        console.error("Error en la previsión:", err);
        return { error: true, status: null, res: res.message };
    }
}

export const getObjectsByWeather = (weatherData) => {
    const suggestedObjects = [];
    const desc = weatherData.descripcion.toLowerCase();
    const temp = weatherData.temperatura;

    if (desc.includes("lluvia") || desc.includes("llovizna") || desc.includes("tormenta")) {
        suggestedObjects.push("Paraguas", "Chubasquero");
    }
    if (desc.includes("nieve")) {
        suggestedObjects.push("Botas de nieve");
    }

    if (temp < 10) {
        suggestedObjects.push("Guantes", "Bufanda", "Gorro");
    } else if (temp > 25) {
        suggestedObjects.push("Abanico", "Gafas de sol");
    }
    if (temp > 30) {
        suggestedObjects.push("Protector solar");
    }

    return suggestedObjects;
};