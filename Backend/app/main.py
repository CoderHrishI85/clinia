from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Backend.app.routes.patients import router as patients_router
# ... aapke baaki imports

app = FastAPI()

# SABSE PEHLE YE HONA CHAHIYE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Sab allow karo testing ke liye
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# PHIR ROUTERS
app.include_router(patients_router)

@app.get("/")
def read_root():
    return {"message": "Backend is Live!"}