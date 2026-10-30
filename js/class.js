const slideImage = document.getElementById("slide-image");
const slideContainer = document.querySelector(".slide-container");
const homeBtn = document.getElementById("home-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const studentDropdownLinks = document.querySelectorAll("#students-book-dropdown a");
const activityDropdownLinks = document.querySelectorAll("#activity-book-dropdown a");
const dropdownBtns = document.querySelectorAll(".dropdown-btn");

const audioBtn = document.getElementById("audio-btn");
const audioListContainer = document.getElementById("audio-list-container");
const audioPlayer = document.getElementById("slide-audio");
const audioSource = document.getElementById("audio-source");
const hideAudioBtn = document.getElementById("hide-audio-btn");

const videoBtnImage = document.querySelector('a img[alt="Videos"]');
const videoBtn = videoBtnImage ? videoBtnImage.closest("a") : null;

const videoPlayer = document.getElementById("slide-video");
const videoSource = document.getElementById("video-source");
const hideVideoBtn = document.getElementById("hide-video-btn");

const gamesBtn = document.getElementById("games-btn");

const editCanvas = document.getElementById("edit-canvas");
const whiteboardCanvas = document.getElementById("whiteboard-canvas");

const editBtn = document.getElementById("edit-btn");
const editTray = document.getElementById("edit-tray");
const pencilTool = document.getElementById("pencil-tool");
const penTool = document.getElementById("pen-tool");
const eraserTool = document.getElementById("eraser-tool");
const highlightTool = document.getElementById("highlight-tool");
const textTool = document.getElementById("text-tool");
const clearTool = document.getElementById("clear-tool");

const whiteboardBtn = document.getElementById("whiteboard-btn");
const whiteboard = document.getElementById("whiteboard");

const gamesHub = document.getElementById("games-hub");
const gameCards = document.querySelectorAll(".game-card");

const editCtx = editCanvas ? editCanvas.getContext("2d") : null;
const whiteboardCtx = whiteboardCanvas
    ? whiteboardCanvas.getContext("2d")
    : null;

const MAX_CARDS_PER_LESSON = 8;
const LESSON_MEDIA_BUCKET = "lesson-media";

let currentImages = [];
let currentIndex = 0;
let currentScale = 1;

let activeStudentUnit = null;
let activeStudentLesson = null;

let activeLessonRecord = null;
let activeLessonCards = [];
let activeLessonContent = [];

let drawingCanvas = editCanvas;
let drawingCtx = editCtx;

let currentTool = null;
let strokes = [];
let currentStroke = null;
let drawing = false;

let pencilSize = 3;
let activeTextBox = null;

let pinchStartDistance = null;
let pinchStartScale = 1;

let cardZoomScale = 1;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const MIN_CARD_ZOOM = 0.5;
const MAX_CARD_ZOOM = 3;
const CARD_ZOOM_STEP = 0.1;

let textToolbar = null;


// ============================================================
// GENERAL HELPERS
// ============================================================

function getClassroomSupabaseClient() {
    const client = window.supabaseClient;

    if (!client) {
        throw new Error(
            "Supabase is not initialized. Check js/supabase.js."
        );
    }

    return client;
}

function saveCurrentState(bookType, unit, pageNum) {
    localStorage.setItem(
        "pptkb1State",
        JSON.stringify({ bookType, unit, pageNum })
    );
}

function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;

    return Math.sqrt(dx * dx + dy * dy);
}


// ============================================================
// DROPDOWN TOGGLE
// ============================================================

dropdownBtns.forEach(btn => {
    btn.addEventListener("click", event => {
        event.stopPropagation();

        const parentDropdown = btn.parentElement;

        document.querySelectorAll(".dropdown").forEach(dropdown => {
            if (dropdown !== parentDropdown) {
                dropdown.classList.remove("show");
            }
        });

        parentDropdown.classList.toggle("show");
    });
});

window.addEventListener("click", () => {
    document.querySelectorAll(".dropdown").forEach(dropdown => {
        dropdown.classList.remove("show");
    });
});


// ============================================================
// ORIGINAL PRESENTATION IMAGE
// ============================================================

function autoFitImage() {
    if (
        !slideContainer ||
        !slideImage ||
        !slideImage.naturalWidth ||
        !slideImage.naturalHeight
    ) {
        return;
    }

    const containerWidth = slideContainer.clientWidth;
    const containerHeight = slideContainer.clientHeight;

    if (!containerWidth || !containerHeight) {
        return;
    }

    const scaleX = containerWidth / slideImage.naturalWidth;
    const scaleY = containerHeight / slideImage.naturalHeight;

    currentScale = Math.min(scaleX, scaleY);

    slideImage.style.width =
        slideImage.naturalWidth * currentScale + "px";

    slideImage.style.height =
        slideImage.naturalHeight * currentScale + "px";

    resizeEditCanvas();
}

function loadImage(src) {
    if (!slideImage || !src) {
        return;
    }

    slideImage.onload = autoFitImage;
    slideImage.onerror = () => {
        console.error("Unable to load presentation image:", src);
    };

    slideImage.src = src;

    if (slideImage.complete && slideImage.naturalWidth) {
        autoFitImage();
    }
}

function loadHome() {
    currentImages = [];
    currentIndex = 0;

    hideLessonCardView();
    closeOpenLessonViewer();

    loadImage("images/homepage.jpg");

    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
}


// ============================================================
// STUDENT BOOK — SUPABASE LESSON SYSTEM
// ============================================================

function getLessonCardContainer() {
    let container = document.getElementById("lesson-card-grid");

    if (!container) {
        container = document.createElement("div");
        container.id = "lesson-card-grid";
        container.setAttribute("aria-live", "polite");

        if (!slideContainer) {
            throw new Error(
                "The .slide-container element was not found."
            );
        }

        slideContainer.appendChild(container);
    }

    return container;
}

function showLessonCardView() {
    const container = getLessonCardContainer();
    const slideWrapper = document.querySelector(".slide-wrapper");

    if (slideWrapper) {
        slideWrapper.style.display = "none";
    }

    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";

    if (audioListContainer) {
        audioListContainer.style.display = "none";
    }

    const videoList = document.getElementById("video-list-container");

    if (videoList) {
        videoList.style.display = "none";
    }

    container.style.display = "grid";

    return container;
}

function hideLessonCardView() {
    const container = document.getElementById("lesson-card-grid");
    const slideWrapper = document.querySelector(".slide-wrapper");

    if (container) {
        container.style.display = "none";
    }

    if (slideWrapper) {
        slideWrapper.style.display = "";
    }

    if (prevBtn) prevBtn.style.display = "";
    if (nextBtn) nextBtn.style.display = "";
}

