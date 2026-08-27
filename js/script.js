/* =========================================================
   ACADEMIA POLIGLOTA
   INTERACTIVE BOOK PLATFORM
   LESSON CARD ENGINE + SUPABASE MEDIA
   ========================================================= */

/*
   IMPORTANT

   This version changes the lesson experience from:

       IMAGE / SLIDE

   to:

       LESSON
          ↓
       3D CONTENT CARDS
          ↓
       CLICK / TAP
          ↓
       CARD EXPANDS
          ↓
       TEXT / AUDIO / VIDEO / IMAGE

   Supabase is used for media storage and lesson data.

   The code also keeps compatibility with the existing
   presentation / whiteboard / audio / video controls.
*/


/* =========================================================
   01. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "https://kioqhgkpfqdhjqidrlwf.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_ZDAJmFtSl9WNGVlZPyvngA_ZWiv_Q4g";

let supabaseClient = null;

if (
    typeof window.supabase !== "undefined" &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}


/* =========================================================
   02. APPLICATION STATE
   ========================================================= */

const state = {

    currentSlide: 0,

    currentLesson: null,

    currentCard: null,

    lessons: [],

    cards: [],

    media: [],

    units: [],

    currentUnit: null,

    currentLessonId: null,

    isCardOpen: false,

    audioPlaying: false,

    videoPlaying: false,

    zoom: 1,

    drawing: false,

    pencilSize: 5,

    pencilColor: "#111111",

    editMode: false

};


/* =========================================================
   03. LOCAL FALLBACK LESSON DATA

   This allows the application to continue working even
   before Supabase has been configured completely.
   ========================================================= */

const localLessons = [

    {
        id: "lesson-1",

        title: "Introduction",

        unit: "Unit 1",

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
                    "Learn the most important vocabulary from this lesson. Tap the card to see the complete explanation."

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
   04. DOM HELPERS
   ========================================================= */

function $(selector) {

    return document.querySelector(selector);

}


function $all(selector) {

    return Array.from(
        document.querySelectorAll(selector)
    );

}


function createElement(tag, className, content = "") {

    const element =
        document.createElement(tag);

    if (className) {

        element.className =
            className;

    }

    if (content !== "") {

        element.innerHTML =
            content;

    }

    return element;

}


/* =========================================================
   05. INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        initializeApplication();

        initializeExistingControls();

        initializeLessonSystem();

        initializeMediaUpload();

        initializeWhiteboard();

        initializeKeyboard();

        await loadLessons();

    }
);


/* =========================================================
   06. INITIALIZE APPLICATION
   ========================================================= */

function initializeApplication() {

    document.body.classList.add(
        "poliglota-app-ready"
    );

}


/* =========================================================
   07. LESSON SYSTEM
   ========================================================= */

function initializeLessonSystem() {

    /*
       Find an existing lesson container.

       If it doesn't exist in the HTML, create it.
    */

    let lessonContainer =
        document.querySelector(
            "#lesson-content"
        );

    if (!lessonContainer) {

        lessonContainer =
            document.createElement("div");

        lessonContainer.id =
            "lesson-content";

        lessonContainer.className =
            "lesson-content";

        const slideContainer =
            document.querySelector(
                ".slide-container"
            );

        if (slideContainer) {

            slideContainer.appendChild(
                lessonContainer
            );

        } else {

            document.body.appendChild(
                lessonContainer
            );

        }

    }

    /*
       Delegated click handler for cards.
    */

    lessonContainer.addEventListener(
        "click",
        handleCardClick
    );

}


/* =========================================================
   08. LOAD LESSONS
   ========================================================= */

async function loadLessons() {

    /*
       First try Supabase.

       If Supabase isn't ready or the tables don't exist,
       fall back to local lessons.
    */

    if (!supabaseClient) {

        state.lessons =
            localLessons;

        renderLessonList();

        if (state.lessons.length) {

            openLesson(
                state.lessons[0].id
            );

        }

        return;

    }

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("lessons")
            .select(`
                *,
                lesson_cards (
                    *
                )
            `)
            .order(
                "position",
                {
                    ascending: true
                }
            );

        if (error) {

            console.warn(
                "Supabase lessons unavailable:",
                error
            );

            state.lessons =
                localLessons;

        } else {

            state.lessons =
                normalizeLessons(data);

        }

    } catch (error) {

        console.error(
            "Error loading lessons:",
            error
        );

        state.lessons =
            localLessons;

    }

    renderLessonList();

    if (state.lessons.length) {

        openLesson(
            state.lessons[0].id
        );

    }

}


/* =========================================================
   09. NORMALIZE SUPABASE LESSONS
   ========================================================= */

function normalizeLessons(data) {

    if (!Array.isArray(data)) {

        return [];

    }

    return data.map(
        lesson => {

            return {

                id:
                    lesson.id,

                title:
                    lesson.title ||
                    "Lesson",

                unit:
                    lesson.unit ||
                    "",

                description:
                    lesson.description ||
                    "",

                cards:
                    Array.isArray(
                        lesson.lesson_cards
                    )
                        ?
                        lesson.lesson_cards
                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    (
                                        a.position ||
                                        0
                                    ) -
                                    (
                                        b.position ||
                                        0
                                    )
                            )
                        :
                        []

            };

        }
    );

}


