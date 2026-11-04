(() => {
    "use strict";

    const $ = selector => document.querySelector(selector);

    const container = $("#activity-container");
    const feedback = $("#activity-feedback");

    let activity = null;
    let answers = {};
    let matchingSelection = null;

    function decodeActivity() {
        try {
            const encoded = window.location.hash.slice(1);

            if (!encoded) {
                throw new Error("No activity data was provided.");
            }

            const json = decodeURIComponent(
                Array.from(
                    atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))
                ).map(character =>
                    "%" + character.charCodeAt(0).toString(16).padStart(2, "0")
                ).join("")
            );

            return JSON.parse(json);

        } catch (error) {
            console.error(error);
            throw new Error("The activity could not be loaded.");
        }
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function shuffle(items) {
        const result = [...items];

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    function updateHeader() {
        $("#activity-title").textContent =
            activity.title || "Interactive Activity";

        $("#activity-instructions").textContent =
            activity.instructions || "";

        $("#activity-progress").textContent =
            `${activity.questions.length} questions`;
    }

    function render() {
        answers = {};
        matchingSelection = null;
        feedback.textContent = "";
        feedback.className = "";

        updateHeader();

        switch (activity.type) {
            case "matching":
                renderMatching();
                break;

            case "cloze":
                renderCloze();
                break;

            case "picture-selection":
                renderPictures();
                break;

            case "multiple-choice":
                renderMultipleChoice();
                break;

            case "ordering":
                renderOrdering();
                break;

            default:
                container.innerHTML =
                    '<div class="activity-empty">Unknown activity type.</div>';
        }
    }

    function renderMatching() {
        const left = activity.questions.map((item, index) => ({
            id: index,
            text: item.left
        }));

        const right = shuffle(
            activity.questions.map((item, index) => ({
                id: index,
                text: item.right
            }))
        );

        container.innerHTML = `
            <div class="matching-grid">
                <div class="matching-column">
                    <h3>Column A</h3>
                    ${left.map(item => `
                        <button class="matching-item"
                            type="button"
                            data-side="left"
                            data-id="${item.id}">
                            <span class="matching-dot"></span>
                            ${escapeHTML(item.text)}
                        </button>
                    `).join("")}
                </div>

                <div class="matching-column">
                    <h3>Column B</h3>
                    ${right.map(item => `
                        <button class="matching-item"
                            type="button"
                            data-side="right"
                            data-id="${item.id}">
                            <span class="matching-dot"></span>
                            ${escapeHTML(item.text)}
                        </button>
                    `).join("")}
                </div>
            </div>
        `;

        container.querySelectorAll(".matching-item").forEach(button => {
            button.addEventListener("click", () => {
                selectMatching(button);
            });
        });
    }

    function selectMatching(button) {
        const side = button.dataset.side;
        const id = Number(button.dataset.id);

        if (!matchingSelection) {
            matchingSelection = { side, id };

            container.querySelectorAll(".matching-item").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
            return;
        }

        if (matchingSelection.side === side) {
            matchingSelection = { side, id };

            container.querySelectorAll(".matching-item").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
            return;
        }

        const leftId = side === "left" ? id : matchingSelection.id;
        const rightId = side === "right" ? id : matchingSelection.id;

        answers[leftId] = rightId;

        matchingSelection = null;

        container.querySelectorAll(".matching-item").forEach(item => {
            item.classList.remove("selected");
        });

        container.querySelectorAll('[data-side="left"]').forEach(item => {
            const leftKey = Number(item.dataset.id);
            item.classList.toggle(
                "matched",
                Object.prototype.hasOwnProperty.call(answers, leftKey)
            );
        });

        container.querySelectorAll('[data-side="right"]').forEach(item => {
            const rightKey = Number(item.dataset.id);

            item.classList.toggle(
                "matched",
                Object.values(answers).includes(rightKey)
            );
        });
    }

    function renderCloze() {
        container.innerHTML = activity.questions.map((question, index) => {
            const parts = String(question.sentence || "").split("___");

            let sentence = "";

            parts.forEach((part, partIndex) => {
                sentence += escapeHTML(part);

                if (partIndex < parts.length - 1) {
                    sentence += `
                        <input
                            class="cloze-input"
                            type="text"
                            data-question="${index}"
                            aria-label="Answer ${index + 1}"
                            autocomplete="off"
                        >
                    `;
                }
            });

            return `
                <div class="question-block">
                    <p class="cloze-sentence">${sentence}</p>
                </div>
            `;
        }).join("");
    }

    function renderPictures() {
        container.innerHTML = activity.questions.map((question, index) => `
            <div class="question-block">
                <h3 class="question-title">
                    ${escapeHTML(question.prompt)}
                </h3>

                <div class="picture-grid">
                    ${question.options.map((option, optionIndex) => `
                        <button
                            type="button"
                            class="picture-option"
                            data-question="${index}"
                            data-option="${optionIndex}"
                        >
                            <img src="${escapeHTML(option.image)}"
                                alt="${escapeHTML(option.label)}">
                            <span>${escapeHTML(option.label)}</span>
                        </button>
                    `).join("")}
                </div>
            </div>
        `).join("");

        container.querySelectorAll(".picture-option").forEach(button => {
            button.addEventListener("click", () => {
                const questionIndex = Number(button.dataset.question);
                const optionIndex = Number(button.dataset.option);

                const question = activity.questions[questionIndex];

                if (question.multiple) {
                    answers[questionIndex] ||= [];

                    const selected = answers[questionIndex];
                    const position = selected.indexOf(optionIndex);

                    if (position >= 0) {
                        selected.splice(position, 1);
                    } else {
                        selected.push(optionIndex);
                    }
                } else {
                    answers[questionIndex] = [optionIndex];
                }

                updatePictureSelection(questionIndex);
            });
        });
    }

    function updatePictureSelection(questionIndex) {
        const selected = answers[questionIndex] || [];

        container.querySelectorAll(
            `[data-question="${questionIndex}"]`
        ).forEach(button => {
            button.classList.toggle(
                "selected",
                selected.includes(Number(button.dataset.option))
            );
        });
    }

    function renderMultipleChoice() {
        container.innerHTML = activity.questions.map((question, index) => `
            <div class="question-block">
                <h3 class="question-title">
                    ${escapeHTML(question.prompt)}
                </h3>

                <div class="option-list">
                    ${question.options.map((option, optionIndex) => `
                        <button
                            type="button"
                            class="option-button"
                            data-question="${index}"
                            data-option="${optionIndex}"
                        >
                            ${escapeHTML(option)}
                        </button>
                    `).join("")}
                </div>
            </div>
        `).join("");

        container.querySelectorAll(".option-button").forEach(button => {
            button.addEventListener("click", () => {
                const questionIndex = Number(button.dataset.question);
                const optionIndex = Number(button.dataset.option);
                const question = activity.questions[questionIndex];

                if (question.multiple) {
                    answers[questionIndex] ||= [];

                    const selected = answers[questionIndex];
                    const position = selected.indexOf(optionIndex);

                    if (position >= 0) {
                        selected.splice(position, 1);
                    } else {
                        selected.push(optionIndex);
                    }
                } else {
                    answers[questionIndex] = [optionIndex];
                }

                updateMultipleSelection(questionIndex);
            });
        });
    }

    function updateMultipleSelection(questionIndex) {
        const selected = answers[questionIndex] || [];

        container.querySelectorAll(
            `[data-question="${questionIndex}"]`
        ).forEach(button => {
            button.classList.toggle(
                "selected",
                selected.includes(Number(button.dataset.option))
            );
        });
    }

    function renderOrdering() {
        activity.questions.forEach((question, index) => {
            question.currentItems = shuffle(question.items);
        });

        container.innerHTML = activity.questions.map((question, index) => `
            <div class="question-block">
                <h3 class="question-title">
                    ${escapeHTML(question.prompt)}
                </h3>

                <div class="order-list" data-question="${index}">
                    ${question.currentItems.map((item, itemIndex) => `
                        <div class="order-item"
                            draggable="true"
                            data-index="${itemIndex}">
                            <span class="order-text">${escapeHTML(item)}</span>

                            <span class="order-controls">
                                <button type="button"
                                    data-move="-1"
                                    aria-label="Move up">↑</button>

                                <button type="button"
                                    data-move="1"
                                    aria-label="Move down">↓</button>
                            </span>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("");

        container.querySelectorAll(".order-list").forEach(list => {
            initializeOrdering(list);
        });
    }

    function initializeOrdering(list) {
        let dragged = null;

        list.querySelectorAll(".order-item").forEach(item => {
            item.addEventListener("dragstart", () => {
                dragged = item;
                item.classList.add("dragging");
            });

            item.addEventListener("dragend", () => {
                item.classList.remove("dragging");
                dragged = null;
            });

            item.addEventListener("dragover", event => {
                event.preventDefault();
                item.classList.add("drag-over");
            });

            item.addEventListener("dragleave", () => {
                item.classList.remove("drag-over");
            });

            item.addEventListener("drop", event => {
                event.preventDefault();
                item.classList.remove("drag-over");

                if (dragged && dragged !== item) {
                    list.insertBefore(dragged, item);
                }
            });

            item.querySelectorAll("[data-move]").forEach(button => {
                button.addEventListener("click", () => {
                    const direction = Number(button.dataset.move);

                    if (direction < 0 && item.previousElementSibling) {
                        list.insertBefore(item, item.previousElementSibling);
                    }

                    if (direction > 0 && item.nextElementSibling) {
                        list.insertBefore(item.nextElementSibling, item);
                    }
                });
            });
        });
    }

    function normalizeAnswer(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function arraysEqual(first, second) {
        if (first.length !== second.length) return false;

        const a = [...first].sort((x, y) => x - y);
        const b = [...second].sort((x, y) => x - y);

        return a.every((value, index) => value === b[index]);
    }

    function checkAnswers() {
        let correct = 0;
        let total = activity.questions.length;

        if (activity.type === "matching") {
            activity.questions.forEach((question, index) => {
                if (Number(answers[index]) === index) {
                    correct++;
                }
            });
        }

        if (activity.type === "cloze") {
            activity.questions.forEach((question, index) => {
                const input = container.querySelector(
                    `[data-question="${index}"]`
                );

                const accepted = [
                    question.answer,
                    ...(question.acceptedAnswers || [])
                ].filter(Boolean).map(normalizeAnswer);

                if (accepted.includes(normalizeAnswer(input?.value))) {
                    correct++;
                    input.style.borderColor = "var(--success)";
                } else {
                    input.style.borderColor = "var(--error)";
                }
            });
        }

        if (
            activity.type === "multiple-choice" ||
            activity.type === "picture-selection"
        ) {
            activity.questions.forEach((question, index) => {
                const selected = answers[index] || [];
                const expected = question.correct || [];

                if (arraysEqual(selected, expected)) {
                    correct++;
                }
            });
        }

        if (activity.type === "ordering") {
            activity.questions.forEach((question, index) => {
                const list = container.querySelector(
                    `.order-list[data-question="${index}"]`
                );

                const current = Array.from(
                    list.querySelectorAll(".order-text")
                ).map(item => item.textContent);

                if (current.every((item, itemIndex) =>
                    item === question.items[itemIndex]
                )) {
                    correct++;
                }
            });
        }

        feedback.textContent =
            `You got ${correct} out of ${total} correct.`;

        feedback.className = correct === total
            ? "feedback-success"
            : "feedback-error";

        if (correct === total) {
            feedback.textContent += " Excellent work!";
        }
    }

    function initialize() {
        try {
            activity = decodeActivity();

            if (
                !activity ||
                !Array.isArray(activity.questions) ||
                !activity.questions.length
            ) {
                throw new Error("The activity has no questions.");
            }

            render();

            $("#check-answers").addEventListener("click", checkAnswers);
            $("#reset-activity").addEventListener("click", render);

        } catch (error) {
            container.innerHTML = `
                <div class="activity-empty">
                    ${escapeHTML(error.message)}
                </div>
            `;

            $("#check-answers").disabled = true;
            $("#reset-activity").disabled = true;
        }
    }

    initialize();
})();