function showLessonMessage(titleText, messageText, isError = false) {
    const container = showLessonCardView();

    container.replaceChildren();

    const messageBox = document.createElement("div");
    messageBox.className = "lesson-empty-state";

    const title = document.createElement("h2");
    title.textContent = titleText;

    const message = document.createElement("p");
    message.textContent = messageText;

    messageBox.append(title, message);

    if (isError) {
        messageBox.classList.add("lesson-load-error");
    }

    container.appendChild(messageBox);

    return container;
}

async function getLessonContentUrl(content) {
    if (!content.storage_path) {
        return null;
    }

    const client = getClassroomSupabaseClient();

    const { data, error } = await client.storage
        .from(LESSON_MEDIA_BUCKET)
        .createSignedUrl(content.storage_path, 3600);

    if (error) {
        console.error(
            "Could not create a signed URL for lesson content:",
            {
                contentId: content.id,
                storagePath: content.storage_path,
                error
            }
        );

        return null;
    }

    return data?.signedUrl || null;
}

async function renderStudentLesson(unitNumber, lessonNumber) {
    activeStudentUnit = String(unitNumber);
    activeStudentLesson = String(lessonNumber);

    activeLessonRecord = null;
    activeLessonCards = [];
    activeLessonContent = [];

    closeOpenLessonViewer();

    const container = showLessonCardView();
    container.replaceChildren();

    const loading = document.createElement("div");
    loading.className = "lesson-empty-state";
    loading.textContent = "Loading lesson from Supabase...";

    container.appendChild(loading);

    try {
        const client = getClassroomSupabaseClient();

        const { data: lesson, error: lessonError } = await client
            .from("lessons")
            .select("*")
            .eq("unit_number", Number(unitNumber))
            .eq("lesson_number", Number(lessonNumber))
            .maybeSingle();

        if (lessonError) {
            throw lessonError;
        }

        if (!lesson) {
            showLessonMessage(
                `Unit ${unitNumber} — Lesson ${lessonNumber}`,
                "This lesson has not been created in the Content Manager yet."
            );

            return;
        }

        activeLessonRecord = lesson;

        const { data: cards, error: cardsError } = await client
            .from("lesson_cards")
            .select("*")
            .eq("lesson_id", lesson.id)
            .order("card_number", { ascending: true });

        if (cardsError) {
            throw cardsError;
        }

        activeLessonCards = (cards || []).slice(
            0,
            MAX_CARDS_PER_LESSON
        );

        if (activeLessonCards.length > 0) {
            const cardIds = activeLessonCards.map(card => card.id);

            const { data: content, error: contentError } = await client
                .from("lesson_content")
                .select("*")
                .in("card_id", cardIds)
                .order("created_at", { ascending: true });

            if (contentError) {
                throw contentError;
            }

            activeLessonContent = await Promise.all(
                (content || []).map(async item => {
                    if (!item.storage_path) {
                        return item;
                    }

                    const signedUrl = await getLessonContentUrl(item);

                    return {
                        ...item,
                        signed_url: signedUrl
                    };
                })
            );
        }

        renderStudentLessonCards();

    } catch (error) {
        console.error("Could not load lesson from Supabase:", error);

        showLessonMessage(
            "Unable to load this lesson",
            error.message ||
                "An error occurred while retrieving the lesson from Supabase.",
            true
        );
    }
}

function renderStudentLessonCards() {
    const container = showLessonCardView();

    container.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "lesson-heading";

    const title = document.createElement("h1");
    title.textContent =
        activeLessonRecord?.title ||
        `Unit ${activeStudentUnit} — Lesson ${activeStudentLesson}`;

    const subtitle = document.createElement("p");
    subtitle.textContent =
        activeLessonRecord?.description ||
        `Unit ${activeStudentUnit} · Lesson ${activeStudentLesson}`;

    heading.append(title, subtitle);
    container.appendChild(heading);

    if (activeLessonCards.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "lesson-empty-state";

        const emptyTitle = document.createElement("h2");
        emptyTitle.textContent = "No cards available yet";

        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
            "This lesson exists, but no cards have been created for it yet.";

        emptyState.append(emptyTitle, emptyMessage);
        container.appendChild(emptyState);

        return;
    }

    activeLessonCards.forEach(card => {
        const cardElement = document.createElement("button");

        cardElement.type = "button";
        cardElement.className = "lesson-content-card";
        cardElement.dataset.cardId = card.id;

        const cardNumber = document.createElement("span");
        cardNumber.className = "lesson-card-number";
        cardNumber.textContent = `Card ${card.card_number}`;

        const cardTitle = document.createElement("h2");
        cardTitle.textContent = card.title || `Card ${card.card_number}`;

        const cardContent = activeLessonContent.filter(
            item => String(item.card_id) === String(card.id)
        );

        const cardDescription = document.createElement("p");

        if (cardContent.length === 0) {
            cardDescription.textContent = "No content added yet.";
        } else if (cardContent.length === 1) {
            cardDescription.textContent =
                cardContent[0].title || "1 content item";
        } else {
            cardDescription.textContent =
                `${cardContent.length} content items`;
        }

        cardElement.append(cardNumber, cardTitle, cardDescription);

        cardElement.addEventListener("click", () => {
            openLessonCard(card);
        });

        container.appendChild(cardElement);
    });
}


// ============================================================
// EXPANDED LESSON CARD VIEWER
// ============================================================

function closeOpenLessonViewer() {
    const viewer = document.getElementById("lesson-card-viewer");

    if (viewer) {
        viewer.querySelectorAll("audio, video").forEach(media => {
            media.pause();
        });

        viewer.remove();
    }

    if (drawingCanvas?.id === "lesson-card-edit-canvas") {
        setDrawingTarget("slide");
    }

    if (
        activeTextBox &&
        activeTextBox.dataset.canvas === "lesson-card-edit-canvas"
    ) {
        activeTextBox = null;

        if (textToolbar) {
            textToolbar.style.display = "none";
        }
    }

    drawing = false;
    currentStroke = null;
}

function appendUnavailableMessage(container, messageText) {
    const message = document.createElement("p");

    message.className = "lesson-content-error";
    message.textContent = messageText;

    container.appendChild(message);
}

