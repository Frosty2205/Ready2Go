import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { stat } from 'node:fs';

config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_1
);

export const getAuthUrl = (userId) => {
    // Creamos un jwt para guardar el estado y volver a la app después de la autenticación
    const stateToken = jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Para el refresh_token
        prompt: 'consent select_account',      // Para asegurar que nos de el refresh_token
        scope: ['https://www.googleapis.com/auth/calendar'],
        state: stateToken
    });
};

export const getTokensFromCode = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};