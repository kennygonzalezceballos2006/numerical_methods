// frontend/js/main.js

// Variable global para almacenar el usuario activo
let usuarioAutenticado = null;

// Helper para determinar la URL base de la API (Local vs Render)
function getBaseUrl() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return isLocal
        ? 'http://127.0.0.1:8000'
        : 'https://numerical-methods-api.onrender.com';
}

// --------------------------------------------------------------------------
// 1. CALLBACK DE GOOGLE OAUTH 2.0 (Invocado por Google Identity Services)
// --------------------------------------------------------------------------
async function handleCredentialResponse(response) {
    const googleToken = response.credential;
    const endpointAuth = `${getBaseUrl()}/api/auth/google`;

    const btnCancel = document.getElementById('btn-cerrar-auth');
    if (btnCancel) btnCancel.innerText = "Verificando con el servidor...";

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

            actualizarInterfazSesion(data);

            cerrarModalAuth();
            mostrarModalQuiz(data);
        } else {
            alert(`Acceso denegado: ${data.detail}`);
        }
    } catch (error) {
        console.error("Error conectando con la API de autenticación:", error);
        alert("El servidor está despertando (Cold Start de Render). Vuelve a presionar iniciar sesión en 10 segundos.");
    } finally {
        if (btnCancel) btnCancel.innerText = "Cancelar";
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

// Actualizar botones y foto de perfil en la top-nav
function actualizarInterfazSesion(usuario) {
    const btnLoginTrigger = document.getElementById('btn-login-trigger');
    const userProfileBox = document.getElementById('user-profile-box');
    const userAvatar = document.getElementById('user-avatar');
    const dropdownUserName = document.getElementById('dropdown-user-name');

    if (usuario) {
        btnLoginTrigger?.classList.add('hidden');
        userProfileBox?.classList.remove('hidden');

        if (userAvatar) userAvatar.src = usuario.picture || usuario.foto || 'https://via.placeholder.com/40';
        if (dropdownUserName) dropdownUserName.textContent = usuario.nombre.split(' ')[0];
    } else {
        btnLoginTrigger?.classList.remove('hidden');
        userProfileBox?.classList.add('hidden');
    }
}

// --------------------------------------------------------------------------
// 2. INICIALIZACIÓN DE COMPONENTES DOM
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const btnSimular = document.getElementById('btn-simular');
    const tituloMetodo = document.getElementById('titulo-metodo');
    const inputNodos = document.getElementById('num-nodos');
    const contenedorMatriz = document.getElementById('contenedor-matriz');
    const modalConfig = document.getElementById('modal-config');
    const modalAuth = document.getElementById('modal-auth');
    const formQuiz = document.getElementById('form-cuestionario');
    const userProfileBox = document.getElementById('user-profile-box');
    const userDropdown = document.getElementById('user-dropdown');
    const btnLoginTrigger = document.getElementById('btn-login-trigger');

    // RESTAURAR SESIÓN AL CARGAR
    const usuarioGuardado = sessionStorage.getItem('usuarioAutenticado');
    if (usuarioGuardado) {
        usuarioAutenticado = JSON.parse(usuarioGuardado);
        actualizarInterfazSesion(usuarioAutenticado);
    }

    // CONTROL DE MODALES CONFIG Y AUTH
    document.getElementById('btn-config')?.addEventListener('click', () => modalConfig?.classList.remove('hidden'));

    document.getElementById('btn-cerrar-config')?.addEventListener('click', () => {
        modalConfig?.classList.add('hidden');
        const n = parseInt(inputNodos?.value) || 3;
        if (typeof actualizarTopologia === 'function') {
            actualizarTopologia(n);
        }
    });

    document.getElementById('btn-cancelar-auth')?.addEventListener('click', () => {
        modalAuth?.classList.add('hidden');
    });

    btnLoginTrigger?.addEventListener('click', () => {
        modalAuth?.classList.remove('hidden');
    });

    // MENÚ DESPLEGABLE DE PERFIL
    userProfileBox?.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown?.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        userDropdown?.classList.add('hidden');
    });

    // ACCIÓN: VER RANKING
    document.getElementById('btn-ver-ranking')?.addEventListener('click', async () => {
        userDropdown?.classList.add('hidden');

        try {
            const resRanking = await fetch(`${getBaseUrl()}/api/quiz/ranking`);
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

    // ACCIÓN: CERRAR SESIÓN
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
        sessionStorage.removeItem('usuarioAutenticado');
        usuarioAutenticado = null;
        userDropdown?.classList.add('hidden');
        actualizarInterfazSesion(null);
        alert("Sesión cerrada correctamente.");
    });

    // RENDERIZAR MATRIZ DINÁMICA
    function renderizarCuadricula(n) {
        if (!contenedorMatriz) return;
        contenedorMatriz.innerHTML = '';
        contenedorMatriz.removeAttribute('style');

        for (let i = 0; i < n; i++) {
            const fila = document.createElement('div');
            fila.className = 'fila-servidor';

            let htmlFila = `<h4>Servidor ${i + 1}</h4><div class="inputs-ecuacion">`;

            for (let j = 0; j < n; j++) {
                const valorDefecto = (i === j) ? 4 : (Math.abs(i - j) === 1 ? -1 : 0);
                htmlFila += `<input type="number" id="a${i}${j}" class="coef-a" value="${valorDefecto}">`;
                if (j < n - 1) htmlFila += `<span style="color:#777; font-size:0.8rem;">+</span>`;
            }

            htmlFila += `<span style="color:var(--accent-color); font-weight:bold; margin: 0 4px;">=</span>`;
            htmlFila += `<input type="number" id="b${i}" class="vector-b" value="${(i + 1) * 10}"></div>`;

            fila.innerHTML = htmlFila;
            contenedorMatriz.appendChild(fila);
        }
    }

    inputNodos?.addEventListener('change', (e) => {
        let n = parseInt(e.target.value);
        if (isNaN(n) || n < 2) n = 2;
        if (n > 20) n = 20;
        e.target.value = n;

        renderizarCuadricula(n);
        if (typeof actualizarTopologia === 'function') {
            actualizarTopologia(n);
        }
    });

    renderizarCuadricula(3);

    function obtenerDatosMatriz() {
        const n = parseInt(inputNodos?.value) || 3;
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

    // SIMULAR RED (BOTÓN PRINCIPAL)
    btnSimular?.addEventListener('click', async () => {
        const payload = obtenerDatosMatriz();
        const textoBoton = document.getElementById('texto-boton');
        if (textoBoton) textoBoton.innerText = "Calculando...";

        const esJacobi = tituloMetodo?.innerText.toLowerCase().includes('jacobi');
        const metodoEndpoint = esJacobi ? 'jacobi' : 'gauss-seidel';
        const url = `${getBaseUrl()}/api/${metodoEndpoint}`;

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
            alert("Error de conexión con la API backend. Revisa la consola o espera si el servidor está iniciando.");
        } finally {
            if (textoBoton) textoBoton.innerText = "Simular Red";
        }
    });

    // INTERCEPTAR ENVÍO DEL QUIZ
    if (formQuiz) {
        formQuiz.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

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

            const payload = {
                nombre: usuario.nombre,
                email: usuario.email,
                respuestas: {
                    inp_sust: valSust,
                    inp_res: valRes
                }
            };

            try {
                const resGuardar = await fetch(`${getBaseUrl()}/api/quiz/guardar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!resGuardar.ok) throw new Error("Error guardando el cuestionario.");

                document.getElementById('modal-quiz')?.classList.add('hidden');

                const resRanking = await fetch(`${getBaseUrl()}/api/quiz/ranking`);
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
                console.error("Error al procesar la respuesta:", err);
                alert("Ocurrió un error al conectar con la API para registrar el quiz.");
            }
        });
    }

    inicializarDragAndDrop();
});

// Función global para el onclick del botón Cancelar
function cerrarModalAuth() {
    const modalAuth = document.getElementById('modal-auth');
    if (modalAuth) {
        modalAuth.classList.add('hidden');
    }
}

// --------------------------------------------------------------------------
// 3. LÓGICA INTERACTIVA DE ARRASTRAR Y SOLTAR (DRAG & DROP)
// --------------------------------------------------------------------------
function inicializarDragAndDrop() {
    const cards = document.querySelectorAll('.drag-card');
    const dropZones = document.querySelectorAll('.drop-target');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.id);
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('hovered');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('hovered');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('hovered');

            const idCard = e.dataTransfer.getData('text/plain');
            const cardElement = document.getElementById(idCard);
            if (!cardElement) return;

            const targetEsperado = cardElement.getAttribute('data-target');
            const metodoZona = zone.getAttribute('data-method');

            const placeholder = zone.querySelector('.placeholder-text');
            if (placeholder) placeholder.style.display = 'none';

            zone.appendChild(cardElement);

            if (targetEsperado === metodoZona) {
                cardElement.style.borderColor = '#00ffcc';
                cardElement.style.background = 'rgba(0, 255, 204, 0.1)';
            } else {
                cardElement.style.borderColor = '#ff3366';
                cardElement.style.background = 'rgba(255, 51, 102, 0.1)';
            }

            verificarProgresoTaller();
        });
    });
}

function verificarProgresoTaller() {
    const origenContainer = document.getElementById('origen-cards');
    const tarjetasRestantes = origenContainer ? origenContainer.querySelectorAll('.drag-card').length : 0;
    const feedbackBox = document.getElementById('feedback-drag');

    if (tarjetasRestantes === 0 && feedbackBox) {
        feedbackBox.classList.remove('hidden');
        feedbackBox.innerHTML = `
            <div style="text-align: center; background: rgba(0,255,204,0.1); border: 1px solid #00ffcc; padding: 15px; border-radius: 12px; margin-top: 20px;">
                <h4 style="color: #00ffcc; margin: 0 0 5px 0;">¡Excelente trabajo!</h4>
                <p style="color: #ccc; margin: 0; font-size: 0.9rem;">Has clasificado todas las propiedades. Ya estás listo para probar la simulación 3D.</p>
            </div>
        `;
    }
}

// Scroll suave automático
document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Redimensionar el gráfico 3D usando 'grafo3D'
window.addEventListener('resize', () => {
    if (typeof grafo3D !== 'undefined' && grafo3D) {
        const contenedor = document.getElementById('contenedor-3d');
        if (contenedor) {
            const ancho = contenedor.clientWidth || window.innerWidth;
            const alto = contenedor.clientHeight || window.innerHeight;
            grafo3D.width(ancho);
            grafo3D.height(alto);
        }
    }
});