function openLessonCard(card) {
    closeOpenLessonViewer();

    const viewer = document.createElement("div");
    viewer.id = "lesson-card-viewer";

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.className = "lesson-viewer-close";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close lesson card");

    const zoomArea = document.createElement("div");
    zoomArea.className = "lesson-viewer-zoom-area";

    const contentArea = document.createElement("div");
    contentArea.className = "lesson-viewer-content";

    // The content area is the coordinate system for the canvas
    // and for text boxes added to this expanded card.
    contentArea.style.position = "relative";

    const title = document.createElement("h2");
    title.textContent = card.title || `Card ${card.card_number}`;
    contentArea.appendChild(title);

    const cardContent = activeLessonContent.filter(
        item => String(item.card_id) === String(card.id)
    );

    if (cardContent.length === 0) {
        const emptyMessage = document.createElement("p");

        emptyMessage.textContent =
            "No content has been added to this card yet.";

        contentArea.appendChild(emptyMessage);
    }

    cardContent.forEach(item => {
        const itemContainer = document.createElement("section");
        itemContainer.className = "lesson-viewer-item";

        const itemTitle = document.createElement("h3");
        itemTitle.className = "lesson-viewer-item-title";
        itemTitle.textContent = item.title || "Lesson content";

        itemContainer.appendChild(itemTitle);

        const type = String(item.content_type || "text").toLowerCase();
        const mediaUrl = item.signed_url || "";

        if (item.text_content) {
            const text = document.createElement("div");

            text.className = "lesson-viewer-text";
            text.textContent = item.text_content;

            itemContainer.appendChild(text);
        }

        if (type === "image") {
            if (mediaUrl) {
                const image = document.createElement("img");

                image.className = "lesson-viewer-media";
                image.src = mediaUrl;
                image.alt = item.title || "Lesson image";
                image.loading = "lazy";

                itemContainer.appendChild(image);
            } else if (item.storage_path) {
                appendUnavailableMessage(
                    itemContainer,
                    "This image could not be loaded. Check the Supabase Storage permissions."
                );
            }
        } else if (type === "audio") {
            if (mediaUrl) {
                const audio = document.createElement("audio");

                audio.className = "lesson-viewer-media";
                audio.controls = true;
                audio.preload = "metadata";
                audio.src = mediaUrl;

                itemContainer.appendChild(audio);
            } else if (item.storage_path) {
                appendUnavailableMessage(
                    itemContainer,
                    "This audio file could not be loaded. Check the Supabase Storage permissions."
                );
            }
        } else if (type === "video") {
            if (mediaUrl) {
                const video = document.createElement("video");

                video.className = "lesson-viewer-media";
                video.controls = true;
                video.preload = "metadata";
                video.playsInline = true;
                video.src = mediaUrl;

                itemContainer.appendChild(video);
            } else if (item.storage_path) {
                appendUnavailableMessage(
                    itemContainer,
                    "This video could not be loaded. Check the Supabase Storage permissions."
                );
            }
        } else if (type === "file" || type === "game") {
            if (mediaUrl) {
                const fileLink = document.createElement("a");

                fileLink.href = mediaUrl;
                fileLink.target = "_blank";
                fileLink.rel = "noopener noreferrer";
                fileLink.textContent =
                    item.original_filename ||
                    item.file_name ||
                    "Open resource";

                itemContainer.appendChild(fileLink);
            } else if (item.storage_path) {
                appendUnavailableMessage(
                    itemContainer,
                    "This resource could not be opened. Check the Supabase Storage permissions."
                );
            }
        }

        contentArea.appendChild(itemContainer);
    });

    // Add the canvas AFTER the lesson content so it covers the entire card.
    // CSS will make it fill the content area.
    const cardEditCanvas = document.createElement("canvas");

    cardEditCanvas.id = "lesson-card-edit-canvas";
    cardEditCanvas.className = "lesson-card-edit-canvas";
    cardEditCanvas.setAttribute(
        "aria-label",
        "Lesson card editing canvas"
    );

    contentArea.appendChild(cardEditCanvas);

    zoomArea.appendChild(contentArea);
    viewer.append(closeButton, zoomArea);
    document.body.appendChild(viewer);

    cardZoomScale = 1;
    zoomArea.style.transform = "scale(1)";

    closeButton.addEventListener("click", () => {
        closeOpenLessonViewer();
    });

    // Ctrl + mouse wheel zooms the card without zooming the browser.
    zoomArea.addEventListener("wheel", event => {
        if (!event.ctrlKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        cardZoomScale += event.deltaY < 0
            ? CARD_ZOOM_STEP
            : -CARD_ZOOM_STEP;

        cardZoomScale = Math.max(
            MIN_CARD_ZOOM,
            Math.min(MAX_CARD_ZOOM, cardZoomScale)
        );

        zoomArea.style.transform = `scale(${cardZoomScale})`;
    }, { passive: false });

    attachDrawingEvents(cardEditCanvas);

    cardEditCanvas.addEventListener("click", handleTextClick);

    setDrawingTarget("lesson-card", cardEditCanvas);

    requestAnimationFrame(() => {
        resizeLessonCardCanvas();
        updateCursor();
    });
}


// ============================================================
// SELECT A STUDENT BOOK UNIT
// ============================================================

function loadStudentUnit(unitNumber) {
    closeOpenLessonViewer();

    activeStudentUnit = String(unitNumber);
    activeStudentLesson = null;

    activeLessonRecord = null;
    activeLessonCards = [];
    activeLessonContent = [];

    showLessonMessage(
        `Unit ${unitNumber}`,
        "Choose a lesson from the Student Book menu."
    );
}


// ============================================================
// ACTIVITY BOOK
// ============================================================

function loadActivityUnit(unitNumber) {
    currentImages = [];
    currentIndex = 0;

    const folderName = "unit_" + unitNumber;
    const basePath = `images/activity-book-pages/${folderName}/`;

    const pageNumbersByUnit = {
        "1": [7, 8, 9, 10, 11, 12],
        "2": [13, 14, 15, 16, 17, 18],
        "3": [19, 20, 21, 22, 23, 24],
        "4": [25, 26, 27, 28, 29, 30],
        "5": [31, 32, 33, 34, 35, 36],
        "6": [39, 40, 41, 42, 43, 44],
        "7": [45, 46, 47, 48, 49, 50],
        "8": [51, 52, 53, 54, 55, 56],
        "9": [57, 58, 59, 60, 61, 62],
        "10": [63, 64, 65, 66, 67, 68],
        "11": [71, 72, 73, 74, 75, 76],
        "12": [77, 78, 79, 80, 81, 82]
    };

    currentImages = (pageNumbersByUnit[String(unitNumber)] || []).map(
        pageNumber => `${basePath}page${pageNumber}.jpg`
    );

    hideLessonCardView();
    closeOpenLessonViewer();

    if (prevBtn) {
        prevBtn.style.display = currentImages.length > 1 ? "block" : "none";
    }

    if (nextBtn) {
        nextBtn.style.display = currentImages.length > 1 ? "block" : "none";
    }

    if (currentImages.length > 0) {
        loadImage(currentImages[currentIndex]);
    }
}


// ============================================================
// STUDENT BOOK AND ACTIVITY BOOK NAVIGATION
// ============================================================

studentDropdownLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        const unit = link.getAttribute("data-unit");
        const lesson = link.getAttribute("data-lesson");

        if (whiteboard) whiteboard.style.display = "none";
        if (editTray) editTray.style.display = "none";

        setDrawingTarget("slide");

        if (lesson) {
            renderStudentLesson(unit, lesson);

            saveCurrentState(
                "student",
                unit,
                `lesson-${lesson}`
            );

            document.querySelectorAll(".dropdown").forEach(dropdown => {
                dropdown.classList.remove("show");
            });

            return;
        }

        if (unit) {
            loadStudentUnit(unit);
        }
    });
});

