# 🏥 Clinia

### AI-powered CRM for clinics with semantic patient search

Clinia is a production-oriented SaaS backend for clinic CRM workflows. It helps clinics manage patients, appointments, authentication, and AI-powered semantic search using FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT authentication, and ChromaDB.

## 🚀 Project Status

- Backend: In Development (Day 64/90)
- Core Features: Completed (Auth, Patient CRUD, AI Search)
- Appointments Module: In Progress
- Frontend: Planned (Next.js + animations)

## 🎯 The Problem

Independent clinics often manage appointments, patient history, and follow-ups manually across phone calls, messaging apps, spreadsheets, and paper records.

Enterprise healthcare platforms can be expensive or too complex for small and mid-sized clinics. Clinia is designed to provide a focused, modern CRM experience for clinics that need simple workflows, secure data handling, and fast patient lookup.

## ✨ Features

- 🔐 **JWT Authentication** for secure API access
- 👤 **Patient Management** with full CRUD support
- 🔎 **AI Semantic Patient Search** powered by ChromaDB
- 📄 **Pagination** for scalable patient listing
- 🗄️ **PostgreSQL Database** with SQLAlchemy ORM
- 🔁 **Alembic Migrations** for version-controlled schema changes
- 📅 **Appointments Module** foundation
- 🧱 **Modular FastAPI Architecture**
- 🚀 Built with SaaS scalability and future frontend integration in mind

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Authentication | JWT |
| AI Search | ChromaDB, sentence-transformers |
| Frontend | Next.js planned |
| Testing | pytest |

## 🏗 Architecture Overview

Clinia follows a clean modular backend structure:

- **Routes** handle API endpoints and request flow
- **Schemas** validate request and response data with Pydantic
- **Models** define database tables using SQLAlchemy
- **Core** contains shared configuration, database, security, and dependencies
- **Alembic** manages database migrations
- **ChromaDB** stores searchable patient embeddings for semantic search

This structure keeps the codebase maintainable, testable, and ready for production SaaS growth.

## ⚙️ Installation Guide

### 1. Clone the repository

```bash
git clone https://github.com/hrishikeshgaware/clinia.git
cd clinia
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r Backend/requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/clinia
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=http://localhost:3000
```

### 5. Run database migrations

```bash
alembic upgrade head
```

### 6. Start the FastAPI server

```bash
python -m uvicorn Backend.app.main:app --reload
```

API server:

```text
http://localhost:8000
```

Interactive API docs:

```text
http://localhost:8000/docs
```

## 📡 API Overview

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT token |

### Patients

| Method | Endpoint | Description |
|---|---|---|
| GET | `/patients?skip=0&limit=10` | List patients with pagination |
| POST | `/patients` | Create a patient |
| GET | `/patients/{patient_id}` | Get patient by ID |
| PUT | `/patients/{patient_id}` | Update patient |
| DELETE | `/patients/{patient_id}` | Delete patient |

### Search

| Method | Endpoint | Description |
|---|---|---|
| GET | `/search?query=...` | Semantic patient search |

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| GET | `/appointments` | List appointments |
| POST | `/appointments` | Create appointment |
| GET | `/appointments/{appointment_id}` | Get appointment |
| PUT | `/appointments/{appointment_id}` | Update appointment |
| DELETE | `/appointments/{appointment_id}` | Delete appointment |

## 🧪 Example Requests

### Create Patient

```bash
curl -X POST http://localhost:8000/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ananya Sharma",
    "phone": "+91 9876543210",
    "email": "ananya@example.com",
    "age": 32,
    "gender": "female"
  }'
```

### Get Patients With Pagination

```bash
curl "http://localhost:8000/patients?skip=0&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Semantic Search

```bash
curl "http://localhost:8000/search?query=young female patient" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📁 Project Structure

```text
clinia/
├── Backend/
│   ├── app/
│   │   ├── core/          # Config, database, security, dependencies
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── routes/        # FastAPI route handlers
│   │   ├── schemas/       # Pydantic validation schemas
│   │   ├── ai_db.py       # ChromaDB setup
│   │   └── main.py        # FastAPI application entrypoint
│   └── tests/             # Backend test suite
├── alembic/
│   └── versions/          # Database migration files
├── clinia-frontend/       # Planned Next.js frontend
├── docker-compose.yml
├── alembic.ini
└── README.md
```

## 🗺️ Roadmap

- [x] FastAPI backend foundation
- [x] PostgreSQL and SQLAlchemy setup
- [x] Alembic migrations
- [x] JWT authentication
- [x] Patient CRUD APIs
- [x] AI semantic patient search
- [ ] Appointment workflow improvements
- [ ] Clinic dashboard
- [ ] Staff and role management
- [ ] Patient reminders and follow-ups
- [ ] Next.js frontend with polished animations
- [ ] Production deployment pipeline
- [ ] Expanded automated test coverage

## 📈 90-Day Build

Clinia is being built as a focused 90-day SaaS project with a production-first backend, strong API design, and a clear path toward a full clinic dashboard.

**Start date:** March 2, 2026  
**Target:** Production-ready clinic CRM MVP by May 30, 2026

## 👤 Author

Built by **Hrishikesh Gaware** as a production-grade SaaS backend project for clinics, AI workflows, and modern healthcare CRM use cases.

## 📄 License

MIT
