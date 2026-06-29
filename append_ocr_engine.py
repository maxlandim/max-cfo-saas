import os

engine_logic = """
// ═══════════ OCR MÁGICO LOGIC ═══════════

function openOCRModal() {
    // Reset state
    document.getElementById('ocrUploadState').style.display = 'block';
    document.getElementById('ocrReviewState').style.display = 'none';
    document.getElementById('ocrScanningOverlay').style.display = 'none';
    
    // Set today as default date for extracted data
    document.getElementById('ocrExtractedDate').value = new Date().toISOString().split('T')[0];
    
    openModal('ocrModal');
}

function handleOCRFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 1. Show Scanning Animation
    document.getElementById('ocrScanningOverlay').style.display = 'flex';
    
    // 2. Simulate AI Processing (3 seconds)
    setTimeout(() => {
        // Hide upload, show review
        document.getElementById('ocrUploadState').style.display = 'none';
        document.getElementById('ocrReviewState').style.display = 'block';
        
        // Randomize the mock data just a little bit to feel real
        const amounts = [4530.00, 1250.50, 8900.00, 320.00, 15000.00];
        const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
        document.getElementById('ocrExtractedAmount').value = randomAmount;
        
        // Reset file input so same file can be uploaded again if needed
        event.target.value = '';
    }, 3000);
}

function resetOCR() {
    document.getElementById('ocrUploadState').style.display = 'block';
    document.getElementById('ocrReviewState').style.display = 'none';
    document.getElementById('ocrScanningOverlay').style.display = 'none';
}

function saveOCRTransaction() {
    const desc = document.getElementById('ocrExtractedDesc').value;
    const amount = parseFloat(document.getElementById('ocrExtractedAmount').value);
    const date = document.getElementById('ocrExtractedDate').value;
    const cat = document.getElementById('ocrExtractedCategory').value;
    
    const newTx = {
        id: 'tx-' + Date.now(),
        desc: desc,
        amount: amount,
        date: date,
        type: 'DESPESA',
        category: cat,
        notes: 'Extraído automaticamente via IA (OCR)'
    };
    
    transactions.push(newTx);
    saveTransactions(); // Persists to localStorage
    
    // Switch to finance view and refresh
    closeModal('ocrModal');
    switchView('finance');
    renderFinanceKPIs();
    renderPieChart();
    applyFilters();
    
    // Show a success notification
    showNotification('Despesa lançada com sucesso via OCR Mágico!', 'success');
}

// Add drag and drop listeners
document.addEventListener('DOMContentLoaded', () => {
    // We have to wait or run it if DOM is already loaded, but engine.js is loaded dynamically or synchronously.
    // For safety, let's just add it to the window load
});

// Since the JS is executed, let's just bind drag events globally to the drop zone.
setTimeout(() => {
    const dropZone = document.getElementById('ocrDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Mock the event object for our handler
                handleOCRFile({ target: { files: e.dataTransfer.files } });
            }
        });
    }
}, 1000);
"""

with open('public/engine.js', 'a', encoding='utf-8') as f:
    f.write(engine_logic)

print("OCR Logic appended to engine.js")
