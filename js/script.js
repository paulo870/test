/* =========================================================
   ACADEMIA POLIGLOTA
   INTERACTIVE BOOK PLATFORM
   =========================================================

   LESSON SYSTEM

   Lesson
      ↓
   Content Cards
      ↓
   Click / Tap
      ↓
   Expanded Card
      ↓
   Text / Image / Audio / Video / PDF

   Supabase:
      lessons
      lesson_cards
      lesson_media

   Teachers:
      CAN upload
      CANNOT delete
========================================================= */


/* =========================================================
   01. SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://kioqhgkpfqdhjqidrlwf.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_ZDAJmFtSl9WNGVlZPyvngA_ZWiv_Q4g";

let supabaseClient = null;

if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
) {

    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );

}


/* =========================================================
   02. STATE
========================================================= */

const state = {

    lessons: [],

    cards: [],

    media: [],

    currentLesson: null,

    currentLessonId: null,

    currentCard: null,

    currentCardElement: null,

    currentUnit: null,

    currentSlide: 0,

    cardOpen: false,

    drawing: false,

    pencilSize: 5,

    pencilColor: "#111111",

    editMode: false

};


/* =========================================================
   03. LOCAL FALLBACK
========================================================= */

const localLessons = [

    {
        id: "lesson-1",

        title: "Introduction",

        unit: "Unit 1",

        lesson_number: 1,

        description:
            "Introduction to the lesson.",

        cards: [

            {
                id: "card-1",

                type: "text",

                title: "Welcome",

                subtitle: "Start here",

                content:
                    "Welcome to today's lesson. Tap this card to expand it and begin learning."

            },

            {
                id: "card-2",

                type: "text",

                title: "Key Vocabulary",

                subtitle: "Vocabulary",

                content:
                    "Learn the most important vocabulary from this lesson."

            },

            {
                id: "card-3",

                type: "audio",

                title: "Listening",

                subtitle: "Listen",

                content:
                    "Listen carefully and repeat what you hear.",

                media_url: ""

            },

            {
                id: "card-4",

                type: "video",

                title: "Lesson Video",

                subtitle: "Watch",

                content:
                    "Watch the lesson video.",

                media_url: ""

            }

        ]

    }

];


/* =========================================================
   04. HELPERS
========================================================= */

function $(selector) {

    return document.querySelector(selector);

}


function $all(selector) {

    return Array.from(
        document.querySelectorAll(selector)
    );

}


function escapeHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function sanitizeLessonHTML(html) {

    const temp =
        document.createElement("div");

    temp.innerHTML =
        String(html || "");

    temp.querySelectorAll(
        "script, iframe, object, embed, form"
    ).forEach(
        element => element.remove()
    );

    temp.querySelectorAll("*").forEach(
        element => {

            Array.from(
                element.attributes
            ).forEach(
                attribute => {

                    if (
                        /^on/i.test(attribute.name)
                    ) {

                        element.removeAttribute(
                            attribute.name
                        );

                    }

                }
            );

        }
    );

    return temp.innerHTML;

}


function normalizeUnit(unit) {

    if (
        unit === null ||
        unit === undefined
    ) {

        return "";

    }

    return String(unit)
        .replace(/^unit\s*/i, "")
        .trim();

}


function getLessonNumber(lesson) {

    if (
        lesson.lesson_number !==
        undefined &&
        lesson.lesson_number !== null
    ) {

        return Number(
            lesson.lesson_number
        );

    }

    const match =
        String(lesson.title || "")
            .match(
                /lesson\s*(\d+)/i
            );

    return match
        ? Number(match[1])
        : 0;

}


/* =========================================================
   05. INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializePassword();

        initializeExistingControls();

        initializeLessonInterface();

        initializeUploadSystem();

        initializeWhiteboard();

        initializeKeyboard();

        await loadLessons();

        await loadMedia();

    }
);


/* =========================================================
   06. PASSWORD
========================================================= */

function initializePassword() {

    const form =
        $("#teacher-login-form");

    const screen =
        $("#password-screen");

    const input =
        $("#teacher-password");

    const error =
        $("#password-error");

    if (
        !form ||
        !screen
    ) {

        return;

    }


    if (
        sessionStorage.getItem(
            "poliglotaTeacherAccess"
        ) === "true"
    ) {

        screen.style.display =
            "none";

    }


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const password =
                input
                    ? input.value
                    : "";

            if (
                password === "angola"
            ) {

                sessionStorage.setItem(
                    "poliglotaTeacherAccess",
                    "true"
                );

                screen.style.display =
                    "none";

                if (error) {
                    error.textContent = "";
                }

            } else {

                if (error) {

                    error.textContent =
                        "Incorrect password.";

                }

                if (input) {

                    input.focus();

                    input.select();

                }

            }

        }
    );

}


/* =========================================================
   07. LESSON INTERFACE
========================================================= */