activityDropdownLinks.forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        const unit = link.getAttribute("data-unit");

        if (!unit) {
            return;
        }

        if (whiteboard) whiteboard.style.display = "none";
        if (editTray) editTray.style.display = "none";

        setDrawingTarget("slide");

        loadActivityUnit(unit);

        if (currentImages[currentIndex]) {
            const match = currentImages[currentIndex].match(/page(\d+)/i);

            if (match) {
                saveCurrentState("activity", unit, match[1]);
            }
        }
    });
});


// ============================================================
// PRESENTATION PAGE NAVIGATION
// ============================================================

function navigatePage(direction) {
    if (!currentImages.length) {
        return;
    }

    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= currentImages.length) {
        return;
    }

    currentIndex = newIndex;

    loadImage(currentImages[currentIndex]);

    const pageMatch = currentImages[currentIndex].match(/page(\d+)/i);
    const unitMatch = currentImages[currentIndex].match(/unit_(\d+)/i);

    if (pageMatch && unitMatch) {
        const bookType = currentImages[currentIndex].includes(
            "student-book-pages"
        ) ? "student" : "activity";

        saveCurrentState(
            bookType,
            unitMatch[1],
            pageMatch[1]
        );
    }
}

if (prevBtn) {
    prevBtn.addEventListener("click", () => navigatePage(-1));
}

if (nextBtn) {
    nextBtn.addEventListener("click", () => navigatePage(1));
}


// ============================================================
// SLIDE ZOOM
// ============================================================

function applyZoom() {
    if (
        !slideImage ||
        !slideImage.naturalWidth ||
        !slideImage.naturalHeight
    ) {
        return;
    }

    slideImage.style.width =
        slideImage.naturalWidth * currentScale + "px";

    slideImage.style.height =
        slideImage.naturalHeight * currentScale + "px";

    resizeEditCanvas();
}

if (slideContainer) {
    slideContainer.addEventListener("touchstart", event => {
        if (event.touches.length !== 2) {
            return;
        }

        event.preventDefault();

        pinchStartDistance = getTouchDistance(
            event.touches[0],
            event.touches[1]
        );

        pinchStartScale = currentScale;
    }, { passive: false });

    slideContainer.addEventListener("touchmove", event => {
        if (event.touches.length !== 2 || !pinchStartDistance) {
            return;
        }

        event.preventDefault();

        const currentDistance = getTouchDistance(
            event.touches[0],
            event.touches[1]
        );

        currentScale = pinchStartScale *
            (currentDistance / pinchStartDistance);

        currentScale = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, currentScale)
        );

        applyZoom();
    }, { passive: false });

    slideContainer.addEventListener("touchend", event => {
        if (event.touches.length < 2) {
            pinchStartDistance = null;
        }
    }, { passive: false });

    slideContainer.addEventListener("touchcancel", () => {
        pinchStartDistance = null;
    }, { passive: false });
}


// ============================================================
// HOME BUTTON AND SAVED STATE
// ============================================================

if (homeBtn) {
    homeBtn.addEventListener("click", event => {
        event.preventDefault();
        loadHome();
    });
}

window.addEventListener("load", () => {
    const navigationEntries = performance.getEntriesByType("navigation");

    const isReload =
        navigationEntries.length > 0 &&
        navigationEntries[0].type === "reload";

    if (!isReload) {
        loadHome();
        return;
    }

    const savedState = localStorage.getItem("pptkb1State");

    if (!savedState) {
        loadHome();
        return;
    }

    try {
        const { bookType, unit, pageNum } = JSON.parse(savedState);

        if (bookType === "student") {
            // Restore the unit selection. Lesson restoration is handled
            // separately because this is a Supabase-backed lesson system.
            const lessonMatch = String(pageNum).match(/^lesson-(\d+)$/);

            if (lessonMatch) {
                renderStudentLesson(unit, lessonMatch[1]);
            } else {
                loadStudentUnit(unit);
            }

        } else if (bookType === "activity") {
            loadActivityUnit(unit);

            const restoredIndex = currentImages.findIndex(src =>
                new RegExp(`page${pageNum}\\.jpg$`, "i").test(src)
            );

            if (restoredIndex >= 0) {
                currentIndex = restoredIndex;
                loadImage(currentImages[currentIndex]);
            }

        } else {
            loadHome();
        }

    } catch (error) {
        console.error("Could not restore saved presentation state:", error);
        loadHome();
    }
});


// ============================================================
// AUDIO FUNCTIONALITY
// ============================================================

function showAudioPlayer() {
    if (audioPlayer) audioPlayer.style.display = "block";
    if (hideAudioBtn) hideAudioBtn.style.display = "inline-block";
}

if (hideAudioBtn) {
    hideAudioBtn.addEventListener("click", () => {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.style.display = "none";
        }

        hideAudioBtn.style.display = "none";
    });
}

