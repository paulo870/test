const CATEGORIES = [
    "Animal",
    "Food",
    "Country / Place",
    "Name",
    "Object"
];

const LETTERS = ["B", "C", "F", "M", "P", "S", "T", "R", "L", "D"];

const GAME_DURATION = 45;

let playerCount = 1;
let playerNames = ["Player 1", "Player 2", "Player 3"];

let selectedLetter = null;
let usedLetters = [];

let timerInterval = null;
let timeRemaining = GAME_DURATION;

let playerAnswers = [];
let playerScores = [];
let currentRound = 0;

const $ = id => document.getElementById(id);

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.add("hidden");
    });

    $(id).classList.remove("hidden");
}

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function initialisePlayers() {
    $("player-count").textContent = playerCount;

    $("player-names").innerHTML = "";

    for (let i = 0; i < playerCount; i++) {
        const input = document.createElement("input");

        input.className = "player-name-input";
        input.placeholder = `Player ${i + 1} name`;
        input.value = playerNames[i] || `Player ${i + 1}`;

        input.addEventListener("input", () => {
            playerNames[i] = input.value;
        });

        $("player-names").appendChild(input);
    }

    $("players-minus").disabled = playerCount <= 1;
    $("players-plus").disabled = playerCount >= 2;
}

$("players-minus").addEventListener("click", () => {
    if (playerCount > 1) {
        playerCount--;
        initialisePlayers();
    }
});

$("players-plus").addEventListener("click", () => {
    if (playerCount < 2) {
        playerCount++;
        initialisePlayers();
    }
});

function renderLetterOptions() {
    $("letter-options").innerHTML = "";

    LETTERS.forEach(letter => {
        const button = document.createElement("button");

        button.className = "letter-option";
        button.textContent = letter;

        if (letter === selectedLetter) {
            button.classList.add("selected");
        }

        if (usedLetters.includes(letter)) {
            button.disabled = true;
        }

        button.addEventListener("click", () => {
            selectLetter(letter);
        });

        $("letter-options").appendChild(button);
    });
}

function selectLetter(letter) {
    selectedLetter = letter;

    $("wheel-center").textContent = letter;
    $("selected-letter").textContent = `Selected letter: ${letter}`;

    $("start-button").disabled = false;

    renderLetterOptions();
}

let wheelAngle = 0;

function spinWheel() {
    const available = LETTERS.filter(letter =>
        !usedLetters.includes(letter)
    );

    if (!available.length) {
        alert("All letters have been used. Start a new game to continue.");
        return;
    }

    $("spin-button").disabled = true;

    const letter = available[Math.floor(Math.random() * available.length)];

    const index = LETTERS.indexOf(letter);
    const segment = 360 / LETTERS.length;
    const center = (index + 0.5) * segment;

    const spins = 4 + Math.floor(Math.random() * 3);

    wheelAngle =
        wheelAngle - (wheelAngle % 360) - 360 * spins - center;

    $("letter-wheel").style.transform = `rotate(${wheelAngle}deg)`;

    setTimeout(() => {
        selectLetter(letter);
        $("spin-button").disabled = false;
    }, 3900);
}

$("spin-button").addEventListener("click", spinWheel);

function createPlayerPanel(index) {
    const panel = document.createElement("div");

    panel.className = "player-panel";

    const title = document.createElement("h3");
    title.textContent = playerNames[index] || `Player ${index + 1}`;

    panel.appendChild(title);

    CATEGORIES.forEach((category, categoryIndex) => {
        const row = document.createElement("div");
        row.className = "category-row";

        const label = document.createElement("label");
        label.textContent = category;

        row.appendChild(label);

        const input = document.createElement("input");

        input.className = "answer-input";
        input.placeholder = `Starts with ${selectedLetter}`;
        input.dataset.player = index;
        input.dataset.category = categoryIndex;

        input.autocomplete = "off";

        row.appendChild(input);
        panel.appendChild(row);
    });

    return panel;
}

