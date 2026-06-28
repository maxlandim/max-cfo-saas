import boto3
from botocore.exceptions import NoCredentialsError
import uuid
import os

AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY", "mock_access_key")
AWS_SECRET_KEY = os.environ.get("AWS_SECRET_KEY", "mock_secret_key")
AWS_BUCKET_NAME = os.environ.get("AWS_BUCKET_NAME", "max-cfo-ged-bucket")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Use boto3 client for interacting with S3 API compatible storage
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)

def upload_document(file_content: bytes, filename: str, workspace_id: str) -> str:
    """
    Uploads a document (GED) to an S3-compatible storage.
    Organizes files per workspace_id for multi-tenant isolation.
    """
    file_extension = filename.split('.')[-1] if '.' in filename else ''
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # Isolate storage paths by workspace
    s3_key = f"workspaces/{workspace_id}/documents/{unique_filename}"
    
    try:
        # In a real environment, we'd uncomment this:
        # s3_client.put_object(Bucket=AWS_BUCKET_NAME, Key=s3_key, Body=file_content)
        
        # Return a mock S3 URL for now
        return f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    except NoCredentialsError:
        print("S3 Credentials not available.")
        return ""
