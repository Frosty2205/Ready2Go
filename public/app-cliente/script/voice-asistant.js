// Aquí va la lógica del asistente de voz
// IMPORTANTE: para hacer las frases de las previsiones del tiempo debe ser ("en" o "el" + ciudad) y si quieres decir día (el jueves por ejemplo)
// IMPORTANTE: para las frases de previsiones del tiempo solo acepta mañana, pasado mañana o los días de la semana NO los números ni meses al menos de momento
// Aquí va la lógica del asistente de voz
// IMPORTANTE: para hacer las frases de las previsiones del tiempo debe ser ("en" o "el" + ciudad) y si quieres decir día (el jueves por ejemplo)
// IMPORTANTE: para las frases de previsiones del tiempo solo acepta mañana, pasado mañana o los días de la semana NO los números ni meses al menos de momento

const extractEventDetails = (transcript) => {
    let title = transcript.toLowerCase();

        // Limpiamos solo la orden inicial (el verbo y los artículos), 
        // conservando palabras como "reunión" o "recordatorio" para el título final
        const regexOrder = /^(?:ponme|añade|crea|guarda|haz|tengo)\s+\b(?:una?|el|la)\b\s*/i;
        title = title.replace(regexOrder, '').trim();

        // Buscamos dónde empieza a hablar del tiempo para cortar ahí
        const regexTime = /\s+\b(para el|para mañana|para hoy|a las?|el lunes|el martes|el miércoles|el jueves|el viernes|el sábado|el domingo|mañana|hoy|pasado mañana)\b/i;
        const matchTime = title.match(regexTime);

        // Si encuentra una palabra de tiempo, corta el texto justo antes
        if (matchTime) {
            title = title.substring(0, matchTime.index).trim();
        }

        // Limpieza final
        title = title.replace(/^de\s+/i, '');
        if (!title) title = "Nuevo evento";

        // Devolvemos la frase con la primera letra en mayúscula
        return title.charAt(0).toUpperCase() + title.slice(1);
};