function initializeLessonInterface() {

    const refresh =
        $("#lesson-content-refresh");

    if (refresh) {

        refresh.addEventListener(
            "click",
            async () => {

                await loadLessons();

                await loadMedia();

                if (
                    state.currentLessonId
                ) {

                    openLesson(
                        state.currentLessonId
                    );

                }

            }
        );

    }


    const close =
        $("#lesson-focus-close");

    if (close) {

        close.addEventListener(
            "click",
            closeFocusedCard
        );

    }


    const overlay =
        $("#lesson-focus-overlay");

    if (overlay) {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    closeFocusedCard();

                }

            }
        );

    }


    document.addEventListener(
        "click",
        event => {

            const card =
                event.target.closest(
                    ".lesson-card"
                );

            if (!card) {
                return;
            }

            if (
                event.target.closest(
                    "button, a, audio, video, input, textarea, select"
                )
            ) {

                return;

            }

            const cardId =
                card.dataset.cardId;

            const found =
                state.cards.find(
                    item =>
                        String(item.id) ===
                        String(cardId)
                );

            if (found) {

                openLessonCard(
                    found,
                    card
                );

            }

        }
    );


    document.addEventListener(
        "click",
        event => {

            const closeButton =
                event.target.closest(
                    ".lesson-card-close"
                );

            if (!closeButton) {
                return;
            }

            event.stopPropagation();

            closeFocusedCard();

        }
    );

}


/* =========================================================
   08. LOAD LESSONS
========================================================= */

async function loadLessons() {

    if (!supabaseClient) {

        state.lessons =
            localLessons;

        renderLessonNavigation();

        if (
            state.lessons.length &&
            !state.currentLessonId
        ) {

            openLesson(
                state.lessons[0].id
            );

        }

        return;

    }


    try {

        const result =
            await supabaseClient
                .from("lessons")
                .select(`
                    *,
                    lesson_cards (*)
                `)
                .order(
                    "position",
                    {
                        ascending: true
                    }
                );


        if (result.error) {

            console.warn(
                "Supabase lesson loading failed:",
                result.error
            );

            state.lessons =
                localLessons;

        } else {

            state.lessons =
                normalizeLessons(
                    result.data
                );

        }

    } catch (error) {

        console.error(
            "Lesson loading error:",
            error
        );

        state.lessons =
            localLessons;

    }


    renderLessonNavigation();


    if (
        state.currentLessonId
    ) {

        const exists =
            state.lessons.some(
                lesson =>
                    String(lesson.id) ===
                    String(
                        state.currentLessonId
                    )
            );

        if (exists) {

            openLesson(
                state.currentLessonId
            );

            return;

        }

    }


    const restored =
        restoreLastLesson();

    if (!restored && state.lessons.length) {

        openLesson(
            state.lessons[0].id
        );

    }

}


/* =========================================================
   09. NORMALIZE LESSONS
========================================================= */

function normalizeLessons(data) {

    if (!Array.isArray(data)) {

        return [];

    }


    return data.map(
        lesson => {

            const cards =
                Array.isArray(
                    lesson.lesson_cards
                )
                    ? [...lesson.lesson_cards]
                    : [];


            cards.sort(
                (a, b) => {

                    return (
                        Number(a.position || 0) -
                        Number(b.position || 0)
                    );

                }
            );


            return {

                ...lesson,

                id:
                    lesson.id,

                title:
                    lesson.title ||
                    "Lesson",

                unit:
                    lesson.unit ||
                    lesson.unit_name ||
                    "",

                lesson_number:
                    getLessonNumber(
                        lesson
                    ),

                description:
                    lesson.description ||
                    "",

                cards

            };

        }
    );

}


/* =========================================================
   10. RENDER NAVIGATION
========================================================= */

function renderLessonNavigation() {

    const links =
        $all(
            "#students-book-dropdown a[data-lesson]"
        );


    links.forEach(
        link => {

            const unit =
                normalizeUnit(
                    link.dataset.unit
                );

            const number =
                Number(
                    link.dataset.lesson
                );


            const lesson =
                state.lessons.find(
                    item => {

                        return (
                            normalizeUnit(
                                item.unit
                            ) === unit &&
                            getLessonNumber(
                                item
                            ) === number
                        );

                    }
                );


            if (lesson) {

                link.dataset.lessonId =
                    lesson.id;

                link.classList.remove(
                    "lesson-unavailable"
                );

                link.title =
                    lesson.title;

            } else {

                link.classList.add(
                    "lesson-unavailable"
                );

            }

        }
    );


    links.forEach(
        link => {

            link.onclick =
                event => {

                    event.preventDefault();

                    const id =
                        link.dataset.lessonId;

                    if (!id) {

                        showUploadStatus(
                            "This lesson has not been created yet."
                        );

                        return;

                    }

                    openLesson(id);

                };

        }
    );


    $all(
        "#students-book-dropdown .unit-item > a"
    ).forEach(
        unitLink => {

            unitLink.onclick =
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    const unit =
                        normalizeUnit(
                            unitLink.dataset.unit
                        );

                    const parent =
                        unitLink.closest(
                            ".unit-item"
                        );

                    if (parent) {

                        parent.classList.toggle(
                            "unit-open"
                        );

                    }

                    state.currentUnit =
                        unit;

                };

        }
    );


    $all(
        "#activity-book-dropdown a[data-unit]"
    ).forEach(
        link => {

            link.onclick =
                event => {

                    event.preventDefault();

                    const unit =
                        normalizeUnit(
                            link.dataset.unit
                        );

                    state.currentUnit =
                        unit;

                    const lesson =
                        state.lessons.find(
                            item =>
                                normalizeUnit(
                                    item.unit
                                ) === unit
                        );

                    if (lesson) {

                        openLesson(
                            lesson.id
                        );

                    }

                };

        }
    );

}


/* =========================================================
   11. OPEN LESSON
========================================================= */

