const { executeAfterLoad } = require('./funzione');

let didLogin = false; 

function login(winMain) {
    return new Promise((resolve, reject) => {
        if (didLogin) return resolve();
        didLogin = true;

        console.log("Inizio login...");

        // Aspetta che la pagina sia completamente caricata prima di eseguire il codice di login
        winMain.webContents.once('did-finish-load', () => {
            executeAfterLoad(winMain, `
                try {
                    let userInput = document.getElementById('user');
                    let passwordInput = document.getElementById('password');
                    let loginButton = document.querySelector('.btn-login');

                    console.log(userInput, passwordInput, loginButton);  // Log degli elementi trovati

                    if (userInput && passwordInput && loginButton) {
                        console.log("Campi di login trovati.");
                        userInput.value = 'killer300';
                        passwordInput.value = 'Computernuovo30.';
                        setTimeout(() => {
                            console.log("Cliccando sul pulsante di login...");
                            loginButton.click();
                        }, 3000); // Timeout più lungo
                    } else {
                        console.log("Gli elementi di login non sono ancora disponibili.");
                        reject('Gli elementi di login non sono ancora disponibili');
                    }
                } catch (error) {
                    console.log("Errore durante l'esecuzione dello script:", error);
                    reject(error);
                }
            `);
        });

        // Fase di carico iniziale
        winMain.webContents.loadURL('URL della pagina di login');
    });
}

function loginMondo91(winMain) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        let maxAttempts = 10;

        let interval = setInterval(() => {
            try {
                let spans = winMain.webContents.executeJavaScript(`
                    Array.from(document.querySelectorAll('.world_button_active')).map(span => span.innerText.trim());
                `);

                spans.then(texts => {
                    let mondo91 = texts.find(text => text === "Mondo 91");

                    if (mondo91) {
                        winMain.webContents.executeJavaScript(`
                            document.querySelector('.world_button_active').click();
                        `);
                        clearInterval(interval);

                        winMain.webContents.once('did-finish-load', () => {
                            resolve();
                        });
                    } else {
                        attempts++;
                        if (attempts >= maxAttempts) {
                            clearInterval(interval);
                            console.log("Mondo 91 non trovato.");
                            reject('Mondo 91 non trovato');
                        }
                    }
                }).catch(error => {
                    clearInterval(interval);
                    console.log("Errore durante la ricerca di Mondo 91:", error);
                    reject(error);
                });

            } catch (error) {
                clearInterval(interval);
                console.log("Errore durante l'esecuzione dello script:", error);
                reject(error);
            }
        }, 500);
    });
}

module.exports = { login, loginMondo91 };