const studentBookAudioTracks = {
    1: {
        8: ["page8_Track_1.1", "page8_Track_1.2"],
        9: ["page9_Track_1.3", "page9_Track_1.4"],
        10: ["page10_Track_1.5"],
        11: ["page11_Track_1.6", "page11_Track_1.7"],
        12: ["page12_Track_1.8", "page12_Track_1.9"],
        13: ["page13_Track_1.10", "page13_Track_1.11", "page13_Track_1.12"]
    },
    2: {
        16: ["page16_Track_2.1", "page16_Track_2.2", "page16_Track_2.3"],
        17: ["page17_Track_2.4", "page17_Track_2.5"],
        18: ["page18_Track_2.6"],
        19: ["page19_Track_2.7", "page19_Track_2.8", "page19_Track_2.9"],
        20: ["page20_Track_2.10", "page20_Track_2.11"],
        21: ["page21_Track_2.12", "page21_Track_2.13", "page21_Track_2.14", "page21_Track_2.15"]
    },
    3: {
        23: ["page23_Track_3.1"],
        24: ["page24_Track_3.2", "page24_Track_3.3"],
        25: ["page25_Track_3.4", "page25_Track_3.5", "page25_Track_3.6"],
        26: ["page26_Track_3.7", "page26_Track_3.8"],
        27: ["page27_Track_3.9"],
        28: ["page28_Track_3.10", "page28_Track_3.11"],
        29: ["page29_Track_3.12"]
    },
    4: {
        31: ["page31_Track_4.1"],
        32: ["page32_Track_4.2"],
        33: ["page33_Track_4.3", "page33_Track_4.4", "page33_Track_4.5", "page33_Track_4.6"],
        34: ["page34_Track_4.7", "page34_Track_4.8"],
        35: ["page35_Track_4.9", "page35_Track_4.10"],
        36: ["page36_Track_4.11", "page36_Track_4.12", "page36_Track_4.13"],
        38: ["page38_Track_4.14", "page38_Track_4.15", "page38_Track_4.16", "page38_Track_4.17"],
        39: ["page39_Track_4.18", "page39_Track_4.19", "page39_Track_4.20"]
    },
    5: {
        42: ["page42_Track_5.1", "page42_Track_5.2"],
        43: ["page43_Track_5.3", "page43_Track_5.4", "page43_Track_5.5", "page43_Track_5.6"],
        44: ["page44_Track_5.7"],
        45: ["page45_Track_5.8", "page45_Track_5.9"],
        46: ["page46_Track_5.10", "page46_Track_5.11"],
        47: ["page47_Track_5.12"],
        48: ["page48_Track_5.13"],
        49: ["page49_Track_5.14", "page49_Track_5.15", "page49_Track_5.16", "page49_Track_5.17"]
    },
    6: {
        52: ["page52_Track_6.1", "page52_Track_6.2"],
        53: ["page53_Track_6.3", "page53_Track_6.4"],
        54: ["page54_Track_6.5", "page54_Track_6.6", "page54_Track_6.7", "page54_Track_6.8"],
        55: ["page55_Track_6.9", "page55_Track_6.10"],
        56: ["page56_Track_6.11"],
        57: ["page57_Track_6.12", "page57_Track_6.13"],
        58: ["page58_Track_6.14", "page58_Track_6.15"],
        59: ["page59_Track_6.16"]
    },
    7: {
        62: ["page62_Track_7.1", "page62_Track_7.2"],
        63: ["page63_Track_7.3"],
        64: ["page64_Track_7.4"],
        65: ["page65_Track_7.5", "page65_Track_7.6", "page65_Track_7.7"],
        66: ["page66_Track_7.8"],
        67: ["page67_Track_7.9"],
        69: ["page69_Track_7.10", "page69_Track_7.11"]
    },
    8: {
        72: ["page72_Track_8.1", "page72_Track_8.2", "page72_Track_8.3"],
        73: ["page73_Track_8.4", "page73_Track_8.5"],
        74: ["page74_Track_8.6"],
        75: ["page75_Track_8.7", "page75_Track_8.8", "page75_Track_8.9"],
        76: ["page76_Track_8.10"],
        78: ["page78_Track_8.11", "page78_Track_8.12"],
        79: ["page79_Track_8.13"]
    },
    9: {
        82: ["page82_Track_9.1", "page82_Track_9.2", "page82_Track_9.3", "page82_Track_9.4", "page82_Track_9.5"],
        83: ["page83_Track_9.6", "page83_Track_9.7"],
        84: ["page84_Track_9.8", "page84_Track_9.9", "page84_Track_9.10", "page84_Track_9.11"],
        85: ["page85_Track_9.12"],
        86: ["page86_Track_9.13"],
        87: ["page87_Track_9.14"],
        88: ["page88_Track_9.15"],
        89: ["page89_Track_9.16", "page89_Track_9.17", "page89_Track_9.18", "page89_Track_9.19", "page89_Track_9.20"]
    },
    10: {
        92: ["page92_Track_10.1", "page92_Track_10.2"],
        93: ["page93_Track_10.3", "page93_Track_10.4", "page93_Track_10.5", "page93_Track_10.6"],
        94: ["page94_Track_10.7"],
        95: ["page95_Track_10.8", "page95_Track_10.9"],
        97: ["page97_Track_10.10"],
        99: ["page99_Track_10.11"]
    },
    11: {
        102: ["page102_Track_11.1"],
        103: ["page103_Track_11.2", "page103_Track_11.3", "page103_Track_11.4"],
        104: ["page104_Track_11.5", "page104_Track_11.6"],
        105: ["page105_Track_11.7"],
        106: ["page106_Track_11.8"],
        107: ["page107_Track_11.9"],
        108: ["page108_Track_11.10"],
        109: ["page109_Track_11.11"]
    },
    12: {
        112: ["page112_Track_12.1", "page112_Track_12.2"],
        113: ["page113_Track_12.3", "page113_Track_12.4"],
        114: ["page114_Track_12.5", "page114_Track_12.6"],
        115: ["page115_Track_12.7", "page115_Track_12.8"],
        118: ["page118_Track_12.9"],
        119: ["page119_Track_12.10"]
    }
};

const activityBookAudioTracks = {
    1: { 4: ["page4_Track_02"], 6: ["page6_Track_03"], 7: ["page7_Track_04"] },
    2: { 10: ["page10_Track_05"], 12: ["page12_Track_06"], 16: ["page16_Track_07"] },
    3: { 18: ["page18_Track_08"], 19: ["page19_Track_09"], 20: ["page20_Track_10"], 21: ["page21_Track_11"], 22: ["page22_Track_12"] },
    4: { 24: ["page24_Track_13"], 25: ["page25_Track_14"], 26: ["page26_Track_15"], 28: ["page28_Track_16"] },
    5: { 34: ["page34_Track_18"], 36: ["page36_Track_19"], 38: ["page38_Track_20"] },
    6: { 40: ["page40_Track_21"], 41: ["page41_Track_22"], 42: ["page42_Track_23"], 46: ["page46_Track_24"] },
    7: { 48: ["page48_Track_25"], 50: ["page50_Track_26"], 52: ["page52_Track_27"] },
    8: { 54: ["page54_Track_28"], 55: ["page55_Track_29"], 56: ["page56_Track_30", "page56_Track_31"], 57: ["page57_Track_32"], 60: ["page60_Track_33"], 62: ["page62_Track_34"] },
    9: { 64: ["page64_Track_35"], 66: ["page66_Track_36"] },
    10: { 70: ["page70_Track_37"], 72: ["page72_Track_38"], 73: ["page73_Track_39"] },
    11: { 78: ["page78_Track_40"], 80: ["page80_Track_41"] },
    12: { 84: ["page84_Track_42"], 86: ["page86_Track_43"], 87: ["page87_Track_44"] }
};

if (audioBtn && audioListContainer) {
    audioBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (audioListContainer.style.display === "flex") {
            audioListContainer.style.display = "none";
            return;
        }

        audioListContainer.replaceChildren();

        if (!currentImages.length || !currentImages[currentIndex]) {
            audioListContainer.style.display = "none";
            return;
        }

        const pageSrc = currentImages[currentIndex];

        let bookType;

        if (pageSrc.includes("student-book-pages")) {
            bookType = "student";
        } else if (pageSrc.includes("activity-book-pages")) {
            bookType = "activity";
        } else {
            audioListContainer.style.display = "none";
            return;
        }

        const unitMatch = pageSrc.match(/unit_(\d+)/i);
        const pageMatch = pageSrc.match(/page(\d+)/i);

        if (!unitMatch || !pageMatch) {
            audioListContainer.style.display = "none";
            return;
        }

        const unit = Number(unitMatch[1]);
        const pageNum = Number(pageMatch[1]);

        const trackMap = bookType === "student"
            ? studentBookAudioTracks
            : activityBookAudioTracks;

        const tracks = trackMap[unit]?.[pageNum] || [];

        if (!tracks.length) {
            audioListContainer.style.display = "none";
            return;
        }

        tracks.forEach(track => {
            const button = document.createElement("button");
            const trackNumber = track.split("_")[2];

            button.textContent = `Audio ${trackNumber}`;

            button.addEventListener("click", event => {
                event.stopPropagation();

                const folder = bookType === "student"
                    ? "student-book-audios"
                    : "activity_book_audios";

                if (!audioSource || !audioPlayer) {
                    return;
                }

                audioSource.src =
                    `audios/${folder}/unit_${unit}/${track}.mp3`;

                audioPlayer.load();
                audioPlayer.controls = true;
                audioPlayer.setAttribute("controlsList", "nodownload");

                showAudioPlayer();
            });

            audioListContainer.appendChild(button);
        });

        audioListContainer.style.display = "flex";
    });
}

