const { executeAfterLoad } = require('./funzione');

let didLogin = false; 

function login(winMain) {
    return new Promise((resolve, reject) => {
        if (didLogin) return resolve();
        didLogin = true;

        console.log("Inizio login...");

        winMain.webContents.once('did-finish-load', () => {
            console.log("Pagina caricata, verifico elementi login...");
            winMain.webContents.executeJavaScript(`
                (function() {
                    let userInput = document.getElementById('user');
                    let passwordInput = document.getElementById('password');
                    let loginButton = document.querySelector('.btn-login');

                    console.log("DEBUG: userInput =", userInput);
                    console.log("DEBUG: passwordInput =", passwordInput);
                    console.log("DEBUG: loginButton =", loginButton);

                    if (userInput && passwordInput && loginButton) {
                        console.log("Campi di login trovati, inserisco dati...");
                        userInput.value = 'killer300';
                        passwordInput.value = 'Computernuovo30.';

                        setTimeout(() => {
                            console.log("Cliccando sul pulsante di login...");
                            loginButton.click();
                        }, 3000);
                    } else {
                        console.log("Gli elementi di login non sono stati trovati.");
                    }
                })();
            `).then(() => resolve()).catch(err => {
                console.error("Errore durante il login:", err);
                reject(err);
            });
        });

        console.log("Caricamento pagina di login...");
        winMain.webContents.loadURL('https://www.tribals.it/');
    });
}

function loginMondo91(winMain) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        let maxAttempts = 10;

        let interval = setInterval(async () => {
            try {
                let spans = await winMain.webContents.executeJavaScript(`
                    Array.from(document.querySelectorAll('.world_button_active')).map(span => span.innerText.trim());
                `);

                console.log("DEBUG: Mondi trovati:", spans);

                let mondo91 = spans.find(text => text.includes("Mondo 91"));

                if (mondo91) {
                    console.log("DEBUG: Mondo 91 trovato, cliccando...");
                    await winMain.webContents.executeJavaScript(`
                        document.querySelector('.world_button_active').click();
                    `);
                    clearInterval(interval);

                    winMain.webContents.once('did-finish-load', () => {
                        console.log("DEBUG: Pagina del mondo 91 caricata!");
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
            } catch (error) {
                clearInterval(interval);
                console.log("Errore durante la ricerca di Mondo 91:", error);
                reject(error);
            }
        }, 1000);
    });
}

module.exports = { login, loginMondo91 };