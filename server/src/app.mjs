import express from 'express'
import fs from 'node:fs'
import cors from 'cors'
import apiRoutes from './routes/index.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url';

import {execSync} from 'child_process'
import {readFileSync} from "fs"

// Creates an express app
export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use('/camera-client', express.static(path.join(__dirname, '../../public/camera-client/')));

app.use(express.static(path.join(__dirname, '../../public/app-cliente/')));
app.use('/faces', express.static(path.join(process.cwd(), 'faces')));
app.use('/clothes', express.static(path.join(process.cwd(), 'clothes')));


// Cuando entras a la ruta raíz, sirves la página de la cámara
app.get('/', (req, res) => {
    // res.setHeader('Content-Type', "text/html");
    const indexPath = path.join(__dirname, '../../public/app-cliente/index.html');
    
    let html = fs.readFileSync(indexPath, 'utf8');
    
    res.send(html);
});

// Protegerme esto luego con algun token o dejarlo solo para adms al iniciar sesion
app.get('/logs', (req, res) => {
  const data = execSync("journalctl -exqu ready2go")

  const html = readFileSync("src/routes/static/logs.html").toString()

  res.end(html.replace("{%data%}", data))
});

//ruta para la camara
app.get('/camera', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/camera-client/camera.html'));
});

// Ruta para el mando del móvil
app.get('/mando', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/app-cliente/mando.html'));
});

//ruta para el monitor
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/camera-client/camera.html'));
});

// Ruta para la pantalla de salida
app.get('/salida', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/camera-client/salida.html'));
});

app.get('/logs-python', (req, res) => {
  const data = execSync("journalctl --user -exqu vision-ci")

  const html = readFileSync("src/routes/static/logs.html").toString()

  res.end(html.replace("{%data%}", data))
});

// Routes
app.use('/api', apiRoutes)


