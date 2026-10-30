(() => {
    "use strict";

    // =========================================================
    // CONFIGURATION
    // =========================================================

    const MAX_CARDS_PER_LESSON = 8;
    const STORAGE_BUCKET = "lesson-media";
    const EDGE_FUNCTION_NAME = "hyper-handler";

    const client = window.supabaseClient;

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    const state = {
        user: null,
        profile: null,
        role: null,
        currentLesson: null,
        currentCard: null,
        lessons: [],
        cards: [],
        content: [],
        users: []
    };

    let noticeTimeout = null;

    // =========================================================
    // GENERAL HELPERS
    // =========================================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function formatBytes(bytes) {
        if (
            bytes === null ||
            bytes === undefined ||
            !Number.isFinite(Number(bytes)) ||
            Number(bytes) < 0
        ) {
            return "";
        }

        const value = Number(bytes);

        if (value < 1024) {
            return `${value} B`;
        }

        if (value < 1024 * 1024) {
            return `${(value / 1024).toFixed(1)} KB`;
        }

        return `${(value / (1024 * 1024)).toFixed(2)} MB`;
    }

    function setNotice(message, type = "info") {
        const notice = $("#notice");

        if (!notice) {
            console[type === "error" ? "error" : "log"](message);
            return;
        }

        clearTimeout(noticeTimeout);

        notice.textContent = message;
        notice.className = `notice notice-${type}`;
        notice.hidden = false;

        noticeTimeout = setTimeout(() => {
            notice.hidden = true;
        }, type === "error" ? 8000 : 5000);
    }

    function showLoading(container, message = "Loading...") {
        if (!container) return;

        container.innerHTML = `
            <div class="loading-state" role="status">
                <span class="loading-spinner" aria-hidden="true"></span>
                <span>${escapeHTML(message)}</span>
            </div>
        `;
    }

    function showEmpty(container, message) {
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(message)}
            </div>
        `;
    }

    function setButtonBusy(button, busy, busyText = "Please wait...") {
        if (!button) return;

        if (busy) {
            if (!button.hasAttribute("aria-busy")) {
                button.dataset.originalText = button.textContent;
                button.dataset.originalDisabled = String(button.disabled);
            }

            button.textContent = busyText;
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
        } else {
            button.textContent =
                button.dataset.originalText || button.textContent;

            const wasDisabled =
                button.dataset.originalDisabled === "true";

            delete button.dataset.originalText;
            delete button.dataset.originalDisabled;

            button.disabled = wasDisabled;
            button.removeAttribute("aria-busy");
        }
    }

    function isAdmin() {
        return state.role === "admin";
    }

    function isTeacher() {
        return state.role === "teacher";
    }

    function canManageContent() {
        return isAdmin() || isTeacher();
    }

    function normalizeRole(role) {
        return String(role || "").trim().toLowerCase();
    }

    function getErrorMessage(error) {
        if (!error) {
            return "An unexpected error occurred.";
        }

        return (
            error.message ||
            error.details ||
            error.hint ||
            String(error)
        );
    }

    function requireClient() {
        if (!client) {
            throw new Error(
                "Supabase is not initialized. Check js/supabase.js and ensure it defines window.supabaseClient."
            );
        }
    }

    function generateFileId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    // =========================================================
    // SESSION AND ROLE VERIFICATION
    // =========================================================

    function redirectToLogin() {
        window.location.replace("index.html");
    }

    async function verifySession() {
        requireClient();

        const {
            data: sessionData,
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const session = sessionData?.session;

        if (!session?.user) {
            redirectToLogin();
            return false;
        }

        state.user = session.user;

        const {
            data: profile,
            error: profileError
        } = await client
            .from("profiles")
            .select("id, username, full_name, role, active")
            .eq("id", session.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            await client.auth.signOut();
            redirectToLogin();
            return false;
        }

        if (profile.active === false) {
            await client.auth.signOut();

            setNotice(
                "Your account is inactive. Please contact an administrator.",
                "error"
            );

            setTimeout(redirectToLogin, 1800);
            return false;
        }

        state.profile = profile;
        state.role = normalizeRole(profile.role);

        if (!["admin", "teacher"].includes(state.role)) {
            redirectToLogin();
            return false;
        }

        const signedInUser = $("#signed-in-user");
        const roleBadge = $("#role-badge");

        if (signedInUser) {
            signedInUser.textContent =
                profile.full_name ||
                profile.username ||
                session.user.email ||
                "Signed in";
        }

        if (roleBadge) {
            roleBadge.textContent =
                state.role === "admin"
                    ? "Administrator"
                    : "Teacher";

            roleBadge.className =
                `role-badge role-badge-${state.role}`;
        }

        document.body.dataset.role = state.role;

        applyRolePermissions();

        return true;
    }

    // =========================================================
    // ROLE-BASED INTERFACE
    // =========================================================

    function applyRolePermissions() {
        const adminOnlyElements = $$(".admin-only, [data-admin-only]");

        adminOnlyElements.forEach(element => {
            element.hidden = !isAdmin();
        });

        const usersNavigation = $('[data-panel="users"]');

        if (usersNavigation) {
            usersNavigation.hidden = !isAdmin();
        }

        const saveLessonButton = $("#save-lesson-btn");
        const addCardButton = $("#add-card-btn");

        if (saveLessonButton) {
            saveLessonButton.hidden = !isAdmin();
        }

        if (addCardButton) {
            addCardButton.hidden = !isAdmin();
        }

        const createUserForm = $("#create-user-form");

        if (createUserForm) {
            createUserForm.hidden = !isAdmin();
        }

        const usersPanel = $("#panel-users");

        if (usersPanel && !isAdmin()) {
            usersPanel.hidden = true;
        }

        const cardTitle = $("#new-card-title");
        const cardNumber = $("#new-card-number");

        if (cardTitle) {
            cardTitle.disabled =
                !isAdmin() || !state.currentLesson;
        }

        if (cardNumber) {
            cardNumber.disabled =
                !isAdmin() || !state.currentLesson;
        }

        updateCardControls();
        updateContentControls();
    }

    function updateContentControls() {
        const contentButton = $("#add-content-btn");

        if (!contentButton) return;

        contentButton.disabled =
            !canManageContent() ||
            !state.currentLesson ||
            !state.currentCard ||
            contentButton.getAttribute("aria-busy") === "true";
    }

    // =========================================================
    // NAVIGATION
    // =========================================================

    function initializeNavigation() {
        $$("[data-panel]").forEach(button => {
            button.addEventListener("click", async () => {
                const panelName = button.dataset.panel;

                if (
                    panelName === "users" &&
                    !isAdmin()
                ) {
                    setNotice(
                        "Only administrators can access account management.",
                        "error"
                    );

                    return;
                }

                $$("[data-panel]").forEach(item => {
                    item.classList.toggle("active", item === button);
                });

                $$("[id^='panel-']").forEach(panel => {
                    panel.hidden =
                        panel.id !== `panel-${panelName}`;
                });

                const pageTitle = $("#page-title");

                if (pageTitle) {
                    pageTitle.textContent =
                        panelName === "users"
                            ? "Accounts & Roles"
                            : "Lessons & Media";
                }

                if (panelName === "lessons") {
                    await loadLessons();
                }

                if (panelName === "users" && isAdmin()) {
                    await loadUsers();
                }
            });
        });
    }

    // =========================================================
    // LESSON CATALOGUE
    // =========================================================

    function readLessonForm() {
        const unitInput = $("#unit-number");
        const lessonInput = $("#lesson-number");
        const titleInput = $("#lesson-title");
        const descriptionInput = $("#lesson-description");

        const unitNumber = Number(unitInput?.value);
        const lessonNumber = Number(lessonInput?.value);

        const title = titleInput?.value.trim() || "";
        const description = descriptionInput?.value.trim() || "";

        if (
            !Number.isInteger(unitNumber) ||
            unitNumber < 1 ||
            unitNumber > 12
        ) {
            throw new Error(
                "Unit number must be between 1 and 12."
            );
        }

        if (
            !Number.isInteger(lessonNumber) ||
            lessonNumber < 1 ||
            lessonNumber > 5
        ) {
            throw new Error(
                "Lesson number must be between 1 and 5."
            );
        }

        if (!title) {
            throw new Error("Please enter a lesson title.");
        }

        return {
            unit_number: unitNumber,
            lesson_number: lessonNumber,
            title,
            description
        };
    }

    async function loadLessons() {
        const lessonList = $("#lesson-list");

        try {
            if (lessonList) {
                showLoading(lessonList, "Loading lessons...");
            }

            const {
                data,
                error
            } = await client
                .from("lessons")
                .select("*")
                .order("unit_number", { ascending: true })
                .order("lesson_number", { ascending: true });

            if (error) {
                throw error;
            }

            state.lessons = data || [];

            renderLessonOptions();
            renderLessonList();

        } catch (error) {
            console.error("Could not load lessons:", error);

            if (lessonList) {
                showEmpty(
                    lessonList,
                    "Unable to load the lesson catalogue."
                );
            }

            setNotice(
                `Could not load lessons: ${getErrorMessage(error)}`,
                "error"
            );
        }
    }

    function renderLessonOptions() {
        const unitInput = $("#unit-number");
        const lessonInput = $("#lesson-number");

        if (!unitInput || !lessonInput) {
            return;
        }

        let currentUnit = Number(unitInput.value);
        let currentLessonNumber = Number(lessonInput.value);

        if (
            !Number.isInteger(currentUnit) ||
            currentUnit < 1 ||
            currentUnit > 12
        ) {
            currentUnit = 1;
        }

        if (
            !Number.isInteger(currentLessonNumber) ||
            currentLessonNumber < 1 ||
            currentLessonNumber > 5
        ) {
            currentLessonNumber = 1;
        }

        unitInput.min = "1";
        unitInput.max = "12";
        unitInput.value = String(currentUnit);

        lessonInput.min = "1";
        lessonInput.max = "5";
        lessonInput.value = String(currentLessonNumber);
    }

    function renderLessonList() {
        const container = $("#lesson-list");

        if (!container) return;

        if (!state.lessons.length) {
            showEmpty(
                container,
                "No lessons have been created yet."
            );

            return;
        }

        container.innerHTML = state.lessons.map(lesson => `
            <button
                type="button"
                class="lesson-list-item"
                data-lesson-id="${escapeHTML(lesson.id)}"
            >
                <span class="lesson-list-item-title">
                    ${escapeHTML(lesson.title || "Untitled lesson")}
                </span>

                <span class="lesson-list-item-meta">
                    Unit ${escapeHTML(lesson.unit_number)}
                    · Lesson ${escapeHTML(lesson.lesson_number)}
                </span>
            </button>
        `).join("");

        $$("[data-lesson-id]", container).forEach(button => {
            button.addEventListener("click", async () => {
                await loadLessonById(button.dataset.lessonId);
            });
        });
    }

    async function saveLesson() {
        if (!isAdmin()) {
            setNotice(
                "Only administrators can create or edit lessons.",
                "error"
            );

            return;
        }

        const button = $("#save-lesson-btn");

        try {
            const lessonData = readLessonForm();

            setButtonBusy(button, true, "Saving lesson...");

            const duplicate = state.lessons.find(lesson =>
                Number(lesson.unit_number) === lessonData.unit_number &&
                Number(lesson.lesson_number) === lessonData.lesson_number &&
                String(lesson.id) !== String(state.currentLesson?.id || "")
            );

            if (duplicate) {
                throw new Error(
                    "A lesson already exists with this unit and lesson number."
                );
            }

            let result;

            if (state.currentLesson?.id) {
                result = await client
                    .from("lessons")
                    .update(lessonData)
                    .eq("id", state.currentLesson.id)
                    .select()
                    .single();
            } else {
                result = await client
                    .from("lessons")
                    .insert({
                        ...lessonData,
                        created_by: state.user.id
                    })
                    .select()
                    .single();
            }

            if (result.error) {
                throw result.error;
            }

            state.currentLesson = result.data;

            await loadLessons();
            await loadLessonById(result.data.id);

            setNotice(
                "Lesson saved successfully.",
                "success"
            );

        } catch (error) {
            console.error("Could not save lesson:", error);

            setNotice(
                `Could not save lesson: ${getErrorMessage(error)}`,
                "error"
            );
        } finally {
            setButtonBusy(button, false);
        }
    }

    async function loadSelectedLesson() {
        try {
            const unitNumber = Number($("#unit-number")?.value);
            const lessonNumber = Number($("#lesson-number")?.value);

            const lesson = state.lessons.find(item =>
                Number(item.unit_number) === unitNumber &&
                Number(item.lesson_number) === lessonNumber
            );

            if (!lesson) {
                state.currentLesson = null;
                state.currentCard = null;
                state.cards = [];
                state.content = [];

                if ($("#lesson-title")) {
                    $("#lesson-title").value = "";
                }

                if ($("#lesson-description")) {
                    $("#lesson-description").value = "";
                }

                if ($("#save-lesson-btn")) {
                    $("#save-lesson-btn").textContent = "Create lesson";
                }

                if ($("#selected-card-label")) {
                    $("#selected-card-label").textContent =
                        "No card selected";
                }

                renderCards();
                renderContent();
                updateContentControls();

                setNotice(
                    "No lesson exists for this unit and lesson number.",
                    "error"
                );

                return;
            }

            await loadLessonById(lesson.id);

        } catch (error) {
            setNotice(
                `Could not load lesson: ${getErrorMessage(error)}`,
                "error"
            );
        }
    }

    async function loadLessonById(lessonId) {
        const lesson = state.lessons.find(item =>
            String(item.id) === String(lessonId)
        );

        if (!lesson) {
            setNotice(
                "The selected lesson could not be found.",
                "error"
            );

            return;
        }

        state.currentLesson = lesson;
        state.currentCard = null;
        state.cards = [];
        state.content = [];

        if ($("#unit-number")) {
            $("#unit-number").value = lesson.unit_number;
        }

        if ($("#lesson-number")) {
            $("#lesson-number").value = lesson.lesson_number;
        }

        if ($("#lesson-title")) {
            $("#lesson-title").value = lesson.title || "";
        }

        if ($("#lesson-description")) {
            $("#lesson-description").value =
                lesson.description || "";
        }

        const saveButton = $("#save-lesson-btn");

        if (saveButton) {
            saveButton.textContent = "Save Lesson";
        }

        const newLessonButton = $("#new-lesson-btn");

        if (newLessonButton) {
            newLessonButton.hidden = !isAdmin();
        }

        renderCards();
        renderContent();
        updateContentControls();

        try {
            showLoading(
                $("#cards-list"),
                "Loading lesson cards..."
            );

            const {
                data,
                error
            } = await client
                .from("lesson_cards")
                .select("*")
                .eq("lesson_id", lesson.id)
                .order("card_number", { ascending: true });

            if (error) {
                throw error;
            }

            state.cards = data || [];

            renderCards();

            setNotice(
                `Loaded Unit ${lesson.unit_number}, Lesson ${lesson.lesson_number}.`,
                "success"
            );

        } catch (error) {
            console.error(
                "Could not load lesson cards:",
                error
            );

            showEmpty(
                $("#cards-list"),
                "Unable to load lesson cards."
            );

            setNotice(
                `Could not load cards: ${getErrorMessage(error)}`,
                "error"
            );
        }
    }

    // =========================================================
    // LESSON CARDS
    // =========================================================

    function renderCards() {
        const container = $("#cards-list");
        const numberInput = $("#new-card-number");
        const countLabel = $("#cards-count");

        if (countLabel) {
            countLabel.textContent =
                `${state.cards.length} / ${MAX_CARDS_PER_LESSON}`;
        }

        if (container) {
            if (!state.currentLesson) {
                showEmpty(
                    container,
                    "Load a lesson to see its cards."
                );
            } else if (!state.cards.length) {
                showEmpty(
                    container,
                    "No cards have been added to this lesson."
                );
            } else {
                container.innerHTML = state.cards.map(card => `
                    <button
                        type="button"
                        class="lesson-card-item ${
                            String(state.currentCard?.id) === String(card.id)
                                ? "active"
                                : ""
                        }"
                        data-card-id="${escapeHTML(card.id)}"
                    >
                        <span class="lesson-card-number">
                            ${escapeHTML(card.card_number)}
                        </span>

                        <span class="lesson-card-title">
                            ${escapeHTML(
                                card.title || `Card ${card.card_number}`
                            )}
                        </span>
                    </button>
                `).join("");

                $$("[data-card-id]", container).forEach(button => {
                    button.addEventListener("click", async () => {
                        await selectCard(button.dataset.cardId);
                    });
                });
            }
        }

        if (numberInput) {
            const usedNumbers = new Set(
                state.cards.map(card => Number(card.card_number))
            );

            numberInput.min = "1";
            numberInput.max = String(MAX_CARDS_PER_LESSON);

            const currentNumber = Number(numberInput.value);

            if (
                !Number.isInteger(currentNumber) ||
                currentNumber < 1 ||
                currentNumber > MAX_CARDS_PER_LESSON ||
                usedNumbers.has(currentNumber)
            ) {
                const firstAvailable = Array.from(
                    { length: MAX_CARDS_PER_LESSON },
                    (_, index) => index + 1
                ).find(number => !usedNumbers.has(number));

                numberInput.value =
                    firstAvailable ? String(firstAvailable) : "";
            }
        }

        updateCardControls();
    }

    function updateCardControls() {
        const addCardButton = $("#add-card-btn");
        const titleInput = $("#new-card-title");
        const numberInput = $("#new-card-number");

        const canAdd =
            isAdmin() &&
            Boolean(state.currentLesson) &&
            state.cards.length < MAX_CARDS_PER_LESSON;

        if (addCardButton) {
            addCardButton.disabled = !canAdd;

            addCardButton.title =
                state.cards.length >= MAX_CARDS_PER_LESSON
                    ? "This lesson already has eight cards."
                    : "";
        }

        if (titleInput) {
            titleInput.disabled = !canAdd;
        }

        if (numberInput) {
            numberInput.disabled = !canAdd;
        }

        updateContentControls();
    }

    async function addCard() {
        if (!isAdmin()) {
            setNotice(
                "Only administrators can create lesson cards.",
                "error"
            );

            return;
        }

        if (!state.currentLesson) {
            setNotice(
                "Load a lesson before adding a card.",
                "error"
            );

            return;
        }

        if (state.cards.length >= MAX_CARDS_PER_LESSON) {
            setNotice(
                "Each lesson can contain a maximum of eight cards.",
                "error"
            );

            return;
        }

        const titleInput = $("#new-card-title");
        const numberInput = $("#new-card-number");
        const button = $("#add-card-btn");

        const title = titleInput?.value.trim() || "";
        const cardNumber = Number(numberInput?.value);

        if (!title) {
            setNotice(
                "Please enter a title for the new card.",
                "error"
            );

            return;
        }

        if (
            !Number.isInteger(cardNumber) ||
            cardNumber < 1 ||
            cardNumber > MAX_CARDS_PER_LESSON
        ) {
            setNotice(
                "Choose a card number between 1 and 8.",
                "error"
            );

            return;
        }

        if (state.cards.some(card =>
            Number(card.card_number) === cardNumber
        )) {
            setNotice(
                "That card number is already in use.",
                "error"
            );

            return;
        }

        try {
            setButtonBusy(button, true, "Adding card...");

            const {
                data,
                error
            } = await client
                .from("lesson_cards")
                .insert({
                    lesson_id: state.currentLesson.id,
                    card_number: cardNumber,
                    title
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            state.cards.push(data);

            state.cards.sort((a, b) =>
                Number(a.card_number) - Number(b.card_number)
            );

            if (titleInput) {
                titleInput.value = "";
            }

            renderCards();

            await selectCard(data.id);

            setNotice(
                "Lesson card added successfully.",
                "success"
            );

             } catch (error) {
            console.error("Could not create account:", error);

            let detailedMessage = getErrorMessage(error);

            // Read the actual response returned by the Edge Function.
            if (error?.context) {
                try {
                    const response = error.context.clone();
                    const responseData = await response.json();

                    detailedMessage =
                        responseData.error ||
                        responseData.message ||
                        detailedMessage;

                } catch (responseError) {
                    console.warn(
                        "Could not read Edge Function response:",
                        responseError
                    );
                }
            }

            console.error(
                "Account creation details:",
                detailedMessage
            );

            setNotice(
                `Could not create account: ${detailedMessage}`,
                "error"
            );
        } finally {
            setButtonBusy(button, false);
            updateCardControls();
        }
    }

    async function selectCard(cardId) {
        const card = state.cards.find(item =>
            String(item.id) === String(cardId)
        );

        if (!card) {
            setNotice(
                "The selected card could not be found.",
                "error"
            );

            return;
        }

        state.currentCard = card;
        state.content = [];

        const selectedLabel = $("#selected-card-label");

        if (selectedLabel) {
            selectedLabel.textContent =
                `Unit ${state.currentLesson.unit_number} · ` +
                `Lesson ${state.currentLesson.lesson_number} · ` +
                `Card ${card.card_number}: ${card.title || "Untitled"}`;
        }

        renderCards();
        renderContent();
        updateContentControls();

        await loadCardContent();
    }

    // =========================================================
    // CONTENT TYPE CONTROLS
    // =========================================================

    function initializeContentTypeControls() {
        const typeSelect = $("#content-type");

        if (!typeSelect) return;

        typeSelect.addEventListener(
            "change",
            updateContentTypeFields
        );

        updateContentTypeFields();
    }

    function updateContentTypeFields() {
        const type = $("#content-type")?.value || "text";
        const fileInput = $("#content-file");
        const textInput = $("#text-content");
        const fileLabel = $("#file-label");

        const textLabel = textInput?.closest("label");

        if (fileLabel) {
            fileLabel.hidden = type === "text";
        }

        if (textLabel) {
            textLabel.hidden = false;
        }

        if (fileInput) {
            fileInput.value = "";

            const acceptByType = {
                image: "image/*",
                audio: "audio/*",
                video: "video/*",
                file: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.html",
                game: ".html,.zip"
            };

            fileInput.accept =
                acceptByType[type] ||
                "image/*,audio/*,video/*,.pdf,.html,.zip";
        }
    }

    // =========================================================
    // ADD CONTENT TO A CARD
    // =========================================================

    function getActualFileType(file) {
        if (!file) {
            return "text";
        }

        const mime = String(file.type || "").toLowerCase();
        const name = String(file.name || "").toLowerCase();

        if (
            mime.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name)
        ) {
            return "image";
        }

        if (
            mime.startsWith("audio/") ||
            /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(name)
        ) {
            return "audio";
        }

        if (
            mime.startsWith("video/") ||
            /\.(mp4|webm|mov|m4v|ogv|avi)$/i.test(name)
        ) {
            return "video";
        }

        return "file";
    }

    async function uploadContentFile(file) {
        if (!file) {
            throw new Error("Choose a file to upload.");
        }

        const safeName = file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        const path = [
            state.currentLesson.id,
            state.currentCard.id,
            `${generateFileId()}-${safeName}`
        ].join("/");

        const {
            data,
            error
        } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType:
                    file.type || "application/octet-stream"
            });

        if (error) {
            throw error;
        }

        return {
            path: data.path || path,
            file_name: file.name,
            file_size: file.size,
            mime_type:
                file.type || "application/octet-stream"
        };
    }

    async function addContent() {
        if (!canManageContent()) {
            setNotice(
                "You do not have permission to add content.",
                "error"
            );

            return;
        }

        if (!state.currentLesson || !state.currentCard) {
            setNotice(
                "Select a lesson and a card first.",
                "error"
            );

            return;
        }

        const title = $("#content-title")?.value.trim() || "";
        const requestedType = $("#content-type")?.value || "text";
        const text = $("#text-content")?.value.trim() || "";
        const file = $("#content-file")?.files?.[0] || null;
        const button = $("#add-content-btn");

        if (!title) {
            setNotice(
                "Please enter a content title.",
                "error"
            );

            return;
        }

        if (requestedType === "text" && !text) {
            setNotice(
                "Enter the text or instructions for this content.",
                "error"
            );

            return;
        }

        if (requestedType !== "text" && !file) {
            setNotice(
                "Choose a file to upload for this content type.",
                "error"
            );

            return;
        }

        let uploadedFile = null;

        try {
            setButtonBusy(button, true, "Saving content...");

            let actualType = requestedType;

            if (file) {
                const detectedType = getActualFileType(file);
                const name = String(file.name || "").toLowerCase();

                if (requestedType === "game") {
                    if (
                        !name.endsWith(".html") &&
                        !name.endsWith(".zip")
                    ) {
                        throw new Error(
                            "Game resources must be an .html or .zip file."
                        );
                    }

                    actualType = "game";
                } else if (requestedType === "file") {
                    actualType = "file";
                } else if (detectedType !== requestedType) {
                    throw new Error(
                        `The selected file does not appear to be ${requestedType}. Please choose a matching file.`
                    );
                }
            }

            if (file) {
                uploadedFile = await uploadContentFile(file);
            }

           const contentData = {
  card_id: state.currentCard.id,
  title: title || "",
  content_type: actualType,
  text_content: text || null,
  storage_path: uploadedFile?.path || null,
  original_filename: uploadedFile?.original_filename
    || uploadedFile?.file_name
    || uploadedFile?.name
    || null,
  file_size: uploadedFile?.file_size ?? null,
  mime_type: uploadedFile?.mime_type || null,
  created_by: state.user.id
};

            const {
                error
            } = await client
                .from("lesson_content")
                .insert(contentData);

            if (error) {
                throw error;
            }

            if ($("#content-title")) {
                $("#content-title").value = "";
            }

            if ($("#text-content")) {
                $("#text-content").value = "";
            }

            if ($("#content-file")) {
                $("#content-file").value = "";
            }

            await loadCardContent();

            setNotice(
                "Content added successfully.",
                "success"
            );

        } catch (error) {
            console.error(
                "Could not add content:",
                error
            );

            setNotice(
                `Could not add content: ${getErrorMessage(error)}`,
                "error"
            );

            if (uploadedFile?.path) {
                console.warn(
                    "The file may have uploaded successfully, but its database record was not saved. Storage path:",
                    uploadedFile.path
                );
            }
        } finally {
            setButtonBusy(button, false);
            updateContentControls();
        }
    }

    // =========================================================
    // LOAD AND DISPLAY CARD CONTENT
    // =========================================================

    async function loadCardContent() {
        if (!state.currentCard) {
            state.content = [];
            renderContent();
            updateContentControls();
            return;
        }

        const container = $("#content-list");

        try {
            showLoading(
                container,
                "Loading card content..."
            );

            const {
                data,
                error
            } = await client
                .from("lesson_content")
                .select("*")
                .eq("card_id", state.currentCard.id)
                .order("created_at", { ascending: true });

            if (error) {
                throw error;
            }

            state.content = await Promise.all(
                (data || []).map(async item => {
                    if (!item.storage_path) {
                        return item;
                    }

                    try {
                        const {
                            data: signedData,
                            error: signedError
                        } = await client.storage
                            .from(STORAGE_BUCKET)
                            .createSignedUrl(
                                item.storage_path,
                                3600
                            );

                        if (signedError) {
                            throw signedError;
                        }

                        return {
                            ...item,
                            signed_url: signedData?.signedUrl || null
                        };

                    } catch (signedError) {
                        console.warn(
                            "Could not create a temporary media link:",
                            signedError
                        );

                        return {
                            ...item,
                            signed_url: null
                        };
                    }
                })
            );

            renderContent();

        } catch (error) {
            console.error(
                "Could not load card content:",
                error
            );

            showEmpty(
                container,
                "Unable to load content for this card."
            );

            setNotice(
                `Could not load card content: ${getErrorMessage(error)}`,
                "error"
            );
        }
    }

    function renderContent() {
        const container = $("#content-list");
        const countLabel = $("#content-count");

        if (countLabel) {
            countLabel.textContent =
                `${state.content.length} ` +
                `${state.content.length === 1 ? "item" : "items"}`;
        }

        if (!container) {
            return;
        }

        if (!state.currentCard) {
            showEmpty(
                container,
                "Select a card to view its content."
            );

            return;
        }

        if (!state.content.length) {
            showEmpty(
                container,
                "This card does not contain any content yet."
            );

            return;
        }

        const typeLabels = {
            text: "Text / Instructions",
            image: "Image",
            audio: "Audio",
            video: "Video",
            file: "File",
            game: "Game / Interactive Resource"
        };

        container.innerHTML = state.content.map(item => {
            const type = String(
                item.content_type || "text"
            ).toLowerCase();

            const signedUrl = item.signed_url
                ? escapeHTML(item.signed_url)
                : "";

            const safeTitle = escapeHTML(
                item.title || "Untitled content"
            );

            const safeFileName = escapeHTML(
                item.file_name || "Lesson resource"
            );

            let preview = "";

            if (signedUrl && type === "image") {
                preview = `
                    <img
                        class="content-preview content-preview-image"
                        src="${signedUrl}"
                        alt="${safeTitle}"
                        loading="lazy"
                    >
                `;
            } else if (signedUrl && type === "audio") {
                preview = `
                    <audio
                        class="content-preview"
                        controls
                        preload="none"
                        src="${signedUrl}"
                    >
                        Your browser does not support audio playback.
                    </audio>
                `;
            } else if (signedUrl && type === "video") {
                preview = `
                    <video
                        class="content-preview content-preview-video"
                        controls
                        preload="metadata"
                        src="${signedUrl}"
                    >
                        Your browser does not support video playback.
                    </video>
                `;
            }

            const openLink =
                signedUrl &&
                !["image", "audio", "video"].includes(type)
                    ? `
                        <p>
                            <a
                                class="content-open-link"
                                href="${signedUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open / download resource
                            </a>
                        </p>
                    `
                    : "";

            const linkWarning =
                item.storage_path && !signedUrl
                    ? `
                        <p class="content-item-note">
                            A temporary link could not be generated.
                            Check Storage permissions for the private
                            lesson-media bucket.
                        </p>
                    `
                    : "";

            return `
                <article class="content-item">
                    <div class="content-item-header">
                        <div>
                            <h4>${safeTitle}</h4>

                            <span class="content-type-badge content-type-${escapeHTML(type)}">
                                ${escapeHTML(typeLabels[type] || type)}
                            </span>
                        </div>
                    </div>

                    ${
                        item.text_content
                            ? `
                                <p class="content-item-text">
                                    ${escapeHTML(item.text_content)}
                                </p>
                            `
                            : ""
                    }

                    ${preview}

                    ${
                        item.file_name
                            ? `
                                <p class="content-file-name">
                                    📎 ${safeFileName}
                                </p>
                            `
                            : ""
                    }

                    ${openLink}
                    ${linkWarning}

                    ${
                        item.file_size != null
                            ? `
                                <p class="content-file-size">
                                    ${escapeHTML(formatBytes(item.file_size))}
                                </p>
                            `
                            : ""
                    }

                    <p class="content-item-note">
                        Content is retained. Deletion is not available
                        from this dashboard.
                    </p>
                </article>
            `;
        }).join("");
    }

    // =========================================================
    // ACCOUNT MANAGEMENT — ADMIN ONLY
    // =========================================================

    async function createUser(event) {
        event.preventDefault();

        if (!isAdmin()) {
            setNotice(
                "Only administrators can create accounts.",
                "error"
            );

            return;
        }

        const fullName =
            $("#new-user-fullname")?.value.trim() ||
            $("#new-user-name")?.value.trim() ||
            "";

        const username =
            $("#new-user-username")?.value.trim() || "";

        const email =
            $("#new-user-email")?.value.trim() || "";

        const password =
            $("#new-user-password")?.value || "";

        const role = normalizeRole(
            $("#new-user-role")?.value
        );

        const button = $("#create-user-btn");

        if (!fullName || !username || !email || !password) {
            setNotice(
                "Complete all account fields before submitting.",
                "error"
            );

            return;
        }

        if (password.length < 10) {
            setNotice(
                "The temporary password must contain at least 10 characters.",
                "error"
            );

            return;
        }

        if (!["admin", "teacher", "student"].includes(role)) {
            setNotice(
                "Choose a valid account role.",
                "error"
            );

            return;
        }

        try {
            setButtonBusy(
                button,
                true,
                "Creating account..."
            );

            /*
             * This request requires the deployed hyper-handler Edge
             * Function to implement the "create_user" action and enforce
             * administrator permissions on the server.
             *
             * Never put a Supabase service-role key in this browser script.
             */

            const {
                data,
                error
            } = await client.functions.invoke(
                EDGE_FUNCTION_NAME,
                {
                    body: {
                        action: "create_user",
                        full_name: fullName,
                        username,
                        email,
                        password,
                        role
                    }
                }
            );

            if (error) {
                throw error;
            }

            if (!data || data.success !== true) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    "The server did not confirm account creation. Check the Edge Function implementation."
                );
            }

            $("#create-user-form")?.reset();

            setNotice(
                "Account created successfully.",
                "success"
            );

            await loadUsers();

        } catch (error) {
            console.error(
                "Could not create account:",
                error
            );

            setNotice(
                `Could not create account: ${getErrorMessage(error)}`,
                "error"
            );
        } finally {
            setButtonBusy(button, false);
        }
    }

    async function loadUsers() {
        if (!isAdmin()) {
            return;
        }

        const container = $("#users-list");

        try {
            showLoading(
                container,
                "Loading accounts..."
            );

            const {
                data,
                error
            } = await client
                .from("profiles")
                .select("id, username, full_name, role, active")
                .order("full_name", { ascending: true });

            if (error) {
                throw error;
            }

            state.users = data || [];

            renderUsers();

        } catch (error) {
            console.error(
                "Could not load accounts:",
                error
            );

            showEmpty(
                container,
                "Unable to load accounts."
            );

            setNotice(
                `Could not load accounts: ${getErrorMessage(error)}`,
                "error"
            );
        }
    }

    function renderUsers() {
        const container = $("#users-list");

        if (!container) {
            return;
        }

        if (!state.users.length) {
            showEmpty(
                container,
                "No accounts were found."
            );

            return;
        }

        container.innerHTML = state.users.map(user => `
            <article class="user-item">
                <div class="user-item-main">
                    <h4>
                        ${escapeHTML(
                            user.full_name ||
                            user.username ||
                            "Unnamed user"
                        )}
                    </h4>

                    <p>
                        @${escapeHTML(user.username || "no-username")}
                    </p>
                </div>

                <div class="user-item-details">
                    <span class="role-badge role-badge-${escapeHTML(normalizeRole(user.role))}">
                        ${escapeHTML(user.role || "Unknown role")}
                    </span>

                    <span class="status-badge ${
                        user.active === false
                            ? "status-inactive"
                            : "status-active"
                    }">
                        ${user.active === false ? "Inactive" : "Active"}
                    </span>
                </div>
            </article>
        `).join("");
    }

    // =========================================================
    // SIGN OUT
    // =========================================================

    async function signOut() {
        const button = $("#sign-out-btn");

        try {
            setButtonBusy(
                button,
                true,
                "Signing out..."
            );

            const { error } = await client.auth.signOut();

            if (error) {
                throw error;
            }

            window.location.replace("index.html");

        } catch (error) {
            console.error(
                "Could not sign out:",
                error
            );

            setNotice(
                `Could not sign out: ${getErrorMessage(error)}`,
                "error"
            );

            setButtonBusy(button, false);
        }
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================

    function initializeEvents() {
        $("#save-lesson-btn")?.addEventListener(
            "click",
            saveLesson
        );

        $("#load-lesson-btn")?.addEventListener(
            "click",
            loadSelectedLesson
        );

        $("#add-card-btn")?.addEventListener(
            "click",
            addCard
        );

        $("#add-content-btn")?.addEventListener(
            "click",
            addContent
        );

        $("#create-user-form")?.addEventListener(
            "submit",
            createUser
        );

        $("#refresh-users-btn")?.addEventListener(
            "click",
            loadUsers
        );

        $("#sign-out-btn")?.addEventListener(
            "click",
            signOut
        );

        const resetLessonSelection = () => {
            state.currentLesson = null;
            state.currentCard = null;
            state.cards = [];
            state.content = [];

            if ($("#lesson-title")) {
                $("#lesson-title").value = "";
            }

            if ($("#lesson-description")) {
                $("#lesson-description").value = "";
            }

            const saveButton = $("#save-lesson-btn");

            if (saveButton) {
                saveButton.textContent = "Create lesson";
            }

            if ($("#selected-card-label")) {
                $("#selected-card-label").textContent =
                    "No card selected";
            }

            renderCards();
            renderContent();
            updateContentControls();
        };

        $("#unit-number")?.addEventListener(
            "change",
            resetLessonSelection
        );

        $("#lesson-number")?.addEventListener(
            "change",
            resetLessonSelection
        );

        $("#new-lesson-btn")?.addEventListener(
            "click",
            () => {
                resetLessonSelection();

                $("#lesson-title")?.focus();

                setNotice(
                    "Enter a title and save to create a new lesson.",
                    "info"
                );
            }
        );

        initializeContentTypeControls();
    }

    // =========================================================
    // INITIALIZATION
    // =========================================================

    async function initializeAdmin() {
        try {
            requireClient();

            const authenticated = await verifySession();

            if (!authenticated) {
                return;
            }

            initializeNavigation();
            initializeEvents();

            renderLessonOptions();

            await loadLessons();

            if (isAdmin()) {
                await loadUsers();
            }

        } catch (error) {
            console.error(
                "Admin initialization failed:",
                error
            );

            setNotice(
                `Could not initialize the dashboard: ${getErrorMessage(error)}`,
                "error"
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeAdmin
        );
    } else {
        initializeAdmin();
    }
})();
