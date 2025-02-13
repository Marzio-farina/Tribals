const { ipcRenderer } = require('electron');

ipcRenderer.once('openQg', (event, data) => {
    if (!data) {
        console.error("Errore: ricevuto 'openQg' senza dati validi.");
        return;
    }
    const { villaggio, struttura } = data;
    const url = `https://it91.tribals.it/game.php?village=${villaggio}&screen=${struttura}`;
    window.location.href = url;
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.__updateInterval) {
        clearInterval(window.__updateInterval);
    }
    window.__updateInterval = setInterval(() => {
        ipcRenderer.invoke('get-strutture')
            .then(listaCoda)
            .catch(error => console.error("Errore aggiornamento strutture:", error));
    }, 5000);
});

function listaCoda(livelliStrutture) {
    const containerInCoda = document.getElementById("containerInCoda");
    const containerAttivi = document.getElementById("containerAttivi");

    const struttureInCoda = livelliStrutture.struttureInCoda || [];
    const struttureInCorso = livelliStrutture.struttureInCorso || {};

    // console.log("Strutture in coda:", struttureInCoda);
    // console.log("Altre strutture:", struttureInCorso);

    containerInCoda.innerHTML = '';
    containerAttivi.innerHTML = '';

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

    if (Object.keys(struttureInCorso).length > 0) {
        Object.entries(struttureInCorso).forEach(([nome, livello]) => {
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
                    <div class="d-flex align-items-end mb-1 delay-info" style="width: 75px">
                        <span>In attesa...</span>
                    </div>
                </div>
            `;
            containerAttivi.appendChild(div);
        });

        console.log("Strutture generate, avvio aggiornamento delay...");
        setTimeout(aggiornaDelay, 500);
    }
}