function openLesson(lessonId) {

    const lesson =
        state.lessons.find(
            item =>
                String(item.id) ===
                String(lessonId)
        );


    if (!lesson) {

        console.warn(
            "Lesson not found:",
            lessonId
        );

        return;

    }


    state.currentLesson =
        lesson;

    state.currentLessonId =
        lesson.id;

    state.currentUnit =
        normalizeUnit(
            lesson.unit
        );

    state.cards =
        Array.isArray(
            lesson.cards
        )
            ? lesson.cards
            : [];

    state.currentCard =
        null;

    state.currentCardElement =
        null;

    state.cardOpen =
        false;


    closeFocusedCard(
        false
    );


    hideLegacySlide();

    renderLesson();

    saveCurrentLessonLocally();

    updateNavigationButtons();

}


/* =========================================================
   12. RENDER LESSON
========================================================= */

function renderLesson() {

    const title =
        $("#lesson-content-title");

    const subtitle =
        $("#lesson-content-subtitle");

    const cardsContainer =
        $("#lesson-cards");


    if (
        !cardsContainer
    ) {

        return;

    }


    if (title) {

        title.textContent =
            state.currentLesson.title ||
            "Lesson";

    }


    if (subtitle) {

        const unit =
            state.currentLesson.unit
                ? `${state.currentLesson.unit} • `
                : "";

        subtitle.textContent =
            `${unit}${state.currentLesson.description || "Explore the lesson cards below."}`;

    }


    cardsContainer.innerHTML =
        "";


    if (!state.cards.length) {

        cardsContainer.innerHTML = `

            <div class="lesson-empty">

                <div class="lesson-empty-icon">
                    +
                </div>

                <h3>
                    No lesson content yet
                </h3>

                <p>
                    Teacher materials can be uploaded
                    using the UPLOAD button.
                </p>

            </div>

        `;

        return;

    }


    state.cards.forEach(
        (card, index) => {

            cardsContainer.appendChild(
                createLessonCardElement(
                    card,
                    index
                )
            );

        }
    );

}


/* =========================================================
   13. CREATE CARD DOM ELEMENT
========================================================= */

function createLessonCardElement(
    card,
    index
) {

    const wrapper =
        document.createElement(
            "article"
        );

    wrapper.className =
        "lesson-card-wrapper";


    const cardElement =
        document.createElement(
            "div"
        );

    cardElement.className =
        "lesson-card";

    cardElement.dataset.cardId =
        card.id || index;

    cardElement.dataset.cardType =
        card.type || "text";


    const front =
        document.createElement(
            "div"
        );

    front.className =
        "lesson-card-front";


    const icon =
        document.createElement(
            "div"
        );

    icon.className =
        "lesson-card-icon";

    icon.textContent =
        getCardIcon(
            card.type
        );


    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "lesson-card-title";

    title.textContent =
        card.title ||
        "Lesson content";


    const subtitle =
        document.createElement(
            "p"
        );

    subtitle.className =
        "lesson-card-subtitle";

    subtitle.textContent =
        card.subtitle ||
        getCardTypeLabel(
            card.type
        );


    const hint =
        document.createElement(
            "div"
        );

    hint.className =
        "lesson-card-hint";

    hint.innerHTML =
        `Tap to explore <span>→</span>`;


    front.appendChild(icon);

    front.appendChild(title);

    front.appendChild(subtitle);

    front.appendChild(hint);


    const back =
        document.createElement(
            "div"
        );

    back.className =
        "lesson-card-back";


    const close =
        document.createElement(
            "button"
        );

    close.type =
        "button";

    close.className =
        "lesson-card-close";

    close.textContent =
        "×";

    close.setAttribute(
        "aria-label",
        "Close"
    );


    const expandedTitle =
        document.createElement(
            "h2"
        );

    expandedTitle.className =
        "lesson-card-expanded-title";

    expandedTitle.textContent =
        card.title ||
        "Lesson content";


    const content =
        document.createElement(
            "div"
        );

    content.className =
        "lesson-card-content";


    renderCardContent(
        content,
        card
    );


    back.appendChild(
        close
    );

    back.appendChild(
        expandedTitle
    );

    back.appendChild(
        content
    );


    cardElement.appendChild(
        front
    );

    cardElement.appendChild(
        back
    );


    wrapper.appendChild(
        cardElement
    );


    return wrapper;

}


/* =========================================================
   14. CARD ICON
========================================================= */

function getCardIcon(type) {

    switch (
        String(type || "")
            .toLowerCase()
    ) {

        case "audio":
        case "listening":
            return "🎧";

        case "video":
            return "▶";

        case "image":
            return "▣";

        case "pdf":
            return "PDF";

        case "grammar":
            return "Aa";

        case "question":
            return "?";

        case "exercise":
            return "✓";

        case "speaking":
            return "◉";

        case "text":
        case "explanation":
            return "Aa";

        default:
            return "◆";

    }

}


/* =========================================================
   15. CARD TYPE LABEL
========================================================= */

function getCardTypeLabel(type) {

    switch (
        String(type || "")
            .toLowerCase()
    ) {

        case "audio":
            return "Audio";

        case "video":
            return "Video";

        case "image":
            return "Visual";

        case "pdf":
            return "Document";

        case "grammar":
            return "Grammar";

        case "question":
            return "Question";

        case "exercise":
            return "Practice";

        case "listening":
            return "Listening";

        case "speaking":
            return "Speaking";

        case "text":
        case "explanation":
            return "Explanation";

        default:
            return "Explore";

    }

}


