from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos nuestros propios módulos
from schemas import SistemaRequest, SistemaResponse
from solver import calcular_jacobi, calcular_gauss_seidel

# Inicializamos la aplicación
app = FastAPI(
    title="API Métodos Numéricos - Exposición",
    description="Backend para resolución de Jacobi y Gauss-Seidel aplicados a redes"
)

# Configuramos CORS (Vital para que el frontend HTML no sea bloqueado al pedir datos)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint 1: Jacobi
@app.post("/api/jacobi", response_model=SistemaResponse)
def endpoint_jacobi(datos: SistemaRequest):
    # FastAPI ya validó el JSON con SistemaRequest. Solo se lo pasamos al solver.
    return calcular_jacobi(datos)

# Endpoint 2: Gauss-Seidel
@app.post("/api/gauss-seidel", response_model=SistemaResponse)
def endpoint_gauss_seidel(datos: SistemaRequest):
    return calcular_gauss_seidel(datos)