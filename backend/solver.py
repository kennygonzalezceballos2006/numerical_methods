import numpy as np
from schemas import SistemaRequest, SistemaResponse, PasoIteracion

def calcular_jacobi(datos: SistemaRequest) -> SistemaResponse:
    # Convertimos las listas de Python a matrices de NumPy para cálculo rápido
    A = np.array(datos.matriz_A, dtype=float)
    b = np.array(datos.vector_b, dtype=float)
    x = np.array(datos.vector_x0, dtype=float)
    
    n = len(b)
    historial = []
    convergencia = False
    
    for k in range(datos.max_iteraciones):
        x_nuevo = np.zeros_like(x)
        
        # Lógica de Jacobi: Usa la "foto" de la iteración anterior
        for i in range(n):
            suma = sum(A[i][j] * x[j] for j in range(n) if j != i)
            x_nuevo[i] = (b[i] - suma) / A[i][i]
            
        # Calculamos el error (Norma infinita: la mayor diferencia entre iteraciones)
        error = float(np.linalg.norm(x_nuevo - x, np.inf))
        
        # Guardamos este paso para la animación en la web
        historial.append(PasoIteracion(
            iteracion=k + 1,
            valores_nodos=x_nuevo.tolist(),
            error=error
        ))
        
        if error < datos.tolerancia:
            convergencia = True
            break
            
        x = x_nuevo.copy()
        
    return SistemaResponse(
        metodo="Jacobi",
        convergencia=convergencia,
        historial=historial
    )


def calcular_gauss_seidel(datos: SistemaRequest) -> SistemaResponse:
    A = np.array(datos.matriz_A, dtype=float)
    b = np.array(datos.vector_b, dtype=float)
    x = np.array(datos.vector_x0, dtype=float)
    
    n = len(b)
    historial = []
    convergencia = False
    
    for k in range(datos.max_iteraciones):
        x_viejo = x.copy()
        
        # Lógica de Gauss-Seidel: Actualización inmediata de los valores
        for i in range(n):
            s1 = sum(A[i][j] * x[j] for j in range(i))           # Valores nuevos ya calculados
            s2 = sum(A[i][j] * x_viejo[j] for j in range(i + 1, n)) # Valores viejos pendientes
            
            x[i] = (b[i] - s1 - s2) / A[i][i]
            
        error = float(np.linalg.norm(x - x_viejo, np.inf))
        
        historial.append(PasoIteracion(
            iteracion=k + 1,
            valores_nodos=x.tolist(),
            error=error
        ))
        
        if error < datos.tolerancia:
            convergencia = True
            break
            
    return SistemaResponse(
        metodo="Gauss-Seidel",
        convergencia=convergencia,
        historial=historial
    )