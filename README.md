# Weather Dashboard - Full Stack Application

A comprehensive full-stack application that collects weather data, processes it through a queue system, stores it in MongoDB, and displays it in a modern React dashboard with AI-powered insights.

## 🏗️ Architecture

The application consists of 5 main services:

1. **Python Service** - Collects weather data from Open-Meteo API and publishes to RabbitMQ
2. **Go Worker** - Consumes messages from RabbitMQ and forwards them to NestJS API
3. **NestJS API** - Backend API with MongoDB, authentication, and weather endpoints
4. **React Frontend** - Modern dashboard with Vite, Tailwind CSS, and shadcn/ui
5. **Infrastructure** - MongoDB and RabbitMQ containers

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### Running with Docker Compose

1. Clone the repository:
```bash
git clone <repository-url>
cd "Renan Orozco"
```

2. Copy environment variables (optional - defaults are set):
```bash
# The .env file is optional, defaults are configured in docker-compose.yml
```

3. Start all services:
```bash
docker-compose up -d
```

4. Wait for all services to be ready (may take a few minutes on first run)

5. Access the application:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **MongoDB**: localhost:27017

### Default Credentials

- **Email**: admin@example.com
- **Password**: 123456

## 📦 Services Details

### Python Weather Collector

**Location**: `weather-collector/`

Collects weather data from Open-Meteo API every hour (configurable) and publishes to RabbitMQ queue.

