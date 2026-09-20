from pydantic import BaseModel, Field
from typing import List

# 1. Lo que recibimos desde el Frontend (El problema)
class SistemaRequest(BaseModel):
    matriz_A: List[List[float]] = Field(..., description="Matriz de coeficientes (Topología de la red)")
    vector_b: List[float] = Field(..., description="Vector de términos independientes")
    vector_x0: List[float] = Field(..., description="Vector inicial (usualmente ceros)")
    tolerancia: float = Field(default=0.001, description="Margen de error permitido")
    max_iteraciones: int = Field(default=50, description="Límite de seguridad para evitar bucles infinitos")

# 2. La estructura de un solo paso/iteración (Para animar el frontend)
class PasoIteracion(BaseModel):
    iteracion: int
    valores_nodos: List[float]
    error: float

# 3. Lo que le devolvemos al Frontend (La solución)
class SistemaResponse(BaseModel):
    metodo: str
    convergencia: bool
    historial: List[PasoIteracion]