window.addEventListener("click", event => {
    if (
        audioListContainer &&
        !audioListContainer.contains(event.target) &&
        event.target !== audioBtn
    ) {
        audioListContainer.style.display = "none";
    }

    if (
        videoListContainer &&
        !videoListContainer.contains(event.target) &&
        event.target !== videoBtn
    ) {
        videoListContainer.style.display = "none";
    }
});


// ============================================================
// VIDEO FUNCTIONALITY
// ============================================================

const videoListContainer = document.createElement("div");
videoListContainer.id = "video-list-container";
document.body.appendChild(videoListContainer);

function showVideoPlayer() {
    if (videoPlayer) videoPlayer.style.display = "block";
    if (hideVideoBtn) hideVideoBtn.style.display = "inline-block";
}

if (hideVideoBtn) {
    hideVideoBtn.addEventListener("click", () => {
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.style.display = "none";
        }

        hideVideoBtn.style.display = "none";
    });
}

if (videoPlayer) {
    videoPlayer.addEventListener("dblclick", () => {
        if (!document.fullscreenElement) {
            videoPlayer.requestFullscreen?.().catch(error => {
                console.log(error);
            });
        } else {
            document.exitFullscreen?.();
        }
    });
}

const unitVideos = {
    1: {
        7: ["Headway-Openers---Beginner---Unit-1"],
        10: ["Hw5e-Beginner-U01---Hello!"]
    },
    3: {
        24: ["br2_004_v1_1", "br2_004_v1_2"],
        25: ["br2_004_v1_3"]
    },
    6: {
        44: ["br2_004_v2_1"],
        45: ["br2_004_v2_2", "br2_004_v2_3"]
    },
    9: {
        64: ["br2_004_v3_1", "br2_004_v3_2"],
        65: ["br2_004_v3_3", "br2_004_v3_4", "br2_004_v3_5", "br2_004_v3_6"]
    },
    12: {
        84: ["br2_004_v4_1"],
        85: ["br2_004_v4_2", "br2_004_v4_3", "br2_004_v4_4"]
    }
};

if (videoBtn) {
    videoBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (videoListContainer.style.display === "flex") {
            videoListContainer.style.display = "none";
            return;
        }

        videoListContainer.replaceChildren();

        if (!currentImages.length || !currentImages[currentIndex]) {
            videoListContainer.style.display = "none";
            return;
        }

        const pageSrc = currentImages[currentIndex];

        if (!pageSrc.includes("student-book-pages")) {
            videoListContainer.style.display = "none";
            return;
        }

        const unitMatch = pageSrc.match(/unit_(\d+)/i);
        const pageMatch = pageSrc.match(/page(\d+)/i);

        if (!unitMatch || !pageMatch) {
            videoListContainer.style.display = "none";
            return;
        }

        const unit = Number(unitMatch[1]);
        const pageNum = Number(pageMatch[1]);
        const tracks = unitVideos[unit]?.[pageNum] || [];

        if (!tracks.length) {
            videoListContainer.style.display = "none";
            return;
        }

        tracks.forEach((track, index) => {
            const button = document.createElement("button");

            button.textContent = `Video ${index + 1}`;

            button.addEventListener("click", event => {
                event.stopPropagation();

                if (!videoSource || !videoPlayer) {
                    return;
                }

                videoSource.src = `video/unit_${unit}/${track}.mp4`;

                videoPlayer.load();
                showVideoPlayer();
            });

            videoListContainer.appendChild(button);
        });

        videoListContainer.style.display = "flex";
    });
}


// ============================================================
// GAMES BUTTON
// ============================================================

if (gamesBtn) {
    gamesBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        window.location.href = "https://play.poliglotaangola.com/";
    });
}


// ============================================================
// EDIT TRAY AND WHITEBOARD
// ============================================================

if (editBtn && editTray) {
    editBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        editTray.style.display =
            editTray.style.display === "flex" ? "none" : "flex";
    });
}

if (whiteboardBtn && whiteboard && editTray) {
    whiteboardBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        if (whiteboard.style.display === "flex") {
            whiteboard.style.display = "none";
            editTray.style.display = "none";

            setDrawingTarget("slide");
        } else {
            whiteboard.style.display = "flex";
            editTray.style.display = "flex";

            resizeWhiteboardCanvas();
            setDrawingTarget("whiteboard");
        }
    });
}


// ============================================================
// DRAWING TARGET SYSTEM
// ============================================================

function setDrawingTarget(type, targetCanvas = null) {
    if (type === "whiteboard" && whiteboardCanvas) {
        drawingCanvas = whiteboardCanvas;
        drawingCtx = whiteboardCtx;

    } else if (type === "lesson-card" && targetCanvas) {
        drawingCanvas = targetCanvas;
        drawingCtx = targetCanvas.getContext("2d");

    } else {
        drawingCanvas = editCanvas;
        drawingCtx = editCtx;
    }

    updateCursor();
}


// ============================================================
// TOOL SELECTION
// ============================================================

function setTool(tool) {
    currentTool = currentTool === tool ? null : tool;

    updateToolUI();
    updateCursor();
}

if (pencilTool) {
    pencilTool.addEventListener("click", () => setTool("pencil"));
}

if (penTool) {
    penTool.addEventListener("click", () => setTool("pen"));
}

if (eraserTool) {
    eraserTool.addEventListener("click", () => setTool("eraser"));
}

if (highlightTool) {
    highlightTool.addEventListener("click", () => setTool("marker"));
}

if (textTool) {
    textTool.addEventListener("click", () => setTool("text"));
}

function updateToolUI() {
    const tools = {
        pencil: pencilTool,
        pen: penTool,
        eraser: eraserTool,
        marker: highlightTool,
        text: textTool
    };

    Object.values(tools).forEach(button => {
        if (button) {
            button.classList.remove("active-tool");
        }
    });

    if (tools[currentTool]) {
        tools[currentTool].classList.add("active-tool");
    }
}


// ============================================================
// CLEAR ONLY THE ACTIVE DRAWING SURFACE
// ============================================================