function startGame() {
    if (!selectedLetter) return;

    usedLetters.push(selectedLetter);

    playerNames = Array.from(
        document.querySelectorAll(".player-name-input")
    ).map((input, index) =>
        input.value.trim() || `Player ${index + 1}`
    );

    playerAnswers = Array.from(
        { length: playerCount },
        () => Array(CATEGORIES.length).fill("")
    );

    $("game-letter").textContent = selectedLetter;

    $("player-panels").innerHTML = "";

    for (let i = 0; i < playerCount; i++) {
        $("player-panels").appendChild(createPlayerPanel(i));
    }

    showScreen("game-screen");

    startTimer();
}

$("start-button").addEventListener("click", startGame);

function startTimer() {
    clearInterval(timerInterval);

    timeRemaining = GAME_DURATION;

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeRemaining--;

        updateTimerDisplay();

        if (timeRemaining <= 10) {
            $("timer-progress").classList.add("warning");
        }

        if (timeRemaining <= 0) {
            stopTimer();
            finishRound();
        }

    }, 1000);
}

function updateTimerDisplay() {
    $("timer-display").textContent = timeRemaining;

    $("timer-progress").style.width =
        `${(timeRemaining / GAME_DURATION) * 100}%`;
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function finishRound() {
    stopTimer();

    document.querySelectorAll(".answer-input").forEach(input => {
        const player = Number(input.dataset.player);
        const category = Number(input.dataset.category);

        playerAnswers[player][category] = input.value.trim();

        input.disabled = true;
    });

    renderValidation();

    showScreen("validation-screen");
}

function renderValidation() {
    $("validation-content").innerHTML = "";

    playerScores = Array(playerCount).fill(0);

    for (let p = 0; p < playerCount; p++) {
        const card = document.createElement("div");

        card.className = "validation-card";

        const heading = document.createElement("h3");
        heading.textContent = playerNames[p];

        card.appendChild(heading);

        CATEGORIES.forEach((category, c) => {
            const answer = playerAnswers[p][c];

            const row = document.createElement("div");
            row.className = "validation-answer";

            const answerText = document.createElement("span");

            answerText.textContent =
                `${category}: ${answer || "No answer"}`;

            row.appendChild(answerText);

            const actions = document.createElement("div");

            const approve = document.createElement("button");
            approve.textContent = "✓";
            approve.title = "Approve answer";

            const reject = document.createElement("button");
            reject.textContent = "✗";
            reject.title = "Reject answer";

            approve.addEventListener("click", () => {
                approve.classList.add("approved");
                reject.classList.remove("rejected");
                approve.dataset.approved = "true";
            });

            reject.addEventListener("click", () => {
                reject.classList.add("rejected");
                approve.classList.remove("approved");
                approve.dataset.approved = "false";
            });

            actions.appendChild(approve);
            actions.appendChild(reject);

            row.appendChild(actions);

            card.appendChild(row);
        });

        $("validation-content").appendChild(card);
    }
}

$("finish-game").addEventListener("click", () => {
    const cards = document.querySelectorAll(".validation-card");

    cards.forEach((card, p) => {
        const approved = card.querySelectorAll(
            'button[data-approved="true"]'
        );

        playerScores[p] = approved.length * 100;
    });

    renderResults();

    showScreen("results-screen");
});

function renderResults() {
    $("results-content").innerHTML = "";

    const ranking = playerNames.map((name, index) => ({
        name,
        score: playerScores[index]
    })).sort((a, b) => b.score - a.score);

    ranking.forEach((player, index) => {
        const card = document.createElement("div");

        card.className = "result-card";

        const heading = document.createElement("h3");

        heading.textContent =
            `${index + 1}. ${player.name}`;

        const score = document.createElement("div");

        score.className = "score";
        score.textContent = `${player.score} points`;

        card.appendChild(heading);
        card.appendChild(score);

        $("results-content").appendChild(card);
    });
}

function resetGame() {
    stopTimer();

    selectedLetter = null;
    timeRemaining = GAME_DURATION;

    $("wheel-center").textContent = "?";
    $("selected-letter").textContent = "No letter selected";

    $("start-button").disabled = true;

    $("timer-progress").classList.remove("warning");
    $("timer-progress").style.width = "100%";

    $("spin-button").disabled = false;

    renderLetterOptions();

    showScreen("setup-screen");
}

$("play-again").addEventListener("click", resetGame);

$("exit-game").addEventListener("click", () => {
    if (confirm("Are you sure you want to leave this round?")) {
        resetGame();
    }
});

initialisePlayers();
renderLetterOptions();
