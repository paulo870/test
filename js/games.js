const LETTERS = ["B", "C", "F", "M", "P", "S", "T", "R", "L", "D"];

const CATEGORIES = [
    "Animal",
    "Food",
    "Country / Place",
    "Name",
    "Object"
];

const DURATION = 45;

const state = {
    players: 2,
    rounds: 1,
    names: ["Player 1", "Player 2", "Player 3"],
    letter: null,
    used: [],
    round: 0,
    scores: [0, 0, 0],
    answers: [],
    approvals: []
};

const $ = id => document.getElementById(id);

let timerInterval = null;
let remaining = DURATION;
let wheelAngle = 0;
let spinning = false;

function showScreen(id) {
    ["setup-screen", "game-screen", "validation-screen", "results-screen"]
        .forEach(screen => $(screen).hidden = screen !== id);
}

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/* ---------------- PLAYER SETUP ---------------- */

function renderPlayers() {
    $("player-number").textContent = state.players;

    $("minus").disabled = state.players <= 1;
    $("plus").disabled = state.players >= 3;

    $("name-fields").innerHTML = "";

    for (let i = 0; i < state.players; i++) {
        const input = document.createElement("input");

        input.className = "name-input";
        input.placeholder = `Player ${i + 1}`;
        input.value = state.names[i] || `Player ${i + 1}`;

        input.addEventListener("input", () => {
            state.names[i] = input.value;
        });

        $("name-fields").appendChild(input);
    }
}

$("minus").onclick = () => {
    if (state.players > 1) {
        state.players--;
        renderPlayers();
    }
};

$("plus").onclick = () => {
    if (state.players < 3) {
        state.players++;
        renderPlayers();
    }
};

$("round-minus").onclick = () => {
    if (state.rounds > 1) state.rounds--;
    updateRounds();
};

$("round-plus").onclick = () => {
    if (state.rounds < Math.min(3, LETTERS.length)) state.rounds++;
    updateRounds();
};

function updateRounds() {
    $("round-number").textContent = state.rounds;
    $("round-minus").disabled = state.rounds <= 1;
    $("round-plus").disabled = state.rounds >= 3;
}

/* ---------------- LETTER WHEEL ---------------- */

function drawWheel() {
    const svg = $("wheel");
    const n = LETTERS.length;
    const segment = 360 / n;

    let markup = "";

    LETTERS.forEach((letter, i) => {
        const a0 = (i * segment - 90) * Math.PI / 180;
        const a1 = ((i + 1) * segment - 90) * Math.PI / 180;

        const x0 = 100 + 100 * Math.cos(a0);
        const y0 = 100 + 100 * Math.sin(a0);

        const x1 = 100 + 100 * Math.cos(a1);
        const y1 = 100 + 100 * Math.sin(a1);

        const used = state.used.includes(letter);

        const fill = used
            ? "#cfe0df"
            : i % 2
                ? "#017A79"
                : "#03AAA2";

        markup += `
            <path
                d="M100,100 L${x0},${y0}
                A100,100 0 0 1 ${x1},${y1} Z"
                fill="${fill}"
                stroke="#fff"
                stroke-width="1.2"
            />
        `;

        const angle = ((i + .5) * segment - 90) * Math.PI / 180;
        const x = 100 + 66 * Math.cos(angle);
        const y = 100 + 66 * Math.sin(angle);

        markup += `
            <text
                x="${x}"
                y="${y}"
                fill="${used ? "#9fb6b5" : "#fff"}"
                font-family="Montserrat"
                font-weight="800"
                font-size="14"
                text-anchor="middle"
                dominant-baseline="central"
                transform="rotate(${(i + .5) * segment} ${x} ${y})"
            >${letter}</text>
        `;
    });

    svg.innerHTML = markup;
}

function renderChips() {
    $("letter-chips").innerHTML = "";

    LETTERS.forEach(letter => {
        const button = document.createElement("button");

        button.className = "letter-chip";
        button.textContent = letter;

        if (letter === state.letter) {
            button.classList.add("selected");
        }

        if (state.used.includes(letter)) {
            button.classList.add("used");
            button.disabled = true;
        }

        button.onclick = () => selectLetter(letter);

        $("letter-chips").appendChild(button);
    });
}

function selectLetter(letter) {
    if (state.used.includes(letter)) return;

    state.letter = letter;

    $("wheel-hub").textContent = letter;
    $("ready").hidden = false;
    $("ready").textContent = `Letter ready: ${letter}`;

    $("start-round").disabled = false;

    renderChips();
}

