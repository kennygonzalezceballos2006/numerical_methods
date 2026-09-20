// frontend/js/navegacion.js

document.addEventListener('DOMContentLoaded', () => {
    const btnSiguiente = document.getElementById('btn-siguiente');
    const tituloMetodo = document.getElementById('titulo-metodo');
    const descripcionMetodo = document.getElementById('descripcion-metodo');
    const formulaContainer = document.getElementById('formula-container');
    
    let vistaActual = 0;

    btnSiguiente.addEventListener('click', () => {
        if (vistaActual === 0) {
            // Cambiamos a la vista de Jacobi
            tituloMetodo.innerHTML = 'Método<br>Jacobi';
            descripcionMetodo.innerText = 'Este método utiliza los valores de la iteración anterior para calcular los nuevos. Es altamente paralelizable, ideal para arquitecturas de red con múltiples procesadores trabajando en simultáneo.';
            
            // Fórmula de Jacobi (Nota que todas las variables x a la derecha usan 'k')
            formulaContainer.innerHTML = '$$ x_i^{(k+1)} = \\frac{1}{a_{ii}} \\left( b_i - \\sum_{j=1}^{i-1} a_{ij} x_j^{(k)} - \\sum_{j=i+1}^{n} a_{ij} x_j^{(k)} \\right) $$';
            
            vistaActual = 1;
        } else {
            // Volvemos a Gauss-Seidel
            tituloMetodo.innerHTML = 'Gauss<br>Seidel';
            descripcionMetodo.innerText = 'A diferencia de Jacobi, este método inyecta los valores calculados inmediatamente en la siguiente ecuación, reduciendo las iteraciones. Ideal para balanceo de carga en controladores SDN.';
            
            // Fórmula de Gauss-Seidel (La primera sumatoria usa 'k+1')
            formulaContainer.innerHTML = '$$ x_i^{(k+1)} = \\frac{1}{a_{ii}} \\left( b_i - \\sum_{j=1}^{i-1} a_{ij} x_j^{(k+1)} - \\sum_{j=i+1}^{n} a_{ij} x_j^{(k)} \\right) $$';
            
            vistaActual = 0;
        }

        // Le decimos a KaTeX que vuelva a transformar el texto nuevo en matemáticas
        renderMathInElement(formulaContainer);
    });
});