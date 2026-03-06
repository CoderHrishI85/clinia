# 🏥 Clinia — AI CRM for Clinics

> Vertical AI-powered CRM for independent clinics in India.
> Appointment management, AI knowledge assistant, and automated reminders.

![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=flat&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat&logo=python)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

## 🚀 Live Demo
> Coming Week 3 — Render deployment

## 🎯 The Problem
Independent clinic owners in India manage everything manually — WhatsApp for appointments, paper registers for patient history, zero follow-up system.

Enterprise solutions like Practo are expensive and built for hospitals. 
**Clinia fills that gap.**

## ✨ Features
- 📅 **Appointment CRM** — book, reschedule, cancel, track patient visits
- 🤖 **AI Knowledge Assistant** — ask questions from clinic's own documents
- 🔔 **Automated Reminders** — patients get reminders 24h before appointments
- 💳 **Subscription Billing** — ₹2,999 to ₹8,999/month via Razorpay

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.13 |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| AI/RAG | ChromaDB + sentence-transformers + OpenRouter |
| Frontend | Streamlit |
| Payments | Razorpay Subscriptions |
| Deployment | Render.com |

## 📁 Project Structure
```
clinia/
├── Backend/
│   ├── app/
│   │   ├── routes/      # API route handlers
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── crud/        # Database operations
│   │   ├── core/        # Auth, security, config
│   │   └── main.py      # FastAPI entry point
│   └── tests/           # pytest test suite
└── README.md
```

## ⚙️ Setup
```bash
git clone https://github.com/yourusername/clinia.git
cd clinia
python -m venv venv
venv\Scripts\activate
pip install -r Backend/requirements.txt
python -m uvicorn Backend.app.main:app --reload
```

## 🗺️ Roadmap
- [x] Project structure
- [x] FastAPI entry point + health routes
- [x] Virtual environment + dependencies
- [x] Branch strategy + conventional commits
- [ ] JWT Authentication
- [ ] PostgreSQL + Alembic migrations
- [ ] RAG pipeline
- [ ] Streamlit dashboard
- [ ] Razorpay payments

## 📈 90-Day Build
Building this live in public — daily commits + daily LinkedIn posts.

**Start date:** March 2, 2026
**Target:** First paying clinic by May 30, 2026

## 📄 License
MIT
