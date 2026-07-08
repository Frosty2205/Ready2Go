import jwt from "jsonwebtoken";
import { config } from 'dotenv'

config();

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No se ha encontrado el token' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Token no válido' });
        req.user = user;
        req.userId = user.id; // Lo de no pasarle el id es para pegarte Sergio
        next();
    });
};