/* =========================================================
   10. RENDER LESSON LIST
   ========================================================= */

function renderLessonList() {

    const containers = [

        "#students-book-dropdown",

        "#presentation-list-container",

        "#presentations-unit-container"

    ];

    containers.forEach(
        selector => {

            const container =
                document.querySelector(
                    selector
                );

            if (!container) {

                return;

            }

            /*
               Don't destroy existing controls that may
               belong to the original application.
            */

        }
    );

}


/* =========================================================
   11. OPEN LESSON
   ========================================================= */

async function openLesson(lessonId) {

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

    state.cards =
        lesson.cards || [];

    state.currentCard =
        null;

    state.isCardOpen =
        false;

    hideLegacySlide();

    renderLesson();

    saveCurrentLessonLocally();

}


/* =========================================================
   12. RENDER LESSON
   ========================================================= */

function renderLesson() {

    const container =
        document.querySelector(
            "#lesson-content"
        );

    if (!container) {

        return;

    }

    container.innerHTML = "";

    container.classList.add(
        "lesson-card-mode"
    );


    /* -----------------------------------------------------
       LESSON HEADER
       ----------------------------------------------------- */

    const header =
        document.createElement("div");

    header.className =
        "lesson-header";


    const unit =
        document.createElement("div");

    unit.className =
        "lesson-unit";

    unit.textContent =
        state.currentLesson.unit ||
        "LESSON";


    const title =
        document.createElement("h1");

    title.className =
        "lesson-title";

    title.textContent =
        state.currentLesson.title ||
        "Lesson";


    const description =
        document.createElement("p");

    description.className =
        "lesson-description";

    description.textContent =
        state.currentLesson.description ||
        "Explore the lesson cards below.";


    header.appendChild(unit);

    header.appendChild(title);

    if (
        state.currentLesson.description
    ) {

        header.appendChild(
            description
        );

    }


    /* -----------------------------------------------------
       CARD GRID
       ----------------------------------------------------- */

    const grid =
        document.createElement("div");

    grid.className =
        "lesson-card-grid";


    if (!state.cards.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "lesson-empty";

        empty.innerHTML = `
            <div class="lesson-empty-icon">
                +
            </div>

            <h3>
                No lesson content yet
            </h3>

            <p>
                Add lesson cards from Supabase.
            </p>
        `;

        grid.appendChild(
            empty
        );

    } else {

        state.cards.forEach(
            (card, index) => {

                grid.appendChild(
                    createLessonCard(
                        card,
                        index
                    )
                );

            }
        );

    }


    container.appendChild(
        header
    );

    container.appendChild(
        grid
    );

}


/* =========================================================
   13. CREATE 3D CARD
   ========================================================= */