function spinWheel() {
    if (spinning) return;

    const available = LETTERS.filter(
        letter => !state.used.includes(letter)
    );

    if (!available.length) return;

    spinning = true;
    $("spin").disabled = true;

    const letter = available[
        Math.floor(Math.random() * available.length)
    ];

    const index = LETTERS.indexOf(letter);
    const segment = 360 / LETTERS.length;
    const center = (index + .5) * segment;

    const spins = 4 + Math.floor(Math.random() * 3);

    const target =
        wheelAngle - (wheelAngle % 360) - 360 * spins - center;

    wheelAngle = target;

    $("wheel").style.transition =
        "transform 3.8s cubic-bezier(.16,.84,.27,1)";

    $("wheel").style.transform = `rotate(${target}deg)`;

    setTimeout(() => {
        spinning = false;
        $("spin").disabled = false;
        selectLetter(letter);
    }, 3900);
}

$("spin").onclick = spinWheel;

/* ---------------- HANDWRITING ---------------- */

function createPad(canvas, disabled = false) {
    const ctx = canvas.getContext("2d");

    let drawing = false;
    let hasInk = false;

    function paper() {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#dbeceb";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(12, canvas.height - 24);
        ctx.lineTo(canvas.width - 12, canvas.height - 24);
        ctx.stroke();

        ctx.strokeStyle = "#0e2a2b";
        ctx.lineWidth = 5.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }

    paper();

    function position(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }

    function down(event) {
        if (disabled || drawing) return;

        event.preventDefault();

        drawing = true;
        hasInk = true;

        const p = position(event);

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + .01, p.y + .01);
        ctx.stroke();
    }

    function move(event) {
        if (!drawing) return;

        event.preventDefault();

        const p = position(event);

        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    function up() {
        drawing = false;
    }

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return {
        canvas,

        clear() {
            if (disabled) return;
            hasInk = false;
            paper();
        },

        hasInk() {
            return hasInk;
        },

        image() {
            return hasInk ? canvas.toDataURL("image/png") : "";
        }
    };
}

/* ---------------- GAME ROUND ---------------- */

function startRound() {
    if (!state.letter) return;

    state.used.push(state.letter);

    state.names = Array.from(
        document.querySelectorAll(".name-input")
    ).map((input, i) => input.value.trim() || `Player ${i + 1}`);

    $("round-progress").textContent =
        `${state.round + 1} / ${state.rounds}`;

    $("active-letter").textContent = state.letter;

    const players = $("players");

    players.innerHTML = "";
    players.className = `players p${state.players}`;

    state.answers = [];
    state.approvals = [];

    for (let i = 0; i < state.players; i++) {
        state.answers.push([]);

        const panel = document.createElement("div");
        panel.className = "panel";

        const title = document.createElement("div");
        title.className = "player-title";
        title.textContent = state.names[i];

        panel.appendChild(title);

        const categories = shuffle(CATEGORIES);

        categories.forEach(category => {
            const row = document.createElement("div");
            row.className = "stoprow";

            const label = document.createElement("span");
            label.className = "inklbl";
            label.textContent = category;

            const wrap = document.createElement("div");
            wrap.className = "padwrap";

            const canvas = document.createElement("canvas");
            canvas.className = "inkpad";
            canvas.width = 560;
            canvas.height = 150;

            const clear = document.createElement("button");
            clear.className = "padclr";
            clear.textContent = "↺";
            clear.type = "button";

            const pad = createPad(canvas);

            clear.onclick = pad.clear;

            wrap.appendChild(canvas);
            wrap.appendChild(clear);

            row.appendChild(label);
            row.appendChild(wrap);

            panel.appendChild(row);

            state.answers[i].push({
                category,
                pad
            });
        });

        const done = document.createElement("button");
        done.className = "gbtn";
        done.textContent = "DONE";

        done.onclick = () => finishPlayer(i);

        panel.appendChild(done);
        players.appendChild(panel);
    }

    state.finished = new Array(state.players).fill(false);

    showScreen("game-screen");

    startTimer();
}

$("start-round").onclick = startRound;

function finishPlayer(index) {
    if (state.finished[index]) return;

    state.finished[index] = true;

    const panel = $("players").children[index];

    panel.querySelectorAll("canvas").forEach(canvas => {
        canvas.style.pointerEvents = "none";
    });

    panel.querySelectorAll("button").forEach(button => {
        button.disabled = true;
    });

    if (state.finished.every(Boolean)) {
        stopTimer();
        showValidation();
    }
}

