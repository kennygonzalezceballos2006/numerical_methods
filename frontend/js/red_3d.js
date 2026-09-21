// frontend/js/red_3d.js

let grafo3D = null;
let datosRed = { nodes: [], links: [] };

// 1. GENERACIÓN DE TEXTURAS EN CANVAS PARA MODELOS 3D
function crearTexturaPeticion() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 64, 64);

    // Cuerpo del Sobre (Petición HTTP)
    ctx.fillStyle = '#ea4335';
    ctx.fillRect(8, 16, 48, 32);

    // Solapa Blanca
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(8, 16); 
    ctx.lineTo(32, 34); 
    ctx.lineTo(56, 16);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 16, 48, 32);

    return new THREE.CanvasTexture(canvas);
}

function crearTexturaPCCliente() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(15, 20, 98, 50);

    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 50); ctx.lineTo(40, 30); ctx.lineTo(60, 60); ctx.lineTo(80, 25); ctx.lineTo(100, 45);
    ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText('TRÁFICO CLIENTES', 12, 95);

    return new THREE.CanvasTexture(canvas);
}

function crearTexturaBalanceador() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2b1704'; ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#ff5e00'; ctx.lineWidth = 8; ctx.strokeRect(3, 3, 122, 250);

    for (let i = 0; i < 5; i++) {
        let yPos = 20 + (i * 45);
        ctx.fillStyle = '#ff5e00'; ctx.fillRect(15, yPos, 98, 32);
        ctx.fillStyle = '#00ffcc'; ctx.fillRect(25, yPos + 10, 50, 12);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(90, yPos + 16, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(102, yPos + 16, 4, 0, Math.PI * 2); ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

function crearTexturaServidor() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e3a5f'; ctx.fillRect(0, 0, 128, 256);
    ctx.strokeStyle = '#0f1d30'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 122, 250);

    for (let i = 0; i < 6; i++) {
        let yPos = 18 + (i * 38);
        ctx.fillStyle = '#0f1d30'; ctx.fillRect(12, yPos, 104, 30);
        ctx.fillStyle = '#243b55'; ctx.fillRect(20, yPos + 10, 45, 10);
        ctx.fillStyle = '#00ffcc'; ctx.beginPath(); ctx.arc(95, yPos + 15, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = (i === 2) ? '#ff3b30' : '#00ffcc'; ctx.beginPath(); ctx.arc(110, yPos + 15, 3, 0, Math.PI * 2); ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

let padreOriginalTelemetria = null;
let siguienteHermanoTelemetria = null;

// 2. CONSTRUIR TOPOLOGÍA DE RED
function actualizarTopologia(n) {
    datosRed = { nodes: [], links: [] };
    
    // NODO CLIENTE
    datosRed.nodes.push({ id: 'pc', nombre: '💻 Usuarios / Peticiones Web', tipo: 'pc' });

    // NODO BALANCEADOR CENTRAL
    datosRed.nodes.push({ id: 0, nombre: '⚡ Balanceador SDN Central', tipo: 'balanceador' });
    
    datosRed.links.push({ source: 'pc', target: 0, esTragicoCliente: true });

    // NODOS SERVIDORES
    for (let i = 1; i <= n; i++) {
        datosRed.nodes.push({ id: i, nombre: `Rack Servidor ${i}`, tipo: 'servidor' });
    }
    
    for (let i = 1; i <= n; i++) {
        datosRed.links.push({ source: 0, target: i, esTragicoBalanceador: true });
    }

    for (let i = 1; i <= n; i++) {
        let siguiente = (i % n) + 1;
        datosRed.links.push({ source: i, target: siguiente });
    }

    if (grafo3D) {
        grafo3D.graphData(datosRed);

        const esInmersivo = document.getElementById('contenedor-3d')?.classList.contains('modo-inmersivo-3d');
        
        // Ajuste de fuerzas para que mantenga un bonito volumen 3D
        const repulsion = esInmersivo ? -180 : -75;
        const distanciaEnlaces = esInmersivo ? (55 + (n * 3)) : (25 + (n * 2));

        grafo3D.d3Force('charge').strength(repulsion);
        grafo3D.d3Force('link').distance(distanciaEnlaces);

        // Distancia de cámara adaptativa: Alejada suficiente para que NO SE CORTEN los nodos en el inicio
        setTimeout(() => {
            const distCamara = esInmersivo ? (170 + (n * 16)) : (160 + (n * 28));
            grafo3D.cameraPosition(
                { x: 0, y: 0, z: distCamara },
                { x: 0, y: 0, z: 0 },
                600
            );
        }, 200);
    }
}

// 3. INICIALIZAR ESCENARIO 3D CON ORIENTACIÓN FIJA
function inicializarRed3D() {
    const contenedor = document.getElementById('contenedor-3d');
    if (!contenedor) return;

    contenedor.innerHTML = ''; 
    const nInicial = parseInt(document.getElementById('num-nodos')?.value) || 3;
    const THREE = window.THREE;

    grafo3D = ForceGraph3D()(contenedor)
        .width(contenedor.clientWidth || 400)
        .height(contenedor.clientHeight || 400)
        .graphData(datosRed)
        .nodeLabel('nombre')
        .backgroundColor('rgba(0,0,0,0)')
        .showNavInfo(false)
        .enableNavigationControls(true)
        .enableNodeDrag(true)

        .nodeThreeObject(node => {
            let textura, dimensiones, colorLateral;

            if (node.tipo === 'pc') {
                textura = crearTexturaPCCliente();
                colorLateral = 0x1d4ed8;
                dimensiones = [10, 8, 4];
            } else if (node.tipo === 'balanceador') {
                textura = crearTexturaBalanceador();
                colorLateral = 0x3d1d03;
                dimensiones = [9, 18, 9];
            } else {
                textura = crearTexturaServidor();
                colorLateral = 0x0f1d30;
                dimensiones = [7, 14, 7];
            }

            const materialLateral = new THREE.MeshStandardMaterial({ color: colorLateral, metalness: 0.8, roughness: 0.3 });
            const materialFrontal = new THREE.MeshStandardMaterial({ map: textura });
            const materialTrasero = new THREE.MeshStandardMaterial({ color: 0x080e18, metalness: 0.9, roughness: 0.5 });

            const materiales = [
                materialLateral, materialLateral, 
                materialLateral, materialLateral, 
                materialFrontal, materialTrasero 
            ];

            const geometria = new THREE.BoxGeometry(...dimensiones);
            const malla = new THREE.Mesh(geometria, materiales);

            malla.userData = { materialLateral: materialLateral, tipo: node.tipo };
            return malla;
        })

        // RENDERIZADO DE PARTÍCULAS
        .linkColor(link => {
            if (link.esTragicoCliente || link.source.id === 'pc' || link.source === 'pc') return 'rgba(59, 130, 246, 0.4)';
            if (link.source.id === 0 || link.source === 0) return 'rgba(255, 94, 0, 0.3)';
            return 'rgba(255, 255, 255, 0.08)';
        })
        .linkDirectionalParticles(3)
        .linkDirectionalParticleWidth(4.5)
        .linkDirectionalParticleColor(link => {
            if (link.esTragicoCliente || link.source.id === 'pc' || link.source === 'pc') return '#ea4335';
            if (link.source.id === 0 || link.source === 0) return '#ff5e00';
            return '#00ffcc';
        })
        .linkDirectionalParticleSpeed(0.004);

    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.85);
    grafo3D.scene().add(luzAmbiente);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 1.2);
    luzDireccional.position.set(0, 20, 25);
    grafo3D.scene().add(luzDireccional);

    actualizarTopologia(nInicial);
}

function activarModoInmersivo3D() {
    const contenedor = document.getElementById('contenedor-3d');
    const btnCerrar = document.getElementById('btn-cerrar-3d');
    const panelTelemetria = document.getElementById('telemetria');
    const overlayGlass = document.getElementById('overlay-glass');

    // Mover contenedor 3D al body
    if (contenedor) {
        padreOriginal3D = contenedor.parentNode;
        siguienteHermano3D = contenedor.nextSibling;
        document.body.appendChild(contenedor);
        contenedor.classList.add('modo-inmersivo-3d');
    }

    // Mover la Telemetría al body para que flote sobre el 3D
    if (panelTelemetria) {
        padreOriginalTelemetria = panelTelemetria.parentNode;
        siguienteHermanoTelemetria = panelTelemetria.nextSibling;
        document.body.appendChild(panelTelemetria);
        panelTelemetria.classList.remove('hidden');
        panelTelemetria.classList.add('telemetry-inmersiva');
    }

    if (overlayGlass) overlayGlass.classList.remove('hidden');
    if (btnCerrar) btnCerrar.classList.remove('hidden');

    setTimeout(() => {
        if (grafo3D) {
            const ancho = window.innerWidth;
            const alto = window.innerHeight;

            grafo3D.width(ancho);
            grafo3D.height(alto);

            if (grafo3D.camera()) {
                grafo3D.camera().aspect = ancho / alto;
                grafo3D.camera().updateProjectionMatrix();
            }

            const n = parseInt(document.getElementById('num-nodos')?.value) || 3;
            grafo3D.d3Force('charge').strength(-180);
            grafo3D.d3Force('link').distance(55 + (n * 3));
            grafo3D.d3ReheatSimulation();

            grafo3D.cameraPosition(
                { x: 0, y: 0, z: 170 + (n * 16) },
                { x: 0, y: 0, z: 0 },
                500
            );
        }
    }, 120);
}

function salirModoInmersivo3D() {
    const contenedor = document.getElementById('contenedor-3d');
    const btnCerrar = document.getElementById('btn-cerrar-3d');
    const panelTelemetria = document.getElementById('telemetria');
    const overlayGlass = document.getElementById('overlay-glass');

    // Devolver contenedor 3D a su posición original
    if (contenedor) {
        contenedor.classList.remove('modo-inmersivo-3d');
        if (padreOriginal3D) {
            if (siguienteHermano3D) {
                padreOriginal3D.insertBefore(contenedor, siguienteHermano3D);
            } else {
                padreOriginal3D.appendChild(contenedor);
            }
        }
    }

    // Devolver la Telemetría a su posición original y ocultarla
    if (panelTelemetria) {
        panelTelemetria.classList.add('hidden');
        panelTelemetria.classList.remove('telemetry-inmersiva');
        if (padreOriginalTelemetria) {
            if (siguienteHermanoTelemetria) {
                padreOriginalTelemetria.insertBefore(panelTelemetria, siguienteHermanoTelemetria);
            } else {
                padreOriginalTelemetria.appendChild(panelTelemetria);
            }
        }
    }

    if (overlayGlass) overlayGlass.classList.add('hidden');
    if (btnCerrar) btnCerrar.classList.add('hidden');

    setTimeout(() => {
        if (grafo3D && contenedor) {
            const ancho = contenedor.clientWidth || 400;
            const alto = contenedor.clientHeight || 400;

            grafo3D.width(ancho);
            grafo3D.height(alto);

            if (grafo3D.camera()) {
                grafo3D.camera().aspect = ancho / alto;
                grafo3D.camera().updateProjectionMatrix();
            }

            const n = parseInt(document.getElementById('num-nodos')?.value) || 3;
            grafo3D.d3Force('charge').strength(-75);
            grafo3D.d3Force('link').distance(25 + (n * 2));
            grafo3D.d3ReheatSimulation();

            grafo3D.cameraPosition(
                { x: 0, y: 0, z: 160 + (n * 28) },
                { x: 0, y: 0, z: 0 },
                500
            );
        }
    }, 120);
}

// 4. ANIMACIÓN SECUENCIAL CON EFECTO DE ABSORCIÓN
function animarTopologia(historial) {
    activarModoInmersivo3D();
    let pasoActual = 0;

    const panelTelemetria = document.getElementById('telemetria');
    const txtIteracion = document.getElementById('telemetria-iteracion');
    const txtError = document.getElementById('telemetria-error');
    if (panelTelemetria) panelTelemetria.classList.remove('hidden');

    const totalPasos = historial.length;

    // FASE 1: CLIENTE ULTRARRÁPIDO
    if (grafo3D) {
        grafo3D.linkDirectionalParticleSpeed(link => {
            const esCliente = link.esTragicoCliente || link.source.id === 'pc' || link.source === 'pc';
            return esCliente ? 0.060 : 0.002;
        });
    }

    setTimeout(() => {
        const intervalo = setInterval(() => {
            if (pasoActual >= totalPasos) {
                clearInterval(intervalo);
                if (grafo3D) grafo3D.linkDirectionalParticleSpeed(0.004);
                return;
            }

            const paso = historial[pasoActual];
            const valoresDestino = paso.valores_nodos;

            if (txtIteracion) txtIteracion.innerText = paso.iteracion;
            if (txtError) txtError.innerText = paso.error.toFixed(6);

            const progreso = pasoActual / Math.max(totalPasos - 1, 1);
            const velocidadServidores = 0.050 - (progreso * 0.045);

            if (grafo3D) {
                grafo3D.linkDirectionalParticleSpeed(link => {
                    const esCliente = link.esTragicoCliente || link.source.id === 'pc' || link.source === 'pc';
                    return esCliente ? 0.040 : velocidadServidores;
                });
            }

            const posicionesBase = datosRed.nodes.map(n => ({ x: n.x || 0, y: n.y || 0, z: n.z || 0 }));

            let frameVibracion = 0;
            const duracionVibracion = 30;

            function hacerVibrarYAbsorber() {
                if (frameVibracion < duracionVibracion) {
                    const atenuacion = 1 - (frameVibracion / duracionVibracion);

                    datosRed.nodes.forEach((nodo, idx) => {
                        if (nodo.__threeObj) {
                            const esServidor = nodo.tipo === 'servidor';

                            // PULSO DE ABSORCIÓN (CRECIMIENTO Y CONTRACCIÓN DE TAMAÑO)
                            const factorEscala = 1.0 + (Math.sin((frameVibracion / duracionVibracion) * Math.PI) * 0.18);
                            nodo.__threeObj.scale.set(factorEscala, factorEscala, factorEscala);

                            if (esServidor) {
                                const indiceServidor = idx - 2; 
                                const valorCalculado = valoresDestino[indiceServidor] || 0;
                                const carga = Math.abs(valorCalculado);

                                const userData = nodo.__threeObj.userData;
                                if (userData && userData.materialLateral) {
                                    if (carga > 8) {
                                        userData.materialLateral.color.setHex(0xff3b30);
                                    } else if (carga > 4) {
                                        userData.materialLateral.color.setHex(0xff9500);
                                    } else {
                                        userData.materialLateral.color.setHex(0x0f1d30);
                                    }
                                }

                                const intensidad = Math.min(carga * 0.05, 1.0) * atenuacion;
                                const offsetX = (Math.random() - 0.5) * intensidad;
                                const offsetY = (Math.random() - 0.5) * intensidad;
                                const offsetZ = (Math.random() - 0.5) * intensidad;

                                nodo.__threeObj.position.set(
                                    posicionesBase[idx].x + offsetX,
                                    posicionesBase[idx].y + offsetY,
                                    posicionesBase[idx].z + offsetZ
                                );
                            }
                        }
                    });

                    frameVibracion++;
                    requestAnimationFrame(hacerVibrarYAbsorber);
                } else {
                    datosRed.nodes.forEach((nodo, idx) => {
                        if (nodo.__threeObj) {
                            nodo.__threeObj.scale.set(1, 1, 1);
                            nodo.__threeObj.position.set(posicionesBase[idx].x, posicionesBase[idx].y, posicionesBase[idx].z);
                        }
                    });
                }
            }

            hacerVibrarYAbsorber();
            pasoActual++;
        }, 1000); 
    }, 600); 
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarRed3D);
} else {
    inicializarRed3D();
}