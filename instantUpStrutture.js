function UpFree(winMain, winSide, url = null) {
    return winMain.webContents.executeJavaScript(`
        (async function() {
            let hasClicked = false;
            try {
                let upFree = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                if (!upFree) {
                    throw new Error("Elemento non trovato.");
                }
                const dataAvailableFrom = parseInt(upFree.getAttribute('data-available-from') * 1000);
                const currentTime = Date.now();
                let delay = dataAvailableFrom - currentTime + 7000;
                if (delay > 0) {
                    return delay;
                } else {
                        throw new Error("Delay negativo o troppo basso.");
                }
            } catch (err) {
                return { delay: null, message: "Errore esecuzione: " + err.message };
            }
        })();
    `).then(result => {
        if (typeof result === "number") {
            let delay = result;

            if (delay > 7000 && url) {
                setTimeout(() => {
                    console.log("Carico la pagina:", url);
                    winMain.loadURL(url);
                }, delay - 7000);
            } else {
                console.warn("Delay troppo basso per cambiare URL prima dell'azione.");
            }

            if (delay > 2000) {
                setTimeout(() => {
                    winMain.webContents.executeJavaScript(`
                        (function() {
                            let upFreeClick = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                            if (upFreeClick) {
                                upFreeClick.click();
                                console.log("Click eseguito su upFree!");
                            } else {
                                console.log("Elemento non trovato al momento del click.");
                            }
                        })();
                    `);
                }, delay - 2000);
            } else {
                console.warn("Delay troppo basso per eseguire il click.");
            }

            return handleUpFreeResult({ delay, message: "Attendo " + delay + " ms per il click." }, winSide, winMain);
        } else {
            return handleUpFreeResult(result, winSide, winMain);
        }
    }).catch(err => handleUpFreeResult({ delay: null, message: "Errore esecuzione UpFree" }, winSide));
};

function handleUpFreeResult(result, winSide, winMain) {
    try {
        const { delay, message } = result;
        const remainingDelay = Number(delay) || 0;
        console.log("remainingDelay: " + remainingDelay);
        if (remainingDelay > 0) {
            winSide.webContents.send('update-delay', { delay: remainingDelay, message });
        } else {
            setTimeout(() => {
                winMain.webContents.executeJavaScript(`
                    (function() {
                        let upFree = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                        if (!upFree) return null;
                        const dataAvailableFrom = parseInt(upFree.getAttribute('data-available-from')) * 1000;
                        console.log("Nuovo delay calcolato:", dataAvailableFrom, "Current Time:", Date.now());
                        return dataAvailableFrom - Date.now() + 7000;
                    })();
                `).then(nuovoDelay => {
                    const prossimoDelay = Number(nuovoDelay) || 0;
                    console.log("prossimoDelay" + prossimoDelay);
                    
                    winSide.webContents.send('update-delay', { delay: prossimoDelay, message: "Nuovo delay calcolato" });
                    if (prossimoDelay > 0) {
                        UpFree(winMain, winSide, url);
                    }
                }).catch(err => {
                    console.error("Errore durante il recupero del nuovo delay:", err);
                });
            }, 2000);
        };
    } catch (err) {
        console.error("Errore nel parsing JSON di UpFree:", err);
    };
};

module.exports = { UpFree };