// frontend/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const btnSimular = document.getElementById('btn-simular');
    const tituloMetodo = document.getElementById('titulo-metodo');
    const inputNodos = document.getElementById('num-nodos');
    const contenedorMatriz = document.getElementById('contenedor-matriz');
    const modalConfig = document.getElementById('modal-config');
    const modalAuth = document.getElementById('modal-auth');
    const menuIcon = document.querySelector('.menu-icon');

    // 0. ABRIR MODAL DE AUTENTICACIÓN GOOGLE DESDE EL MENÚ HAMBURGUESA
    if (menuIcon && modalAuth) {
        menuIcon.style.cursor = 'pointer';
        menuIcon.addEventListener('click', () => {
            modalAuth.classList.remove('hidden');
        });
    }

    // Lógica de apertura y cierre del Modal de Configuración
    document.getElementById('btn-config')?.addEventListener('click', () => modalConfig.classList.remove('hidden'));

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

    // Cambiar la cantidad de nodos (rango actualizado entre 2 y 20)
    inputNodos.addEventListener('change', (e) => {
        let n = parseInt(e.target.value);
        if (isNaN(n) || n < 2) n = 2;
        if (n > 20) n = 20; // Permitir hasta 20 nodos
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

    // 3. ENVIAR A FASTAPI (Simular Red)
    btnSimular.addEventListener('click', async () => {
        const payload = obtenerDatosMatriz();
        const textoBoton = document.getElementById('texto-boton');
        textoBoton.innerText = "Calculando...";

        const esJacobi = tituloMetodo.innerText.toLowerCase().includes('jacobi');
        const metodoEndpoint = esJacobi ? 'jacobi' : 'gauss-seidel';

        // Detección dinámica del entorno (Local vs Render)
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocal ? 'http://127.0.0.1:8000' : 'https://numerical-methods-1.onrender.com';
        const url = `${baseUrl}/api/${metodoEndpoint}`;

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
            console.error("Error en la simulación:", error);
            alert("Error de conexión con la API. Verifica que Uvicorn esté corriendo en la terminal.");
        } finally {
            textoBoton.innerText = "Simular Red";
        }
    });
});

// Variable global para almacenar el usuario activo
let usuarioAutenticado = null;
// CALLBACK DE GOOGLE OAUTH 2.0
async function handleCredentialResponse(response) {
    const googleToken = response.credential;

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const endpointAuth = isLocal
        ? 'http://127.0.0.1:8000/api/auth/google'
        : 'https://numerical-methods-1.onrender.com/api/auth/google';

    try {
        const res = await fetch(endpointAuth, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken })
        });

        const data = await res.json();

        if (res.ok) {
            sessionStorage.setItem('usuarioAutenticado', JSON.stringify(data));
            usuarioAutenticado = data;

            // Actualizar la barra superior con la foto del usuario
            actualizarInterfazSesion(data);

            // Ocultar modal de login y desplegar el quiz
            document.getElementById('modal-auth')?.classList.add('hidden');
            mostrarModalQuiz(data);
        } else {
            alert(`Acceso denegado: ${data.detail}`);
        }
    } catch (error) {
        console.error("Error conectando con la API:", error);
        alert("Error de conexión al verificar el token de Google.");
    }
}

// Función auxiliar para desplegar el Quiz
function mostrarModalQuiz(usuario) {
    const modalQuiz = document.getElementById('modal-quiz');
    const infoUsuario = document.getElementById('usuario-autenticado-info');

    if (infoUsuario) {
        infoUsuario.textContent = `Estudiante: ${usuario.nombre} (${usuario.email})`;
    }

    if (modalQuiz) {
        modalQuiz.classList.remove('hidden');
        if (window.renderMathInElement) {
            renderMathInElement(modalQuiz, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '$', right: '$', display: false }
                ],
                throwOnError: false
            });
        }
    }
}

// Restaurar sesión al cargar la página si ya había iniciado sesión
document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = sessionStorage.getItem('usuarioAutenticado');
    if (usuarioGuardado) {
        usuarioAutenticado = JSON.parse(usuarioGuardado);
    }
});

