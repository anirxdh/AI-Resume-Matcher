"""
Script to load jobs data and create embeddings in Pinecone.
Run this once to populate the vector database.
"""
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from pinecone import Pinecone, ServerlessSpec
import time

load_dotenv()

# Initialize clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "resume-job-matching")
JOBS_FILE = Path(__file__).parent.parent / "data" / "jobs.json"


def get_embedding(text: str, model: str = "text-embedding-3-small") -> list:
    """Get embedding from OpenAI."""
    response = openai_client.embeddings.create(
        model=model,
        input=text
    )
    return response.data[0].embedding


def create_job_text(job: dict) -> str:
    """Create a combined text representation of a job for embedding."""
    parts = [
        job.get("title", ""),
        job.get("company_name", ""),
        job.get("job_category", ""),
        job.get("requirements", ""),
        job.get("responsibilities", ""),
        job.get("location", ""),
    ]
    # Remove HTML tags from responsibilities if present
    import re
    text = " ".join(parts)
    text = re.sub(r'<[^>]+>', '', text)  # Remove HTML tags
    return text.strip()


def setup_pinecone_index():
    """Create Pinecone index if it doesn't exist."""
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    
    if INDEX_NAME not in existing_indexes:
        print(f"Creating index: {INDEX_NAME}")
        # Get region from env (format: us-east-1, us-west-2, etc.)
        region = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
        print(f"Using region: {region}")
        
        pc.create_index(
            name=INDEX_NAME,
            dimension=1536,  # text-embedding-3-small dimension
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=region
            )
        )
        print(f"Index {INDEX_NAME} created. Waiting for it to be ready...")
        time.sleep(5)
    else:
        print(f"Index {INDEX_NAME} already exists")
    
    return pc.Index(INDEX_NAME)


def embed_jobs():
    """Load jobs and create embeddings in Pinecone."""
    print("Loading jobs data...")
    with open(JOBS_FILE, "r") as f:
        jobs = json.load(f)
    
    print(f"Found {len(jobs)} jobs")
    
    # Setup Pinecone index
    index = setup_pinecone_index()
    
    # Check if index already has data
    stats = index.describe_index_stats()
    if stats.get("total_vector_count", 0) > 0:
        print(f"Index already has {stats['total_vector_count']} vectors")
        response = input("Do you want to delete existing vectors and re-embed? (yes/no): ")
        if response.lower() == "yes":
            print("Deleting existing vectors...")
            index.delete(delete_all=True)
            time.sleep(2)
        else:
            print("Skipping embedding. Using existing vectors.")
            return
    
    print("Creating embeddings and uploading to Pinecone...")
    batch_size = 100
    vectors = []
    
    for i, job in enumerate(jobs):
        # Create text representation
        job_text = create_job_text(job)
        
        # Get embedding
        embedding = get_embedding(job_text)
        
        # Prepare metadata with all filtering fields
        metadata = {
            # String fields
            "company_name": job.get("company_name", ""),
            "location": job.get("location", ""),
            "job_category": job.get("job_category", ""),
            "employment_type": job.get("employment_type", ""),
            "work_location_type": job.get("work_location_type", ""),
            "status": job.get("status", "active"),
            
            # Array field
            "ideal_companies": job.get("idealCompanies", []),
            
            # Boolean field
            "h1b_sponsorship": bool(job.get("h1b_sponsorship", False)),
            
            # Number fields
            "yoe_min": int(job.get("yoe_min", 0)),
            "equity_min": float(job.get("equity_min", 0.0)),
            "equity_max": float(job.get("equity_max", 0.0)),
        }
        
        # Prepare vector
        vectors.append({
            "id": job["job_id"],
            "values": embedding,
            "metadata": metadata
        })
        
        # Upload in batches
        if len(vectors) >= batch_size:
            index.upsert(vectors=vectors)
            print(f"Uploaded batch: {i+1}/{len(jobs)} jobs")
            vectors = []
            time.sleep(0.5)  # Rate limiting
    
    # Upload remaining vectors
    if vectors:
        index.upsert(vectors=vectors)
        print(f"Uploaded final batch: {len(jobs)}/{len(jobs)} jobs")
    
    print(f"\n✅ Successfully embedded {len(jobs)} jobs into Pinecone index: {INDEX_NAME}")


if __name__ == "__main__":
    embed_jobs()