function createLessonCard(
    card,
    index
) {

    const wrapper =
        document.createElement("article");

    wrapper.className =
        "lesson-card-wrapper";


    const element =
        document.createElement("div");

    element.className =
        "lesson-card";

    element.dataset.cardId =
        card.id || index;

    element.dataset.cardType =
        card.type || "text";


    /* -----------------------------------------------------
       CARD FRONT
       ----------------------------------------------------- */

    const front =
        document.createElement("div");

    front.className =
        "lesson-card-front";


    const icon =
        document.createElement("div");

    icon.className =
        "lesson-card-icon";

    icon.innerHTML =
        getCardIcon(
            card.type
        );


    const title =
        document.createElement("h2");

    title.className =
        "lesson-card-title";

    title.textContent =
        card.title ||
        "Lesson content";


    const subtitle =
        document.createElement("p");

    subtitle.className =
        "lesson-card-subtitle";

    subtitle.textContent =
        card.subtitle ||
        getCardTypeLabel(
            card.type
        );


    const hint =
        document.createElement("div");

    hint.className =
        "lesson-card-hint";

    hint.innerHTML =
        "Tap to explore <span>→</span>";


    front.appendChild(
        icon
    );

    front.appendChild(
        title
    );

    front.appendChild(
        subtitle
    );

    front.appendChild(
        hint
    );


    /* -----------------------------------------------------
       CARD BACK / EXPANDED CONTENT
       ----------------------------------------------------- */

    const back =
        document.createElement("div");

    back.className =
        "lesson-card-back";


    const close =
        document.createElement("button");

    close.className =
        "lesson-card-close";

    close.type =
        "button";

    close.innerHTML =
        "×";

    close.setAttribute(
        "aria-label",
        "Close"
    );


    const expandedTitle =
        document.createElement("h2");

    expandedTitle.className =
        "lesson-card-expanded-title";

    expandedTitle.textContent =
        card.title ||
        "Lesson content";


    const content =
        document.createElement("div");

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


    element.appendChild(
        front
    );

    element.appendChild(
        back
    );


    wrapper.appendChild(
        element
    );


    /*
       Close button.
    */

    close.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            closeLessonCard(
                element
            );

        }
    );


    /*
       Card click.
    */

    element.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".lesson-card-close"
                )
            ) {

                return;

            }

            openLessonCard(
                element,
                card
            );

        }
    );


    return wrapper;

}


/* =========================================================
   14. CARD ICONS
   ========================================================= */

function getCardIcon(type) {

    switch (
        String(type || "")
            .toLowerCase()
    ) {

        case "audio":
            return "🎧";

        case "video":
            return "▶";

        case "image":
            return "▣";

        case "text":
        case "explanation":
            return "Aa";

        case "question":
            return "?";

        case "exercise":
            return "✓";

        case "grammar":
            return "Aa";

        case "listening":
            return "♫";

        case "speaking":
            return "◉";

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

        case "text":
            return "Explanation";

        case "question":
            return "Question";

        case "exercise":
            return "Practice";

        case "grammar":
            return "Grammar";

        case "listening":
            return "Listening";

        case "speaking":
            return "Speaking";

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


    /*
       TEXT
    */

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
                card.content ||
                ""
            );

        container.appendChild(
            text
        );

        return;

    }


    /*
       IMAGE
    */

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

        }

        if (
            card.content
        ) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /*
       AUDIO
    */

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

        if (
            card.content
        ) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /*
       VIDEO
    */

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

        if (
            card.content
        ) {

            appendDescription(
                container,
                card.content
            );

        }

        return;

    }


    /*
       DEFAULT
    */

    if (
        card.content
    ) {

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
            ${mediaType}
        </strong>

        <span>
            No ${mediaType.toLowerCase()} has been uploaded yet.
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
    element,
    card
) {

    /*
       Close other cards first.
    */

    $all(
        ".lesson-card.is-expanded"
    ).forEach(
        other => {

            if (
                other !== element
            ) {

                other.classList.remove(
                    "is-expanded"
                );

            }

        }
    );


    element.classList.add(
        "is-expanded"
    );


    document.body.classList.add(
        "lesson-card-open"
    );


    state.currentCard =
        card;

    state.isCardOpen =
        true;


    /*
       Focus expanded card.
    */

    setTimeout(
        () => {

            element.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        },
        50
    );

}


/* =========================================================
   20. CLOSE CARD
   ========================================================= */

