(function () {
    "use strict";

    const activityArea = document.getElementById("activity-area");

    const titleElement = document.getElementById("activity-title");
    const instructionsElement = document.getElementById("activity-instructions");

    const checkButton = document.getElementById("check-answers");
    const resetButton = document.getElementById("reset-activity");

    const resultsElement = document.getElementById("activity-results");

    let activityData = null;
    let selectedLeft = null;
    let connections = new Map();
    let checked = false;

    function shuffle(items) {
        const result = [...items];

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    function clearResults() {
        resultsElement.innerHTML = "";
        resultsElement.className = "activity-results";
    }

    function createItem(item, side) {
        const container = document.createElement("div");

        container.className =
            `match-item ${side}-item`;

        container.dataset.id = item.id;

        const text = document.createElement("span");

        text.className = "match-text";
        text.textContent = item.text;

        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "connection-dot";

        dot.dataset.side = side;
        dot.dataset.id = item.id;

        dot.setAttribute(
            "aria-label",
            `Select ${item.text}`
        );

        dot.addEventListener("click", () => {
            handleDotClick(side, item.id);
        });

        if (side === "left") {
            container.append(text, dot);
        } else {
            container.append(dot, text);
        }

        return container;
    }

    function handleDotClick(side, id) {
        if (checked) return;

        if (side === "left") {
            selectedLeft = id;

            document
                .querySelectorAll(".left-item")
                .forEach(item => {
                    item.classList.remove("selected");
                });

            const selectedItem = document.querySelector(
                `.left-item[data-id="${CSS.escape(id)}"]`
            );

            selectedItem?.classList.add("selected");

            return;
        }

        if (!selectedLeft) return;

        const existingConnection = [...connections.entries()]
            .find(([, rightId]) => rightId === id);

        // Prevent one right-side answer from being used twice.
        if (existingConnection) {
            connections.delete(existingConnection[0]);
        }

        // Replace any previous answer for the selected left item.
        connections.set(selectedLeft, id);

        selectedLeft = null;

        renderConnections();
    }

    function renderConnections() {
        document
            .querySelectorAll(".left-item, .right-item")
            .forEach(item => {
                item.classList.remove("selected");

                item.querySelector(".connection-dot")
                    ?.classList.remove("connected");

                item.querySelector(".match-feedback")
                    ?.remove();
            });

        connections.forEach((rightId, leftId) => {
            const leftItem = document.querySelector(
                `.left-item[data-id="${CSS.escape(leftId)}"]`
            );

            const rightItem = document.querySelector(
                `.right-item[data-id="${CSS.escape(rightId)}"]`
            );

            leftItem?.querySelector(".connection-dot")
                ?.classList.add("connected");

            rightItem?.querySelector(".connection-dot")
                ?.classList.add("connected");
        });

        drawLines();
    }

    function drawLines() {
        const board = document.querySelector(".matching-board");

        const svg = document.querySelector(".connection-lines");

        if (!board || !svg) return;

        svg.innerHTML = "";

        const boardRect = board.getBoundingClientRect();

        connections.forEach((rightId, leftId) => {
            const leftDot = document.querySelector(
                `.left-item[data-id="${CSS.escape(leftId)}"] .connection-dot`
            );

            const rightDot = document.querySelector(
                `.right-item[data-id="${CSS.escape(rightId)}"] .connection-dot`
            );

            if (!leftDot || !rightDot) return;

            const leftRect = leftDot.getBoundingClientRect();
            const rightRect = rightDot.getBoundingClientRect();

            const x1 =
                leftRect.left + leftRect.width / 2 - boardRect.left;

            const y1 =
                leftRect.top + leftRect.height / 2 - boardRect.top;

            const x2 =
                rightRect.left + rightRect.width / 2 - boardRect.left;

            const y2 =
                rightRect.top + rightRect.height / 2 - boardRect.top;

            const line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );

            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);

            line.classList.add("connection-line");

            if (checked) {
                const isCorrect =
                    activityData.pairs.some(pair =>
                        pair.leftId === leftId &&
                        pair.rightId === rightId
                    );

                line.classList.add(
                    isCorrect
                        ? "correct-line"
                        : "incorrect-line"
                );
            }

            svg.appendChild(line);
        });
    }

    function renderActivity(data) {
        activityData = data;

        selectedLeft = null;
        connections = new Map();
        checked = false;

        clearResults();

        titleElement.textContent = data.title || "Matching Activity";

        instructionsElement.textContent =
            data.instructions || "Match each item with the correct answer.";

        activityArea.innerHTML = "";

        const board = document.createElement("div");

        board.className = "matching-board";

        const leftColumn = document.createElement("div");
        leftColumn.className = "matching-column";

        const rightColumn = document.createElement("div");
        rightColumn.className = "matching-column";

        const leftHeading = document.createElement("div");
        leftHeading.className = "column-heading";
        leftHeading.textContent = data.leftLabel || "Column 1";

        const rightHeading = document.createElement("div");
        rightHeading.className = "column-heading";
        rightHeading.textContent = data.rightLabel || "Column 2";

        leftColumn.appendChild(leftHeading);
        rightColumn.appendChild(rightHeading);

        const shuffledLeft = shuffle(data.pairs);
        const shuffledRight = shuffle(data.pairs);

        shuffledLeft.forEach(pair => {
            leftColumn.appendChild(
                createItem(
                    {
                        id: pair.leftId,
                        text: pair.left
                    },
                    "left"
                )
            );
        });

        shuffledRight.forEach(pair => {
            rightColumn.appendChild(
                createItem(
                    {
                        id: pair.rightId,
                        text: pair.right
                    },
                    "right"
                )
            );
        });

        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );

        svg.classList.add("connection-lines");
        svg.setAttribute("aria-hidden", "true");

        board.append(
            leftColumn,
            rightColumn,
            svg
        );

        activityArea.appendChild(board);

        checkButton.disabled = false;
        resetButton.disabled = false;

        requestAnimationFrame(drawLines);
    }

    function checkAnswers() {
        if (!activityData || checked) return;

        const total = activityData.pairs.length;

        let correct = 0;

        activityData.pairs.forEach(pair => {
            const selectedAnswer = connections.get(pair.leftId);

            if (selectedAnswer === pair.rightId) {
                correct++;
            }
        });

        const incorrect = total - correct;

        checked = true;

        connections.forEach((rightId, leftId) => {
            const isCorrect = activityData.pairs.some(pair =>
                pair.leftId === leftId &&
                pair.rightId === rightId
            );

            const leftItem = document.querySelector(
                `.left-item[data-id="${CSS.escape(leftId)}"]`
            );

            const rightItem = document.querySelector(
                `.right-item[data-id="${CSS.escape(rightId)}"]`
            );

            const feedback = document.createElement("span");

            feedback.className =
                `match-feedback ${isCorrect ? "correct" : "incorrect"}`;

            feedback.textContent = isCorrect ? "✓" : "✕";

            feedback.setAttribute(
                "aria-label",
                isCorrect ? "Correct" : "Incorrect"
            );

            leftItem?.appendChild(feedback);

            if (rightItem && !rightItem.querySelector(".match-feedback")) {
                const rightFeedback = feedback.cloneNode(true);

                rightItem.appendChild(rightFeedback);
            }

            leftItem?.classList.add(
                isCorrect ? "correct" : "incorrect"
            );

            rightItem?.classList.add(
                isCorrect ? "correct" : "incorrect"
            );
        });

        drawLines();

        resultsElement.className =
            `activity-results visible ${
                correct === total ? "success" : "partial"
            }`;

        const heading = document.createElement("h2");

        heading.textContent =
            correct === total
                ? "Excellent work!"
                : "Activity completed";

        const summary = document.createElement("p");

        summary.textContent =
            `Correct: ${correct} | Incorrect: ${incorrect} | Total: ${total}`;

        resultsElement.replaceChildren(heading, summary);

        checkButton.disabled = true;
    }

    function resetActivity() {
        if (!activityData) return;

        renderActivity(activityData);
    }

    checkButton.addEventListener("click", checkAnswers);

    resetButton.addEventListener("click", resetActivity);

    window.addEventListener("resize", () => {
        requestAnimationFrame(drawLines);
    });

    window.InteractiveActivity = {
        load: renderActivity,

        reset: resetActivity
    };

    // Standalone testing:
    // Load an example activity when no activity data was supplied.
    const params = new URLSearchParams(window.location.search);

    if (params.has("demo")) {
        renderActivity({
            type: "matching",
            title: "Countries and Nationalities",
            instructions: "Match each country with the correct nationality.",

            leftLabel: "Countries",
            rightLabel: "Nationalities",

            pairs: [
                {
                    leftId: "country-1",
                    left: "Angola",
                    rightId: "nationality-1",
                    right: "Angolan"
                },
                {
                    leftId: "country-2",
                    left: "Brazil",
                    rightId: "nationality-2",
                    right: "Brazilian"
                },
                {
                    leftId: "country-3",
                    left: "Portugal",
                    rightId: "nationality-3",
                    right: "Portuguese"
                }
            ]
        });
    }
})();
