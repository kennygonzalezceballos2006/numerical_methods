// frontend/js/navegacion.js

window.metodoSeleccionado = 'gauss-seidel';

document.addEventListener('DOMContentLoaded', () => {
    const btnSiguiente = document.getElementById('btn-siguiente');
    const tituloMetodo = document.getElementById('titulo-metodo');
    const descripcionMetodo = document.getElementById('descripcion-metodo');
    const formulaContainer = document.getElementById('formula-container');

    let vistaActual = 0; // 0 = Gauss-Seidel, 1 = Jacobi

    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', (e) => {
            e.preventDefault();

            if (vistaActual === 0) {
                // Cambiar a Jacobi
                if (tituloMetodo) tituloMetodo.innerHTML = 'Método<br>Jacobi';
                if (descripcionMetodo) {
                    descripcionMetodo.innerText = 'Este método utiliza los valores de la iteración anterior para calcular los nuevos. Es highly paralelizable, ideal para arquitecturas de red con múltiples procesadores trabajando en simultáneo.';
                }

                if (formulaContainer) {
                    formulaContainer.innerHTML = '$$ x_i^{(k+1)} = \\frac{1}{a_{ii}} \\left( b_i - \\sum_{j=1}^{i-1} a_{ij} x_j^{(k)} - \\sum_{j=i+1}^{n} a_{ij} x_j^{(k)} \\right) $$';
                }

                window.metodoSeleccionado = 'jacobi';
                vistaActual = 1;
            } else {
                // Cambiar a Gauss-Seidel
                if (tituloMetodo) tituloMetodo.innerHTML = 'Gauss<br>Seidel';
                if (descripcionMetodo) {
                    descripcionMetodo.innerText = 'A diferencia de Jacobi, este método inyecta los valores calculados inmediatamente en la siguiente ecuación, reduciendo las iteraciones. Ideal para balanceo de carga en controladores SDN.';
                }

                if (formulaContainer) {
                    formulaContainer.innerHTML = '$$ x_i^{(k+1)} = \\frac{1}{a_{ii}} \\left( b_i - \\sum_{j=1}^{i-1} a_{ij} x_j^{(k+1)} - \\sum_{j=i+1}^{n} a_{ij} x_j^{(k)} \\right) $$';
                }

                window.metodoSeleccionado = 'gauss-seidel';
                vistaActual = 0;
            }

            // Renderizar notación KaTeX de forma segura
            if (formulaContainer && typeof renderMathInElement === 'function') {
                renderMathInElement(formulaContainer, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false }
                    ],
                    throwOnError: false
                });
            }
        });
    }
});