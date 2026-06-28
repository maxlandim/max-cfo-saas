from typing import Optional
from pydantic import BaseModel, UUID4, validator
import re

def validate_cnpj(cnpj: str) -> bool:
    cnpj = re.sub(r'[^0-9]', '', cnpj)
    if len(cnpj) != 14:
        return False
    if cnpj in (c * 14 for c in "0123456789"):
        return False
    
    # Validação matemática CNPJ
    def calc_digit(cnpj_base, weights):
        s = sum(int(digit) * weight for digit, weight in zip(cnpj_base, weights))
        r = s % 11
        return 0 if r < 2 else 11 - r

    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    d1 = calc_digit(cnpj[:12], w1)
    d2 = calc_digit(cnpj[:12] + str(d1), w2)

    return cnpj[-2:] == f"{d1}{d2}"


class WorkspaceBase(BaseModel):
    name: str
    cnpj: str
    plan: Optional[str] = "Básico"
    
    @validator('cnpj')
    def cnpj_must_be_valid(cls, v):
        cleaned = re.sub(r'[^0-9]', '', v)
        if not validate_cnpj(cleaned):
            raise ValueError('CNPJ inválido')
        return cleaned

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceInDBBase(WorkspaceBase):
    id: UUID4
    is_active: bool

    class Config:
        from_attributes = True

class Workspace(WorkspaceInDBBase):
    pass
