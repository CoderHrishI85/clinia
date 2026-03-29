import chromadb
from sentence_transformers import SentenceTransformer

chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_or_create_collection(name="patients")
model = SentenceTransformer('all-MiniLM-L6-v2')

def index_patient(patient_id: int, name: str, phone: str, email: str = None):
    text = f"Patient name: {name}, phone: {phone}, email: {email or 'not provided'}"
    embedding = model.encode(text).tolist()

    collection.upsert(
        ids=[str(patient_id)],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{
            "patient_id": patient_id,
            "name": name,
            "phone": phone
        }]
    )

    print(f"🔥 Indexed patient: {patient_id} - {name}")

def search_patients(query: str, n_results: int = 5):
    query_embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )

    return results