/* =========================================================
   16. RENDER CARD CONTENT
========================================================= */

function renderCardContent(
    container,
    card
) {

    const type =
        String(
            card.type || "text"
        ).toLowerCase();


    /* TEXT */

    if (
        type === "text" ||
        type === "explanation" ||
        type === "grammar"
    ) {

        const text =
            document.createElement(
                "div"
            );

        text.className =
            "lesson-card-text";

        text.innerHTML =
            sanitizeLessonHTML(
                card.content || ""
            );

        container.appendChild(
            text
        );

        return;

    }


    /* IMAGE */

    if (
        type === "image"
    ) {

        if (
            card.media_url
        ) {

            const image =
                document.createElement(
                    "img"
                );

            image.className =
                "lesson-card-image";

            image.src =
                card.media_url;

            image.alt =
                card.title ||
                "Lesson image";

            image.loading =
                "lazy";

            container.appendChild(
                image
            );

        } else {

            showMissingMedia(
                container,
                "Image"
            );

        }


        if (card.content) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /* AUDIO */

    if (
        type === "audio" ||
        type === "listening"
    ) {

        if (
            card.media_url
        ) {

            const audio =
                document.createElement(
                    "audio"
                );

            audio.className =
                "lesson-card-audio";

            audio.controls =
                true;

            audio.preload =
                "metadata";

            audio.src =
                card.media_url;

            container.appendChild(
                audio
            );

        } else {

            showMissingMedia(
                container,
                "Audio"
            );

        }


        if (card.content) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /* VIDEO */

    if (
        type === "video"
    ) {

        if (
            card.media_url
        ) {

            const video =
                document.createElement(
                    "video"
                );

            video.className =
                "lesson-card-video";

            video.controls =
                true;

            video.preload =
                "metadata";

            video.playsInline =
                true;

            video.src =
                card.media_url;

            container.appendChild(
                video
            );

        } else {

            showMissingMedia(
                container,
                "Video"
            );

        }


        if (card.content) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /* PDF */

    if (
        type === "pdf"
    ) {

        if (
            card.media_url
        ) {

            const link =
                document.createElement(
                    "a"
                );

            link.className =
                "lesson-pdf-link";

            link.href =
                card.media_url;

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

            link.textContent =
                "Open lesson document";

            container.appendChild(
                link
            );

        } else {

            showMissingMedia(
                container,
                "Document"
            );

        }


        if (card.content) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /* DEFAULT */

    if (card.content) {

        appendDescription(
            container,
            card.content
        );

    }

}


/* =========================================================
   17. DESCRIPTION
========================================================= */

function appendDescription(
    container,
    content
) {

    const description =
        document.createElement(
            "div"
        );

    description.className =
        "lesson-card-text";

    description.innerHTML =
        sanitizeLessonHTML(
            content
        );

    container.appendChild(
        description
    );

}


/* =========================================================
   18. MISSING MEDIA
========================================================= */

function showMissingMedia(
    container,
    mediaType
) {

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "lesson-media-missing";

    message.innerHTML = `

        <strong>
            ${escapeHTML(mediaType)}
        </strong>

        <span>
            No ${escapeHTML(
                mediaType.toLowerCase()
            )} has been uploaded yet.
        </span>

    `;

    container.appendChild(
        message
    );

}


/* =========================================================
   19. OPEN CARD
========================================================= */

function openLessonCard(
    card,
    element
) {

    if (!card) {
        return;
    }


    state.currentCard =
        card;

    state.currentCardElement =
        element;

    state.cardOpen =
        true;


    /*
       The requested behavior is a true focused card.
       We use the overlay rather than relying solely on
       CSS expansion inside the grid.
    */

    const overlay =
        $("#lesson-focus-overlay");

    const focusCard =
        $("#lesson-focus-card");


    if (
        !overlay ||
        !focusCard
    ) {

        return;

    }


    focusCard.innerHTML =
        "";


    const close =
        document.createElement(
            "button"
        );

    close.type =
        "button";

    close.className =
        "lesson-card-close";

    close.textContent =
        "×";

    close.setAttribute(
        "aria-label",
        "Close"
    );


    const title =
        document.createElement(
            "h2"
        );

    title.className =
        "lesson-card-expanded-title";

    title.textContent =
        card.title ||
        "Lesson content";


    const content =
        document.createElement(
            "div"
        );

    content.className =
        "lesson-card-content";


    renderCardContent(
        content,
        card
    );


    focusCard.appendChild(
        close
    );

    focusCard.appendChild(
        title
    );

    focusCard.appendChild(
        content
    );


    close.addEventListener(
        "click",
        closeFocusedCard
    );


    overlay.classList.add(
        "is-visible"
    );

    overlay.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "lesson-card-open"
    );


    /*
       Prevent background scrolling.
    */

    document.documentElement.classList.add(
        "lesson-focus-active"
    );

}


/* =========================================================
   20. CLOSE CARD
========================================================= */

function closeFocusedCard(
    updateState = true
) {

    const overlay =
        $("#lesson-focus-overlay");

    if (overlay) {

        overlay.classList.remove(
            "is-visible"
        );

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    document.body.classList.remove(
        "lesson-card-open"
    );

    document.documentElement.classList.remove(
        "lesson-focus-active"
    );


    if (updateState) {

        state.currentCard =
            null;

        state.currentCardElement =
            null;

        state.cardOpen =
            false;

    }

}


/* =========================================================
   21. LEGACY SLIDE
========================================================= */

function hideLegacySlide() {

    const image =
        $("#slide-image");

    if (image) {

        image.style.display =
            "none";

    }


    const wrapper =
        document.querySelector(
            ".slide-wrapper"
        );

    if (wrapper) {

        wrapper.classList.add(
            "lesson-mode-active"
        );

    }

}


/* =========================================================
   22. MEDIA
========================================================= */

async function loadMedia() {

    if (!supabaseClient) {

        state.media = [];

        return [];

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("lesson_media")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.warn(
                "Could not load media:",
                error
            );

            return [];

        }


        state.media =
            data || [];

        return state.media;

    } catch (error) {

        console.error(
            "Media loading failed:",
            error
        );

        return [];

    }

}


/* =========================================================
   23. TEACHER UPLOAD SYSTEM
========================================================= */

function initializeUploadSystem() {

    const button =
        $("#lesson-upload-btn");

    const modal =
        $("#lesson-upload-modal");

    const close =
        $("#lesson-upload-close");

    const submit =
        $("#lesson-upload-submit");

    const input =
        $("#lesson-file-input");


    if (button) {

        button.addEventListener(
            "click",
            openUploadModal
        );

    }


    if (close) {

        close.addEventListener(
            "click",
            closeUploadModal
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    closeUploadModal();

                }

            }
        );

    }


    if (submit) {

        submit.addEventListener(
            "click",
            handleUploadSubmit
        );

    }


    if (input) {

        input.addEventListener(
            "change",
            updateUploadFileLabel
        );

    }

}


/* =========================================================
   24. OPEN UPLOAD MODAL
========================================================= */

function openUploadModal() {

    const modal =
        $("#lesson-upload-modal");

    const label =
        $("#upload-lesson-label");


    if (!modal) {
        return;
    }


    if (
        !state.currentLesson
    ) {

        if (label) {

            label.textContent =
                "Please select a lesson first.";

        }

    } else {

        if (label) {

            label.textContent =
                `${state.currentLesson.unit || ""} • ${state.currentLesson.title}`;

        }

    }


    modal.classList.add(
        "is-visible"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    const title =
        $("#upload-title");

    if (title) {

        setTimeout(
            () => title.focus(),
            100
        );

    }

}


/* =========================================================
   25. CLOSE UPLOAD MODAL
========================================================= */

function closeUploadModal() {

    const modal =
        $("#lesson-upload-modal");

    if (!modal) {
        return;
    }


    modal.classList.remove(
        "is-visible"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   26. FILE LABEL
========================================================= */

function updateUploadFileLabel() {

    const input =
        $("#lesson-file-input");

    const progress =
        $("#upload-progress");


    if (
        !input ||
        !progress
    ) {

        return;

    }


    const file =
        input.files?.[0];


    if (!file) {

        progress.textContent =
            "";

        return;

    }


    progress.textContent =
        `${file.name} • ${formatFileSize(file.size)}`;

}


/* =========================================================
   27. HANDLE UPLOAD
========================================================= */

async function handleUploadSubmit() {

    if (
        !state.currentLesson
    ) {

        showUploadProgress(
            "Select a lesson first."
        );

        return;

    }


    const titleInput =
        $("#upload-title");

    const descriptionInput =
        $("#upload-description");

    const fileInput =
        $("#lesson-file-input");


    const title =
        titleInput?.value.trim() ||
        "Teacher Material";


    const description =
        descriptionInput?.value.trim() ||
        "";


    const file =
        fileInput?.files?.[0];


    if (!file) {

        showUploadProgress(
            "Please select a file."
        );

        return;

    }


    const submit =
        $("#lesson-upload-submit");


    if (submit) {

        submit.disabled =
            true;

        submit.textContent =
            "Uploading...";

    }


    try {

        const media =
            await uploadMedia(
                file
            );


        if (!media) {

            return;

        }


        const card =
            await createLessonCard(
                state.currentLesson.id,
                {

                    title,

                    subtitle:
                        detectMediaType(
                            file.type
                        ) === "audio"
                            ? "Audio"
                            : detectMediaType(
                                file.type
                            ) === "video"
                                ? "Video"
                                : detectMediaType(
                                    file.type
                                ) === "image"
                                    ? "Visual"
                                    : "Document",

                    type:
                        detectMediaType(
                            file.type
                        ),

                    content:
                        description,

                    media_id:
                        media.id,

                    media_url:
                        media.file_url

                }
            );


        if (!card) {

            showUploadProgress(
                "The file uploaded, but the lesson card could not be created."
            );

            return;

        }


        showUploadProgress(
            "Material uploaded successfully."
        );


        if (titleInput) {
            titleInput.value = "";
        }

        if (descriptionInput) {
            descriptionInput.value = "";
        }

        if (fileInput) {
            fileInput.value = "";
        }


        await loadLessons();

        await loadMedia();


        if (
            state.currentLessonId
        ) {

            openLesson(
                state.currentLessonId
            );

        }


        setTimeout(
            closeUploadModal,
            1200
        );

    } catch (error) {

        console.error(
            "Upload process failed:",
            error
        );

        showUploadProgress(
            `Upload failed: ${error.message}`
        );

    } finally {

        if (submit) {

            submit.disabled =
                false;

            submit.textContent =
                "Upload material";

        }

    }

}


/* =========================================================
   28. UPLOAD MEDIA
========================================================= */

async function uploadMedia(file) {

    if (!supabaseClient) {

        showUploadProgress(
            "Supabase is not configured."
        );

        return null;

    }


    const allowedTypes = [

        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",

        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/webm",

        "video/mp4",
        "video/webm",
        "video/ogg",

        "application/pdf"

    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        showUploadProgress(
            "This file type is not supported."
        );

        return null;

    }


    const maxSize =
        500 * 1024 * 1024;


    if (
        file.size > maxSize
    ) {

        showUploadProgress(
            "The file is larger than 500 MB."
        );

        return null;

    }


    const safeName =
        sanitizeFileName(
            file.name
        );


    const path =
        `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}-${safeName}`;


    showUploadProgress(
        `Uploading ${file.name}...`
    );


    try {

        const {
            error
        } =
            await supabaseClient
                .storage
                .from("lesson-media")
                .upload(
                    path,
                    file,
                    {

                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            file.type

                    }
                );


        if (error) {

            throw error;

        }


        const {
            data: publicData
        } =
            supabaseClient
                .storage
                .from("lesson-media")
                .getPublicUrl(
                    path
                );


        const publicUrl =
            publicData.publicUrl;


        const mediaType =
            detectMediaType(
                file.type
            );


        const {
            data,
            error: databaseError
        } =
            await supabaseClient
                .from("lesson_media")
                .insert({

                    file_name:
                        file.name,

                    file_path:
                        path,

                    file_url:
                        publicUrl,

                    media_type:
                        mediaType,

                    mime_type:
                        file.type,

                    file_size:
                        file.size

                })
                .select()
                .single();


        if (databaseError) {

            console.error(
                "Media database error:",
                databaseError
            );

            /*
               Storage succeeded but database
               record failed.
            */

            showUploadProgress(
                "File uploaded, but the media record could not be saved."
            );

            return null;

        }


        state.media.push(
            data
        );


        return data;

    } catch (error) {

        console.error(
            "Upload failed:",
            error
        );

        showUploadProgress(
            `Upload failed: ${error.message}`
        );

        return null;

    }

}


/* =========================================================
   29. MEDIA TYPE
========================================================= */

function detectMediaType(mime) {

    if (
        mime === "application/pdf"
    ) {

        return "pdf";

    }


    if (
        mime.startsWith("image/")
    ) {

        return "image";

    }


    if (
        mime.startsWith("audio/")
    ) {

        return "audio";

    }


    if (
        mime.startsWith("video/")
    ) {

        return "video";

    }


    return "other";

}


/* =========================================================
   30. CREATE LESSON CARD
========================================================= */

async function createLessonCard(
    lessonId,
    cardData
) {

    if (!supabaseClient) {

        return null;

    }


    try {

        const position =
            state.cards.length;


        const {
            data,
            error
        } =
            await supabaseClient
                .from("lesson_cards")
                .insert({

                    lesson_id:
                        lessonId,

                    title:
                        cardData.title ||
                        "New Card",

                    subtitle:
                        cardData.subtitle ||
                        "",

                    type:
                        cardData.type ||
                        "text",

                    content:
                        cardData.content ||
                        "",

                    media_id:
                        cardData.media_id ||
                        null,

                    media_url:
                        cardData.media_url ||
                        null,

                    position

                })
                .select()
                .single();


        if (error) {

            throw error;

        }


        return data;

    } catch (error) {

        console.error(
            "Could not create lesson card:",
            error
        );

        return null;

    }

}


/* =========================================================
   31. ASSIGN MEDIA
========================================================= */

async function assignMediaToCard(
    cardId,
    mediaId
) {

    if (!supabaseClient) {

        return false;

    }


    try {

        const {
            data: media,
            error
        } =
            await supabaseClient
                .from("lesson_media")
                .select("*")
                .eq(
                    "id",
                    mediaId
                )
                .single();


        if (error) {

            throw error;

        }


        const {
            error: updateError
        } =
            await supabaseClient
                .from("lesson_cards")
                .update({

                    media_id:
                        media.id,

                    media_url:
                        media.file_url

                })
                .eq(
                    "id",
                    cardId
                );


        if (updateError) {

            throw updateError;

        }


        await loadLessons();

        return true;

    } catch (error) {

        console.error(
            "Could not assign media:",
            error
        );

        return false;

    }

}


/* =========================================================
   32. UPDATE CARD
========================================================= */

async function updateLessonCard(
    cardId,
    updates
) {

    if (!supabaseClient) {

        return false;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("lesson_cards")
                .update(
                    updates
                )
                .eq(
                    "id",
                    cardId
                );


        if (error) {

            throw error;

        }


        await loadLessons();

        return true;

    } catch (error) {

        console.error(
            "Could not update card:",
            error
        );

        return false;

    }

}


/* =========================================================
   33. DELETE CARD
=========================================================

   This remains available to the owner/backend API,
   but NO delete UI is exposed to teachers.
========================================================= */

async function deleteLessonCard(
    cardId
) {

    if (!supabaseClient) {

        return false;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("lesson_cards")
                .delete()
                .eq(
                    "id",
                    cardId
                );


        if (error) {

            throw error;

        }


        await loadLessons();

        return true;

    } catch (error) {

        console.error(
            "Could not delete card:",
            error
        );

        return false;

    }

}


/* =========================================================
   34. EXISTING CONTROLS
========================================================= */

function initializeExistingControls() {

    initializeNavigation();

    initializeAudio();

    initializeVideo();

    initializeDropdowns();

    initializeLegacyButtons();

}


/* =========================================================
   35. NAVIGATION
========================================================= */

function initializeNavigation() {

    const previous =
        $("#prev-btn");

    const next =
        $("#next-btn");


    if (previous) {

        previous.addEventListener(
            "click",
            () => navigateLesson(-1)
        );

    }


    if (next) {

        next.addEventListener(
            "click",
            () => navigateLesson(1)
        );

    }

}


/* =========================================================
   36. LESSON NAVIGATION
========================================================= */

function navigateLesson(direction) {

    if (
        !state.lessons.length
    ) {

        return;

    }


    const index =
        state.lessons.findIndex(
            lesson =>
                String(lesson.id) ===
                String(
                    state.currentLessonId
                )
        );


    if (index === -1) {

        openLesson(
            state.lessons[0].id
        );

        return;

    }


    let nextIndex =
        index + direction;


    if (
        nextIndex < 0
    ) {

        nextIndex =
            state.lessons.length - 1;

    }


    if (
        nextIndex >=
        state.lessons.length
    ) {

        nextIndex = 0;

    }


    openLesson(
        state.lessons[nextIndex].id
    );

}


/* =========================================================
   37. NAVIGATION BUTTON STATE
========================================================= */

function updateNavigationButtons() {

    const previous =
        $("#prev-btn");

    const next =
        $("#next-btn");


    if (!state.lessons.length) {

        if (previous) {
            previous.disabled = true;
        }

        if (next) {
            next.disabled = true;
        }

        return;

    }


    if (previous) {

        previous.disabled =
            false;

    }


    if (next) {

        next.disabled =
            false;

    }

}


/* =========================================================
   38. DROPDOWNS
========================================================= */

function initializeDropdowns() {

    $all(".dropdown")
        .forEach(
            dropdown => {

                const icon =
                    dropdown.querySelector(
                        ".dropdown-btn"
                    );

                if (!icon) {
                    return;
                }


                icon.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        $all(
                            ".dropdown.show"
                        ).forEach(
                            other => {

                                if (
                                    other !==
                                    dropdown
                                ) {

                                    other.classList.remove(
                                        "show"
                                    );

                                }

                            }
                        );


                        dropdown.classList.toggle(
                            "show"
                        );

                    }
                );

            }
        );


    document.addEventListener(
        "click",
        () => {

            $all(
                ".dropdown.show"
            ).forEach(
                dropdown =>
                    dropdown.classList.remove(
                        "show"
                    )
            );

        }
    );

}


/* =========================================================
   39. AUDIO
========================================================= */

function initializeAudio() {

    const audio =
        $("#slide-audio");

    const button =
        $("#audio-btn");

    const hide =
        $("#hide-audio-btn");


    if (button && audio) {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                if (
                    audio.style.display ===
                    "none"
                ) {

                    audio.style.display =
                        "block";

                } else {

                    audio.style.display =
                        "none";

                    audio.pause();

                }

            }
        );

    }


    if (hide && audio) {

        hide.addEventListener(
            "click",
            () => {

                audio.pause();

                audio.style.display =
                    "none";

            }
        );

    }

}


