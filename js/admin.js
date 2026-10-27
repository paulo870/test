/* =========================================================
   ACADEMIA POLIGLOTA — ADMIN DASHBOARD
   File: js/admin.js

   Uses the existing window.supabaseClient.

   IMPORTANT:
   - Does not replace the existing login system.
   - Does not assume an undocumented Edge Function API.
   - Teachers must not be able to edit or delete existing content.
   ========================================================= */

(() => {
    "use strict";

    const MAX_CARDS_PER_LESSON = 8;
    const STORAGE_BUCKET = "lesson-media";
    const EDGE_FUNCTION_NAME = "hyper-handler";

    const state = {
        user: null,
        profile: null,
        role: null,

        currentLesson: null,
        currentCard: null,

        lessons: [],
        cards: [],
        content: [],
        users: [],

        busy: false
    };

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        Array.from(root.querySelectorAll(selector));

    function getClient() {
        if (!window.supabaseClient) {
            throw new Error(
                "Supabase client not found. Check js/supabase.js and make sure it loads before js/admin.js."
            );
        }

        return window.supabaseClient;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function formatBytes(bytes) {
        const size = Number(bytes);

        if (!Number.isFinite(size) || size < 0) {
            return "";
        }

        if (size < 1024) {
            return `${size} B`;
        }

        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }

        if (size < 1024 * 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }

        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }

    function setNotice(message, type = "info") {
        const notice = $("#notice");

        if (!notice) {
            console[type === "error" ? "error" : "log"](message);
            return;
        }

        notice.textContent = message;
        notice.className = "";

        if (type) {
            notice.classList.add(type);
        }

        notice.style.display = "block";
    }

    function clearNotice() {
        const notice = $("#notice");

        if (notice) {
            notice.textContent = "";
            notice.className = "";
            notice.style.display = "none";
        }
    }

    function showLoading(container, message = "Loading...") {
        if (!container) return;

        container.innerHTML = `
            <div class="admin-loading">
                ${escapeHTML(message)}
            </div>
        `;
    }

    function showEmpty(container, title, description = "") {
        if (!container) return;

        container.innerHTML = `
            <div class="admin-empty-state">
                <h3>${escapeHTML(title)}</h3>
                <p>${escapeHTML(description)}</p>
            </div>
        `;
    }

    function setButtonBusy(button, busy, busyText = "Please wait...") {
        if (!button) return;

        if (busy) {
            if (!button.dataset.originalText) {
                button.dataset.originalText = button.textContent;
            }

            button.disabled = true;
            button.textContent = busyText;
        } else {
            button.disabled = false;

            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    function isAdmin() {
        return state.role === "admin";
    }

    function isTeacherOrAdmin() {
        return state.role === "admin" || state.role === "teacher";
    }

    function requireAdmin() {
        if (!isAdmin()) {
            setNotice(
                "This operation is restricted to administrators.",
                "error"
            );

            return false;
        }

        return true;
    }

    function requireTeacherOrAdmin() {
        if (!isTeacherOrAdmin()) {
            setNotice(
                "You do not have permission to perform this operation.",
                "error"
            );

            return false;
        }

        return true;
    }

    function getFriendlyError(error) {
        if (!error) {
            return "An unexpected error occurred.";
        }

        if (typeof error === "string") {
            return error;
        }

        return error.message ||
            error.error_description ||
            error.details ||
            "An unexpected error occurred.";
    }

    function assertNoError(result) {
        if (result?.error) {
            throw result.error;
        }

        return result?.data;
    }

    function normalizeRole(role) {
        return String(role || "").trim().toLowerCase();
    }

    /* =====================================================
       AUTHENTICATION AND ROLE VERIFICATION
       ===================================================== */

    async function verifySession() {
        const client = getClient();

        const {
            data: { session },
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

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
            .select("*")
            .eq("id", state.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            setNotice(
                "Your account profile could not be found. Contact the administrator.",
                "error"
            );

            disableDashboard();
            return false;
        }

        if (profile.active === false) {
            await client.auth.signOut();
            redirectToLogin();
            return false;
        }

        state.profile = profile;
        state.role = normalizeRole(profile.role);

        if (!["admin", "teacher", "student"].includes(state.role)) {
            setNotice(
                "Your account has an unrecognized role. Contact the administrator.",
                "error"
            );

            disableDashboard();
            return false;
        }

        if (state.role === "student") {
            window.location.replace("index.html");
            return false;
        }

        updateIdentity();
        applyRolePermissions();

        return true;
    }

    function redirectToLogin() {
        const loginPage = "index.html";

        if (!window.location.pathname.endsWith("/index.html")) {
            window.location.replace(loginPage);
        } else {
            window.location.replace(loginPage);
        }
    }

    function disableDashboard() {
        $$("button, input, select, textarea").forEach(element => {
            if (element.id !== "sign-out-btn") {
                element.disabled = true;
            }
        });
    }

    function updateIdentity() {
        const name =
            state.profile?.full_name ||
            state.profile?.username ||
            state.user?.email ||
            "User";

        const signedInUser = $("#signed-in-user");
        const roleBadge = $("#role-badge");

        if (signedInUser) {
            signedInUser.textContent = name;
        }

        if (roleBadge) {
            roleBadge.textContent = state.role;
            roleBadge.className = "admin-role-badge";
        }
    }

    function applyRolePermissions() {
        const adminOnlyElements = $$("[data-admin-only]");

        adminOnlyElements.forEach(element => {
            element.hidden = !isAdmin();
        });

        const teacherOrAdminElements = $$("[data-teacher-or-admin]");

        teacherOrAdminElements.forEach(element => {
            element.hidden = !isTeacherOrAdmin();
        });

        const usersPanel = $('[data-panel="users"]');

        if (usersPanel) {
            usersPanel.hidden = !isAdmin();
        }

        const createUserForm = $("#create-user-form");

        if (createUserForm && !isAdmin()) {
            createUserForm.hidden = true;
        }

        /*
         * The database must also enforce these permissions.
         * Hiding an element is not a security boundary.
         */
    }

    /* =====================================================
       DASHBOARD NAVIGATION
       ===================================================== */

    function initializeNavigation() {
        const navButtons = $$("[data-panel]");

        navButtons.forEach(button => {
            button.addEventListener("click", async () => {
                const panelName = button.dataset.panel;

                if (!panelName) return;

                if (panelName === "users" && !isAdmin()) {
                    setNotice(
                        "Only administrators can manage user accounts.",
                        "error"
                    );

                    return;
                }

                navButtons.forEach(item => {
                    item.classList.toggle("active", item === button);
                });

                $$("[id^='panel-']").forEach(panel => {
                    panel.hidden = panel.id !== `panel-${panelName}`;
                });

                if (panelName === "lessons") {
                    await loadLessons();
                }

                if (panelName === "users" && isAdmin()) {
                    await loadUsers();
                }
            });
        });
    }

    /* =====================================================
       LESSONS
       ===================================================== */

    function readLessonForm() {
        const unitInput = $("#unit-number");
        const lessonInput = $("#lesson-number");
        const titleInput = $("#lesson-title");
        const descriptionInput = $("#lesson-description");

        const unitNumber = Number(unitInput?.value);
        const lessonNumber = Number(lessonInput?.value);

        const title = titleInput?.value.trim() || "";
        const description = descriptionInput?.value.trim() || "";

        if (!Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 12) {
            throw new Error("Unit number must be between 1 and 12.");
        }

        if (
            !Number.isInteger(lessonNumber) ||
            lessonNumber < 1 ||
            lessonNumber > 5
        ) {
            throw new Error("Lesson number must be between 1 and 5.");
        }

        if (!title) {
            throw new Error("Enter a lesson title.");
        }

        return {
            unit_number: unitNumber,
            lesson_number: lessonNumber,
            title,
            description: description || null
        };
    }

    async function loadLessons() {
        const container = $("#load-lesson-btn")
            ? $("#cards-list")
            : null;

        try {
            const client = getClient();

            const { data, error } = await client
                .from("lessons")
                .select("*")
                .order("unit_number", { ascending: true })
                .order("lesson_number", { ascending: true });

            if (error) throw error;

            state.lessons = data || [];

            renderLessonOptions();
            renderLessonList();

            if (container && !state.currentLesson) {
                showEmpty(
                    container,
                    "Select a lesson",
                    "Choose a lesson before managing its cards."
                );
            }

            return state.lessons;
        } catch (error) {
            setNotice(
                `Could not load lessons: ${getFriendlyError(error)}`,
                "error"
            );

            return [];
        }
    }

    function renderLessonOptions() {
        const unitSelect = $("#unit-number");
        const lessonSelect = $("#lesson-number");

        if (unitSelect && !unitSelect.options.length) {
            unitSelect.innerHTML = Array.from(
                { length: 12 },
                (_, index) => {
                    const unit = index + 1;

                    return `
                        <option value="${unit}">
                            Unit ${unit}
                        </option>
                    `;
                }
            ).join("");
        }

        if (lessonSelect && !lessonSelect.options.length) {
            lessonSelect.innerHTML = Array.from(
                { length: 5 },
                (_, index) => {
                    const lesson = index + 1;

                    return `
                        <option value="${lesson}">
                            Lesson ${lesson}
                        </option>
                    `;
                }
            ).join("");
        }
    }

    function renderLessonList() {
        const container = $("#lesson-list");

        if (!container) return;

        if (!state.lessons.length) {
            showEmpty(
                container,
                "No lessons yet",
                "Create your first lesson using the lesson form."
            );

            return;
        }

        container.innerHTML = state.lessons.map(lesson => `
            <div class="admin-list-item">
                <div>
                    <h3>
                        Unit ${lesson.unit_number} ·
                        Lesson ${lesson.lesson_number}
                    </h3>

                    <p>${escapeHTML(lesson.title)}</p>

                    <div class="lesson-meta">
                        <span class="${
                            lesson.published
                                ? "lesson-status-published"
                                : "lesson-status-draft"
                        }">
                            ${lesson.published ? "Published" : "Draft"}
                        </span>
                    </div>
                </div>

                <div class="admin-item-actions">
                    <button
                        type="button"
                        class="admin-button admin-button-secondary admin-button-small"
                        data-load-lesson="${escapeHTML(lesson.id)}"
                    >
                        Load
                    </button>
                </div>
            </div>
        `).join("");

        $$("[data-load-lesson]", container).forEach(button => {
            button.addEventListener("click", async () => {
                await loadLessonById(button.dataset.loadLesson);
            });
        });
    }

    async function saveLesson() {
        if (!requireAdmin()) return;

        const button = $("#save-lesson-btn");

        try {
            setButtonBusy(button, true, "Saving...");

            const client = getClient();
            const form = readLessonForm();

            const duplicate = state.lessons.find(lesson =>
                Number(lesson.unit_number) === form.unit_number &&
                Number(lesson.lesson_number) === form.lesson_number &&
                lesson.id !== state.currentLesson?.id
            );

            if (duplicate) {
                throw new Error(
                    "A lesson already exists for this unit and lesson number."
                );
            }

            let result;

            if (state.currentLesson?.id) {
                result = await client
                    .from("lessons")
                    .update({
                        ...form,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", state.currentLesson.id)
                    .select()
                    .single();
            } else {
                result = await client
                    .from("lessons")
                    .insert({
                        ...form,
                        published: false,
                        created_by: state.user.id
                    })
                    .select()
                    .single();
            }

            const savedLesson = assertNoError(result);

            state.currentLesson = savedLesson;

            setNotice("Lesson saved successfully.", "success");

            await loadLessons();
            await loadLessonById(savedLesson.id);
        } catch (error) {
            setNotice(
                `Could not save lesson: ${getFriendlyError(error)}`,
                "error"
            );
        } finally {
            setButtonBusy(button, false);
        }
    }

    async function loadSelectedLesson() {
        const unitNumber = Number($("#unit-number")?.value);
        const lessonNumber = Number($("#lesson-number")?.value);

        const lesson = state.lessons.find(item =>
            Number(item.unit_number) === unitNumber &&
            Number(item.lesson_number) === lessonNumber
        );

        if (!lesson) {
            setNotice(
                "No saved lesson exists for this unit and lesson number.",
                "warning"
            );

            return;
        }

        await loadLessonById(lesson.id);
    }

    async function loadLessonById(lessonId) {
        try {
            const client = getClient();

            const lesson = state.lessons.find(item =>
                item.id === lessonId
            );

            if (!lesson) {
                throw new Error("Lesson not found.");
            }

            state.currentLesson = lesson;
            state.currentCard = null;

            if ($("#unit-number")) {
                $("#unit-number").value = String(lesson.unit_number);
            }

            if ($("#lesson-number")) {
                $("#lesson-number").value = String(lesson.lesson_number);
            }

            if ($("#lesson-title")) {
                $("#lesson-title").value = lesson.title || "";
            }

            if ($("#lesson-description")) {
                $("#lesson-description").value = lesson.description || "";
            }

            const { data, error } = await client
                .from("lesson_cards")
                .select("*")
                .eq("lesson_id", lessonId)
                .order("card_number", { ascending: true });

            if (error) throw error;

            state.cards = data || [];

            renderCards();

            const label = $("#selected-card-label");

            if (label) {
                label.textContent = "No card selected";
            }

            showEmpty(
                $("#content-list"),
                "Select a card",
                "Choose a card to view its content."
            );

            setNotice(
                `Loaded Unit ${lesson.unit_number}, Lesson ${lesson.lesson_number}.`,
                "success"
            );
        } catch (error) {
            setNotice(
                `Could not load lesson: ${getFriendlyError(error)}`,
                "error"
            );
        }
    }

    /* =====================================================
       LESSON CARDS
       ===================================================== */

    function renderCards() {
        const container = $("#cards-list");

        if (!container) return;

        if (!state.currentLesson) {
            showEmpty(
                container,
                "No lesson selected",
                "Load or create a lesson first."
            );

            return;
        }

        const cardSelect = $("#new-card-number");

        if (cardSelect) {
            cardSelect.innerHTML = Array.from(
                { length: MAX_CARDS_PER_LESSON },
                (_, index) => {
                    const number = index + 1;

                    return `
                        <option value="${number}">
                            Card ${number}
                        </option>
                    `;
                }
            ).join("");

            const existingNumbers = new Set(
                state.cards.map(card => Number(card.card_number))
            );

            const firstAvailable = Array.from(
                { length: MAX_CARDS_PER_LESSON },
                (_, index) => index + 1
            ).find(number => !existingNumbers.has(number));

            if (firstAvailable) {
                cardSelect.value = String(firstAvailable);
            }
        }

        if (!state.cards.length) {
            showEmpty(
                container,
                "No cards yet",
                "Add cards to this lesson. Each lesson supports up to eight cards."
            );

            return;
        }

        container.innerHTML = state.cards.map(card => `
            <div class="lesson-card-item ${
                state.currentCard?.id === card.id ? "selected" : ""
            }">
                <div class="lesson-card-main">
                    <div class="lesson-card-number">
                        ${escapeHTML(card.card_number)}
                    </div>

                    <div>
                        <h3>${escapeHTML(card.title || `Card ${card.card_number}`)}</h3>
                        <p>Lesson card ${escapeHTML(card.card_number)} of ${MAX_CARDS_PER_LESSON}</p>
                    </div>
                </div>

                <div class="lesson-card-actions">
                    <button
                        type="button"
                        class="admin-button admin-button-secondary admin-button-small"
                        data-select-card="${escapeHTML(card.id)}"
                    >
                        Select
                    </button>
                </div>
            </div>
        `).join("");

        $$("[data-select-card]", container).forEach(button => {
            button.addEventListener("click", async () => {
                await selectCard(button.dataset.selectCard);
            });
        });

        updateCardControls();
    }

    function updateCardControls() {
        const addButton = $("#add-card-btn");
        const cardSelect = $("#new-card-number");
        const cardTitle = $("#new-card-title");

        const existingNumbers = new Set(
            state.cards.map(card => Number(card.card_number))
        );

        const allCardsExist =
            state.cards.length >= MAX_CARDS_PER_LESSON;

        if (addButton) {
            addButton.disabled = !isAdmin() ||
                !state.currentLesson ||
                allCardsExist;
        }

        if (cardSelect) {
            Array.from(cardSelect.options).forEach(option => {
                const number = Number(option.value);

                option.disabled = existingNumbers.has(number);
            });
        }

        if (cardTitle) {
            cardTitle.disabled = !isAdmin() || !state.currentLesson;
        }
    }

    async function addCard() {
        if (!requireAdmin()) return;

        if (!state.currentLesson) {
            setNotice("Load or create a lesson first.", "warning");
            return;
        }

        if (state.cards.length >= MAX_CARDS_PER_LESSON) {
            setNotice(
                "Each lesson can contain a maximum of eight cards.",
                "warning"
            );

            return;
        }

        const button = $("#add-card-btn");

        try {
            setButtonBusy(button, true, "Adding...");

            const cardNumber = Number($("#new-card-number")?.value);

            const title =
                $("#new-card-title")?.value.trim() ||
                `Card ${cardNumber}`;

            if (
                !Number.isInteger(cardNumber) ||
                cardNumber < 1 ||
                cardNumber > MAX_CARDS_PER_LESSON
            ) {
                throw new Error("Choose a card number between 1 and 8.");
            }

            if (state.cards.some(card =>
                Number(card.card_number) === cardNumber
            )) {
                throw new Error("That card number already exists.");
            }

            const client = getClient();

            const { data, error } = await client
                .from("lesson_cards")
                .insert({
                    lesson_id: state.currentLesson.id,
                    card_number: cardNumber,
                    title
                })
                .select()
                .single();

            if (error) throw error;

            state.cards.push(data);

            state.cards.sort((a, b) =>
                Number(a.card_number) - Number(b.card_number)
            );

            if ($("#new-card-title")) {
                $("#new-card-title").value = "";
            }

            renderCards();

            setNotice("Lesson card added successfully.", "success");
        } catch (error) {
            setNotice(
                `Could not add card: ${getFriendlyError(error)}`,
                "error"
            );
        } finally {
            setButtonBusy(button, false);
        }
    }

    async function selectCard(cardId) {
        const card = state.cards.find(item => item.id === cardId);

        if (!card) {
            setNotice("The selected card could not be found.", "error");
            return;
        }

        state.currentCard = card;

        const label = $("#selected-card-label");

        if (label) {
            label.textContent =
                `Unit ${state.currentLesson.unit_number} · ` +
                `Lesson ${state.currentLesson.lesson_number} · ` +
                `Card ${card.card_number}: ${card.title}`;
        }

        renderCards();

        await loadCardContent(card.id);
    }

    /* =====================================================
       CARD CONTENT
       ===================================================== */

    function getContentType() {
        return $("#content-type")?.value || "text";
    }

    function getFileContentType(file) {
        if (!file) return "file";

        if (file.type.startsWith("image/")) return "image";
        if (file.type.startsWith("audio/")) return "audio";
        if (file.type.startsWith("video/")) return "video";

        return "file";
    }

    function validateFile(file) {
        if (!file) {
            throw new Error("Choose a file to upload.");
        }

        if (file.size <= 0) {
            throw new Error("The selected file is empty.");
        }

        /*
         * Set an appropriate file-size limit in your deployment.
         * Supabase Storage limits also apply.
         */
    }

    function safeFilename(filename) {
        return String(filename || "upload")
            .normalize("NFKD")
            .replace(/[^\w.-]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 150) || "upload";
    }

    async function uploadContentFile(file, contentType) {
        const client = getClient();

        const filename = safeFilename(file.name);

        const storagePath = [
            state.currentLesson.id,
            state.currentCard.id,
            crypto.randomUUID(),
            filename
        ].join("/");

        const { data, error } = await client
            .storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type || "application/octet-stream"
            });

        if (error) throw error;

        return {
            storage_path: data.path,
            original_filename: file.name,
            mime_type: file.type || null,
            file_size: file.size,
            content_type: contentType
        };
    }

    async function addContent() {
        if (!requireTeacherOrAdmin()) return;

        if (!state.currentLesson || !state.currentCard) {
            setNotice(
                "Select a lesson and a card before adding content.",
                "warning"
            );

            return;
        }

        const button = $("#add-content-btn");

        let uploadedPath = null;

        try {
            setButtonBusy(button, true, "Saving...");

            const client = getClient();

            const title =
                $("#content-title")?.value.trim() || "";

            const requestedType = getContentType();

            const textContent =
                $("#text-content")?.value.trim() || "";

            const file = $("#content-file")?.files?.[0] || null;

            if (!title) {
                throw new Error("Enter a title for the content.");
            }

            if (requestedType === "text" && !textContent) {
                throw new Error("Enter the text content.");
            }

            let record = {
                card_id: state.currentCard.id,
                content_type: requestedType,
                title,
                text_content: null,
                storage_path: null,
                original_filename: null,
                mime_type: null,
                file_size: null,
                created_by: state.user.id
            };

            if (requestedType === "text") {
                record.text_content = textContent;
            } else {
                validateFile(file);

                const actualType = getFileContentType(file);

                if (
                    requestedType !== "file" &&
                    requestedType !== actualType
                ) {
                    throw new Error(
                        `The selected file is ${actualType}, but the chosen content type is ${requestedType}.`
                    );
                }

                const uploaded = await uploadContentFile(
                    file,
                    requestedType === "file" ? actualType : requestedType
                );

                uploadedPath = uploaded.storage_path;

                record = {
                    ...record,
                    content_type: uploaded.content_type,
                    storage_path: uploaded.storage_path,
                    original_filename: uploaded.original_filename,
                    mime_type: uploaded.mime_type,
                    file_size: uploaded.file_size
                };
            }

            const { data, error } = await client
                .from("lesson_content")
                .insert(record)
                .select()
                .single();

            if (error) {
                /*
                 * If the database insert fails after upload, do not
                 * automatically delete the uploaded object.
                 *
                 * This avoids accidental removal and follows the
                 * requirement that uploaded media must not be deleted
                 * by teachers.
                 */
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

            await loadCardContent(state.currentCard.id);

            setNotice("Content added successfully.", "success");

            return data;
        } catch (error) {
            const message = getFriendlyError(error);

            setNotice(
                `Could not add content: ${message}` +
                (
                    uploadedPath
                        ? " A file may already have been uploaded to Storage. An administrator can check the lesson-media bucket."
                        : ""
                ),
                "error"
            );
        } finally {
            setButtonBusy(button, false);
        }
    }

    async function loadCardContent(cardId) {
        const container = $("#content-list");

        if (!container) return;

        showLoading(container, "Loading card content...");

        try {
            const client = getClient();

            const { data, error } = await client
                .from("lesson_content")
                .select("*")
                .eq("card_id", cardId)
                .order("created_at", { ascending: true });

            if (error) throw error;

            state.content = data || [];

            renderContent();
        } catch (error) {
            showEmpty(
                container,
                "Could not load content",
                getFriendlyError(error)
            );
        }
    }

    function getContentTypeClass(type) {
        const normalized = String(type || "file").toLowerCase();

        if (["text", "image", "audio", "video"].includes(normalized)) {
            return `content-type-${normalized}`;
        }

        return "content-type-file";
    }

    function renderContent() {
        const container = $("#content-list");

        if (!container) return;

        if (!state.content.length) {
            showEmpty(
                container,
                "No content added",
                "Add text, images, audio, video or other files to this card."
            );

            return;
        }

        container.innerHTML = state.content.map(item => `
            <article class="content-item">
                <div class="content-item-main">
                    <h3>${escapeHTML(item.title)}</h3>

                    <div class="content-item-meta">
                        <span class="content-type-label ${getContentTypeClass(item.content_type)}">
                            ${escapeHTML(item.content_type)}
                        </span>

                        ${
                            item.original_filename
                                ? `<span class="admin-tag">${escapeHTML(item.original_filename)}</span>`
                                : ""
                        }

                        ${
                            item.file_size
                                ? `<span class="admin-tag">${escapeHTML(formatBytes(item.file_size))}</span>`
                                : ""
                        }
                    </div>

                    ${
                        item.text_content
                            ? `<p>${escapeHTML(item.text_content)}</p>`
                            : ""
                    }

                    ${
                        item.storage_path
                            ? `<p class="admin-muted">Stored securely in the private lesson-media bucket.</p>`
                            : ""
                    }
                </div>

                <div class="admin-item-actions">
                    <span class="admin-tag">Saved</span>
                </div>
            </article>
        `).join("");
    }

    /* =====================================================
       USER MANAGEMENT
       ===================================================== */

    async function invokeUserManagement(payload) {
        if (!requireAdmin()) {
            throw new Error("Administrator access is required.");
        }

        const client = getClient();

        /*
         * This calls the existing function without assuming
         * undocumented action names or request fields.
         *
         * Your existing hyper-handler must explicitly support
         * the operation requested by the form.
         */
        const { data, error } = await client.functions.invoke(
            EDGE_FUNCTION_NAME,
            {
                body: payload
            }
        );

        if (error) {
            throw error;
        }

        if (data?.error) {
            throw new Error(
                typeof data.error === "string"
                    ? data.error
                    : JSON.stringify(data.error)
            );
        }

        return data;
    }

    async function createUser(event) {
        event.preventDefault();

        if (!requireAdmin()) return;

        const form = $("#create-user-form");

        if (!form) return;

        const button = form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        const fullName =
            $("#new-user-name")?.value.trim() || "";

        const username =
            $("#new-user-username")?.value.trim() || "";

        const email =
            $("#new-user-email")?.value.trim() || "";

        const password =
            $("#new-user-password")?.value || "";

        const role =
            normalizeRole($("#new-user-role")?.value);

        if (!fullName || !email || !password || !role) {
            setNotice(
                "Complete the required user fields.",
                "warning"
            );

            return;
        }

        if (!["teacher", "student", "admin"].includes(role)) {
            setNotice("Choose a valid account role.", "error");
            return;
        }

        if (password.length < 8) {
            setNotice(
                "Use a password with at least eight characters.",
                "warning"
            );

            return;
        }

        try {
            setButtonBusy(button, true, "Creating...");

            /*
             * This is a proposed request contract, not a claim
             * that the existing Edge Function already supports it.
             *
             * Only use this payload if hyper-handler has been
             * implemented to accept action: "create_user" and
             * to validate the caller's admin role server-side.
             *
             * Never put a Supabase service-role key in this file.
             */
            const result = await invokeUserManagement({
                action: "create_user",
                full_name: fullName,
                username: username || null,
                email,
                password,
                role
            });

            if (result?.success === false) {
                throw new Error(
                    result.message || "The user could not be created."
                );
            }

            form.reset();

            setNotice(
                "The request was sent to hyper-handler. Confirm that the new account was created before proceeding.",
                "success"
            );

            await loadUsers();
        } catch (error) {
            setNotice(
                `User creation failed: ${getFriendlyError(error)}. Check that hyper-handler supports the create_user action.`,
                "error"
            );
        } finally {
            setButtonBusy(button, false);
        }
    }

    async function loadUsers() {
        if (!isAdmin()) return;

        const container = $("#users-list");

        if (!container) return;

        showLoading(container, "Loading user profiles...");

        try {
            const client = getClient();

            /*
             * RLS must allow administrators to read profiles.
             * This query does not retrieve passwords or auth secrets.
             */
            const { data, error } = await client
                .from("profiles")
                .select("id, username, full_name, role, active, created_at")
                .order("created_at", { ascending: false });

            if (error) throw error;

            state.users = data || [];

            renderUsers();
        } catch (error) {
            showEmpty(
                container,
                "Could not load users",
                getFriendlyError(error)
            );
        }
    }

    function renderUsers() {
        const container = $("#users-list");

        if (!container) return;

        if (!state.users.length) {
            showEmpty(
                container,
                "No user profiles found",
                "User profiles will appear here when they exist."
            );

            return;
        }

        container.innerHTML = state.users.map(user => {
            const role = normalizeRole(user.role);

            const roleClass = [
                "user-role",
                `user-role-${["admin", "teacher", "student"].includes(role)
                    ? role
                    : "student"}`
            ].join(" ");

            const statusText = user.active === false
                ? "Inactive"
                : "Active";

            const statusClass = user.active === false
                ? "user-status-inactive"
                : "user-status-active";

            return `
                <article class="user-item">
                    <div>
                        <h3>
                            ${escapeHTML(
                                user.full_name ||
                                user.username ||
                                "Unnamed user"
                            )}
                        </h3>

                        <p>
                            Username:
                            ${escapeHTML(user.username || "Not set")}
                        </p>

                        <div class="content-item-meta">
                            <span class="${roleClass}">
                                ${escapeHTML(role || "unknown")}
                            </span>

                            <span class="${statusClass}">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    }

    /* =====================================================
       SIGN OUT
       ===================================================== */

    async function signOut() {
        const client = getClient();

        try {
            const { error } = await client.auth.signOut();

            if (error) throw error;

            window.location.replace("index.html");
        } catch (error) {
            setNotice(
                `Could not sign out: ${getFriendlyError(error)}`,
                "error"
            );
        }
    }

    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

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

        $("#content-type")?.addEventListener("change", () => {
            const type = getContentType();

            const textField = $("#text-content");
            const fileField = $("#content-file");

            const textGroup = textField?.closest(
                ".admin-form-group, .form-group"
            );

            const fileGroup = fileField?.closest(
                ".admin-form-group, .form-group"
            );

            if (textGroup) {
                textGroup.hidden = type !== "text";
            }

            if (fileGroup) {
                fileGroup.hidden = type === "text";
            }
        });
    }

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    async function initializeAdmin() {
        try {
            clearNotice();

            const authenticated = await verifySession();

            if (!authenticated) {
                return;
            }

            initializeNavigation();
            initializeEvents();
            renderLessonOptions();

            if (isAdmin()) {
                await loadUsers();
            }

            await loadLessons();

            /*
             * Show the lessons panel by default.
             */
            const defaultPanel = $("#panel-lessons");

            if (defaultPanel) {
                defaultPanel.hidden = false;
            }

            const usersPanel = $("#panel-users");

            if (usersPanel && !isAdmin()) {
                usersPanel.hidden = true;
            }

        } catch (error) {
            setNotice(
                `Dashboard initialization failed: ${getFriendlyError(error)}`,
                "error"
            );

            console.error("Admin initialization error:", error);
        }
    }

    document.addEventListener("DOMContentLoaded", initializeAdmin);

})();