**Environment Variables**:
- `RABBITMQ_URL`: RabbitMQ connection URL
- `WEATHER_API_URL`: Open-Meteo API URL (default: https://api.open-meteo.com/v1/forecast)
- `LATITUDE`: Location latitude (default: 23.5505 - São Paulo)
- `LONGITUDE`: Location longitude (default: -46.6333 - São Paulo)
- `COLLECTION_INTERVAL`: Collection interval in seconds (default: 3600)

**Running manually**:
```bash
cd weather-collector
pip install -r requirements.txt
python main.py
```

### Go Worker

**Location**: `go-worker/`

Consumes weather data from RabbitMQ, validates it, and sends to NestJS API.

**Environment Variables**:
- `RABBITMQ_URL`: RabbitMQ connection URL
- `API_URL`: NestJS API endpoint for weather logs
- `QUEUE_NAME`: RabbitMQ queue name (default: weather_data)

**Running manually**:
```bash
cd go-worker
go mod download
go run main.go
```

### NestJS API

**Location**: `backend/`

RESTful API with the following features:
- Weather data storage and retrieval
- User management (CRUD)
- JWT authentication
- AI-powered weather insights
- CSV/XLSX export
- Optional Pokemon API integration

**Endpoints**:

#### Weather
- `POST /api/weather/logs` - Create weather log (used by Go worker)
- `GET /api/weather/logs` - List weather logs (paginated)
- `GET /api/weather/logs/latest` - Get latest weather data
- `GET /api/weather/logs/:id` - Get specific weather log
- `GET /api/weather/insights` - Get AI-generated insights
- `GET /api/weather/export/csv` - Export weather data as CSV
- `GET /api/weather/export/xlsx` - Export weather data as XLSX
- `DELETE /api/weather/logs/:id` - Delete weather log

#### Authentication
- `POST /api/auth/login` - Login and get JWT token

#### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Pokemon (Optional)
- `GET /api/pokemon` - List Pokémons (paginated)
- `GET /api/pokemon/:id` - Get Pokémon details

**Environment Variables**:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: API port (default: 3000)
- `DEFAULT_USER_EMAIL`: Default admin email
- `DEFAULT_USER_PASSWORD`: Default admin password

**Running manually**:
```bash
cd backend
npm install
npm run start:dev
```

### React Frontend

**Location**: `frontend/`

Modern React application with:
- Weather dashboard with real-time data
- AI insights visualization
- User management interface
- Pokemon explorer (optional)
- CSV/XLSX export functionality

**Pages**:
- `/` - Dashboard with weather data and insights
- `/users` - User management (CRUD)
- `/pokemon` - Pokemon explorer with pagination

**Environment Variables**:
- `VITE_API_URL`: Backend API URL (default: http://localhost:3000/api)

**Running manually**:
```bash
cd frontend
npm install
npm run dev
```

## 🔄 Data Flow

1. **Python Service** → Collects weather data from Open-Meteo API
2. **Python Service** → Publishes data to RabbitMQ queue (`weather_data`)
3. **Go Worker** → Consumes messages from RabbitMQ
4. **Go Worker** → Validates and forwards data to NestJS API
5. **NestJS API** → Stores data in MongoDB
6. **React Frontend** → Fetches data from NestJS API and displays it

## 🤖 AI Insights

The system generates AI-powered insights from weather data including:
- Statistical analysis (averages, min/max)
- Temperature trends (rising/falling)
- Comfort index (0-100 scale)
- Weather classification (Cold, Hot, Pleasant, Rainy, etc.)
- Automated alerts (extreme temperatures, high humidity, etc.)
- Natural language summaries

Insights are generated using the `/api/weather/insights` endpoint and can be triggered:
- Automatically when new data arrives
- On-demand via frontend
- With custom limits for data points analyzed

## 📊 Features

### Weather Dashboard
- Real-time weather data display
- Temperature, humidity, wind speed, and precipitation cards
- Interactive charts (temperature, humidity, wind speed trends)
- AI insights panel with statistics and alerts
- Export functionality (CSV/XLSX)

### User Management
- Complete CRUD operations
- JWT-based authentication
- Default admin user creation on startup
- User activation/deactivation

### Pokemon Explorer (Optional)
- Browse Pokémons with pagination
- View detailed Pokémon information
- Type, abilities, and stats display

## 🐳 Docker Services

The `docker-compose.yml` defines the following services:

- **mongodb**: MongoDB 7 database
- **rabbitmq**: RabbitMQ with management UI
- **api**: NestJS backend API
- **weather-collector**: Python weather data collector
- **go-worker**: Go worker for RabbitMQ
- **frontend**: React frontend application

All services are interconnected via Docker networks and configured with appropriate dependencies.

## 🔧 Development

### Backend Development

```bash
cd backend
npm install
npm run start:dev  # Watch mode
npm run build      # Production build
npm run lint       # Lint code
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
npm run lint       # Lint code
```

### Go Worker Development

```bash
cd go-worker
go mod download
go run main.go
```

### Python Service Development

```bash
cd weather-collector
pip install -r requirements.txt
python main.py
```

## 📝 Environment Variables

Create a `.env` file in the root directory (optional):

```env
# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/weather_db?authSource=admin

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Weather API
WEATHER_API_URL=https://api.open-meteo.com/v1/forecast
LATITUDE=23.5505
LONGITUDE=-46.6333
COLLECTION_INTERVAL=3600

# NestJS API
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000/api

# Default User
DEFAULT_USER_EMAIL=admin@example.com
DEFAULT_USER_PASSWORD=123456
```

## 🧪 Testing

### API Endpoints Testing

Use tools like Postman, cURL, or the frontend application to test endpoints.

Example login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}'
```

Example get weather logs (requires authentication):
```bash
curl -X GET http://localhost:3000/api/weather/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📦 Technologies Used

### Backend
- **NestJS** - Progressive Node.js framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **ExcelJS** - Excel file generation
- **TypeScript** - Type-safe JavaScript

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - UI components
- **Recharts** - Chart library
- **React Router** - Routing

### Data Collection & Processing
- **Python** - Weather data collection
- **Go** - RabbitMQ worker
- **RabbitMQ** - Message queue
- **Open-Meteo API** - Weather data source

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 🐛 Troubleshooting

### Services not starting
- Check Docker logs: `docker-compose logs [service-name]`
- Ensure ports are not already in use
- Verify Docker has enough resources allocated

### Database connection issues
- Wait for MongoDB to be fully ready (may take 30-60 seconds)
- Check MongoDB credentials in docker-compose.yml
- Verify network connectivity between services

### Frontend not connecting to API
- Ensure API is running and accessible
- Check `VITE_API_URL` environment variable
- Verify CORS settings in NestJS (main.ts)

### Weather data not appearing
- Check Python collector logs: `docker-compose logs weather-collector`
- Verify RabbitMQ is running: `docker-compose logs rabbitmq`
- Check Go worker logs: `docker-compose logs go-worker`
- Ensure API is receiving data: `docker-compose logs api`

## 📄 License

This project is created for educational/demonstration purposes.

## 👤 Author

Renan Orozco

---

## 🎥 Video Demonstration

[Link to video will be added here]

The video should demonstrate:
- Architecture overview
- Data pipeline flow (Python → RabbitMQ → Go → NestJS → Frontend)
- AI insights generation
- Main features (Dashboard, Users, Pokemon)
- Docker Compose execution

## ✅ Checklist

- ✅ Python collects weather data (Open-Meteo)
- ✅ Python sends data to RabbitMQ
- ✅ Go worker consumes from RabbitMQ and forwards to NestJS
- ✅ NestJS stores data in MongoDB
- ✅ NestJS exposes weather endpoints
- ✅ NestJS generates AI insights
- ✅ NestJS exports CSV/XLSX
- ✅ NestJS implements user CRUD + authentication
- ✅ NestJS integrates with Pokemon API (optional)
- ✅ React frontend with Vite + Tailwind + shadcn/ui
- ✅ Dashboard displays weather data and insights
- ✅ User management interface
- ✅ Pokemon explorer page
- ✅ Docker Compose orchestrates all services
- ✅ TypeScript in backend and frontend
- ✅ Comprehensive README
