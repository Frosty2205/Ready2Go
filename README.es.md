# Ready2Go 🚀 - Home assistant para ayudar con olvidos

Ready2Go es un sistema interactivo y distribuido pensado para ayudar a personas que suelen olvidar objetos personales al salir de casa, como las llaves o la cartera. Además, permite una interacción sencilla y rápida, con la que se pretende facilitar la vida al usuario.

## Breve Descripción

El proyecto integra el reconocimiento facial y la detección de objetos en tiempo real. Cuando el usuario se sitúa frente a la cámara frontal (espejo), el sistema recupera sus eventos de **Google Calendar** y la previsión meteorológica de **OpenWeather**. Con esta información, genera una lista de objetos requeridos (ej. paraguas si llueve, portátil si hay reunión) y pide a la cámara cenital (mesa) que verifique visualmente si los objetos están presentes antes de dar el visto bueno para salir.

---

## Integrantes

Daniel López-Antona Pesquera, 100522181
Oscar Junhao Qiu Lin, 100516265
Sergio González Jiménez, 100522264

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes:

- **Docker & Docker Compose**: [Instalar aquí](https://docs.docker.com/get-docker/)
- **Git**: Para clonar el repositorio.
- **Cuenta de MongoDB**: Una instancia (Local o Atlas).

## Credenciales necesarias

Cuenta de gmail:

- Correo: proyectosistemasinteractivos@gmail.com
- Contraseña: SistemasInteractivos2026\*

## Arquitectura del proyecto

El sistema se basa en una arquitectura cliente servidor a base de microservicios principalmente conectados por WebSockets.

1. Backend (Node/Express): Gestiona toda la lógica de negocio, autenticación con JWT y protección de contraseñas, comunicación por Sockets y llamadas a APIs externas.
2. Vision Service (Python/Fastapi): Ejecuta el modelo buffalo_l para el reconocimiento facial y actúa como servicio.
3. Database (MongoDB): Base de datos self-hosted que permite el almacenamiento de todos los datos necesarios, desde los datos de usuario, objetos o relaciones entre objetos y eventos del calendario
4. Cliente Web: Interfaces para las cámaras, app web y monitor de salida

## Estructura del proyecto

```text
ready2go/
├── public/                 # Contenido estático servido al cliente
│   ├── app-cliente/        # Lógica de la aplicación principal (Dashboard)
│   │   ├── script/         # JS de configuración (wardrobe, etc.)
│   │   └── *.html          # Vistas (tiempo, calendario, registro)
│   └── camera-client/      # Cliente WebRTC para capturas de vídeo
│       ├── camera.html     # Interfaz de las cámaras (frontal/cenital)
│       └── script.js       # Lógica de Socket.io para streaming de frames
├── server/                 # Directorio raíz del backend Node.js
│   ├── faces/              # Almacenamiento temporal/local de rostros
│   ├── src/
│   │   ├── routes/         # Definición de endpoints API (index.mjs)
|   |   |   |── static/
|   |   |   |   └── logs.html
|   |   |   └── index.mjs
│   │   ├── services/       # Lógica central (Calendar, Weather, Workflow)
|   |   |   └── *.mjs
│   │   ├── utils/          # Conexión DB (database.js) y Helpers (nlp.js)
|   |   |   |── database.js
|   |   |   └── nlp.js
│   │   ├── app.mjs         # Configuración de Express
│   │   └── server.mjs      # Punto de entrada y gestión de WebSockets
│   └── auth.middleware.mjs # Middleware de seguridad JWT
├── vision/                 # Microservicio de IA en Python (FastAPI)
│   ├── conocidos/          # Dataset de rostros para reconocimiento
│   ├── database.py         # Conector DB para Python
│   ├── main.py             # Lógica de detección y embeddings
│   └── requirements.txt    # Dependencias de Python (PyTorch, etc.)
├── docker-compose.yml      # Orquestación de contenedores
├── Dockerfile              # Configuración de imagen para el backend
└── README.md               # Documentación del proyecto
```

## Tecnologías Utilizadas

El proyecto emplea un stack tecnológico moderno basado en JavaScript y Python para gestionar la alta demanda de procesamiento de imagen y datos en tiempo real:

### Backend & Orquestación

- **Node.js & Express**: Servidor principal que gestiona la lógica de negocio y las rutas de la API.
- **Socket.io**: Motor de comunicación bidireccional en tiempo real para el streaming de vídeo y eventos de control.
- **MongoDB**: Base de datos NoSQL para el almacenamiento de usuarios, objetos y configuraciones.

### Inteligencia Artificial (Vision Service)

- **Python (FastAPI)**: Microservicio dedicado al procesamiento de imágenes.
- **Transformers.js / PyTorch**: Modelos de Deep Learning para el reconocimiento facial (Face Recognition) y detección de objetos mediante etiquetas dinámicas.
- **Axios / FormData**: Para el envío eficiente de buffers de imagen entre servicios.

### Frontend & IoT

- **WebRTC**: Protocolos para la captura y manipulación de frames de cámara desde el navegador.
- **JavaScript**: Lógica de cliente para la gestión de roles de cámara (frontal/cenital).
- **CSS3**: Interfaces adaptativas para el monitor de salida y los visualizadores de cámara.

### DevOps & Integración

- **Docker & Docker Compose**: Contenerización de todos los servicios para garantizar un despliegue consistente.
- **Google Calendar API**: Integración con servicios de terceros para la obtención de eventos.
- **OpenWeatherMap API**: Consulta de datos meteorológicos en tiempo real.

## Instrucciones de uso

### Levantar el docker

```bash
# En linux
MONGO_PASSWORD=Una_Contraseña JWT_SECRET=Un_token docker compose up -d
# En Powershell
$env:MONGO_PASSWORD="Una_Contraseña"; $env:JWT_SECRET="Un_token"; docker compose up -d
# En CMD
set MONGO_PASSWORD=Una_Contraseña && set JWT_SECRET=Un_token && docker compose up -d
```

### Instalar dependencias

```bash
# Ejecutar npm install en la raíz del proyecto
npm i
```

### Insertar datos necesarios en la base de datos

Es necesario meter datos iniciales en la base de datos

```bash
# Acceder a la base de datos
# Deberá introducir la contraseña establecida anteriormente
docker exec -it ready2go_db mongosh -u ready2go -p
db.objects.insertMany([
  { "id": "imprescindibles", "nombre": "Llaves", "tags": ["llaves", "llavero", "llave"] },
  { "id": "imprescindibles", "nombre": "Cartera", "tags": ["cartera", "billetera", "monedero"] },
  { "id": "imprescindibles", "nombre": "Móvil", "tags": ["móvil", "teléfono", "celular", "smartphone", "iphone"] },
  { "id": "imprescindibles", "nombre": "Identificación", "tags": ["dni", "carnet", "conducir", "documentación", "pasaporte"] },
  { "id": "imprescindibles", "nombre": "Gafas de sol", "tags": ["gafas", "lentes", "anteojos"] },
  { "id": "imprescindibles", "nombre": "Auriculares", "tags": ["auriculares", "cascos", "airpods", "headset"] },
  { "id": "imprescindibles", "nombre": "Pañuelos", "tags": ["pañuelos", "kleenex", "papel"] },
  { "id": "imprescindibles", "nombre": "Mascarilla", "tags": ["mascarilla", "tapabocas", "barbijo"] },

  { "id": "trabajo", "nombre": "Portátil", "tags": ["portátil", "ordenador", "laptop", "macbook"] },
  { "id": "trabajo", "nombre": "Cargador", "tags": ["cargador", "cable", "alimentación", "enchufe"] },
  { "id": "trabajo", "nombre": "Tablet", "tags": ["tablet", "ipad", "tableta"] },
  { "id": "trabajo", "nombre": "Libreta", "tags": ["libreta", "cuaderno", "bloc", "notas"] },
  { "id": "trabajo", "nombre": "Estuche", "tags": ["estuche", "bolígrafos", "bolis", "lápiz"] },
  { "id": "trabajo", "nombre": "Tarjeta acceso", "tags": ["tarjeta", "acreditación", "pases", "identificador"] },
  { "id": "trabajo", "nombre": "Tupper", "tags": ["tupper", "comida", "almuerzo", "tartera"] },
  { "id": "trabajo", "nombre": "Agenda", "tags": ["agenda", "planificador"] },
  { "id": "trabajo", "nombre": "Almacenamiento", "tags": ["pendrive", "usb", "disco", "memoria"] },

  { "id": "deporte", "nombre": "Botella de agua", "tags": ["botella", "agua", "cantimplora", "beber"] },
  { "id": "deporte", "nombre": "Toalla", "tags": ["toalla", "ducha", "aseo"] },
  { "id": "deporte", "nombre": "Zapatillas", "tags": ["zapatillas", "tenis", "deportivas", "bambas"] },
  { "id": "deporte", "nombre": "Ropa de cambio", "tags": ["ropa", "mudanza", "camiseta", "recambio"] },
  { "id": "deporte", "nombre": "Bañador", "tags": ["bañador", "bikini", "bañu", "piscina"] },
  { "id": "deporte", "nombre": "Natación", "tags": ["gorro", "gafas de agua", "natación", "cloro"] },
  { "id": "deporte", "nombre": "Candado", "tags": ["candado", "taquilla", "llave taquilla"] },
  { "id": "deporte", "nombre": "Esterilla", "tags": ["esterilla", "yoga", "mat"] },
  { "id": "deporte", "nombre": "Suplementos", "tags": ["proteína", "snack", "barrita", "energético"] },

  { "id": "clima", "nombre": "Paraguas", "tags": ["paraguas", "sombrilla", "lluvia"] },
  { "id": "clima", "nombre": "Chubasquero", "tags": ["chubasquero", "impermeable"] },
  { "id": "clima", "nombre": "Abanico", "tags": ["abanico", "ventilador", "calor"] },
  { "id": "clima", "nombre": "Invierno", "tags": ["guantes", "bufanda", "gorro", "frío"] },
  { "id": "clima", "nombre": "Protector solar", "tags": ["crema", "solar", "protector", "sol"] },
  { "id": "clima", "nombre": "Bálsamo labial", "tags": ["cacao", "labial", "protector labios"] },

  { "id": "ocio", "nombre": "Cámara", "tags": ["cámara", "fotos", "fotografía"] },
  { "id": "ocio", "nombre": "Lectura", "tags": ["libro", "ebook", "kindle", "lectura"] },
  { "id": "ocio", "nombre": "Powerbank", "tags": ["batería", "powerbank", "externa"] },
  { "id": "ocio", "nombre": "Bolsas", "tags": ["bolsas", "compra", "supermercado"] },
  { "id": "ocio", "nombre": "Bebé", "tags": ["chupete", "pañales", "biberón", "toallitas"] },
  { "id": "ocio", "nombre": "Medicinas", "tags": ["pastillas", "medicación", "ventolín", "ibuprofeno", "botiquín"] },
  { "id": "ocio", "nombre": "Casco", "tags": ["casco", "bici", "patinete", "seguridad"] }
]);
```

## Aclaraciones

### Aclaración sobre el uso de las cámaras

Para conectar las cámaras, se debe usar la herramienta de port forwarding de Visual Studio Code. Para ello, es necesario cambiar el redireccionamiento a lo siguiente:

- Cámara frontal: https://<enlace_devtunnels>/camera?role=frontal&name=Movil
- Cámara cenital: https://<enlace_devtunnels>/camera?role=cenital&name=Movil
  donde <enlace_devtunnels> debe ser sustituido por en enlace en cuestión.

### Aclaraciones sobre el uso de la app en móvil

En caso de que se quiera probar la página web en el móvil y se quiera hacer el registro, se tendrá que sustituir el GOOGLE_REDIRECT_URI_1 en el .env dentro de la carpeta server por https://<enlace_devtunnels>/api/auth/google/callback.
Aún así, hasta que el proyecto sea mudado al servidor, mientras se esté usando docker se recomienda hacer el registro en un ordenador para evitar este inconveniente.

### Aclaraciones sobre el proyecto

Para la defensa, el proyecto será mudado a un servidor y dispondrá de un dominio propio para que el acceso sea abierto.
