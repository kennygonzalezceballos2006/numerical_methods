import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
from google.oauth2 import id_token
from google.auth.transport import requests

# Módulos numéricos
from schemas import SistemaRequest, SistemaResponse
from solver import calcular_jacobi, calcular_gauss_seidel

# Inicializamos la aplicación FastAPI
app = FastAPI(
    title="API Métodos Numéricos - Exposición",
    description="Backend para resolución de Jacobi, Gauss-Seidel y evaluación OAuth2"
)

# Configuración de CORS
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

# Base de datos en memoria para almacenar evaluaciones del quiz
registro_evaluaciones = []


# Modelos Pydantic
class AuthTokenRequest(BaseModel):
    token: str

class RespuestaQuizRequest(BaseModel):
    nombre: str
    email: EmailStr
    respuestas: Dict[str, float]  # Ej: {"inp_sust": 0.0, "inp_res": 2.5}


# --------------------------------------------------------------------------
# RUTAS DE MÉTODOS NUMÉRICOS Y RED
# --------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "online", "mensaje": "API de Métodos Numéricos y SDN activa"}

@app.post("/api/jacobi", response_model=SistemaResponse)
def endpoint_jacobi(datos: SistemaRequest):
    return calcular_jacobi(datos)

@app.post("/api/gauss-seidel", response_model=SistemaResponse)
def endpoint_gauss_seidel(datos: SistemaRequest):
    return calcular_gauss_seidel(datos)


# --------------------------------------------------------------------------
# AUTENTICACIÓN GOOGLE OAUTH 2.0
# --------------------------------------------------------------------------

@app.post("/api/auth/google")
def verificar_token_google(data: AuthTokenRequest):
    try:
        user_info = id_token.verify_oauth2_token(
            data.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        email = user_info.get("email", "").lower()
        nombre = user_info.get("name", "Estudiante")
        foto = user_info.get("picture", "")

        # Verificación del dominio institucional (@uniguajira.edu.co)
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
            "foto": foto,
            "picture": foto
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de Google inválido o caducado."
        )


# --------------------------------------------------------------------------
# CUESTIONARIO Y RANKING
# --------------------------------------------------------------------------

@app.post("/api/quiz/guardar")
def guardar_respuestas_quiz(data: RespuestaQuizRequest):
    val_sust = data.respuestas.get("inp_sust")
    val_res = data.respuestas.get("inp_res")
    
    puntaje = 0
    if val_sust == 0.0:
        puntaje += 50
    if val_res == 2.5:
        puntaje += 50

    registro = {
        "nombre": data.nombre,
        "email": data.email,
        "puntaje": puntaje
    }
    
    # Evitar duplicados del mismo estudiante (actualiza la nota si vuelve a enviar)
    registro_evaluaciones[:] = [r for r in registro_evaluaciones if r["email"] != data.email]
    registro_evaluaciones.append(registro)

    return {"status": "ok", "puntaje": puntaje, "mensaje": "Respuestas guardadas con éxito"}


@app.get("/api/quiz/ranking")
def obtener_ranking():
    ranking_ordenado = sorted(
        registro_evaluaciones, 
        key=lambda x: x["puntaje"], 
        reverse=True
    )
    return {"ranking": ranking_ordenado[:10]}