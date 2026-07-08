import { google } from 'googleapis';
import { config } from 'dotenv';
import { getAuthUrl } from './googleAuth.service.mjs';

config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_1
);

// Para no tener que gestionar las credenciales todo el rato, usamos una función que nos devuelve el objeto calendario del usuario en específico
const getCalendarClient = (accessToken, refreshToken) => {
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    });
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Servicio para gestionar operaciones Google Calendar
export const calendarService = {

    insertEvent: async (auth, details) => {
        // Obtenemos el calendario del usuario correspondiente
        const gcalendar = getCalendarClient(auth.accessToken, auth.refreshToken);

        const event = {
            'summary': details.title,
            'description': details.description || 'Evento creado por Ready2Go',
            'start': {
                'dateTime': details.initDate, 
                'timeZone': 'Europe/Madrid',
            },
            'end': {
                'dateTime': details.endDate,
                'timeZone': 'Europe/Madrid',
            },
            'reminders': {
                'useDefault': true,
            },
        };

        try {
            const response = await gcalendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error al crear el evento en el servicio:', error);
            throw error;
        }
    },
    getCalendarsFromUser: async (auth) => {
        console.log("Obteniendo calendarios para el usuario");
        const gcalendar = getCalendarClient(auth.accessToken, auth.refreshToken);

        const response = await gcalendar.calendarList.list({
            minAccessRole: 'writer'
        });

        console.log("Respuesta de Google Calendar:", response.data);

        const items = response.data.items || [];

        return items.map(calendar => ({
            id: calendar.id,
            name: calendar.summary,
            isPrimary: calendar.primary || false
        }));
    },
    getEventsFromCalendar: async (auth, calendarId = 'primary', interval = 2) => {
        // Obtenemos el calendario del usuario correspondiente
        const gcalendar = getCalendarClient(auth.accessToken, auth.refreshToken)

        // Obtenemos la hora en formato ISO que es lo que entiende google calendar
        const now = new Date()
        const iTime = now.toISOString()
        const fDate = new Date(now)
        fDate.setHours(now.getHours() + interval)
        const fTime = fDate.toISOString()


        // Obtenemos la lista de calendarios
        try {
            const events = await gcalendar.events.list({
                calendarId: calendarId,
                timeMin: iTime,
                timeMax: fTime,
                singleEvents: true,
                orderBy: 'startTime',
            })

            return events.data.items || []
        } catch (error) {
            console.error('Error al obtener eventos en el intervalo:', error);
            throw error;
        }
    }
}