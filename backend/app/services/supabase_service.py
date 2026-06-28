import os
from supabase import create_client, Client
from app.core.config import settings
from fastapi import UploadFile, HTTPException
import uuid

# We will need SUPABASE_URL and SUPABASE_KEY in config
url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

supabase: Client = create_client(url, key) if url and key else None

class StorageService:
    @staticmethod
    async def upload_document(file: UploadFile, workspace_id: str) -> str:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase Storage not configured")
        
        file_ext = file.filename.split('.')[-1]
        file_name = f"{workspace_id}/{uuid.uuid4()}.{file_ext}"
        
        # Read file content
        file_bytes = await file.read()
        
        # Upload to bucket "maxcfo-documents"
        try:
            res = supabase.storage.from_("maxcfo-documents").upload(file_name, file_bytes, {"content-type": file.content_type})
            
            # Get public URL
            public_url = supabase.storage.from_("maxcfo-documents").get_public_url(file_name)
            return public_url
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
