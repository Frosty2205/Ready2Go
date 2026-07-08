//registro
$(document).ready(function () {
    const registro = $('#registroformulario');
    const nombre = $('#nombre');
    const email = $('#email');
    const username = $('#username');
    const clave = $('#clave');
    const archivo = $('#img');



    //funcion nueva para mostrar error 
    function mostrarError(input, mensaje) {
        input.removeClass('input-error');
        input.siblings('.mensaje-error').remove(); // Limpia errores previos

        input.addClass('input-error');
        input.after(`<span class="mensaje-error">${mensaje}</span>`);

        // Cuando el usuario vuelve a escribir, se borra el error
        input.one('input change', function () {
            $(this).removeClass('input-error');
            $(this).siblings('.mensaje-error').remove();
        });
    }


    function validar_registro(event) {
        event.preventDefault();


        // Limpiamos errores generales antes de volver a comprobar
        $('.mensaje-error').remove();
        $('input').removeClass('input-error');

        let nombreVal = nombre.val().trim();
        const lista_nombre = nombreVal.split(' ').filter(word => word.length > 0); //divide el string en un array usando el espacio como separador

        let emailVal = email.val().trim();
        let arrobaEmail = emailVal.split('@'); //divide el string en un array usando @ como separador

        const claveVal = clave.val().trim();
        //Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número
        const regexClave = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

        const usernameVal = username.val().trim();
        const archivoVal = archivo.val().toLowerCase();

        // Validaciones CON TOOLTIPS
        let hayErrores = false;

        //valida nombre completo


        if (lista_nombre.length < 2) {
            mostrarError(nombre, 'Debe haber al menos un nombre y un apellido');
            hayErrores = true;
        }

        // Valida email
        let puntoEmail = [];
        if (arrobaEmail.length === 2 && arrobaEmail[1]) {
            puntoEmail = arrobaEmail[1].split('.');
        }

        if (arrobaEmail.length !== 2 || puntoEmail.length < 2) {
            mostrarError(email, 'El email no es válido');
            hayErrores = true;
        }


        // Validación de Usuario y Clave
        if (usernameVal.length < 4) {
            mostrarError(username, 'El nombre de usuario debe tener mínimo 4 caracteres');
            hayErrores = true;
        }

        if (!regexClave.test(claveVal)) {
            mostrarError(clave, 'La contraseña debe tener mínimo 8 caracteres, con al menos 1 mayúscula, 1 minúscula y 1 número');
            hayErrores = true;
        }

        // Valida foto
        const selectedFile = archivo[0].files[0];

        if (!selectedFile) {
            mostrarError(archivo, 'Debes subir una foto de perfil');
            hayErrores = true;
        }
        else if (selectedFile) {
            if (archivoVal && !archivoVal.endsWith('.jpg') && !archivoVal.endsWith('.png') && !archivoVal.endsWith('.jpeg')) {
                mostrarError(archivo, 'Solo se permiten archivos .jpg, .webp o .png');
                hayErrores = true;
            }
        }

        if (hayErrores) return;


        //envio al servidor
        const reader = new FileReader();
        reader.onload = () => {

            const datosUsuario = {
                name: nombreVal,
                email: emailVal,
                username: usernameVal,
                password: claveVal,
                photo: reader.result
            }


            fetch(window.location.protocol + "//" + window.location.host + "/api/register", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosUsuario)
            })
                .then(response => {
                    if (response.ok) {
                        console.log('¡Se ha registrado correctamente. Ya puedes iniciar sesión!');
                        return response.json();
                    } else if (response.status === 409) {
                        mostrarError(username, "El usuario ya existe");
                        throw new Error("Conflict");
                    } else {
                        console.log('Error al registrar. Inténtalo de nuevo');
                        throw new Error("Error en el registro");
                    }
                })
                .then(data => {
                    if (data && data.token) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('photoPath', data.photoPath);
                        localStorage.setItem('username', usernameVal);
                        
                        console.log('Se ha registrado y se ha iniciado sesión');
                        window.location.href = `/api/auth/google?userId=${data.userId}`;
                    }
                })
                .catch(error => {
                    if (error.message !== "Conflict") {
                        console.error('Error:', error);
                    }
                });
        };



        reader.readAsDataURL(selectedFile);
    }
    registro.on('submit', validar_registro);
});
