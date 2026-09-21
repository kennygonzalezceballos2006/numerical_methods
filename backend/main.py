import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests

# Importamos tus módulos existentes
from schemas import SistemaRequest, SistemaResponse
from solver import calcular_jacobi, calcular_gauss_seidel

# Inicializamos la aplicación
app = FastAPI(
    title="API Métodos Numéricos - Exposición",
    description="Backend para resolución de Jacobi, Gauss-Seidel y evaluación OAuth2"
)

# Configuramos CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variables de Entorno para OAuth
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID", 
    "470520188656-hp1qqoue2vtr33dqk9oiin7hpls0ou1q.apps.googleusercontent.com"
)
ALLOWED_DOMAIN = os.getenv("ALLOWED_DOMAIN", "uniguajira.edu.co")

# Base de datos en memoria para almacenar las respuestas de los estudiantes
registro_evaluaciones = []


# Modelos Pydantic para Autenticación y Quiz
class AuthTokenRequest(BaseModel):
    token: str

class RespuestaQuizRequest(BaseModel):
    email: EmailStr
    nombre: str
    respuestas: dict  # Ejemplo: {"pregunta1": "opcionA", "pregunta2": "opcionB"}


# --------------------------------------------------------------------------
# ENDPOINTS EXISTENTES
# --------------------------------------------------------------------------

@app.post("/api/jacobi", response_model=SistemaResponse)
def endpoint_jacobi(datos: SistemaRequest):
    return calcular_jacobi(datos)

@app.post("/api/gauss-seidel", response_model=SistemaResponse)
def endpoint_gauss_seidel(datos: SistemaRequest):
    return calcular_gauss_seidel(datos)

@app.get("/")
def read_root():
    return {"status": "online", "mensaje": "API de Métodos Numéricos y SDN activa"}


# --------------------------------------------------------------------------
# ENDPOINTS DE AUTENTICACIÓN GOOGLE Y CUESTIONARIO
# --------------------------------------------------------------------------

@app.post("/api/auth/google")
def verificar_token_google(data: AuthTokenRequest):
    """
    Verifica la autenticidad del ID Token emitido por Google y valida
    estrictamente que el dominio del correo termine en @uniguajira.edu.co.
    """
    try:
        user_info = id_token.verify_oauth2_token(
            data.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        email = user_info.get("email", "").lower()
        nombre = user_info.get("name", "Estudiante")
        foto = user_info.get("picture", "")

        # Verificación estricta del dominio universitario
        if not email.endswith(f"@{ALLOWED_DOMAIN}"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere cuenta institucional (@{ALLOWED_DOMAIN})."
            )

        return {
            "status": "success",
            "message": "Autenticación exitosa",
            "email": email,
            "nombre": nombre,
            "foto": foto
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de Google inválido o caducado."
        )


@app.post("/api/quiz/guardar")
def guardar_respuestas_quiz(data: RespuestaQuizRequest):
    """
    Guarda la evaluación realizada por un estudiante autenticado.
    Evita entregas duplicadas.
    """
    for registro in registro_evaluaciones:
        if registro["email"] == data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya registraste tus respuestas previamente."
            )

    nuevo_registro = {
        "email": data.email,
        "nombre": data.nombre,
        "respuestas": data.respuestas
    }
    registro_evaluaciones.append(nuevo_registro)

    return {"status": "ok", "message": "Evaluación guardada exitosamente."}


@app.get("/api/quiz/resultados")
def obtener_resultados():
    """
    Devuelve la lista de respuestas acumuladas de los compañeros.
    """
    return {"total": len(registro_evaluaciones), "registros": registro_evaluaciones}