(() => {
    "use strict";

    const ENGINE_URL =
        "https://raw.githubusercontent.com/paulo870/poliglota-games-source/main/poliglota-games-source.html";

    const GAME_NAMES = {
        stop: "Categories",
        round: "PoliglotAround",
        grad: "Word Ladder",
        box: "Mind Box"
    };

    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("game");

    const frame = document.getElementById("game-frame");
    const loading = document.getElementById("game-loading");
    const errorBox = document.getElementById("game-error");
    const title = document.getElementById("game-title");
    const closeButton = document.getElementById("close-game");

    function closeGame() {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: "POLIGLOTA_LESSON_GAME_CLOSE" },
                window.location.origin
            );
        } else {
            window.history.back();
        }
    }

    closeButton.addEventListener("click", closeGame);

    function showError(message) {
        loading.hidden = true;
        errorBox.hidden = false;
        errorBox.textContent = message;
    }

    async function loadGame() {
        if (!GAME_NAMES[gameId]) {
            showError("Invalid game selection.");
            return;
        }

        title.textContent = GAME_NAMES[gameId];

        try {
            const response = await fetch(ENGINE_URL, {
                cache: "no-cache"
            });

            if (!response.ok) {
                throw new Error("Unable to retrieve the game engine.");
            }

            let engineHTML = await response.text();

            /*
             * The existing engine has a scrDemo(gid) function.
             * This launches the selected game in one-player practice mode.
             */
            const bootstrap = `
                <script>
                    window.addEventListener("load", function () {
                        const selectedGame = ${JSON.stringify(gameId)};

                        function launchLessonGame() {
                            if (typeof scrDemo === "function") {
                                scrDemo(selectedGame);
                            } else {
                                document.body.innerHTML =
                                    "<div style='padding:30px;font-family:Arial;color:#b00020'>" +
                                    "The game could not be started. The game engine function was not found." +
                                    "</div>";
                            }
                        }

                        setTimeout(launchLessonGame, 500);
                    });
                <\/script>
            `;

            if (engineHTML.includes("</body>")) {
                engineHTML = engineHTML.replace(
                    "</body>",
                    bootstrap + "</body>"
                );
            } else {
                engineHTML += bootstrap;
            }

            frame.srcdoc = engineHTML;

            frame.addEventListener("load", () => {
                loading.hidden = true;
            }, { once: true });

        } catch (error) {
            console.error("Lesson game error:", error);
            showError(
                "The game could not be loaded. Please check your internet connection and try again."
            );
        }
    }

    loadGame();
})();
