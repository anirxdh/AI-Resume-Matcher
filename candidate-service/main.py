from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from candidate_service.config import ALLOWED_ORIGINS, MAX_FILE_SIZE
from candidate_service.matching_service import run_match
from candidate_service.pdf_text import extract_text_from_pdf
from candidate_service.resume_metadata import extract_resume_metadata
from candidate_service.schemas import MatchRequest
from candidate_service.embeddings import get_embedding

import time


app = FastAPI(title="Resume Matching Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Resume Matching Service - Ready for PDF upload"}


@app.post("/embed-resume")
async def embed_resume(file: UploadFile = File(...)):
    """
    Upload a PDF or TXT resume, extract text, and create embedding.
    Returns the embedding and extracted text.
    
    Limits:
    - Max file size: 10MB
    - Max pages processed: 10 pages (PDF only)
    - Max text length: 50,000 characters
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    file_ext = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
    if file_ext not in ['pdf', 'txt']:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported")
    
    try:
        start_time = time.time()

        file_bytes = await file.read()
        file_size = len(file_bytes)

        if file_size > MAX_FILE_SIZE:
            size_mb = file_size / (1024 * 1024)
            max_mb = MAX_FILE_SIZE / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({size_mb:.1f}MB). Maximum file size is {max_mb}MB.",
            )

        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        if file_ext == "pdf":
            resume_text = extract_text_from_pdf(file_bytes)
        else:
            try:
                resume_text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="TXT file must be UTF-8 encoded")

        if not resume_text or len(resume_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract sufficient text from file. "
                    "Please ensure the file contains readable text."
                ),
            )

        resume_metadata = extract_resume_metadata(resume_text)
        embedding = get_embedding(resume_text)

        processing_time = int((time.time() - start_time) * 1000)

        return {
            "status": "success",
            "filename": file.filename,
            "file_size_bytes": file_size,
            "text_length": len(resume_text),
            "embedding_dimension": len(embedding),
            "processing_time_ms": processing_time,
            "resume_text": resume_text,
            "resume_metadata": resume_metadata,
            "message": "Resume successfully embedded. Ready for matching.",
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "timeout" in error_msg.lower() or "connection" in error_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="Connection timeout. The PDF may be too large or complex. Try a smaller file.",
            )
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {error_msg}")


@app.post("/match")
async def match_resume(request: MatchRequest):
    return await run_match(request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
