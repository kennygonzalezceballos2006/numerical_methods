// frontend/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const btnSimular = document.getElementById('btn-simular');
    const tituloMetodo = document.getElementById('titulo-metodo');
    const inputNodos = document.getElementById('num-nodos');
    const contenedorMatriz = document.getElementById('contenedor-matriz');
    const modalConfig = document.getElementById('modal-config');

    // Lógica de apertura y cierre del Modal
    document.getElementById('btn-config').addEventListener('click', () => modalConfig.classList.remove('hidden'));
    
    document.getElementById('btn-cerrar-config')?.addEventListener('click', () => {
        modalConfig.classList.add('hidden');
        const n = parseInt(inputNodos.value) || 3;
        if (typeof actualizarTopologia === 'function') {
            actualizarTopologia(n);
        }
    });

    // 1. DIBUJAR LA MATRIZ DINÁMICA VERTICAL (FILA POR SERVIDOR)
    function renderizarCuadricula(n) {
        contenedorMatriz.innerHTML = '';
        contenedorMatriz.removeAttribute('style'); // Limpiar estilos grid anteriores

        for (let i = 0; i < n; i++) {
            const fila = document.createElement('div');
            fila.className = 'fila-servidor';

            let htmlFila = `<h4>Servidor ${i + 1}</h4><div class="inputs-ecuacion">`;
            
            for (let j = 0; j < n; j++) {
                // Diagonal dominante por defecto para asegurar convergencia (4 en diagonal, -1 adyacentes)
                const valorDefecto = (i === j) ? 4 : (Math.abs(i - j) === 1 ? -1 : 0);
                htmlFila += `<input type="number" id="a${i}${j}" class="coef-a" value="${valorDefecto}">`;
                if (j < n - 1) htmlFila += `<span style="color:#777; font-size:0.8rem;">+</span>`;
            }

            // Término independiente vector_b
            htmlFila += `<span style="color:var(--accent-color); font-weight:bold; margin: 0 4px;">=</span>`;
            htmlFila += `<input type="number" id="b${i}" class="vector-b" value="${(i + 1) * 10}"></div>`;

            fila.innerHTML = htmlFila;
            contenedorMatriz.appendChild(fila);
        }
    }

    // Cambiar la cantidad de nodos (rango entre 2 y 12)
    inputNodos.addEventListener('change', (e) => {
        let n = parseInt(e.target.value);
        if (isNaN(n) || n < 2) n = 2;
        if (n > 12) n = 12;
        e.target.value = n;
        
        renderizarCuadricula(n);
        if (typeof actualizarTopologia === 'function') {
            actualizarTopologia(n);
        }
    });

    // Carga inicial (3 servidores)
    renderizarCuadricula(3);

    // 2. EXTRAER DATOS MATEMÁTICOS PARA EL BACKEND
    function obtenerDatosMatriz() {
        const n = parseInt(inputNodos.value);
        let matriz_A = [];
        let vector_b = [];

        for (let i = 0; i < n; i++) {
            let fila = [];
            for (let j = 0; j < n; j++) {
                const elem = document.getElementById(`a${i}${j}`);
                fila.push(elem ? parseFloat(elem.value) || 0 : 0);
            }
            matriz_A.push(fila);
            
            const elemB = document.getElementById(`b${i}`);
            vector_b.push(elemB ? parseFloat(elemB.value) || 0 : 0);
        }

        return { 
            matriz_A, 
            vector_b, 
            vector_x0: Array(n).fill(0), 
            tolerancia: 0.001, 
            max_iteraciones: 50 
        };
    }

    // 3. ENVIAR A FASTAPI / UVICORN
    btnSimular.addEventListener('click', async () => {
        const payload = obtenerDatosMatriz();
        const textoBoton = document.getElementById('texto-boton');
        textoBoton.innerText = "Calculando...";

        const esJacobi = tituloMetodo.innerText.toLowerCase().includes('jacobi');
        const url = `http://127.0.0.1:8000/api/${esJacobi ? 'jacobi' : 'gauss-seidel'}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const data = await response.json();
            
            if (typeof animarTopologia === 'function') {
                animarTopologia(data.historial);
            }
            
        } catch (error) {
            alert("Error de conexión con Uvicorn. Asegúrate de ejecutar el servidor backend en el puerto 8000.");
        } finally {
            textoBoton.innerText = "Simular Red";
        }
    });
});