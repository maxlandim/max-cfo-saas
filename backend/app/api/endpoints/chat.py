from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Request
from typing import Dict, List
from app.db.session import get_db
from app.api.deps import get_current_user
from sqlalchemy.orm import Session
from app.schemas.user import User

router = APIRouter()

# Connection manager isolated by workspace_id
class ConnectionManager:
    def __init__(self):
        # Dictionary mapping workspace_id -> list of active connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, workspace_id: str):
        await websocket.accept()
        if workspace_id not in self.active_connections:
            self.active_connections[workspace_id] = []
        self.active_connections[workspace_id].append(websocket)

    def disconnect(self, websocket: WebSocket, workspace_id: str):
        if workspace_id in self.active_connections:
            self.active_connections[workspace_id].remove(websocket)
            if not self.active_connections[workspace_id]:
                del self.active_connections[workspace_id]

    async def broadcast_to_workspace(self, message: str, workspace_id: str):
        if workspace_id in self.active_connections:
            for connection in self.active_connections[workspace_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    # In a real app we parse the JWT token manually in WebSockets because Depends() doesn't work out-of-the-box perfectly for ws connections
):
    from app.core.config import settings
    from jose import jwt, JWTError
    from app.schemas.user import TokenPayload
    
    # Authenticate token and extract workspace_id
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
        workspace_id = token_data.workspace_id
        user_id = token_data.sub
    except JWTError:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, workspace_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = f"User {user_id}: {data}"
            await manager.broadcast_to_workspace(message, workspace_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, workspace_id)
        await manager.broadcast_to_workspace(f"User {user_id} saiu do chat", workspace_id)

@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recebe mensagens do WhatsApp (via Meta API ou Twilio)
    Pode processar imagens enviando para o OCR (Gemini) e cadastrando a transação.
    """
    payload = await request.json()
    
    # Exemplo de payload da Meta API (Cloud API)
    # Aqui identificaríamos o número de telefone do remetente e faríamos o match com a empresa (workspace)
    # Se a mensagem contiver imagem (media_id), baixamos a imagem e passamos pelo OCR
    
    # Mocking the AI Assistant behavior
    return {"status": "success", "message": "Mensagem recebida pelo Assistente Virtual MAX CFO."}
