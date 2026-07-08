$(document).ready(function () {
    const login = $('#formulario-login');
    const register = $('#registro');
    const user = $('#login-user');
    const clave = $('#login-clave');


    //funcion nueva para mostrar error 
    function mostrarError(input, mensaje){
        input.removeClass('input-error');
        input.siblings('.mensaje-error').remove(); // Limpia errores previos

        input.addClass('input-error');
        input.after(`<span class="mensaje-error">${mensaje}</span>`);
        
        // Cuando el usuario vuelve a escribir, se borra el error
        input.one('input change', function() {
            $(this).removeClass('input-error');
            $(this).siblings('.mensaje-error').remove();
        });
    }


    // Redirigir a registro si no tiene cuenta
    register.on('click', function () {
        window.location.href = 'registro.html';
    });

    login.on('submit', function (e) {
        e.preventDefault();
    
    // Limpieza previa
    $('.mensaje-error').remove();
    $('input').removeClass('input-error');

        const loginData = {
            username: user.val().trim(),
            password: clave.val().trim()
        };

        // Enviamos los datos al servidor (Puerto 3000)
        fetch(window.location.protocol + "//" + window.location.host + "/api/login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('Usuario o contraseña incorrectos');
            })
            .then(data => {
                localStorage.setItem('token', data.token);
                localStorage.setItem('photoPath', data.photoPath); // Guardamos la ruta de la foto para mostrarla luego
                localStorage.setItem('username', user.val().trim()); // Guardamos el username para usarlo luego en el armario
                console.log('¡Inicio de sesión correcto!');
                window.location.href = 'ready2go.html';
            })
            .catch(err => {
                console.error(err.message);
                mostrarError(user, err.message);
                mostrarError(clave, '');

            });
    });
});
