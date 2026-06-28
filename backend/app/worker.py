from celery import Celery
import time
import os

# Configure Redis as the broker and backend
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery("worker", broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)

celery_app.conf.task_routes = {
    "app.worker.process_ocr_document": "main-queue",
    "app.worker.sync_open_finance": "high-priority",
}

@celery_app.task(name="app.worker.process_ocr_document")
def process_ocr_document(transaction_id: str, document_url: str):
    """
    Mock OCR Task: Asynchronously reads an S3 document and extracts data.
    """
    print(f"Starting OCR processing for transaction {transaction_id} (URL: {document_url})...")
    time.sleep(3) # Simulate heavy ML model processing
    print(f"OCR completed for {transaction_id}")
    return {"status": "success", "extracted_amount": 10500, "confidence": 0.95}

@celery_app.task(name="app.worker.sync_open_finance")
def sync_open_finance(workspace_id: str):
    """
    Mock Open Finance Sync Task: Fetches latest transactions from APIs.
    """
    print(f"Syncing Open Finance for workspace {workspace_id}...")
    time.sleep(2)
    print(f"Sync complete for {workspace_id}")
    return {"status": "success", "synced_transactions": 5}