// Interceptar el envío del cuestionario
document.addEventListener('DOMContentLoaded', () => {
    const formQuiz = document.getElementById('form-cuestionario');

    if (formQuiz) {
        formQuiz.addEventListener('submit', async (e) => {
            // DETENER RECARGA AUTOMÁTICA DEL NAVEGADOR
            e.preventDefault();
            e.stopPropagation();

            // Recuperar el usuario de la variable global o de sessionStorage
            const usuario = usuarioAutenticado || JSON.parse(sessionStorage.getItem('usuarioAutenticado'));

            if (!usuario) {
                alert("Debes estar autenticado para enviar tus respuestas.");
                return;
            }

            const valSust = parseFloat(document.getElementById('inp-sust')?.value);
            const valRes = parseFloat(document.getElementById('inp-res')?.value);

            if (isNaN(valSust) || isNaN(valRes)) {
                alert("Por favor completa las casillas del ejercicio antes de enviar.");
                return;
            }

            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const baseUrl = isLocal ? 'http://127.0.0.1:8000' : 'https://numerical-methods-1.onrender.com';

            const payload = {
                nombre: usuario.nombre,
                email: usuario.email,
                respuestas: {
                    inp_sust: valSust,
                    inp_res: valRes
                }
            };

            try {
                // 1. Guardar respuesta en FastAPI
                const resGuardar = await fetch(`${baseUrl}/api/quiz/guardar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!resGuardar.ok) throw new Error("Error guardando el cuestionario.");

                // 2. Ocultar el modal del Quiz
                document.getElementById('modal-quiz')?.classList.add('hidden');

                // 3. Consultar y renderizar la Tabla de Posiciones / Ranking
                const resRanking = await fetch(`${baseUrl}/api/quiz/ranking`);
                const dataRanking = await resRanking.json();

                const tbody = document.getElementById('tabla-ranking-body');
                if (tbody) {
                    tbody.innerHTML = '';
                    dataRanking.ranking.forEach((est, idx) => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = '1px solid #333';
                        tr.innerHTML = `
                            <td style="padding: 10px; text-align: center;">${idx + 1}</td>
                            <td style="padding: 10px;">${est.nombre}</td>
                            <td style="padding: 10px; text-align: center; color: var(--accent-color); font-weight: bold;">${est.puntaje} pts</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }

                // 4. Mostrar el Modal del Ranking
                document.getElementById('modal-ranking')?.classList.remove('hidden');

            } catch (err) {
                console.error("Error al procesar la respuesta:", err);
                alert("Ocurrió un error al conectar con la API para registrar el quiz.");
            }
        });
    }
});

// --- MANEJO DEL ESTADO DE SESIÓN Y MENÚ DE USUARIO ---

function actualizarInterfazSesion(usuario) {
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const userProfileBox = document.getElementById('user-profile-box');
    const userAvatar = document.getElementById('user-avatar');
    const dropdownUserName = document.getElementById('dropdown-user-name');

    if (usuario) {
        // SI HAY SESIÓN: Ocultar menú hamburguesa y mostrar avatar
        btnLoginTrigger?.classList.add('hidden');
        userProfileBox?.classList.remove('hidden');

        // Cargar datos en la UI (usando foto de perfil de Google o un fallback)
        if (userAvatar) userAvatar.src = usuario.picture || usuario.foto || 'https://via.placeholder.com/40';
        if (dropdownUserName) dropdownUserName.textContent = usuario.nombre.split(' ')[0]; // Primer nombre
    } else {
        // SI NO HAY SESIÓN: Mostrar menú hamburguesa y ocultar avatar
        btnLoginTrigger?.classList.remove('hidden');
        userProfileBox?.classList.add('hidden');
    }
}

// TOGGLE DEL MENÚ DESPLEGABLE DE PERFIL
document.addEventListener('DOMContentLoaded', () => {
    const userProfileBox = document.getElementById('user-profile-box');
    const userDropdown = document.getElementById('user-dropdown');
    const btnLoginTrigger = document.getElementById('btn-login-trigger');

    // Evento al hacer clic en el botón hamburguesa (Sin sesión)
    btnLoginTrigger?.addEventListener('click', () => {
        document.getElementById('modal-auth')?.classList.remove('hidden');
    });

    // Evento al hacer clic en la foto de perfil (Con sesión)
    userProfileBox?.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown?.classList.toggle('hidden');
    });

    // Cerrar el desplegable si se hace clic fuera de él
    document.addEventListener('click', () => {
        userDropdown?.classList.add('hidden');
    });

    // Acción: Ver Ranking desde el Menú Desplegable
    document.getElementById('btn-ver-ranking')?.addEventListener('click', async () => {
        userDropdown?.classList.add('hidden');

        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocal ? 'http://127.0.0.1:8000' : 'https://numerical-methods-1.onrender.com';

        try {
            const resRanking = await fetch(`${baseUrl}/api/quiz/ranking`);
            const dataRanking = await resRanking.json();

            const tbody = document.getElementById('tabla-ranking-body');
            if (tbody) {
                tbody.innerHTML = '';
                dataRanking.ranking.forEach((est, idx) => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid #333';
                    tr.innerHTML = `
                        <td style="padding: 10px; text-align: center;">${idx + 1}</td>
                        <td style="padding: 10px;">${est.nombre}</td>
                        <td style="padding: 10px; text-align: center; color: var(--accent-color); font-weight: bold;">${est.puntaje} pts</td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            document.getElementById('modal-ranking')?.classList.remove('hidden');
        } catch (err) {
            console.error("Error al cargar el ranking:", err);
            alert("No se pudo obtener la tabla de posiciones.");
        }
    });

    // Acción: Cerrar Sesión desde el Menú Desplegable
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
        sessionStorage.removeItem('usuarioAutenticado');
        usuarioAutenticado = null;
        userDropdown?.classList.add('hidden');
        actualizarInterfazSesion(null);
        alert("Sesión cerrada correctamente.");
    });

    // Restaurar sesión al cargar si ya estaba logueado
    const usuarioGuardado = sessionStorage.getItem('usuarioAutenticado');
    if (usuarioGuardado) {
        usuarioAutenticado = JSON.parse(usuarioGuardado);
        actualizarInterfazSesion(usuarioAutenticado);
    }
});