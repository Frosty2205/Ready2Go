$(document).ready(function(){

    const botonGuardar = $('#boton-guardar');
    const ventanaObjetos = $('#ventanaObjetos');
    const ventanaAnadirRopa = $('#ventanaAñadirRopa');
    const botonCerrar = $('#cerrarVentana');
    const logout = $('#logout');
    const objetos = $('#tarjeta-objetos');

    // Comprobación de seguridad
    const token = localStorage.getItem('token');
     if (!token) {
        alert("No tienes permiso. Por favor, inicia sesión.");
        window.location.href = 'index.html';
        return;
    }

    // Cerrar sesión
    logout.on('click', function() {
        localStorage.removeItem('token'); 
        localStorage.removeItem('photoPath');
        console.log('¡Has cerrado sesión!');
        window.location.href = 'index.html';
    });

    // Encargado de la foto de perfil en la esquina
    const fotoGuardada = localStorage.getItem('photoPath');
    const imagenPerfil = $('#imagenPerfil');

    if (fotoGuardada) {
        const urlCompleta = window.location.protocol + "//" + window.location.host + fotoGuardada;
        imagenPerfil.attr('src', urlCompleta);
    } else {
        imagenPerfil.attr('src', 'img/default-user.png');
    }

    // Abrir ventana de objetos
    objetos.on('click', function() {
        ventanaObjetos.fadeIn(300); 
        cargarConfiguracion(); // Marcamos ya los que están configurados
    });

    // Cerrar ventana de objetos
    botonCerrar.on('click', function() {
        ventanaObjetos.fadeOut(300);
    });

    // Esto para añadir ropa en el móvil
    $('#tarjeta-anadir-ropa').on('click', function() {
        ventanaAnadirRopa.fadeIn(300);
    });

    $('#cerrarAñadir').on('click', function() {
        ventanaAnadirRopa.fadeOut(300);
    });

    // Cerramos también si hacen click fuera del recuadro
    $(window).on('click', function(event) {
        if ($(event.target).is(ventanaObjetos)) {
            ventanaObjetos.fadeOut(300);
        }
    });

    // Para mostrar nombre archivo seleccionado
    $('#fotoRopa').on('change', function() {
        const file = this.files[0];
        if (file) {
            $('#infoFoto').text(`Archivo seleccionado: ${file.name}`);
        } else {
            $('#infoFoto').text('');
        }
    });

    function mostrarError(input, mensaje) {
        input.removeClass('input-error');
        input.siblings('.mensaje-error').remove(); 
        input.addClass('input-error');
        input.after(`<span class="mensaje-error">${mensaje}</span>`);

        input.one('input change', function () {
            $(this).removeClass('input-error');
            $(this).siblings('.mensaje-error').remove();
        });
    }

    // Manejar el envío del formulario de ropa
    $('#formNuevaRopa').submit(async function(e) {
        e.preventDefault();

        const name = $('#nombreRopa').val();
        const type = $('#tipoRopa').val();
        const username = localStorage.getItem('username'); 
        const inputFoto = $('#fotoRopa');
        const filePhoto = inputFoto[0].files[0];

        $('.mensaje-error').remove();
        $('input').removeClass('input-error');

        if (!filePhoto) {
            mostrarError(inputFoto, "Por favor, selecciona una foto de la prenda.");
            return;
        }

        const nombreArchivo = inputFoto.val().toLowerCase();
        if (!nombreArchivo.endsWith('.jpg') && !nombreArchivo.endsWith('.png') && !nombreArchivo.endsWith('.jpeg')) {
            mostrarError(inputFoto, 'Solo se permiten archivos .jpg, .jpeg o .png');
            return;
        }

        if (!username || username === 'null') {
            alert("⚠️ Error: No sabemos quién eres. Por favor, vuelve a iniciar sesión.");
            window.location.href = 'index.html'; 
            return; 
        }

        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        
        try {
            const base64Photo = await toBase64(filePhoto);

            const url = window.location.protocol + "//" + window.location.host;
            const response = await fetch(`${url}/api/wardrobe/${username}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    nombre: name,
                    tipo: type,
                    photo: base64Photo 
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("¡Prenda añadida con éxito!");
                ventanaAnadirRopa.fadeOut(300);
                $('#formNuevaRopa')[0].reset(); // Vaciamos el formulario por si quiere añadir otra
                $('#infoFoto').text('');
            }
            else {
                alert("Error: " + (data.mensaje || "No se pudo guardar la prenda"));
            }
        } catch (error) {
            console.error("Error:", error);
        }
    });

    // Guardamos la configuración de objetos
    botonGuardar.on('click', function() {
        let objetosSeleccionados = [];
        
        $('input[name="objeto"]:checked').each(function() {
            objetosSeleccionados.push($(this).val());
        });

        const datosConfiguracion = {
            objects: objetosSeleccionados
        };
        console.log("Enviando configuración al sistema...");

        fetch(window.location.protocol + "//" + window.location.host + "/api/save-objects", {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(datosConfiguracion)
        })
        .then(response => {
            if (response.ok) {
                console.log('Configuración guardada en el servidor');
                botonGuardar.text('¡Guardado!');
                setTimeout(() => {
                    botonGuardar.text('Guardar');
                    ventanaObjetos.fadeOut(300);
                }, 800);
            } else {
                console.log('Error al guardar la configuración');
            }
        })
        .catch(error => {
            console.error('Error de conexión:', error);
            ventanaObjetos.fadeOut(300);
        });
    });

    // Lógica para que funcione el mando 
    const socket = io(); 
    let indiceSeleccionado = 0; 
    let indiceObjeto = 0; 

    socket.on('mando-gesto', function(datos) {
        const ventanaAbierta = $('#ventanaObjetos').is(':visible');

        if(ventanaAbierta){
            const checkboxes = $('.lista-objetos label');
            const totalElementos = checkboxes.length + 1;
            if (datos.lado === 'derecha' || datos.lado === 'izquierda') {
                checkboxes.removeClass('seleccionado');
                $('#boton-guardar').removeClass('seleccionado');

                if (datos.lado === 'derecha') {
                    indiceObjeto = (indiceObjeto + 1) % totalElementos;
                } else {
                    indiceObjeto = (indiceObjeto - 1 + totalElementos) % totalElementos;
                }

                if (indiceObjeto === checkboxes.length) {
                    $('#boton-guardar').addClass('seleccionado');
                } else {
                    $(checkboxes[indiceObjeto]).addClass('seleccionado');
                }

            } 
            else if (datos.lado === 'aceptar') {
                if (indiceObjeto === checkboxes.length) {
                    $('#boton-guardar').click(); 
                } else {
                    $(checkboxes[indiceObjeto]).click(); 
                }
            } 
            else if (datos.lado === 'salir') {
                $('.ventana').fadeOut(300);
            }  
        } else {

            const tarjetasVisibles = $('.tarjeta:visible');

            if (datos.lado === 'derecha' || datos.lado === 'izquierda') {
                tarjetasVisibles.removeClass('tarjeta-activa');

                if (datos.lado === 'derecha') {
                    indiceSeleccionado = (indiceSeleccionado + 1) % tarjetasVisibles.length;
                } else {
                    indiceSeleccionado = (indiceSeleccionado - 1 + tarjetasVisibles.length) % tarjetasVisibles.length;
                }
            
                $(tarjetasVisibles[indiceSeleccionado]).addClass('tarjeta-activa');
            } 
            else if (datos.lado === 'aceptar') {
                $(tarjetasVisibles[indiceSeleccionado]).click();
            } 
        }
    });
    
    // Escuchamos resultado final del servidor
    socket.on('workflow-result', function(result) {
        console.log("Resultado del workflow recibido:", result);

        let spokenText = "";
        const windowChecklist = $('#ventanaChecklist');
        const objectsListRe = $('#lista-objetos-faltantes');
        
        // Comprobamos resultado y en caso afirmativo guardamos texto a leer
        if (result.success) {
            spokenText = "¡Todo listo! Llevas todo lo necesario para tu evento. ¡Que tengas un buen día!";
            windowChecklist.fadeOut(300); // No mostramos
        } else {
            // Le decimos que objetos le faltan
            let remaining = result.missing;
            let remainingText = "";

            if (remaining.length === 1) {
                remainingText = remaining[0];
            } else {
                // Separamos si hay varios
                const last = remaining[remaining.length - 1];
                const rest = remaining.slice(0, -1);
                remainingText = remaining.join(", ") + " y " + last;
            }
            spokenText = `¡Espera un momento! Creo que te olvidas de lo siguiente: ${remainingText}.`;

            // Preparamos interfaz
            objectsListRe.empty();
            remaining.forEach(obj => {
                // Primera letra en mayúscula
                const cleanName = obj.charAt(0).toUpperCase() + obj.slice(1);
                objectsListRe.append(`
                    <li>
                        <input type="checkbox" class="check-objeto" id="chk-${obj.toLowerCase()}" value="${obj.toLowerCase()}">
                        <label for="chk=${obj.toLowerCase()}">${cleanName}</label>
                    </li>
                `);
            });

            // Mostramos ventana
            windowChecklist.fadeIn(300);
        }

        // Reproducimos mensaje
        const message = new SpeechSynthesisUtterance(spokenText);
        message.lang = 'es-ES';

        // Usamos voz Google si falla se usa otra
        const voices = window.speechSynthesis.getVoices();
        const googleVoice = voices.find(v => v.name.includes('Google español')) || voices.find(v => v.lang.includes('es'));
        if (googleVoice) message.voice = googleVoice;
        window.speechSynthesis.speak(message);
    });

    // Lógica para cerrar la checklist
    $('#cerrarChecklist, #boton-listo').on('click', function() {
        $('#ventanaChecklist').fadeOut(300);
    });

    // Animación chula cuando tachas algo a mano en la pantalla
    $(document).on('change', '.check-objeto', function() {
        if($(this).is(':checked')) {
            $(this).parent().addClass('completado');
        } else {
            $(this).parent().removeClass('completado');
        }
    });

    // Función para cargar lo que el usuario ya tenía configurado
    function cargarConfiguracion() {
        console.log("Recuperando configuración desde el servidor...");
        fetch(window.location.protocol + "//" + window.location.host + "/api/config", {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Añadido por seguridad
            }
        })
        .then(response => {
            if (response.ok) return response.json();
            throw new Error('No se pudo recuperar la configuración');
        })
        .then(data => {
            if (data && data.objetos) {
                $('input[name="objeto"]').prop('checked', false);
                data.objetos.forEach(obj => {
                    $(`input[value="${obj}"]`).prop('checked', true);
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar:', error);
        });
    }
});

// Acceder a wardrobe-config.html (El botón de ordenador)
const botonArmario = document.getElementById('tarjeta-armario');
if (botonArmario) {
    botonArmario.addEventListener('click', function() {
        window.location.href = 'wardrobe-config.html';
    });
}
