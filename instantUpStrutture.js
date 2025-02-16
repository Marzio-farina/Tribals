function UpFree(winMain, winSide, url = null) {
    return winMain.webContents.executeJavaScript(`
        (async function() {
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
                        if (upFreeClick) {
                            setTimeout(() => {
                                upFreeClick.click();  // Aggiungi qui un ulteriore setTimeout per ritardare il click di 1 secondo
                                console.log("Click eseguito su upFree!");
                            }, 2000);
                        } else {
                            console.log("Elemento non trovato al momento del click.");
                        }
                    }, delay);
                } else {
                    setTimeout(() => {
                        upFree.click();
                    }, 2000);
                }
                return { delay, message: "Attendo " + delay + " ms per il click." };
            } catch (err) {
                return { delay: null, message: "Errore esecuzione: " + err.message };
            }
        })();
    `).then(result => handleUpFreeResult(result, winSide, winMain, url))
    .catch(err => handleUpFreeResult({ delay: null, message: "Errore esecuzione UpFree" }, winSide, winMain, url));
}

function handleUpFreeResult(result, winSide, winMain, url = null) {
    try {
        const { delay, message } = result;
        const remainingDelay = Number(delay) || 0;
        winSide.webContents.send('update-delay', { delay: remainingDelay, message });
        updateDelayUI(remainingDelay, winSide, winMain, url);
    } catch (err) {
        console.error("Errore nel parsing JSON di UpFree:", err);
        winSide.webContents.send('update-delay', { delay: null, message: "Errore esecuzione UpFree" });
    }
}

function updateDelayUI(remainingDelay, winSide, winMain, url = null) {
    function update() {
        if (remainingDelay > 5000) {
            remainingDelay -= 1000;
            winSide.webContents.send('update-delay', { delay: remainingDelay });
            setTimeout(update, 1000);
        } else if (remainingDelay > 1000) {
            console.log("Carico la pagina:", url);
            winMain.loadURL(url);
            remainingDelay -= 1000;
            setTimeout(update, 1000);
        } else {
            setTimeout(() => {
                winMain.webContents.executeJavaScript(`
                    (async function() {
                        function waitForElement(selector, timeout = 5000) {
                            return new Promise((resolve, reject) => {
                                const interval = 500;
                                let elapsed = 0;

                                function check() {
                                    const element = document.querySelector(selector);
                                    if (element) {
                                        return resolve(element);
                                    }
                                    elapsed += interval;
                                    if (elapsed < timeout) {
                                        setTimeout(check, interval);
                                    } else {
                                        reject(new Error("Elemento non trovato: " + selector));
                                    }
                                }
                                check();
                            });
                        }

                        try {
                            let upFreeClick = document.querySelector('#buildqueue .lit.nodrag .lit-item .order_feature.btn.btn-btr.btn-instant-free');
                            if (upFreeClick) {
                                upFreeClick.click();
                                console.log("Click eseguito su upFree dopo il caricamento della pagina!");
                                
                                await waitForElement('#buildqueue .lit.nodrag .lit-item', 5000);
                                console.log("Nuovo elemento trovato, pronto per il prossimo ciclo.");
                                return { status: "success", message: "Prossimo elemento pronto" };
                            } else {
                                console.log("Elemento non trovato dopo il caricamento.");
                                return { status: "error", message: "Elemento non disponibile dopo il caricamento." };
                            }
                        } catch (err) {
                            return { status: "error", message: "Errore nell'esecuzione: " + err.message };
                        }
                    })();
                `).then(result => {
                    console.log("Risultato esecuzione:", result);
                    if (result.status === "success") {
                        setTimeout(() => {
                            UpFree(winMain, winSide, url);
                        }, 10000);
                    }
                }).catch(err => console.error("Errore nel ciclo UpFree:", err));
            }, 1000);
            
            winSide.webContents.send('update-delay', { delay: 0, message: "Subito disponibile" });
        }
    }
    update();
}

module.exports = { UpFree };