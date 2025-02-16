function UpFree(winMain, winSide, url = null) {
    return winMain.webContents.executeJavaScript(`
        (async function() {
            let hasClicked = false;
            try {
                let upFree = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                if (!upFree) {
                    throw new Error("Elemento non trovato.");
                }
                const dataAvailableFrom = parseInt(upFree.getAttribute('data-available-from')) * 1000;
                const currentTime = Date.now();
                let delay = dataAvailableFrom - currentTime + 1000;

                if (delay > 0) {
                    setTimeout(() => {
                        let upFreeClick = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                        if (upFreeClick && !hasClicked) {
                            hasClicked = true;
                            upFreeClick.click();  // Aggiungi qui un ulteriore setTimeout per ritardare il click di 1 secondo
                            console.log("Click eseguito su upFree!");
                        } else {
                            console.log("Elemento non trovato al momento del click.");
                        }
                    }, delay + 2000);
                    setTimeout(() => {
                        console.log("Carico la pagina:", url);
                        winMain.loadURL(url);
                    }, delay - 5000);
                }
                return { delay, message: "Attendo " + delay + " ms per il click." };
            } catch (err) {
                return { delay: null, message: "Errore esecuzione: " + err.message };
            }
        })();
    `).then(result => handleUpFreeResult(result, winSide, winMain, url))
    .catch(err => handleUpFreeResult({ delay: null, message: "Errore esecuzione UpFree" }, winSide, winMain, url));
};

function handleUpFreeResult(result, winSide, winMain, url = null) {
    try {
        const { delay, message } = result;
        const remainingDelay = Number(delay) || 0;
        winSide.webContents.send('update-delay', { delay: remainingDelay, message });
        updateDelayUI(remainingDelay, winSide, winMain, url);
    } catch (err) {
        console.error("Errore nel parsing JSON di UpFree:", err);
        winSide.webContents.send('update-delay', { delay: null, message: "Errore esecuzione UpFree" });
    };
};

function updateDelayUI(remainingDelay, winSide, winMain, url = null) {
    let lastUpdatedTime = Date.now();
    function update() {
        const now = Date.now();
        const elapsedTime = now - lastUpdatedTime;
        lastUpdatedTime = now;

        if (remainingDelay > 5000) {
            remainingDelay -= Math.min(elapsedTime, 1000);
            winSide.webContents.send('update-delay', { delay: remainingDelay });
            setTimeout(update, 1000);
        } else if (remainingDelay > 1000) {
            remainingDelay -= Math.min(elapsedTime, 1000);
            setTimeout(update, 1000);
        } else {
            winSide.webContents.send('update-delay', { delay: 0, message: "Subito disponibile" });
        };
    };
    update();
};

module.exports = { UpFree };