$(document).ready(function() {
    // Variable para saber si estás en móvil o en ordenador
    const phone = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Comprobamos
    if (phone) {
        console.log("Estás en móvil");
    } else {
        const url = window.location.protocol + "//" + window.location.host;

        // Aquí guardaremos el catálogo de voces
        let availableVoices = [];

        // Esto es para ver todas las voces dispobibles
        window.speechSynthesis.onvoiceschanged = () => {
            availableVoices = window.speechSynthesis.getVoices();
            
            console.log("Voces disponibles en tu sistema:");
            availableVoices.forEach((voz, indice) => {
                if(voz.lang.includes('es')) { 
                    console.log(`[${indice}] ${voz.name} (${voz.lang})`);
                }
            });
        };

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error("SpeechRecognition no es compatible con este navegador.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = true; 
        recognition.interimResults = false; 

        let isSpeaking = false;

        // Función para hablar
        const talk = (text) => {
            isSpeaking = true;
            recognition.abort();
            console.log("Micrófono apagado (hablando)");
            const message = new SpeechSynthesisUtterance(text); 
            message.lang = 'es-ES';

            if (availableVoices.length > 0) {
                const chosenVoice = availableVoices.find(voz => voz.name.includes('Google español')) 
                                || availableVoices.filter(voz => voz.lang.includes('es'))[0];
                message.voice = chosenVoice;
            }

            message.onend = () => {
                console.log("Terminé de hablar");
                isSpeaking = false;
                recognition.start();
            };
            window.speechSynthesis.speak(message);
        };

        // Variables para el modo de escucha activa (Oye Trasto)
        let activeMode = false;
        let activeTimeout = null;

        // Metemos tu lógica de siempre en una función
        const processCommand = async (transcript) => {
            console.log("Procesando orden:", transcript);

            if (transcript.includes("tiempo") || transcript.includes("clima") || transcript.includes("weather")) {
                let cleanTranscript = transcript.replace(/(el\s+)?(lunes|martes|miércoles|jueves|viernes|sábado|domingo|hoy|mañana|pasado mañana)/g, "").trim();
                const match = cleanTranscript.match(/(?:en|de)\s([a-záéíóúñ\s]+)/i);

                if (match && match[1]) {
                    const city = match[1].trim();
                    console.log("Ciudad detectada:", city);

                    let advanceDays = 0;
                    let dayWord = "hoy";
                    const daysWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                    const dayToday = new Date().getDay();

                    if (transcript.includes("pasado mañana")) {
                        advanceDays = 2;
                        dayWord = "pasado mañana";
                    } else if (transcript.includes("mañana")) {
                        advanceDays = 1;
                        dayWord = "mañana";
                    } else {
                        for (let i = 0; i < daysWeek.length; i++) {
                            if (transcript.includes(daysWeek[i])) {
                                let diference = i - dayToday;
                                if (diference <= 0) {
                                    diference += 7;
                                }
                                advanceDays = diference;
                                dayWord = `el ${daysWeek[i]}`;
                                break;
                            } 
                        }
                    }

                    try {
                        if (advanceDays === 0) {
                            const response = await fetch(`${url}/api/weather/${city}`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                            });
                            const data = await response.json();
                            if (response.ok) {
                                talk(`El tiempo en ${city} hoy es ${data.res.descripcion} con ${Math.round(data.res.temperatura)} grados`);
                            }
                        } else if (advanceDays > 5) {
                            talk(`Lo siento, solo puedo ver el tiempo con 5 días de antelación`);
                        } else {
                            const response = await fetch(`${url}/api/forecast/${city}`, {
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                            });
                            const data = await response.json();

                            if (response.ok) {
                                const objectiveDate = new Date();
                                objectiveDate.setDate(objectiveDate.getDate() + advanceDays);
                                const textDate = objectiveDate.toISOString().split('T')[0];

                                const forecast = data.res.find(tramo => tramo.fechaHora.includes(`${textDate} 12:00:00`)) || data.res.find(tramo => tramo.fechaHora.includes(`${textDate}`));

                                if (forecast) {
                                    talk(`La previsión para ${city} ${dayWord} es de ${forecast.descripcion} con ${Math.round(forecast.temperatura)} grados.`);
                                } else {
                                    talk(`No he encontrado la previsión exacta para ${dayWord} en ${city}.`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(error);
                        talk(`Ocurrió un error al obtener el clima para ${city}.`);
                    }
                } else {
                    talk("No pude detectar la ciudad. Por favor, intenta decir algo como '¿Qué tiempo hace en Madrid?'");
                }
            } else if (transcript.includes("reunión") || transcript.includes("aviso") || transcript.includes("cita") || transcript.includes("ponme") || transcript.includes("recordatorio") || transcript.includes("añade") || transcript.includes("crea")) {
                
                const title = extractEventDetails(transcript);

                const hourMatch = transcript.match(/(\d{1,2})[:h](\d{2})|a las? (\d{1,2})/i);
                let hour = "12:00"; 
                if (hourMatch) {
                    let parsedHour = parseInt(hourMatch[1] || hourMatch[3], 10);
                    let parsedMinutes = hourMatch[2] || "00";
                    if ((transcript.includes("tarde") || transcript.includes("noche") || transcript.includes("pm")) && parsedHour < 12) {
                        parsedHour += 12;
                    }
                    hour = `${String(parsedHour).padStart(2, '0')}:${parsedMinutes}`;
                }

                let advanceDays = 0;
                let dayWord = "hoy";
                const daysWeek = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                const dayToday = new Date().getDay();

                if (transcript.includes("pasado mañana")) {
                    advanceDays = 2;
                    dayWord = "pasado mañana";
                } else if (transcript.includes("mañana")) {
                    advanceDays = 1;
                    dayWord = "mañana";
                } else {
                    for (let i = 0; i < daysWeek.length; i++) {
                        if (transcript.includes(daysWeek[i])) {
                            let diference = i - dayToday;
                            if (diference <= 0) {
                                diference += 7;
                            }
                            advanceDays = diference;
                            dayWord = `el ${daysWeek[i]}`;
                            break;
                        } 
                    }
                }
                const baseDate = new Date();
                baseDate.setDate(baseDate.getDate() + advanceDays);
                const finalDate = baseDate.toISOString().split('T')[0];
                const initDate = `${finalDate}T${hour}:00`;
                
                const endDateObj = new Date(initDate);
                endDateObj.setHours(endDateObj.getHours() + 1);
                const endYear = endDateObj.getFullYear();
                const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
                const endDay = String(endDateObj.getDate()).padStart(2, '0');
                const endHour = String(endDateObj.getHours()).padStart(2, '0');
                const endMinute = String(endDateObj.getMinutes()).padStart(2, '0');
                const endDate = `${endYear}-${endMonth}-${endDay}T${endHour}:${endMinute}:00`;

                talk(`Entendido, voy a anotar ${title} para ${dayWord} a las ${hour}`);

                try {
                    const token = localStorage.getItem('token');
                    if (!token) {
                        talk("Por favor, inicia sesión para usar el calendario.");
                        return;
                    }

                    const response = await fetch(`${url}/api/calendar/event`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            title: title,
                            initDate: initDate,
                            endDate: endDate,
                            description: "Creado por el asistente de voz"
                        })
                    });

                    const result = await response.json();
                    if (result.success && result.eventId) {
                        const voiceConfigRes = await fetch(`${url}/api/bind-voice-objects`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ text: transcript, eventId: result.eventId })
                        });

                        const voiceResult = await voiceConfigRes.json();
                
                        if (voiceResult.objetosDetectados && voiceResult.objetosDetectados.length > 0) {
                            talk(`Ya está guardado. También he recordado que necesitas: ${voiceResult.objetosDetectados.join(', ')}.`);
                        } else {
                            talk("Ya lo tienes guardado en tu calendario.");
                        }
                    } else {
                        talk("He tenido un problema al crear el evento.");
                    }
                } catch (error) {
                    console.error("Error:", error);
                    talk("El servicio de calendario no responde.");
                }
            } else if (transcript.includes("ya tengo") || transcript.includes("ya llevo")) { 
                // Expresión regular para cazar "ya tengo las llaves" o "ya llevo la toalla"
                const regexObject = /(?:ya tengo|ya llevo)\s+(?:el|la|los|las|un|una)?\s*([a-záéíóúñ]+)/i;
                const match = transcript.match(regexObject);
                
                if (match && match[1]) {
                    const object = match[1].toLowerCase().trim();
                    
                    // Buscamos si existe la casilla con ese id en la pantalla
                    const checkbox = document.getElementById(`chk-${object}`);
                    
                    if (checkbox) {
                        checkbox.checked = true;
                        // Forzamos el evento 'change' para que se aplique la clase CSS de tachado
                        $(checkbox).trigger('change'); 
                        
                        talk(`Genial. He marcado ${object} como listo.`);
                        
                        // Opcional: Comprobar si ya están todos marcados para cerrar la ventana
                        const total = $('.check-objeto').length;
                        const marked = $('.check-objeto:checked').length;
                        if (total > 0 && total === marked) {
                            setTimeout(() => {
                                talk("Perfecto, ya tienes todo. ¡Puedes irte!");
                                $('#ventanaChecklist').fadeOut(300);
                            }, 2000);
                        }
                        
                    } else {
                        talk(`No veo ${object} en la lista de cosas que te faltan.`);
                    }
                } else {
                    talk("He entendido que ya lo llevas, pero no sé qué objeto es.");
                }
            } else {
                talk("Lo siento, no he entendido qué quieres hacer.");
            }
        };

        // Procesamiento PRINCIPAL del micrófono
        recognition.onresult = async (event) => {
            if (isSpeaking) {
                return;
            }

            const index = event.resultIndex;
            const transcriptRaw = event.results[index][0].transcript.trim().toLowerCase();
            console.log("Micrófono detectó:", transcriptRaw);

            // Buscamos la palabra paco y hola
            const match = transcriptRaw.match(/(?:oye |hola |ok )?paco/i);

            if (match) {
                activeMode = true;
                clearTimeout(activeTimeout); // Reseteamos el temporizador

                // Sacamos lo que haya dicho DESPUÉS del nombre
                const commandText = transcriptRaw.substring(match.index + match[0].length).trim();

                if (commandText === "") {
                    talk("¿Dime?");
                    // Le damos 8 segundos para responder algo
                    activeTimeout = setTimeout(() => { 
                        activeMode = false; 
                        console.log("Se acabó el tiempo de escucha"); 
                    }, 8000);
                } else {
                    // Si lo dijo todo del tirón, lo procesamos
                    await processCommand(commandText);
                    activeMode = false;
                }
                return; 
            }

            // Si ya estábamos en modo activo porque nos llamó un momento antes
            if (activeMode) {
                clearTimeout(activeTimeout); // Paramos el temporizador de apagado
                await processCommand(transcriptRaw); // Procesamos la orden
                activeMode = false; // Y volvemos a dormir al asistente
            }
        };

        // Como los navegadores apagan el micrófono después de un tiempo, lo reiniciamos cada vez que se detiene
        recognition.onend = () => {
            if (!isSpeaking) {
                console.log("Micrófono pausado, reiniciando...");
                recognition.start();
            } else {
                console.log("Micro detenido. Estoy hablando");
            }
        };

        // Por obligación, hasta que el usuario no interactue con la página, el micrófono no se activa
        $(document).one('click', function() {
            console.log("Asistente activado y escuchando de fondo");
            recognition.start();
        });
    }
});