/* ---------------- TIMER ---------------- */

function startTimer() {
    clearInterval(timerInterval);

    remaining = DURATION;

    updateTimer();

    timerInterval = setInterval(() => {
        remaining--;

        updateTimer();

        if (remaining <= 0) {
            stopTimer();

            state.finished.forEach((finished, i) => {
                if (!finished) finishPlayer(i);
            });

            showValidation();
        }
    }, 1000);
}

function updateTimer() {
    $("timer").textContent = remaining;

    $("timer-bar").style.width =
        `${remaining / DURATION * 100}%`;

    $("timer-bar").classList.toggle(
        "warning",
        remaining <= 10
    );
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

/* ---------------- TEACHER VALIDATION ---------------- */

function showValidation() {
    stopTimer();

    $("validation").innerHTML = "";

    state.approvals = state.answers.map(player =>
        player.map(() => null)
    );

    state.answers.forEach((answers, playerIndex) => {
        const card = document.createElement("div");
        card.className = "review-card";

        const title = document.createElement("h3");
        title.textContent = state.names[playerIndex];

        card.appendChild(title);

        answers.forEach((answer, answerIndex) => {
            const row = document.createElement("div");
            row.className = "review-row";

            const label = document.createElement("strong");
            label.textContent = answer.category;

            const preview = document.createElement("canvas");
            preview.width = 560;
            preview.height = 150;

            if (answer.pad.hasInk()) {
                const img = new Image();

                img.onload = () => {
                    preview.getContext("2d").drawImage(
                        img, 0, 0, preview.width, preview.height
                    );
                };

                img.src = answer.pad.image();
            }

            const actions = document.createElement("div");
            actions.className = "review-actions";

            const approve = document.createElement("button");
            approve.textContent = "✓";

            const reject = document.createElement("button");
            reject.textContent = "✗";
            reject.className = "reject";

            approve.onclick = () => {
                state.approvals[playerIndex][answerIndex] = true;

                approve.classList.add("active");
                reject.classList.remove("active");
            };

            reject.onclick = () => {
                state.approvals[playerIndex][answerIndex] = false;

                reject.classList.add("active");
                approve.classList.remove("active");
            };

            actions.appendChild(approve);
            actions.appendChild(reject);

            row.appendChild(label);
            row.appendChild(preview);
            row.appendChild(actions);

            card.appendChild(row);
        });

        $("validation").appendChild(card);
    });

    showScreen("validation-screen");
}

$("confirm-results").onclick = () => {
    state.approvals.forEach((answers, playerIndex) => {
        const points = answers.filter(answer => answer === true).length;

        state.scores[playerIndex] += points * 100;
    });

    showResults();
};

/* ---------------- RESULTS ---------------- */

function showResults() {
    $("results").innerHTML = "";

    const ranking = state.names
        .slice(0, state.players)
        .map((name, index) => ({
            name,
            score: state.scores[index]
        }))
        .sort((a, b) => b.score - a.score);

    ranking.forEach((player, index) => {
        const card = document.createElement("div");
        card.className = "result-card";

        card.innerHTML = `
            <h3>${index + 1}. ${escapeHTML(player.name)}</h3>
            <strong>${player.score} points</strong>
        `;

        $("results").appendChild(card);
    });

    $("next-round").textContent =
        state.round + 1 < state.rounds
            ? "NEXT ROUND"
            : "PLAY AGAIN";

    showScreen("results-screen");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

$("next-round").onclick = () => {
    if (state.round + 1 < state.rounds) {
        state.round++;

        state.letter = null;

        $("wheel-hub").textContent = "?";
        $("ready").hidden = true;
        $("start-round").disabled = true;

        drawWheel();
        renderChips();

        showScreen("setup-screen");
    } else {
        resetGame();
    }
};

function resetGame() {
    stopTimer();

    state.round = 0;
    state.used = [];
    state.letter = null;
    state.scores = [0, 0, 0];

    $("wheel-hub").textContent = "?";
    $("ready").hidden = true;
    $("start-round").disabled = true;

    drawWheel();
    renderChips();

    showScreen("setup-screen");
}

$("back").onclick = () => {
    if (confirm("Leave this game?")) resetGame();
};

/* ---------------- INITIALISE ---------------- */

renderPlayers();
updateRounds();
drawWheel();
renderChips();

showScreen("setup-screen");