function closeLessonCard(
    element
) {

    element.classList.remove(
        "is-expanded"
    );

    state.currentCard =
        null;

    state.isCardOpen =
        false;

    document.body.classList.remove(
        "lesson-card-open"
    );

}


/* =========================================================
   21. CARD CLICK FALLBACK
   ========================================================= */

function handleCardClick(
    event
) {

    const card =
        event.target.closest(
            ".lesson-card"
        );

    if (!card) {

        return;

    }

}


/* =========================================================
   22. HIDE ORIGINAL SLIDE
   ========================================================= */

function hideLegacySlide() {

    const image =
        document.querySelector(
            "#slide-image"
        );

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
   23. SANITIZE CONTENT
   ========================================================= */

function sanitizeLessonHTML(
    html
) {

    /*
       Basic protection.

       Text supplied by teachers should preferably be
       stored as plain text.

       This permits basic formatting while removing
       dangerous script / iframe elements.
    */

    const temp =
        document.createElement(
            "div"
        );

    temp.innerHTML =
        String(
            html || ""
        );

    temp.querySelectorAll(
        "script, iframe, object, embed"
    ).forEach(
        element =>
            element.remove()
    );

    return temp.innerHTML;

}


/* =========================================================
   24. SUPABASE MEDIA
   ========================================================= */

async function loadMedia() {

    if (!supabaseClient) {

        return [];

    }

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("lesson_media")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {

            console.error(
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
   25. UPLOAD SYSTEM
   ========================================================= */

function initializeMediaUpload() {

    const uploadButton =
        document.querySelector(
            "#upload-media-btn"
        );

    const fileInput =
        document.querySelector(
            "#media-upload-input"
        );


    if (
        !uploadButton ||
        !fileInput
    ) {

        return;

    }


    uploadButton.addEventListener(
        "click",
        () => {

            fileInput.click();

        }
    );


    fileInput.addEventListener(
        "change",
        async event => {

            const files =
                Array.from(
                    event.target.files || []
                );

            if (!files.length) {

                return;

            }

            for (
                const file of files
            ) {

                await uploadMedia(
                    file
                );

            }

            fileInput.value =
                "";

        }
    );

}


/* =========================================================
   26. UPLOAD MEDIA
   ========================================================= */

async function uploadMedia(
    file
) {

    if (!supabaseClient) {

        alert(
            "Supabase is not configured yet."
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

        "video/ogg"

    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        alert(
            "This file type is not supported."
        );

        return null;

    }


    /*
       Maximum file size.

       Change this according to your
       Supabase Storage plan.
    */

    const maxSize =
        500 * 1024 * 1024;


    if (
        file.size > maxSize
    ) {

        alert(
            "The file is larger than 500 MB."
        );

        return null;

    }


    const extension =
        getFileExtension(
            file.name
        );


    const safeName =
        sanitizeFileName(
            file.name
        );


    const path =
        `${Date.now()}-${safeName}`;


    showUploadStatus(
        `Uploading ${file.name}...`
    );


    try {

        const {
            error
        } = await supabaseClient
            .storage
            .from(
                "lesson-media"
            )
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
                .from(
                    "lesson-media"
                )
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
            error:
                databaseError
        } =
            await supabaseClient
                .from(
                    "lesson_media"
                )
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

            /*
               The storage upload succeeded but
               database insertion failed.
            */

            console.error(
                "Media DB error:",
                databaseError
            );

            showUploadStatus(
                "File uploaded, but media record could not be saved."
            );

            return null;

        }


        state.media.push(
            data
        );


        showUploadStatus(
            `${file.name} uploaded successfully.`
        );


        return data;


    } catch (error) {

        console.error(
            "Upload failed:",
            error
        );

        showUploadStatus(
            `Upload failed: ${error.message}`
        );

        return null;

    }

}


/* =========================================================
   27. MEDIA TYPE
   ========================================================= */

function detectMediaType(
    mime
) {

    if (
        mime.startsWith(
            "image/"
        )
    ) {

        return "image";

    }

    if (
        mime.startsWith(
            "audio/"
        )
    ) {

        return "audio";

    }

    if (
        mime.startsWith(
            "video/"
        )
    ) {

        return "video";

    }

    return "other";

}


/* =========================================================
   28. DELETE MEDIA
   ========================================================= */

async function deleteMedia(
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
                .from(
                    "lesson_media"
                )
                .select("*")
                .eq(
                    "id",
                    mediaId
                )
                .single();


        if (error) {

            throw error;

        }


        /*
           Delete storage file.
        */

        if (
            media.file_path
        ) {

            const {
                error:
                    storageError
            } =
                await supabaseClient
                    .storage
                    .from(
                        "lesson-media"
                    )
                    .remove([
                        media.file_path
                    ]);


            if (
                storageError
            ) {

                console.warn(
                    "Storage deletion error:",
                    storageError
                );

            }

        }


        /*
           Delete database record.
        */

        const {
            error:
                databaseError
        } =
            await supabaseClient
                .from(
                    "lesson_media"
                )
                .delete()
                .eq(
                    "id",
                    mediaId
                );


        if (
            databaseError
        ) {

            throw databaseError;

        }


        state.media =
            state.media.filter(
                item =>
                    item.id !==
                    mediaId
            );


        showUploadStatus(
            "Media deleted."
        );


        return true;


    } catch (error) {

        console.error(
            "Could not delete media:",
            error
        );

        showUploadStatus(
            `Delete failed: ${error.message}`
        );

        return false;

    }

}


/* =========================================================
   29. FILE NAME HELPERS
   ========================================================= */

function sanitizeFileName(
    filename
) {

    return filename
        .normalize(
            "NFD"
        )
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


function getFileExtension(
    filename
) {

    const parts =
        filename.split(".");

    return parts.length > 1
        ? parts.pop()
        : "";

}


/* =========================================================
   30. UPLOAD STATUS
   ========================================================= */

function showUploadStatus(
    message
) {

    let status =
        document.querySelector(
            "#upload-status"
        );


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
   31. ASSIGN MEDIA TO CARD
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
                .from(
                    "lesson_media"
                )
                .select(
                    "*"
                )
                .eq(
                    "id",
                    mediaId
                )
                .single();


        if (error) {

            throw error;

        }


        const {
            error:
                updateError
        } =
            await supabaseClient
                .from(
                    "lesson_cards"
                )
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
   32. CREATE LESSON CARD
   ========================================================= */

async function createLessonCard(
    lessonId,
    cardData
) {

    if (!supabaseClient) {

        return null;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "lesson_cards"
                )
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

                    position:
                        cardData.position ||
                        0

                })
                .select()
                .single();


        if (error) {

            throw error;

        }


        await loadLessons();


        return data;

    } catch (error) {

        console.error(
            "Could not create card:",
            error
        );

        return null;

    }

}


/* =========================================================
   33. DELETE LESSON CARD
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
                .from(
                    "lesson_cards"
                )
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
   34. UPDATE LESSON CARD
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
                .from(
                    "lesson_cards"
                )
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
   35. EXISTING CONTROLS
   ========================================================= */

function initializeExistingControls() {

    initializeNavigation();

    initializeAudio();

    initializeVideo();

    initializePresentation();

    initializeDropdowns();

}


/* =========================================================
   36. NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const previous =
        document.querySelector(
            "#prev-btn"
        );

    const next =
        document.querySelector(
            "#next-btn"
        );


    if (previous) {

        previous.addEventListener(
            "click",
            () => {

                navigateLesson(
                    -1
                );

            }
        );

    }


    if (next) {

        next.addEventListener(
            "click",
            () => {

                navigateLesson(
                    1
                );

            }
        );

    }

}


/* =========================================================
   37. LESSON NAVIGATION
   ========================================================= */

function navigateLesson(
    direction
) {

    if (
        !state.lessons.length
    ) {

        return;

    }


    const index =
        state.lessons.findIndex(
            lesson =>
                lesson.id ===
                state.currentLessonId
        );


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

        nextIndex =
            0;

    }


    openLesson(
        state.lessons[
            nextIndex
        ].id
    );

}


