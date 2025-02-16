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
                        console.log("Carico la pagina:", url);
                        winMain.loadURL(url);
                    }, delay - 5000);
                    setTimeout(() => {
                        let upFreeClick = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                        if (upFreeClick && !hasClicked) {
                            hasClicked = true;
                            upFreeClick.click();
                            console.log("Click eseguito su upFree!");
                        } else {
                            console.log("Elemento non trovato al momento del click.");
                        }
                    }, delay + 2000);
                }
                return { delay, message: "Attendo " + delay + " ms per il click." };
            } catch (err) {
                return { delay: null, message: "Errore esecuzione: " + err.message };
            }
        })();
    `).then(result => handleUpFreeResult(result, winSide, winMain))
    .catch(err => handleUpFreeResult({ delay: null, message: "Errore esecuzione UpFree" }, winSide));
};

function handleUpFreeResult(result, winSide, winMain) {
    try {
        const { delay, message } = result;
        const remainingDelay = Number(delay) || 0;
        if (remainingDelay > 0) {
            winSide.webContents.send('update-delay', { delay: remainingDelay, message });
        } else {
            setTimeout(() => {
                winMain.webContents.executeJavaScript(`
                    (function() {
                        let upFree = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                        if (!upFree) return null;
                        const dataAvailableFrom = parseInt(upFree.getAttribute('data-available-from')) * 1000;
                        return dataAvailableFrom;
                    })();
                `).then(nuovoDelay => {
                    const prossimoDelay = Number(nuovoDelay) || 0;
                    winSide.webContents.send('update-delay', { delay: prossimoDelay, message: "Nuovo delay calcolato" });
                }).catch(err => {
                    console.error("Errore durante il recupero del nuovo delay:", err);
                    winSide.webContents.send('update-delay', { delay: null, message: "Errore nel recupero del nuovo delay" });
                });
            }, 2000);
        };
    } catch (err) {
        console.error("Errore nel parsing JSON di UpFree:", err);
        winSide.webContents.send('update-delay', { delay: null, message: "Errore esecuzione UpFree" });
    };
};

module.exports = { UpFree };