/* =========================================================
   40. VIDEO
========================================================= */

function initializeVideo() {

    const video =
        $("#slide-video");

    const button =
        $("#video-btn");

    const hide =
        $("#hide-video-btn");


    if (button && video) {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                if (
                    video.style.display ===
                    "none"
                ) {

                    video.style.display =
                        "block";

                } else {

                    video.pause();

                    video.style.display =
                        "none";

                }

            }
        );

    }


    if (hide && video) {

        hide.addEventListener(
            "click",
            () => {

                video.pause();

                video.style.display =
                    "none";

            }
        );

    }

}


/* =========================================================
   41. LEGACY BUTTONS
========================================================= */

function initializeLegacyButtons() {

    const whiteboard =
        $("#whiteboard-btn");

    const whiteboardElement =
        $("#whiteboard");


    if (
        whiteboard &&
        whiteboardElement
    ) {

        whiteboard.addEventListener(
            "click",
            event => {

                event.preventDefault();

                whiteboardElement.classList.toggle(
                    "visible"
                );

            }
        );

    }


    const edit =
        $("#edit-btn");

    const tray =
        $("#edit-tray");


    if (
        edit &&
        tray
    ) {

        edit.addEventListener(
            "click",
            event => {

                event.preventDefault();

                tray.classList.toggle(
                    "visible"
                );

            }
        );

    }


    const home =
        $("#home-btn");


    if (home) {

        home.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeFocusedCard();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }

}


