(function () {
    "use strict";

    const titleElement = document.getElementById("activity-title");
    const instructionsElement = document.getElementById("activity-instructions");
    const area = document.getElementById("activity-area");
    const checkButton = document.getElementById("check-answers");
    const resetButton = document.getElementById("reset-activity");
    const resultsElement = document.getElementById("activity-results");

    let activity = null;
    let checked = false;
    let selectedLeft = null;
    let connections = new Map();
    let selectedChoices = new Set();
    let orderingItems = [];

    function shuffle(items) {
        const result = [...items];

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);

        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;

        return node;
    }

    function clearResults() {
        resultsElement.replaceChildren();
        resultsElement.className = "activity-results";
    }

    function loadActivity(data) {
        if (!data || !data.type) {
            showError("The activity data is missing or invalid.");
            return;
        }

        activity = data;
        checked = false;
        selectedLeft = null;
        connections = new Map();
        selectedChoices = new Set();
        orderingItems = [];

        clearResults();

        titleElement.textContent = data.title || "Interactive Activity";
        instructionsElement.textContent = data.instructions || "";

        area.replaceChildren();

        checkButton.disabled = false;
        resetButton.disabled = false;

        switch (data.type) {
            case "matching":
                renderMatching(data);
                break;

            case "cloze":
                renderCloze(data);
                break;

            case "picture-selection":
                renderPictureSelection(data);
                break;

            case "multiple-choice":
                renderMultipleChoice(data);
                break;

            case "ordering":
                renderOrdering(data);
                break;

            default:
                showError("This exercise type is not supported.");
        }
    }

    function showError(message) {
        area.replaceChildren(element("p", "activity-error", message));
        checkButton.disabled = true;
    }

    // =====================================================
    // MATCHING
    // =====================================================

    function renderMatching(data) {
        const board = element("div", "matching-board");

        const leftColumn = element("div", "matching-column");
        const rightColumn = element("div", "matching-column");

        leftColumn.appendChild(
            element("div", "column-heading", data.leftLabel || "Column 1")
        );

        rightColumn.appendChild(
            element("div", "column-heading", data.rightLabel || "Column 2")
        );

        shuffle(data.pairs || []).forEach(pair => {
            const row = element("div", "match-item left-item");
            row.dataset.id = pair.id;

            row.append(
                element("span", "match-text", pair.left),
                createMatchDot("left", pair.id)
            );

            leftColumn.appendChild(row);
        });

        shuffle(data.pairs || []).forEach(pair => {
            const row = element("div", "match-item right-item");
            row.dataset.id = pair.id;

            row.append(
                createMatchDot("right", pair.id),
                element("span", "match-text", pair.right)
            );

            rightColumn.appendChild(row);
        });

        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );

        svg.classList.add("connection-lines");
        svg.setAttribute("aria-hidden", "true");

        board.append(leftColumn, rightColumn, svg);
        area.appendChild(board);

        requestAnimationFrame(drawLines);
    }

    function createMatchDot(side, id) {
        const dot = element("button", "connection-dot");

        dot.type = "button";
        dot.dataset.side = side;
        dot.dataset.id = id;

        dot.setAttribute("aria-label", `Select ${side} item`);

        dot.addEventListener("click", () => {
            if (checked) return;

            if (side === "left") {
                selectedLeft = id;

                document.querySelectorAll(".left-item").forEach(row => {
                    row.classList.remove("selected");
                });

                area.querySelector(
                    `.left-item[data-id="${CSS.escape(id)}"]`
                )?.classList.add("selected");

                return;
            }

            if (!selectedLeft) return;

            connections.set(selectedLeft, id);
            selectedLeft = null;

            renderMatchingConnections();
        });

        return dot;
    }

    function renderMatchingConnections() {
        area.querySelectorAll(".match-item").forEach(row => {
            row.classList.remove("selected");

            row.querySelector(".connection-dot")
                ?.classList.remove("connected");

            row.querySelector(".answer-feedback")?.remove();
        });

        connections.forEach((rightId, leftId) => {
            area.querySelector(
                `.left-item[data-id="${CSS.escape(leftId)}"] .connection-dot`
            )?.classList.add("connected");

            area.querySelector(
                `.right-item[data-id="${CSS.escape(rightId)}"] .connection-dot`
            )?.classList.add("connected");
        });

        drawLines();
    }

    function drawLines() {
        const board = area.querySelector(".matching-board");
        const svg = area.querySelector(".connection-lines");

        if (!board || !svg) return;

        const boardRect = board.getBoundingClientRect();

        svg.innerHTML = "";
        svg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);

        connections.forEach((rightId, leftId) => {
            const left = area.querySelector(
                `.left-item[data-id="${CSS.escape(leftId)}"] .connection-dot`
            );

            const right = area.querySelector(
                `.right-item[data-id="${CSS.escape(rightId)}"] .connection-dot`
            );

            if (!left || !right) return;

            const a = left.getBoundingClientRect();
            const b = right.getBoundingClientRect();

            const line = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );

            line.setAttribute("x1", a.left + a.width / 2 - boardRect.left);
            line.setAttribute("y1", a.top + a.height / 2 - boardRect.top);
            line.setAttribute("x2", b.left + b.width / 2 - boardRect.left);
            line.setAttribute("y2", b.top + b.height / 2 - boardRect.top);

            line.classList.add("connection-line");

            if (checked) {
                const correct = leftId === rightId;

                line.classList.add(
                    correct ? "correct-line" : "incorrect-line"
                );
            }

            svg.appendChild(line);
        });
    }

    // =====================================================
    // CLOZE
    // =====================================================

    function renderCloze(data) {
        const passage = element("div", "cloze-passage");

        const parts = String(data.text || "").split(/(\{\{.*?\}\})/g);

        parts.forEach(part => {
            const match = part.match(/^\{\{(.*?)\}\}$/);

            if (!match) {
                passage.appendChild(document.createTextNode(part));
                return;
            }

            const input = element("input", "cloze-input");

            input.type = "text";
            input.autocomplete = "off";
            input.dataset.answers = match[1];

            input.setAttribute("aria-label", "Missing word");

            passage.appendChild(input);
        });

        area.appendChild(passage);
    }

    // =====================================================
    // PICTURE SELECTION
    // =====================================================

    function renderPictureSelection(data) {
        area.appendChild(
            element("div", "picture-question", data.question || "")
        );

        const grid = element("div", "picture-grid");

        (data.options || []).forEach(option => {
            const button = element("button", "picture-option");

            button.type = "button";
            button.dataset.id = option.id;

            const image = element("img");

            image.src = option.image;
            image.alt = option.label || "Answer option";
            image.loading = "lazy";

            button.appendChild(image);

            if (option.label) {
                button.appendChild(
                    element("span", "", option.label)
                );
            }

            button.addEventListener("click", () => {
                if (checked) return;

                const multiple = Boolean(data.multiple);

                if (!multiple) {
                    selectedChoices.clear();

                    grid.querySelectorAll(".picture-option").forEach(item => {
                        item.classList.remove("selected");
                    });
                }

                if (selectedChoices.has(option.id)) {
                    selectedChoices.delete(option.id);
                    button.classList.remove("selected");
                } else {
                    selectedChoices.add(option.id);
                    button.classList.add("selected");
                }
            });

            grid.appendChild(button);
        });

        area.appendChild(grid);
    }

    // =====================================================
    // MULTIPLE CHOICE
    // =====================================================

    function renderMultipleChoice(data) {
        area.appendChild(
            element("div", "choice-question", data.question || "")
        );

        const list = element("div", "choice-list");

        (data.options || []).forEach(option => {
            const label = element("label", "choice-option");

            const input = element("input");

            input.type = data.multiple ? "checkbox" : "radio";
            input.name = "activity-choice";
            input.value = option.id;

            input.addEventListener("change", () => {
                if (checked) return;

                if (!data.multiple) {
                    selectedChoices.clear();
                }

                if (input.checked) {
                    selectedChoices.add(option.id);
                } else {
                    selectedChoices.delete(option.id);
                }

                list.querySelectorAll(".choice-option").forEach(row => {
                    row.classList.remove("selected");
                });

                selectedChoices.forEach(id => {
                    list.querySelector(
                        `input[value="${CSS.escape(id)}"]`
                    )?.closest(".choice-option")?.classList.add("selected");
                });
            });

            label.append(input, element("span", "", option.text));

            list.appendChild(label);
        });

        area.appendChild(list);
    }

    // =====================================================
    // ORDERING
    // =====================================================

    function renderOrdering(data) {
        orderingItems = shuffle(data.items || []);

        const list = element("div", "ordering-list");

        orderingItems.forEach((item, index) => {
            list.appendChild(createOrderingRow(item, index));
        });

        area.appendChild(list);
        updateOrderingNumbers();
    }

    function createOrderingRow(item, index) {
        const row = element("div", "ordering-item");

        row.dataset.id = item.id;

        row.appendChild(element("span", "ordering-number", String(index + 1)));
        row.appendChild(element("span", "ordering-text", item.text));

        const controls = element("div", "ordering-controls");

        const up = element("button", "", "↑");
        up.type = "button";
        up.setAttribute("aria-label", "Move up");

        const down = element("button", "", "↓");
        down.type = "button";
        down.setAttribute("aria-label", "Move down");

        up.addEventListener("click", () => moveOrderingItem(item.id, -1));
        down.addEventListener("click", () => moveOrderingItem(item.id, 1));

        controls.append(up, down);
        row.appendChild(controls);

        return row;
    }

    function moveOrderingItem(id, direction) {
        if (checked) return;

        const index = orderingItems.findIndex(item => item.id === id);
        const newIndex = index + direction;

        if (newIndex < 0 || newIndex >= orderingItems.length) return;

        [orderingItems[index], orderingItems[newIndex]] =
            [orderingItems[newIndex], orderingItems[index]];

        const list = area.querySelector(".ordering-list");

        list.replaceChildren();

        orderingItems.forEach((item, i) => {
            list.appendChild(createOrderingRow(item, i));
        });

        updateOrderingNumbers();
    }

    function updateOrderingNumbers() {
        area.querySelectorAll(".ordering-item").forEach((row, index) => {
            const number = row.querySelector(".ordering-number");

            if (number) number.textContent = String(index + 1);
        });
    }

    // =====================================================
    // ANSWER CHECKING
    // =====================================================

    function checkActivity() {
        if (!activity || checked) return;

        let correct = 0;
        let total = 0;

        switch (activity.type) {
            case "matching": {
                total = activity.pairs.length;

                activity.pairs.forEach(pair => {
                    const isCorrect =
                        connections.get(pair.id) === pair.id;

                    if (isCorrect) correct++;

                    const left = area.querySelector(
                        `.left-item[data-id="${CSS.escape(pair.id)}"]`
                    );

                    const rightId = connections.get(pair.id);

                    const right = rightId
                        ? area.querySelector(
                            `.right-item[data-id="${CSS.escape(rightId)}"]`
                        )
                        : null;

                    if (left) {
                        left.classList.add(isCorrect ? "correct" : "incorrect");
                        addFeedback(left, isCorrect);
                    }

                    if (right) {
                        right.classList.add(isCorrect ? "correct" : "incorrect");
                        addFeedback(right, isCorrect);
                    }
                });

                break;
            }

            case "cloze": {
                const inputs = [...area.querySelectorAll(".cloze-input")];

                total = inputs.length;

                inputs.forEach(input => {
                    const accepted = input.dataset.answers
                        .split("|")
                        .map(answer => answer.trim().toLowerCase());

                    const answer = input.value.trim().toLowerCase();

                    const isCorrect = accepted.includes(answer);

                    if (isCorrect) correct++;

                    input.classList.add(
                        isCorrect ? "correct" : "incorrect"
                    );
                });

                break;
            }

            case "picture-selection": {
                const correctIds = new Set(
                    activity.options
                        .filter(option => option.correct)
                        .map(option => option.id)
                );

                total = correctIds.size;

                selectedChoices.forEach(id => {
                    if (correctIds.has(id)) correct++;
                });

                activity.options.forEach(option => {
                    const button = area.querySelector(
                        `.picture-option[data-id="${CSS.escape(option.id)}"]`
                    );

                    if (!button) return;

                    const isCorrect = correctIds.has(option.id);
                    const selected = selectedChoices.has(option.id);

                    if (isCorrect && selected) {
                        button.classList.add("correct");
                    } else if (selected) {
                        button.classList.add("incorrect");
                    }
                });

                break;
            }

            case "multiple-choice": {
                const correctIds = new Set(
                    activity.options
                        .filter(option => option.correct)
                        .map(option => option.id)
                );

                total = correctIds.size;

                selectedChoices.forEach(id => {
                    if (correctIds.has(id)) correct++;
                });

                activity.options.forEach(option => {
                    const input = area.querySelector(
                        `input[value="${CSS.escape(option.id)}"]`
                    );

                    const row = input?.closest(".choice-option");

                    if (!row) return;

                    if (option.correct && selectedChoices.has(option.id)) {
                        row.classList.add("correct");
                    } else if (selectedChoices.has(option.id)) {
                        row.classList.add("incorrect");
                    }
                });

                break;
            }

            case "ordering": {
                total = orderingItems.length;

                orderingItems.forEach((item, index) => {
                    const isCorrect = item.position === index + 1;

                    if (isCorrect) correct++;

                    const row = area.querySelector(
                        `.ordering-item[data-id="${CSS.escape(item.id)}"]`
                    );

                    row?.classList.add(
                        isCorrect ? "correct" : "incorrect"
                    );

                    if (row) addFeedback(row, isCorrect);
                });

                break;
            }
        }

        checked = true;

        if (activity.type === "matching") {
            drawLines();
        }

        const incorrect = total - correct;

        resultsElement.className =
            `activity-results visible ${
                correct === total ? "success" : "partial"
            }`;

        const heading = element(
            "h2",
            "",
            correct === total ? "Excellent work!" : "Activity completed"
        );

        const summary = element(
            "p",
            "",
            `Correct: ${correct} | Incorrect: ${incorrect} | Total: ${total}`
        );

        resultsElement.replaceChildren(heading, summary);

        checkButton.disabled = true;

        area.querySelectorAll("input, .connection-dot, .picture-option")
            .forEach(control => {
                control.disabled = true;
            });

        area.querySelectorAll(".ordering-controls button")
            .forEach(button => {
                button.disabled = true;
            });
    }

    function addFeedback(container, correct) {
        const feedback = element(
            "span",
            `answer-feedback ${correct ? "correct" : "incorrect"}`,
            correct ? "✓" : "✕"
        );

        container.appendChild(feedback);
    }

    function resetActivity() {
        if (!activity) return;
        loadActivity(activity);
    }

    function showResultsToParent(correct, total) {
        if (window.parent === window) return;

        window.parent.postMessage({
            type: "POLIGLOTA_ACTIVITY_RESULT",
            correct,
            total
        }, window.location.origin);
    }

    checkButton.addEventListener("click", checkActivity);
    resetButton.addEventListener("click", resetActivity);

    window.addEventListener("resize", () => {
        requestAnimationFrame(drawLines);
    });

    window.addEventListener("message", event => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === "POLIGLOTA_LOAD_ACTIVITY") {
            loadActivity(event.data.activity);
        }
    });

    window.InteractiveActivity = {
        load: loadActivity,
        reset: resetActivity
    };

    const params = new URLSearchParams(window.location.search);

    if (params.has("demo")) {
        loadActivity({
            type: "matching",
            title: "Countries and Nationalities",
            instructions: "Match each country with its nationality.",
            leftLabel: "Countries",
            rightLabel: "Nationalities",
            pairs: [
                { id: "1", left: "Angola", right: "Angolan" },
                { id: "2", left: "Brazil", right: "Brazilian" },
                { id: "3", left: "Portugal", right: "Portuguese" }
            ]
        });
    }
})();
