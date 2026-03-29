from fastapi import APIRouter, Depends
from Backend.app.core.dependencies import get_current_user
from Backend.app.core.vector_store import search_patients
from Backend.app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["ai"])

class SearchRequest(BaseModel):
    query: str

@router.post("/search")
def ai_search(request: SearchRequest, current_user: User = Depends(get_current_user)):
    results = search_patients(request.query)
    patients = []
    if results and results['metadatas']:
        for meta in results['metadatas'][0]:
            patients.append(meta)
    return {"query": request.query, "results": patients}