if (clearTool) {
    clearTool.addEventListener("click", () => {
        if (!drawingCanvas || !drawingCtx) {
            return;
        }

        const currentCanvasId = drawingCanvas.id;

        strokes = strokes.filter(
            stroke => stroke.canvas !== currentCanvasId
        );

        drawingCtx.clearRect(
            0,
            0,
            drawingCanvas.width,
            drawingCanvas.height
        );

        document.querySelectorAll(".slide-textbox").forEach(box => {
            if (box.dataset.canvas === currentCanvasId) {
                box.remove();
            }
        });

        if (
            activeTextBox &&
            activeTextBox.dataset.canvas === currentCanvasId
        ) {
            activeTextBox = null;

            if (textToolbar) {
                textToolbar.style.display = "none";
            }
        }

        redrawStrokes();
    });
}


// ============================================================
// CANVAS RESIZING
// ============================================================

function resizeEditCanvas() {
    if (!editCanvas || !slideImage) {
        return;
    }

    const rect = slideImage.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return;
    }

    editCanvas.width = Math.max(1, Math.round(rect.width));
    editCanvas.height = Math.max(1, Math.round(rect.height));

    editCanvas.style.left = slideImage.offsetLeft + "px";
    editCanvas.style.top = slideImage.offsetTop + "px";

    redrawStrokes();
}

function resizeWhiteboardCanvas() {
    if (!whiteboardCanvas || !whiteboard) {
        return;
    }

    whiteboardCanvas.width = Math.max(1, whiteboard.clientWidth);
    whiteboardCanvas.height = Math.max(1, whiteboard.clientHeight);

    redrawStrokes();
}

function resizeLessonCardCanvas() {
    const canvas = document.getElementById("lesson-card-edit-canvas");

    if (!canvas || !canvas.isConnected) {
        return;
    }

    const contentArea = canvas.parentElement;

    if (!contentArea) {
        return;
    }

    // Measure the full content area, not just the visible viewport.
    const width = Math.max(
        contentArea.clientWidth,
        contentArea.scrollWidth,
        contentArea.getBoundingClientRect().width
    );

    const height = Math.max(
        contentArea.clientHeight,
        contentArea.scrollHeight,
        contentArea.getBoundingClientRect().height
    );

    if (!width || !height) {
        return;
    }

    const newWidth = Math.ceil(width);
    const newHeight = Math.ceil(height);

    if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;

        redrawStrokes();
    }
}


// ============================================================
// POINTER COORDINATES
// ============================================================

function getPos(event, canvas) {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return { x: 0, y: 0 };
    }

    // Store normalized coordinates so strokes can be redrawn
    // correctly if the canvas is resized.
    return {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
}


// ============================================================
// DRAWING ENGINE
// ============================================================

function startDrawing(event, canvas) {
    if (!currentTool || currentTool === "text") {
        return;
    }

    const { x, y } = getPos(event, canvas);

    drawing = true;

    if (currentTool === "eraser") {
        currentStroke = null;

        eraseAt(x, y, canvas.id);
        redrawStrokes();

        return;
    }

    let color = "red";
    let size = pencilSize;

    if (currentTool === "pen") {
        color = "blue";
        size = 4;
    }

    if (currentTool === "marker") {
        color = "rgba(255,255,0,0.4)";
        size = 18;
    }

    currentStroke = {
        type: "stroke",
        canvas: canvas.id,
        color,
        size,
        points: [{ x, y }]
    };

    strokes.push(currentStroke);
}

function moveDrawing(event, canvas) {
    if (!drawing) {
        return;
    }

    const { x, y } = getPos(event, canvas);

    if (currentTool === "eraser") {
        eraseAt(x, y, canvas.id);
        redrawStrokes();

        return;
    }

    if (!currentStroke) {
        return;
    }

    currentStroke.points.push({ x, y });

    redrawStrokes();
}

function stopDrawing() {
    drawing = false;
    currentStroke = null;
}

function attachDrawingEvents(canvas) {
    if (!canvas || canvas.dataset.drawingEventsAttached === "true") {
        return;
    }

    canvas.dataset.drawingEventsAttached = "true";

    canvas.addEventListener("pointerdown", event => {
        if (!currentTool || currentTool === "text") {
            return;
        }

        event.preventDefault();

        try {
            canvas.setPointerCapture(event.pointerId);
        } catch (error) {
            // Pointer capture may be unavailable in some browsers.
        }

        startDrawing(event, canvas);
    });

    canvas.addEventListener("pointermove", event => {
        if (!drawing) {
            return;
        }

        event.preventDefault();
        moveDrawing(event, canvas);
    });

    canvas.addEventListener("pointerup", event => {
        stopDrawing();

        try {
            if (canvas.hasPointerCapture(event.pointerId)) {
                canvas.releasePointerCapture(event.pointerId);
            }
        } catch (error) {
            // No action is needed if pointer capture was already released.
        }
    });

    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("lostpointercapture", stopDrawing);
}

attachDrawingEvents(editCanvas);
attachDrawingEvents(whiteboardCanvas);


// ============================================================
// ERASER
// ============================================================

function eraseAt(x, y, canvasId) {
    const radius = 0.01;

    strokes = strokes.flatMap(stroke => {
        if (stroke.canvas !== canvasId) {
            return [stroke];
        }

        const newStrokes = [];
        let currentPoints = [];

        stroke.points.forEach(point => {
            const dx = point.x - x;
            const dy = point.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > radius) {
                currentPoints.push(point);
            } else if (currentPoints.length) {
                newStrokes.push({
                    ...stroke,
                    points: currentPoints
                });

                currentPoints = [];
            }
        });

        if (currentPoints.length) {
            newStrokes.push({
                ...stroke,
                points: currentPoints
            });
        }

        return newStrokes;
    });
}


// ============================================================
// REDRAW STORED STROKES
// ============================================================

