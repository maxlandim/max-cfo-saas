import os

css_code = """
/* ═══════════ OCR MODAL CSS ═══════════ */
.ocr-drop-zone {
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  background: rgba(0,0,0,0.2);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.ocr-drop-zone:hover, .ocr-drop-zone.dragover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.05);
}
.ocr-icon-lg {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}
.ocr-scanning-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15,23,42,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  display: none;
}
.laser-line {
  width: 80%;
  height: 2px;
  background: var(--primary);
  box-shadow: 0 0 10px var(--primary), 0 0 20px var(--primary);
  position: absolute;
  top: 0;
  animation: scanLaser 2s linear infinite;
}
@keyframes scanLaser {
  0% { top: 10%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 90%; opacity: 0; }
}
.ocr-result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 20px;
}
"""

with open('app/globals.css', 'a', encoding='utf-8') as f:
    f.write(css_code)

print("CSS Appended!")
