import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
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

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://numerical-methods-1.onrender.com",
    "https://numerical-methods-xksx.onrender.com"
]

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
    nombre: str
    email: EmailStr
    respuestas: Dict[str, float]  # ej: {"inp_sust": 0.0, "inp_res": 2.5}

@app.post("/api/quiz/guardar")
def guardar_respuestas_quiz(data: RespuestaQuizRequest):
    # Verificación de las respuestas del ejercicio guiado
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
    
    # Evitar duplicados del mismo estudiante (actualizar si ya existe)
    registro_evaluaciones[:] = [r for r in registro_evaluaciones if r["email"] != data.email]
    registro_evaluaciones.append(registro)

    return {"status": "ok", "puntaje": puntaje, "mensaje": "Respuestas guardadas con éxito"}

@app.get("/api/quiz/ranking")
def obtener_ranking():
    # Ordenar por puntaje descendente
    ranking_ordenado = sorted(
        registro_evaluaciones, 
        key=lambda x: x["puntaje"], 
        reverse=True
    )
    return {"ranking": ranking_ordenado[:10]}


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

@app.post("/api/quiz/guardar")
def guardar_respuestas_quiz(data: RespuestaQuizRequest):
    # Calcular puntaje (Ejemplo: 10 pts por respuesta correcta)
    respuestas_correctas = {"p1": "A", "p2": "C", "p3": "B"}
    puntaje = 0
    
    for p, resp in data.respuestas.items():
        if respuestas_correctas.get(p) == resp:
            puntaje += 10

    registro = {
        "email": data.email,
        "nombre": data.nombre,
        "puntaje": puntaje,
        "tiempo": data.tiempo_segundos # Opcional: para desempate
    }
    registro_evaluaciones.append(registro)
    return {"status": "ok", "puntaje": puntaje}

@app.get("/api/quiz/ranking")
def obtener_ranking():
    # Ordenar por puntaje descendente
    ranking_ordenado = sorted(
        registro_evaluaciones, 
        key=lambda x: x["puntaje"], 
        reverse=True
    )
    return {"ranking": ranking_ordenado[:10]}