function redrawStrokes() {
    if (editCtx && editCanvas) {
        editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);
    }

    if (whiteboardCtx && whiteboardCanvas) {
        whiteboardCtx.clearRect(
            0,
            0,
            whiteboardCanvas.width,
            whiteboardCanvas.height
        );
    }

    const lessonCanvas = document.getElementById(
        "lesson-card-edit-canvas"
    );

    const lessonCtx = lessonCanvas
        ? lessonCanvas.getContext("2d")
        : null;

    if (lessonCanvas && lessonCtx) {
        lessonCtx.clearRect(
            0,
            0,
            lessonCanvas.width,
            lessonCanvas.height
        );
    }

    strokes.forEach(stroke => {
        let canvas;
        let ctx;

        if (stroke.canvas === "whiteboard-canvas") {
            canvas = whiteboardCanvas;
            ctx = whiteboardCtx;

        } else if (stroke.canvas === "lesson-card-edit-canvas") {
            canvas = lessonCanvas;
            ctx = lessonCtx;

        } else {
            canvas = editCanvas;
            ctx = editCtx;
        }

        if (!canvas || !ctx || !stroke.points.length) {
            return;
        }

        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();

        stroke.points.forEach((point, index) => {
            const x = point.x * canvas.width;
            const y = point.y * canvas.height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    });
}


// ============================================================
// TEXT TOOL
// ============================================================

function ensureTextToolbar() {
    if (textToolbar) {
        return textToolbar;
    }

    textToolbar = document.createElement("div");

    textToolbar.id = "text-toolbar";
    textToolbar.style.position = "fixed";
    textToolbar.style.display = "none";
    textToolbar.style.gap = "6px";
    textToolbar.style.padding = "5px";
    textToolbar.style.background = "#fff";
    textToolbar.style.border = "1px solid #ccc";
    textToolbar.style.zIndex = "1000000";
    textToolbar.style.borderRadius = "6px";

    document.body.appendChild(textToolbar);

    return textToolbar;
}

function handleTextClick(event) {
    if (currentTool !== "text") {
        return;
    }

    const canvas = event.currentTarget;

    if (canvas !== drawingCanvas) {
        return;
    }

    // Ignore clicks on the media controls or links if a click
    // reaches this handler through an unusual browser event path.
    if (event.target !== canvas) {
        return;
    }

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return;
    }

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    createTextBox(x, y, canvas);
}

if (editCanvas) {
    editCanvas.addEventListener("click", handleTextClick);
}

if (whiteboardCanvas) {
    whiteboardCanvas.addEventListener("click", handleTextClick);
}

function createTextBox(x, y, canvas) {
    if (!canvas || !canvas.parentElement) {
        return;
    }

    const box = document.createElement("div");

    box.contentEditable = "true";
    box.className = "slide-textbox";

    box.dataset.x = String(x);
    box.dataset.y = String(y);
    box.dataset.canvas = canvas.id;

    box.style.position = "absolute";
    box.style.left = `${x * canvas.clientWidth}px`;
    box.style.top = `${y * canvas.clientHeight}px`;
    box.style.minWidth = "50px";
    box.style.minHeight = "20px";
    box.style.color = "red";
    box.style.fontSize = "28px";
    box.style.fontWeight = "bold";
    box.style.outline = "none";
    box.style.cursor = "text";
    box.style.zIndex = "100000";
    box.style.pointerEvents = "auto";
    box.style.userSelect = "text";
    box.style.whiteSpace = "pre-wrap";

    canvas.parentElement.appendChild(box);

    activeTextBox = box;

    showTextToolbar(box);

    enableDrag(box);

    box.focus();
}

function showTextToolbar(box) {
    const toolbar = ensureTextToolbar();

    toolbar.replaceChildren();
    toolbar.style.display = "flex";

    function makeButton(label, action) {
        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;

        button.addEventListener("click", event => {
            event.stopPropagation();
            action();
        });

        toolbar.appendChild(button);

        return button;
    }

    makeButton("🗑️", () => {
        box.remove();

        if (activeTextBox === box) {
            activeTextBox = null;
        }

        toolbar.style.display = "none";
    });

    makeButton("A+", () => {
        const size = parseInt(getComputedStyle(box).fontSize, 10) || 28;
        box.style.fontSize = `${size + 2}px`;
    });

    makeButton("A−", () => {
        const size = parseInt(getComputedStyle(box).fontSize, 10) || 28;

        if (size > 10) {
            box.style.fontSize = `${size - 2}px`;
        }
    });

    makeButton("🔴", () => {
        box.style.color = "red";
    });

    makeButton("⚫", () => {
        box.style.color = "black";
    });

    makeButton("🔵", () => {
        box.style.color = "blue";
    });

    positionTextToolbar(box);
}

function positionTextToolbar(box) {
    if (!textToolbar || !box) {
        return;
    }

    const rect = box.getBoundingClientRect();

    textToolbar.style.left = `${Math.max(4, rect.left)}px`;
    textToolbar.style.top = `${Math.max(4, rect.top - 44)}px`;
}

document.addEventListener("click", event => {
    const box = event.target.closest?.(".slide-textbox");

    if (box) {
        activeTextBox = box;
        showTextToolbar(box);
        return;
    }

    if (textToolbar && !textToolbar.contains(event.target)) {
        textToolbar.style.display = "none";
    }
});

function enableDrag(element) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    element.addEventListener("pointerdown", event => {
        // Allow text selection while editing the text itself.
        if (event.target === element && event.detail > 1) {
            return;
        }

        if (event.target !== element) {
            return;
        }

        dragging = true;

        const rect = element.getBoundingClientRect();

        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        try {
            element.setPointerCapture(event.pointerId);
        } catch (error) {
            // Continue without pointer capture if unsupported.
        }

        event.stopPropagation();
    });

    element.addEventListener("pointermove", event => {
        if (!dragging) {
            return;
        }

        const parent = element.parentElement;

        if (!parent) {
            return;
        }

        const parentRect = parent.getBoundingClientRect();

        element.style.left =
            `${event.clientX - parentRect.left - offsetX}px`;

        element.style.top =
            `${event.clientY - parentRect.top - offsetY}px`;

        positionTextToolbar(element);
    });

    function stopDragging() {
        dragging = false;
    }

    element.addEventListener("pointerup", stopDragging);
    element.addEventListener("pointercancel", stopDragging);
}


// ============================================================
// ACTIVE CANVAS CURSOR AND INTERACTION
// ============================================================

function updateCursor() {
    if (!drawingCanvas) {
        return;
    }

    // Do not disable the canvas when no drawing tool is selected.
    // The canvas remains available for text and for changing tools.
    drawingCanvas.style.pointerEvents = "auto";

    if (drawingCanvas.id === "lesson-card-edit-canvas") {
        drawingCanvas.style.touchAction = "none";
    }

    if (!currentTool) {
        drawingCanvas.style.cursor = "default";
    } else if (currentTool === "text") {
        drawingCanvas.style.cursor = "text";
    } else if (currentTool === "eraser") {
        drawingCanvas.style.cursor = "crosshair";
    } else if (currentTool === "marker") {
        drawingCanvas.style.cursor = "cell";
    } else {
        drawingCanvas.style.cursor = "crosshair";
    }
}


// ============================================================
// PREVENT CTRL + WHEEL FROM ZOOMING THE BROWSER WHEN CARD IS OPEN
// ============================================================

document.addEventListener("wheel", event => {
    if (
        event.ctrlKey &&
        document.getElementById("lesson-card-viewer")
    ) {
        event.preventDefault();
    }
}, { passive: false, capture: true });


// ============================================================
// INITIAL SETUP
// ============================================================

window.addEventListener("load", () => {
    setDrawingTarget("slide");

    resizeEditCanvas();
    resizeWhiteboardCanvas();

    updateToolUI();
    updateCursor();
});

window.addEventListener("resize", () => {
    resizeEditCanvas();
    resizeWhiteboardCanvas();

    if (document.getElementById("lesson-card-edit-canvas")) {
        resizeLessonCardCanvas();
    }
});

