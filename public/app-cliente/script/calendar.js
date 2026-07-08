document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const select = document.getElementById('calendarSelect');
    const btnGuardar = document.getElementById('btnGuardarConfig');
    const mensaje = document.getElementById('mensajeStatus');

    try {
        const res = await fetch('/api/calendar/list', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log("Calendars obtenidos:", data.calendars);

        if (data.success) {
            select.innerHTML = '';
            data.calendars.forEach(cal => {
                const opt = document.createElement('option');
                opt.value = cal.id;
                opt.textContent = cal.name;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        select.innerHTML = '<option>Error al conectar</option>';
    }

    btnGuardar.addEventListener('click', async () => {
        const calendarId = select.value;

        const res = await fetch('/api/user/update-calendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ calendarId })
        });

        if (res.ok) {
            console.log("Configuración guardada");
            window.location.href = 'ready2go.html';
        }
    });
});