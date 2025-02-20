const { executeAfterLoad } = require('./funzione');

let didLogin = false; 

function login(winMain) {
    return new Promise((resolve, reject) => {
        if (didLogin) return resolve();
        didLogin = true;

        winMain.webContents.once('did-finish-load', () => {
            winMain.webContents.executeJavaScript(`
                (function() {
                    let userInput = document.getElementById('user');
                    let passwordInput = document.getElementById('password');
                    let loginButton = document.querySelector('.btn-login');

                    if (userInput && passwordInput && loginButton) {
                        userInput.value = 'killer300';
                        passwordInput.value = 'Computernuovo30.';

                        setTimeout(() => {
                            loginButton.click();
                        }, 3000);
                    }
                })();
            `).then(() => resolve()).catch(err => {
                console.error("Errore durante il login:", err);
                reject(err);
            });
        });
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

                let mondo91 = spans.find(text => text.includes("Mondo 91"));

                if (mondo91) {
                    await winMain.webContents.executeJavaScript(`
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
                        reject('Mondo 91 non trovato');
                    }
                }
            } catch (error) {
                clearInterval(interval);
                reject(error);
            }
        }, 1000);
    });
}

module.exports = { login, loginMondo91 };