/* =========================================================
   42. WHITEBOARD
========================================================= */

function initializeWhiteboard() {

    const canvas =
        $("#whiteboard-canvas");

    if (!canvas) {

        return;

    }


    const context =
        canvas.getContext("2d");


    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        const ratio =
            window.devicePixelRatio || 1;


        canvas.width =
            rect.width * ratio;

        canvas.height =
            rect.height * ratio;


        context.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );


        context.lineCap =
            "round";

        context.lineJoin =
            "round";

    }


    resizeCanvas();


    window.addEventListener(
        "resize",
        resizeCanvas
    );


    function getPosition(event) {

        const rect =
            canvas.getBoundingClientRect();


        if (
            event.touches &&
            event.touches.length
        ) {

            return {

                x:
                    event.touches[0].clientX -
                    rect.left,

                y:
                    event.touches[0].clientY -
                    rect.top

            };

        }


        return {

            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top

        };

    }


    function startDrawing(event) {

        state.drawing =
            true;


        const position =
            getPosition(event);


        context.beginPath();


        context.moveTo(
            position.x,
            position.y
        );


        context.strokeStyle =
            state.pencilColor;


        context.lineWidth =
            state.pencilSize;


        event.preventDefault();

    }


    function draw(event) {

        if (
            !state.drawing
        ) {

            return;

        }


        const position =
            getPosition(event);


        context.lineTo(
            position.x,
            position.y
        );


        context.stroke();


        event.preventDefault();

    }


    function stopDrawing() {

        state.drawing =
            false;

        context.closePath();

    }


    canvas.addEventListener(
        "mousedown",
        startDrawing
    );

    canvas.addEventListener(
        "mousemove",
        draw
    );

    canvas.addEventListener(
        "mouseup",
        stopDrawing
    );

    canvas.addEventListener(
        "mouseleave",
        stopDrawing
    );


    canvas.addEventListener(
        "touchstart",
        startDrawing,
        {
            passive: false
        }
    );

    canvas.addEventListener(
        "touchmove",
        draw,
        {
            passive: false
        }
    );

    canvas.addEventListener(
        "touchend",
        stopDrawing
    );


    const clear =
        $("#clear-tool");


    if (clear) {

        clear.addEventListener(
            "click",
            () => {

                context.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

            }
        );

    }

}


