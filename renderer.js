const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    if (window.__updateInterval) {
        clearInterval(window.__updateInterval);
    };
    window.__delay = 0;

    window.__updateInterval = setInterval(() => {
        ipcRenderer.invoke('get-strutture')
            .then(listaCoda)
            .catch(error => console.error("Errore aggiornamento strutture:", error));
    }, 1000);

    ipcRenderer.on('update-delay', (event, data) => {
        window.__delay = data.delay || 0;
        aggiornaDelayUI();
    });

    function aggiornaUIContinuamente() {
        if (window.__delay > 0) {
            window.__delay -= 1000;
            aggiornaDelayUI();
        } else if (window.__delay === 0) {
            aggiornaDelayUI();
        }
        setTimeout(aggiornaUIContinuamente, 1000);
    }
    aggiornaUIContinuamente();
});

function formattaDelay(delay) {
    const ore = Math.floor(delay / 3600);
    const minuti = Math.floor((delay % 3600) / 60);
    const secondi = delay % 60;
    
    return `${ore.toString().padStart(2, '0')}:${minuti.toString().padStart(2, '0')}:${secondi.toString().padStart(2, '0')}`;
}

function aggiornaDelayUI() {
    const delayInfoElements = document.querySelectorAll('.delay-info span');
    delayInfoElements.forEach(span => {
        span.textContent = window.__delay > 0 
            ? formattaDelay(Math.round(window.__delay / 1000))
            : "Subito disponibile";
    });
}

function listaCoda(livelliStrutture) {
    const containerInCoda = document.getElementById("containerInCoda");
    const containerAttivi = document.getElementById("containerAttivi");
    const struttureInCoda = livelliStrutture.struttureInCoda || [];
    const struttureInCorso = livelliStrutture.struttureInCorso || [];

    if (!containerInCoda || !containerAttivi) {
        console.error("Uno o più container non trovati nella finestra laterale.");
    } else {
        containerInCoda.innerHTML = '';
        containerAttivi.innerHTML = '';
    }

    if (struttureInCoda.length > 0) {
        struttureInCoda.forEach(({ nome, livello }) => {
            const div = document.createElement("div");
            div.className = "m-3 border-bottom border-top border-secondary";
            div.innerHTML = `
                <div class="mx-2 d-flex justify-content-between">
                    <div class="d-flex justify-content-center align-items-center">
                        <img src="./icone/${nome.toLowerCase().replace(/\s/g, '')}.png" 
                        alt="${nome}" style="max-width: 65px;">
                    </div>                
                    <div class="w-75">
                        <h5>${nome}</h5>
                        <h6>Lv. ${livello}</h6>
                    </div>
                </div>
            `;
            containerInCoda.appendChild(div);
        });
    } else {
        console.log("Nessuna struttura in coda.");
    }

    if (struttureInCorso.length > 0) {
        let delaySpanCreated = false;
        struttureInCorso.forEach(({ nome, livello }) => {
            const div = document.createElement("div");
            div.className = "m-3 border-bottom border-top border-secondary";
            div.innerHTML = `
                <div class="mx-2 d-flex justify-content-between">
                    <div class="d-flex justify-content-center align-items-center">
                        <img src="./icone/${nome.toLowerCase().replace(/\s/g, '')}.png" 
                        alt="${nome}" style="max-width: 65px;">
                    </div>                
                    <div style="width: 255px">
                        <h5>${nome}</h5>
                        <h6>Lv. ${livello}</h6>
                    </div>
                    ${!delaySpanCreated ? 
                        `<div class="d-flex align-items-end mb-1 delay-info" style="width: 75px">
                            <span>${window.__delay > 0 ? `${Math.round(window.__delay / 1000)} s` : "in corso"}</span>
                        </div>` 
                        : ''}
                </div>
            `;
            containerAttivi.appendChild(div);
            if (!delaySpanCreated) {
                delaySpanCreated = true;
            }
        });
        aggiornaDelayUI();
    } else {
        console.log("Nessuna struttura in corso.");
    }
}