# Ready2Go 🚀 - Home Assistant for Forgetfulness Assistance

Ready2Go is an interactive and distributed system designed to help people who frequently forget personal items when leaving home, such as keys or wallets. Additionally, it features a simple and fast interaction method intended to make the user's life easier.

## Brief Description

The project integrates real-time facial recognition and object detection. When the user stands in front of the front-facing camera (mirror), the system retrieves their **Google Calendar** events and the **OpenWeather** forecast. With this information, it generates a list of required items (e.g., an umbrella if it rains, a laptop if there is a meeting) and requests the top-down camera (table) to visually verify if the objects are present before giving the green light to leave.

---

## Team Members

Daniel López-Antona Pesquera
Oscar Junhao Qiu Lin
Sergio González Jiménez

## Prerequisites

Before getting started, make sure you have the following components installed:

- **Docker & Docker Compose**: [Install here](https://docs.docker.com/get-docker/)
- **Git**: To clone the repository.
- **MongoDB Account**: An instance (Local or Atlas).

## Required Credentials

Gmail account:

- Email: proyectosistemasinteractivos@gmail.com
- Password: SistemasInteractivos2026\*

## Project Architecture

The system is based on a client-server architecture powered by microservices, primarily connected via WebSockets.

1. **Backend (Node/Express):** Manages all business logic, JWT authentication and password protection, Socket communication, and external API calls.
2. **Vision Service (Python/FastAPI):** Runs the buffalo_l model for facial recognition and acts as a standalone service.
3. **Database (MongoDB):** A self-hosted database that allows storage of all necessary data, from user details and objects to relationships between objects and calendar events.
4. **Web Client:** Interfaces for the cameras, web app, and exit monitor.

## Project Structure

```text
ready2go/
├── public/                 # Static content served to the client
│   ├── app-cliente/        # Main application logic (Dashboard)
│   │   ├── script/         # Configuration JS (wardrobe, etc.)
│   │   └── *.html          # Views (weather, calendar, registration)
│   └── camera-client/      # WebRTC client for video capture
│       ├── camera.html     # Camera interface (front/top-down)
│       └── script.js       # Socket.io logic for frame streaming
├── server/                 # Node.js backend root directory
│   ├── faces/              # Temporary/local storage for faces
│   ├── src/
│   │   ├── routes/         # API endpoint definitions (index.mjs)

|   |   |   |── static/
|   |   |   |   └── logs.html
|   |   |   └── index.mjs
│   │   ├── services/       # Core logic (Calendar, Weather, Workflow)

|   |   |   └── *.mjs
│   │   ├── utils/          # DB connection (database.js) and Helpers (nlp.js)

|   |   |   |── database.js
|   |   |   └── nlp.js
│   │   ├── app.mjs         # Express configuration
│   │   └── server.mjs      # Entry point and WebSocket management
│   └── auth.middleware.mjs # JWT security middleware
├── vision/                 # Python AI microservice (FastAPI)
│   ├── conocidos/          # Dataset of faces for recognition
│   ├── database.py         # DB connector for Python
│   ├── main.py             # Detection logic and embeddings
│   └── requirements.txt    # Python dependencies (PyTorch, etc.)
├── docker-compose.yml      # Container orchestration
├── Dockerfile              # Container image configuration for the backend
└── README.md               # Project documentation
```

## Technologies Used

The project utilizes a modern technology stack based on JavaScript and Python to handle the high demand for real-time image and data processing:

### Backend & Orchestration

- **Node.js & Express**: Main server managing business logic and API routes.
- **Socket.io**: Real-time bidirectional communication engine for video streaming and control events.
- **MongoDB**: NoSQL database for storing users, objects, and configurations.

### Artificial Intelligence (Vision Service)

- **Python (FastAPI)**: Microservice dedicated to image processing.
- **Transformers.js / PyTorch**: Deep Learning models for facial recognition (Face Recognition) and object detection using dynamic tags.
- **Axios / FormData**: For efficiently sending image buffers between services.

### Frontend & IoT

- **WebRTC**: Protocols for capturing and manipulating camera frames from the browser.
- **JavaScript**: Client-side logic for managing camera roles (front/top-down).
- **CSS3**: Responsive interfaces for the exit monitor and camera viewers.

### DevOps & Integration

- **Docker & Docker Compose**: Containerization of all services to guarantee a consistent deployment.
- **Google Calendar API**: Third-party service integration to fetch events.
- **OpenWeatherMap API**: Live weather data tracking.

## Usage Instructions

### Starting Docker

```bash
# On Linux
MONGO_PASSWORD=Your_Password JWT_SECRET=Your_Token docker compose up -d
# On PowerShell
$env:MONGO_PASSWORD="Your_Password"; $env:JWT_SECRET="Your_Token"; docker compose up -d
# On CMD
set MONGO_PASSWORD=Your_Password && set JWT_SECRET=Your_Token && docker compose up -d
```

### Installing Dependencies

```bash
# Run npm install at the project root
npm i
```

### Seeding Required Data into the Database

Initial data must be populated into the database.

```bash
# Access the database
# You will need to enter the password set previously
docker exec -it ready2go_db mongosh -u ready2go -p
db.objects.insertMany([
  { "id": "imprescindibles", "nombre": "Llaves", "tags": ["llaves", "llavero", "llave", "keys", "keychain"] },
  { "id": "imprescindibles", "nombre": "Cartera", "tags": ["cartera", "billetera", "monedero", "wallet", "purse"] },
  { "id": "imprescindibles", "nombre": "Móvil", "tags": ["móvil", "teléfono", "celular", "smartphone", "iphone", "phone"] },
  { "id": "imprescindibles", "nombre": "Identificación", "tags": ["dni", "carnet", "conducir", "documentación", "pasaporte", "id", "license", "passport"] },
  { "id": "imprescindibles", "nombre": "Gafas de sol", "tags": ["gafas", "lentes", "anteojos", "sunglasses", "glasses"] },
  { "id": "imprescindibles", "nombre": "Auriculares", "tags": ["auriculares", "cascos", "airpods", "headset", "headphones", "earphones"] },
  { "id": "imprescindibles", "nombre": "Pañuelos", "tags": ["pañuelos", "kleenex", "papel", "tissues", "tissue"] },
  { "id": "imprescindibles", "nombre": "Mascarilla", "tags": ["mascarilla", "tapabocas", "barbijo", "mask", "facemask"] },

  { "id": "trabajo", "nombre": "Portátil", "tags": ["portátil", "ordenador", "laptop", "macbook", "computer"] },
  { "id": "trabajo", "nombre": "Cargador", "tags": ["cargador", "cable", "alimentación", "enchufe", "charger", "power adapter"] },
  { "id": "trabajo", "nombre": "Tablet", "tags": ["tablet", "ipad", "tableta"] },
  { "id": "trabajo", "nombre": "Libreta", "tags": ["libreta", "cuaderno", "bloc", "notas", "notebook", "notepad"] },
  { "id": "trabajo", "nombre": "Estuche", "tags": ["estuche", "bolígrafos", "bolis", "lápiz", "pencil case", "pens"] },
  { "id": "trabajo", "nombre": "Tarjeta acceso", "tags": ["tarjeta", "acreditación", "pases", "identificador", "badge", "access card"] },
  { "id": "trabajo", "nombre": "Tupper", "tags": ["tupper", "comida", "almuerzo", "tartera", "lunchbox"] },
  { "id": "trabajo", "nombre": "Agenda", "tags": ["agenda", "planificador", "planner"] },
  { "id": "trabajo", "nombre": "Almacenamiento", "tags": ["pendrive", "usb", "disco", "memoria", "flash drive"] },

  { "id": "deporte", "nombre": "Botella de agua", "tags": ["botella", "agua", "cantimplora", "beber", "water bottle"] },
  { "id": "deporte", "nombre": "Toalla", "tags": ["toalla", "ducha", "aseo", "towel"] },
  { "id": "deporte", "nombre": "Zapatillas", "tags": ["zapatillas", "tenis", "deportivas", "bambas", "sneakers", "shoes"] },
  { "id": "deporte", "nombre": "Ropa de cambio", "tags": ["ropa", "mudanza", "change of clothes", "clothes"] }
])
```