/* =========================================================
   38. AUDIO
   ========================================================= */

function initializeAudio() {

    const audio =
        document.querySelector(
            "#slide-audio"
        );

    const hideButton =
        document.querySelector(
            "#hide-audio-btn"
        );


    if (
        hideButton &&
        audio
    ) {

        hideButton.addEventListener(
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
   39. VIDEO
   ========================================================= */

function initializeVideo() {

    const video =
        document.querySelector(
            "#slide-video"
        );

    const hideButton =
        document.querySelector(
            "#hide-video-btn"
        );


    if (
        hideButton &&
        video
    ) {

        hideButton.addEventListener(
            "click",
            () => {

                video.pause();

                video.close?.();

                video.style.display =
                    "none";

            }
        );

    }

}


/* =========================================================
   40. PRESENTATION
   ========================================================= */

function initializePresentation() {

    const viewer =
        document.querySelector(
            "#presentation-viewer"
        );

    const frame =
        document.querySelector(
            "#presentation-frame"
        );

    const close =
        document.querySelector(
            "#hide-presentation-btn"
        );


    if (close) {

        close.addEventListener(
            "click",
            () => {

                if (frame) {

                    frame.src =
                        "about:blank";

                }

                if (viewer) {

                    viewer.style.display =
                        "none";

                }

                close.style.display =
                    "none";

            }
        );

    }

}


/* =========================================================
   41. DROPDOWNS
   ========================================================= */

function initializeDropdowns() {

    $all(
        ".dropdown"
    ).forEach(
        dropdown => {

            const icon =
                dropdown.querySelector(
                    ".control-icon"
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
   42. WHITEBOARD
   ========================================================= */

function initializeWhiteboard() {

    const canvas =
        document.querySelector(
            "#whiteboard-canvas"
        );

    if (!canvas) {

        return;

    }


    const context =
        canvas.getContext(
            "2d"
        );


    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        const ratio =
            window.devicePixelRatio ||
            1;


        canvas.width =
            rect.width *
            ratio;

        canvas.height =
            rect.height *
            ratio;


        context.scale(
            ratio,
            ratio
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


    function getPosition(
        event
    ) {

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


    function startDrawing(
        event
    ) {

        state.drawing =
            true;


        const pos =
            getPosition(
                event
            );


        context.beginPath();

        context.moveTo(
            pos.x,
            pos.y
        );

        context.strokeStyle =
            state.pencilColor;

        context.lineWidth =
            state.pencilSize;


        event.preventDefault();

    }


    function draw(
        event
    ) {

        if (
            !state.drawing
        ) {

            return;

        }


        const pos =
            getPosition(
                event
            );


        context.lineTo(
            pos.x,
            pos.y
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
        document.querySelector(
            "#clear-tool"
        );


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
                event.key ===
                "Escape"
            ) {

                $all(
                    ".lesson-card.is-expanded"
                ).forEach(
                    card =>
                        closeLessonCard(
                            card
                        )
                );

                return;

            }


            if (
                event.key ===
                "ArrowLeft"
            ) {

                navigateLesson(
                    -1
                );

            }


            if (
                event.key ===
                "ArrowRight"
            ) {

                navigateLesson(
                    1
                );

            }

        }
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

    } catch (
        error
    ) {

        console.warn(
            "Could not save lesson state.",
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
                    String(
                        lesson.id
                    ) ===
                    String(id)
            )
        ) {

            openLesson(
                id
            );

            return true;

        }

    } catch (
        error
    ) {

        console.warn(
            "Could not restore lesson.",
            error
        );

    }

    return false;

}


/* =========================================================
   46. SUPABASE AUTH CHECK
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


        return data?.user ||
            null;

    } catch (
        error
    ) {

        console.warn(
            "Auth check failed:",
            error
        );

        return null;

    }

}


/* =========================================================
   47. EXPORT API
   ========================================================= */

window.PoliglotaLesson = {

    state,

    loadLessons,

    openLesson,

    openLessonCard,

    closeLessonCard,

    createLessonCard,

    updateLessonCard,

    deleteLessonCard,

    uploadMedia,

    deleteMedia,

    assignMediaToCard,

    loadMedia,

    getCurrentUser

};


/* =========================================================
   48. DEBUG
   ========================================================= */

window.poliglotaState =
    state;

console.log(
    "Academia Poliglota lesson card system loaded."
);
