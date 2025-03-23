document.addEventListener('DOMContentLoaded', function() {
    const whitelistedEmails = [
        'corredor@email.com'
    ];

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const errorMessage = document.getElementById('error-message');

    // Verificar se já está logado
    const loggedInEmail = localStorage.getItem('userEmail');
    if (loggedInEmail) {
        window.location.href = 'home.html';
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim().toLowerCase();
        
        if (whitelistedEmails.includes(email)) {
            // E-mail na whitelist, armazenar e redirecionar
            localStorage.setItem('userEmail', email);
            window.location.href = 'home.html';
        } else {
            // E-mail não autorizado
            errorMessage.textContent = 'E-mail não autorizado. Por favor, use um e-mail registrado.';
            
            // Animação de shake no input
            emailInput.classList.add('error');
            setTimeout(() => {
                emailInput.classList.remove('error');
            }, 500);
        }
    });
});