/* =========================================================
   43. KEYBOARD
========================================================= */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                if (
                    state.cardOpen
                ) {

                    closeFocusedCard();

                    return;

                }


                closeUploadModal();

                return;

            }


            if (
                event.key === "ArrowLeft"
            ) {

                if (
                    !isTypingTarget(
                        event.target
                    )
                ) {

                    navigateLesson(-1);

                }

            }


            if (
                event.key === "ArrowRight"
            ) {

                if (
                    !isTypingTarget(
                        event.target
                    )
                ) {

                    navigateLesson(1);

                }

            }

        }
    );

}


function isTypingTarget(element) {

    if (!element) {
        return false;
    }


    const tag =
        element.tagName?.toLowerCase();


    return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        element.isContentEditable
    );

}


/* =========================================================
   44. LOCAL PROGRESS
========================================================= */

function saveCurrentLessonLocally() {

    if (
        !state.currentLessonId
    ) {

        return;

    }


    try {

        localStorage.setItem(
            "poliglotaCurrentLesson",
            state.currentLessonId
        );

    } catch (error) {

        console.warn(
            "Could not save lesson:",
            error
        );

    }

}


/* =========================================================
   45. RESTORE LESSON
========================================================= */

function restoreLastLesson() {

    try {

        const id =
            localStorage.getItem(
                "poliglotaCurrentLesson"
            );


        if (
            id &&
            state.lessons.some(
                lesson =>
                    String(lesson.id) ===
                    String(id)
            )
        ) {

            openLesson(id);

            return true;

        }

    } catch (error) {

        console.warn(
            "Could not restore lesson:",
            error
        );

    }


    return false;

}


