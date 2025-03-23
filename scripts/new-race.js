document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        window.location.href = 'index.html';
        return;
    }

    // Elementos da interface
    const backBtn = document.getElementById('back-btn');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const distanceElement = document.getElementById('distance');
    const speedElement = document.getElementById('speed');
    const timeElement = document.getElementById('time');
    const stepsElement = document.getElementById('steps');

    // Variáveis para controle da corrida
    let isRunning = false;
    let startTime;
    let elapsedTime = 0;
    let timerInterval;
    let coordinates = [];
    let currentPosition;
    let totalDistance = 0;
    let currentSpeed = 0;
    let stepCount = 0;
    let map, positionMarker, routeLine;

    // Inicializar o mapa
    initializeMap();

    // Botão de voltar
    backBtn.addEventListener('click', function() {
        if (isRunning) {
            if (confirm('Você tem uma corrida em andamento. Deseja realmente sair?')) {
                stopRun();
                window.location.href = 'home.html';
            }
        } else {
            window.location.href = 'home.html';
        }
    });

    // Botão de iniciar
    startBtn.addEventListener('click', function() {
        startRun();
    });

    // Botão de parar
    stopBtn.addEventListener('click', function() {
        stopRun();
        saveRun();
    });

    // Função para inicializar o mapa
    function initializeMap() {
        // Inicializar com uma posição padrão (será atualizada quando a localização for obtida)
        map = L.map('map').setView([-23.5505, -46.6333], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Solicitar a localização atual
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Centralizar mapa na posição atual
                map.setView([lat, lng], 16);
                
                // Criar o marcador de posição com efeito de pulso
                const pulseIcon = L.divIcon({
                    className: 'pulse-marker',
                    iconSize: [14, 14]
                });
                
                positionMarker = L.marker([lat, lng], {icon: pulseIcon}).addTo(map);
                currentPosition = {lat, lng};
            },
            function(error) {
                alert('Erro ao obter localização: ' + error.message);
            },
            {enableHighAccuracy: true}
        );
    }

    // Função para iniciar a corrida
    function startRun() {
        if (!currentPosition) {
            alert('Aguarde a obtenção da sua localização atual.');
            return;
        }
        
        isRunning = true;
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        
        startTime = Date.now() - (elapsedTime * 1000);
        coordinates = [];
        coordinates.push(currentPosition);
        
        // Iniciar linha da rota
        routeLine = L.polyline([
            [currentPosition.lat, currentPosition.lng]
        ], {color: 'var(--primary-color)', weight: 4}).addTo(map);
        
        // Iniciar o cronômetro
        timerInterval = setInterval(updateTimer, 1000);
        
        // Iniciar rastreamento de localização
        watchLocation();
        
        // Iniciar detecção de passos
        setupStepDetection();
    }

    // Função para parar a corrida
    function stopRun() {
        isRunning = false;
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        
        // Parar cronômetro
        clearInterval(timerInterval);
        
        // Parar sensores
        if (window.watchId) {
            navigator.geolocation.clearWatch(window.watchId);
        }
        window.removeEventListener('devicemotion', stepDetection);
    }

    // Função para acompanhar a localização
    function watchLocation() {
        window.watchId = navigator.geolocation.watchPosition(
            function(position) {
                if (!isRunning) return;
                
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const newPos = {lat, lng};
                
                // Atualizar marcador e linha
                positionMarker.setLatLng([lat, lng]);
                
                // Calcular distância e atualizar linha de rota
                if (currentPosition) {
                    const segmentDistance = calculateDistance(
                        currentPosition.lat, currentPosition.lng,
                        lat, lng
                    );
                    
                    // Se a distância é grande demais, pode ser um erro do GPS
                    if (segmentDistance < 0.05) { // menos de 50m de uma vez
                        totalDistance += segmentDistance;
                        
                        // Atualizar elementos da interface
                        distanceElement.textContent = totalDistance.toFixed(2) + ' km';
                        
                        // Adicionar ponto à linha de rota
                        routeLine.addLatLng([lat, lng]);
                        
                        // Centralizar mapa na posição atual
                        map.setView([lat, lng]);
                    }
                }
                
                // Calcular velocidade (km/h)
                if (position.coords.speed) {
                    currentSpeed = position.coords.speed * 3.6; // m/s para km/h
                } else {
                    // Estimativa de velocidade baseada na distância/tempo
                    currentSpeed = totalDistance / (elapsedTime / 3600);
                }
                
                speedElement.textContent = currentSpeed.toFixed(1) + ' km/h';
                
                // Armazenar posição atual
                currentPosition = newPos;
                coordinates.push(newPos);
            },
            function(error) {
                console.error('Erro no watchPosition:', error);
            },
            {enableHighAccuracy: true, maximumAge: 0, timeout: 5000}
        );
    }

    // Função para atualizar o cronômetro
    function updateTimer() {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        timeElement.textContent = formatTime(elapsedTime);
    }

    // Função para configurar a detecção de passos
    function setupStepDetection() {
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', stepDetection);
        } else {
            console.log('DeviceMotion não suportado neste dispositivo');
        }
    }

    // Função para detectar passos usando acelerômetro
    let lastAccel = {x: 0, y: 0, z: 0};
    let accelThreshold = 10; // Ajuste conforme necessário
    let lastStepTime = 0;
    const minStepInterval = 250; // Mínimo de 250ms entre passos
    
    function stepDetection(event) {
        if (!isRunning) return;
        
        const now = Date.now();
        const accel = event.accelerationIncludingGravity;
        
        if (!accel) return;
        
        // Calcular magnitude da mudança
        const deltaX = Math.abs(accel.x - lastAccel.x);
        const deltaY = Math.abs(accel.y - lastAccel.y);
        const deltaZ = Math.abs(accel.z - lastAccel.z);
        
        const magnitude = Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ);
        
        // Detectar passo baseado na aceleração
        if (magnitude > accelThreshold && (now - lastStepTime) > minStepInterval) {
            stepCount++;
            stepsElement.textContent = stepCount;
            lastStepTime = now;
        }
        
        lastAccel = {x: accel.x, y: accel.y, z: accel.z};
    }

    // Função para calcular distância entre duas coordenadas
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raio da terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Função para salvar a corrida
    function saveRun() {
        if (coordinates.length < 2) {
            alert('Corrida muito curta para ser salva.');
            return;
        }
        
        const race = {
            date: new Date().toISOString(),
            distance: totalDistance,
            duration: elapsedTime,
            avgSpeed: currentSpeed,
            steps: stepCount,
            path: coordinates
        };
        
        // Recuperar corridas salvas
        const savedRaces = JSON.parse(localStorage.getItem('races')) || [];
        savedRaces.push(race);
        
        // Salvar no localStorage
        localStorage.setItem('races', JSON.stringify(savedRaces));
        
        alert('Corrida salva com sucesso!');
        window.location.href = 'home.html';
    }

    // Função para formatar o tempo
    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
});
