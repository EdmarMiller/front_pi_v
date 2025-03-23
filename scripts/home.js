document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.href = 'index.html';
        return;
    }

    // Exibir e-mail do usuário
    const userEmailElement = document.getElementById('user-email');
    userEmailElement.textContent = userEmail.split('@')[0]; // Exibir apenas o nome de usuário

    // Botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
    });

    // Botão de nova corrida
    const newRaceBtn = document.getElementById('new-race-btn');
    newRaceBtn.addEventListener('click', function() {
        window.location.href = 'new-race.html';
    });

    // Carregar corridas anteriores
    loadRaces();
});

function loadRaces() {
    const racesContainer = document.getElementById('races-container');
    const storedRaces = JSON.parse(localStorage.getItem('races')) || [];
    
    if (storedRaces.length === 0) {
        // Exibir mensagem de "nenhuma corrida encontrada"
        return;
    }
    
    // Ordenar corridas por data (mais recente primeiro)
    storedRaces.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Limpar o container
    racesContainer.innerHTML = '';
    
    // Adicionar cada corrida
    storedRaces.forEach(race => {
        const card = document.createElement('div');
        card.className = 'race-card';
        
        // Formatar data
        const raceDate = new Date(race.date);
        const formattedDate = raceDate.toLocaleDateString('pt-BR') + ' • ' + 
                              raceDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        
        card.innerHTML = `
            <div class="race-date">${formattedDate}</div>
            <div class="race-stats">
                <div class="race-stat">
                    <span class="stat-label">Distância</span>
                    <span class="stat-value">${race.distance.toFixed(2)} km</span>
                </div>
                <div class="race-stat">
                    <span class="stat-label">Tempo</span>
                    <span class="stat-value">${formatTime(race.duration)}</span>
                </div>
                <div class="race-stat">
                    <span class="stat-label">Velocidade</span>
                    <span class="stat-value">${race.avgSpeed.toFixed(1)} km/h</span>
                </div>
                <div class="race-stat">
                    <span class="stat-label">Passos</span>
                    <span class="stat-value">${race.steps}</span>
                </div>
            </div>
        `;
        
        racesContainer.appendChild(card);
    });
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