/* =========================================================
   46. FILE HELPERS
========================================================= */

function sanitizeFileName(filename) {

    return filename

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
        )

        .replace(
            /-+/g,
            "-"
        );

}


function formatFileSize(bytes) {

    if (!bytes) {
        return "0 KB";
    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        bytes /
        Math.pow(
            1024,
            index
        )
    ).toFixed(
        index === 0 ? 0 : 1
    ) +
    " " +
    units[index];

}


/* =========================================================
   47. UPLOAD STATUS
========================================================= */

function showUploadProgress(
    message
) {

    const progress =
        $("#upload-progress");


    if (progress) {

        progress.textContent =
            message;

    }


    showUploadStatus(
        message
    );

}


function showUploadStatus(
    message
) {

    let status =
        $("#upload-status");


    if (!status) {

        status =
            document.createElement(
                "div"
            );

        status.id =
            "upload-status";

        status.className =
            "upload-status";

        document.body.appendChild(
            status
        );

    }


    status.textContent =
        message;

    status.classList.add(
        "visible"
    );


    clearTimeout(
        status._timer
    );


    status._timer =
        setTimeout(
            () => {

                status.classList.remove(
                    "visible"
                );

            },
            4000
        );

}


/* =========================================================
   48. CURRENT USER
========================================================= */

async function getCurrentUser() {

    if (!supabaseClient) {

        return null;

    }


    try {

        const {
            data
        } =
            await supabaseClient
                .auth
                .getUser();


        return (
            data?.user ||
            null
        );

    } catch (error) {

        console.warn(
            "Auth check failed:",
            error
        );

        return null;

    }

}


/* =========================================================
   49. PUBLIC API
========================================================= */

window.PoliglotaLesson = {

    state,

    loadLessons,

    loadMedia,

    openLesson,

    openLessonCard,

    closeLessonCard:
        closeFocusedCard,

    createLessonCard,

    updateLessonCard,

    deleteLessonCard,

    uploadMedia,

    assignMediaToCard,

    getCurrentUser

};


window.poliglotaState =
    state;


console.log(
    "Academia Poliglota — Lesson Card System loaded."
);
