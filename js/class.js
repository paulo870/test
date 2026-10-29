const slideImage = document.getElementById("slide-image");
const slideContainer = document.querySelector(".slide-container");
const homeBtn = document.getElementById("home-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
document.addEventListener("DOMContentLoaded", () => {
    });
const studentDropdownLinks = document.querySelectorAll("#students-book-dropdown a");
const activityDropdownLinks = document.querySelectorAll("#activity-book-dropdown a");
const dropdownBtns = document.querySelectorAll(".dropdown-btn");

const audioBtn = document.getElementById("audio-btn");
const audioListContainer = document.getElementById("audio-list-container");
const audioPlayer = document.getElementById("slide-audio");
const audioSource = document.getElementById("audio-source");
const hideAudioBtn = document.getElementById("hide-audio-btn");


// Show audio player and hide button
function showAudioPlayer() {
    audioPlayer.style.display = "block";
    hideAudioBtn.style.display = "inline-block";
}

// Hide audio player when hide button is clicked
hideAudioBtn.addEventListener("click", () => {
    audioPlayer.style.display = "none";
    hideAudioBtn.style.display = "none";
});
let currentImages = [];
let currentIndex = 0;
let currentScale = 1;

// ==========================
// SAVE CURRENT PAGE STATE
// ==========================
function saveCurrentState(bookType, unit, pageNum) {
    localStorage.setItem("pptkb1State", JSON.stringify({ bookType, unit, pageNum }));
}
// ==========================
// DROPDOWN TOGGLE
// ==========================
dropdownBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const parentDropdown = btn.parentElement;
        document.querySelectorAll('.dropdown').forEach(d => {
            if(d !== parentDropdown) d.classList.remove('show');
        });
        parentDropdown.classList.toggle('show');
    });
});

window.addEventListener("click", () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('show'));
});

// ==========================
// LOAD IMAGE FUNCTION
// ==========================
function autoFitImage() {
    const containerWidth = slideContainer.clientWidth;
    const containerHeight = slideContainer.clientHeight;
    const imgWidth = slideImage.naturalWidth;
    const imgHeight = slideImage.naturalHeight;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;

    currentScale = Math.min(scaleX, scaleY);

    slideImage.style.width = imgWidth * currentScale + "px";
    slideImage.style.height = imgHeight * currentScale + "px";
}

function loadImage(src) {
    slideImage.onload = function() {
        autoFitImage();
    };
    slideImage.src = src;
}

// ==========================
// HOME PAGE
// ==========================
function loadHome() {
    currentImages = [];
    currentIndex = 0;
    loadImage("images/homepage.jpg");
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
}

// ============================================================
// STUDENT BOOK — SUPABASE LESSON SYSTEM
// ============================================================

const MAX_CARDS_PER_LESSON = 8;
const LESSON_MEDIA_BUCKET = "lesson-media";

let activeStudentUnit = null;
let activeStudentLesson = null;

let activeLessonRecord = null;
let activeLessonCards = [];
let activeLessonContent = [];


// ============================================================
// SUPABASE CLIENT
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


// ============================================================
// LESSON CARD CONTAINER
// ============================================================

function getLessonCardContainer() {
    let container = document.getElementById("lesson-card-grid");

    if (!container) {
        container = document.createElement("div");

        container.id = "lesson-card-grid";
        container.setAttribute("aria-live", "polite");

        slideContainer.appendChild(container);
    }

    return container;
}


// ============================================================
// DISPLAY THE LESSON CARD AREA
// ============================================================

function showLessonCardView() {
    const container = getLessonCardContainer();

    const slideWrapper = document.querySelector(".slide-wrapper");

    if (slideWrapper) {
        slideWrapper.style.display = "none";
    }

    prevBtn.style.display = "none";
    nextBtn.style.display = "none";

    if (audioListContainer) {
        audioListContainer.style.display = "none";
    }

    const videoList = document.getElementById(
        "video-list-container"
    );

    if (videoList) {
        videoList.style.display = "none";
    }

    container.style.display = "grid";

    return container;
}


// ============================================================
// RESTORE THE ORIGINAL PRESENTATION VIEW
// ============================================================

function hideLessonCardView() {
    const container = document.getElementById("lesson-card-grid");

    const slideWrapper = document.querySelector(".slide-wrapper");

    if (container) {
        container.style.display = "none";
    }

    if (slideWrapper) {
        slideWrapper.style.display = "";
    }

    prevBtn.style.display = "";
    nextBtn.style.display = "";
}


// ============================================================
// LESSON VIEW MESSAGES
// ============================================================

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


// ============================================================
// GET A TEMPORARY URL FOR PRIVATE STORAGE FILES
// ============================================================

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


// ============================================================
// LOAD THE CORRECT LESSON FROM SUPABASE
// ============================================================

async function renderStudentLesson(unitNumber, lessonNumber) {
    activeStudentUnit = String(unitNumber);
    activeStudentLesson = String(lessonNumber);

    activeLessonRecord = null;
    activeLessonCards = [];
    activeLessonContent = [];

    const container = showLessonCardView();

    container.replaceChildren();

    const loading = document.createElement("div");
    loading.className = "lesson-empty-state";
    loading.textContent = "Loading lesson from Supabase...";

    container.appendChild(loading);

    try {
        const client = getClassroomSupabaseClient();

        // ----------------------------------------------------
        // STEP 1: FIND THE EXACT LESSON
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // STEP 2: LOAD THE CARDS BELONGING TO THIS LESSON
        // ----------------------------------------------------

        const { data: cards, error: cardsError } = await client
            .from("lesson_cards")
            .select("*")
            .eq("lesson_id", lesson.id)
            .order("card_number", { ascending: true });

        if (cardsError) {
            throw cardsError;
        }

        // The Content Manager allows a maximum of eight cards.
        activeLessonCards = (cards || []).slice(
            0,
            MAX_CARDS_PER_LESSON
        );

        // ----------------------------------------------------
        // STEP 3: LOAD CONTENT FOR THESE EXACT CARD IDs
        // ----------------------------------------------------

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

            activeLessonContent = content || [];

            // Generate temporary links for uploaded media.
            activeLessonContent = await Promise.all(
                activeLessonContent.map(async item => {
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

        // ----------------------------------------------------
        // STEP 4: DISPLAY THE DATABASE RECORDS
        // ----------------------------------------------------

        renderStudentLessonCards();

    } catch (error) {
        console.error(
            "Could not load lesson from Supabase:",
            error
        );

        showLessonMessage(
            "Unable to load this lesson",
            error.message ||
                "An error occurred while retrieving the lesson from Supabase.",
            true
        );
    }
}


// ============================================================
// RENDER THE CARDS BELONGING TO THE SELECTED LESSON
// ============================================================

function renderStudentLessonCards() {
    const container = showLessonCardView();

    container.replaceChildren();

    // --------------------------------------------------------
    // LESSON HEADING
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // EMPTY LESSON
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // CREATE ONE DISPLAY CARD FOR EACH DATABASE CARD
    // --------------------------------------------------------

    activeLessonCards.forEach(card => {
        const cardElement = document.createElement("button");

        cardElement.type = "button";
        cardElement.className = "lesson-content-card";

        cardElement.dataset.cardId = card.id;

        const cardTitle = document.createElement("h2");

        cardTitle.textContent =
            card.title || `Card ${card.card_number}`;

        const cardContent = activeLessonContent.filter(
            item => String(item.card_id) === String(card.id)
        );

        const cardDescription = document.createElement("p");

        if (cardContent.length === 0) {
            cardDescription.textContent = "No content added yet.";
        } else if (cardContent.length === 1) {
            cardDescription.textContent = cardContent[0].title ||
                "1 content item";
        } else {
            cardDescription.textContent =
                `${cardContent.length} content items`;
        }

        const cardNumber = document.createElement("span");

        cardNumber.className = "lesson-card-number";
        cardNumber.textContent = `Card ${card.card_number}`;

        cardElement.append(
            cardNumber,
            cardTitle,
            cardDescription
        );

        cardElement.addEventListener("click", () => {
            openLessonCard(card);
        });

        container.appendChild(cardElement);
    });
}


// ============================================================
// OPEN A CARD AND DISPLAY ITS SUPABASE CONTENT
// ============================================================

function openLessonCard(card) {
    // Close any previously opened viewer.
    const existingViewer = document.getElementById(
        "lesson-card-viewer"
    );

    if (existingViewer) {
        existingViewer.remove();
    }

    const viewer = document.createElement("div");

    viewer.id = "lesson-card-viewer";

    // --------------------------------------------------------
    // CLOSE BUTTON
    // --------------------------------------------------------

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.className = "lesson-viewer-close";
    closeButton.textContent = "×";

    closeButton.setAttribute(
        "aria-label",
        "Close lesson card"
    );

    // --------------------------------------------------------
    // VIEWER CONTENT
    // --------------------------------------------------------

    const contentArea = document.createElement("div");

    contentArea.className = "lesson-viewer-content";

    // --------------------------------------------------------
// FULL-CARD EDITING CANVAS
// --------------------------------------------------------

contentArea.style.position = "relative";

const cardEditCanvas = document.createElement("canvas");

cardEditCanvas.id = "lesson-card-edit-canvas";
cardEditCanvas.className = "lesson-card-edit-canvas";

cardEditCanvas.setAttribute(
    "aria-label",
    "Lesson card editing canvas"
);

contentArea.appendChild(cardEditCanvas);

    const title = document.createElement("h2");

    title.textContent =
        card.title || `Card ${card.card_number}`;

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

    // --------------------------------------------------------
    // DISPLAY EVERY CONTENT ITEM ASSOCIATED WITH THIS CARD
    // --------------------------------------------------------

    cardContent.forEach(item => {
        const itemContainer = document.createElement("section");

        itemContainer.className = "lesson-viewer-item";

        const itemTitle = document.createElement("h3");

        itemTitle.className = "lesson-viewer-item-title";

        itemTitle.textContent = item.title || "Lesson content";

        itemContainer.appendChild(itemTitle);

        const type = String(
            item.content_type || "text"
        ).toLowerCase();

        const mediaUrl = item.signed_url || "";

        // TEXT CONTENT
        if (item.text_content) {
            const text = document.createElement("div");

            text.className = "lesson-viewer-text";

            text.textContent = item.text_content;

            itemContainer.appendChild(text);
        }

        // IMAGE CONTENT
        if (type === "image") {
            if (mediaUrl) {
                const image = document.createElement("img");

                image.className = "lesson-viewer-media";
                image.src = mediaUrl;

                image.alt =
                    item.title || "Lesson image";

                image.loading = "lazy";

                itemContainer.appendChild(image);
            } else if (item.storage_path) {
                appendUnavailableMessage(
                    itemContainer,
                    "This image could not be loaded. Check the Supabase Storage permissions."
                );
            }
        }

        // AUDIO CONTENT
        else if (type === "audio") {
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
        }

        // VIDEO CONTENT
        else if (type === "video") {
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
        }

        // FILES AND OTHER RESOURCE TYPES
        else if (
            type === "file" ||
            type === "game"
        ) {
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
// Keep the editing canvas above all lesson content.
contentArea.appendChild(cardEditCanvas);

    // --------------------------------------------------------
// CLOSE THE VIEWER
// Only the close button closes the card.
// --------------------------------------------------------

function closeViewer() {
    contentArea.querySelectorAll("audio, video").forEach(media => {
        media.pause();
    });

    viewer.remove();
}

closeButton.addEventListener("click", closeViewer);


// --------------------------------------------------------
// ZOOMABLE CARD CONTENT
// --------------------------------------------------------

const zoomArea = document.createElement("div");
zoomArea.className = "lesson-viewer-zoom-area";

zoomArea.appendChild(contentArea);

let cardZoomScale = 1;

const MIN_CARD_ZOOM = 0.5;
const MAX_CARD_ZOOM = 3;
const CARD_ZOOM_STEP = 0.1;


// Only Ctrl + wheel over the card content changes card zoom.
zoomArea.addEventListener("wheel", function(event) {
    if (!event.ctrlKey) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.deltaY < 0) {
        cardZoomScale += CARD_ZOOM_STEP;
    } else if (event.deltaY > 0) {
        cardZoomScale -= CARD_ZOOM_STEP;
    }

    cardZoomScale = Math.max(
        MIN_CARD_ZOOM,
        Math.min(MAX_CARD_ZOOM, cardZoomScale)
    );

    zoomArea.style.transform =
        `scale(${cardZoomScale})`;

}, { passive: false });


// --------------------------------------------------------
// PREVENT BROWSER ZOOM WHILE THE CARD IS OPEN
// --------------------------------------------------------

// This prevents Ctrl + wheel from zooming the browser.
// It does not change the background slide's scale.
function preventBrowserZoomWhileCardOpen(event) {
    if (!event.ctrlKey) return;

    if (!document.getElementById("lesson-card-viewer")) {
        return;
    }

    event.preventDefault();
}

document.addEventListener(
    "wheel",
    preventBrowserZoomWhileCardOpen,
    { passive: false, capture: true }
);


// Assemble the viewer.
viewer.append(closeButton, zoomArea);

document.body.appendChild(viewer);

} // END OF openLessonCard()


// ============================================================
// DISPLAY AN UNAVAILABLE-FILE MESSAGE
// ============================================================

function appendUnavailableMessage(container, messageText) {
    const message = document.createElement("p");

    message.className = "lesson-content-error";
    message.textContent = messageText;

    container.appendChild(message);
}


// ============================================================
// SELECT A UNIT
// ============================================================

function loadStudentUnit(unitNumber) {
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

// ==========================
// ACTIVITY BOOK
// ==========================
function loadActivityUnit(unitNumber) {
    currentImages = [];
    currentIndex = 0;

    const folderName = "unit_" + unitNumber;
    const basePath = `images/activity-book-pages/${folderName}/`;

    let pageNumbers = [];
    switch(unitNumber) {
        case "1": pageNumbers = [7,8,9,10,11,12]; break;
        case "2": pageNumbers = [13,14,15,16,17,18]; break;
        case "3": pageNumbers = [19,20,21,22,23,24]; break;
        case "4": pageNumbers = [25,26,27,28,29,30]; break;
        case "5": pageNumbers = [31,32,33,34,35,36]; break;
        case "6": pageNumbers = [39,40,41,42,43,44]; break;
        case "7": pageNumbers = [45,46,47,48,49,50]; break;
        case "8": pageNumbers = [51,52,53,54,55,56]; break;
        case "9": pageNumbers = [57,58,59,60,61,62]; break;
        case "10": pageNumbers = [63,64,65,66,67,68]; break;
        case "11": pageNumbers = [71,72,73,74,75,76]; break;
        case "12": pageNumbers = [77,78,79,80,81,82]; break;
        default: pageNumbers = []; break;
    }

    pageNumbers.forEach(num => {
        currentImages.push(basePath + "page" + num + ".jpg");
    });

    if (currentImages.length > 1) {
        prevBtn.style.display = "block";
        nextBtn.style.display = "block";
    } else {
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
    }

    loadImage(currentImages[currentIndex]);
}



// ==========================
// STUDENT BOOK LESSON SELECTION
// ==========================

studentDropdownLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const unit = link.getAttribute("data-unit");
        const lesson = link.getAttribute("data-lesson");

        // Selecting a lesson loads its cards.
        if (lesson) {
            renderStudentLesson(unit, lesson);

            saveCurrentState(
                "student",
                unit,
                `lesson-${lesson}`
            );

            // Close the first dropdown after selection.
            document.querySelectorAll(".dropdown").forEach(dropdown => {
                dropdown.classList.remove("show");
            });

            return;
        }

        // Selecting a unit displays its lesson-selection screen.
        // It no longer loads the old scanned pages.
        if (unit) {
            loadStudentUnit(unit);
        }
    });
});



activityDropdownLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const unit = link.getAttribute("data-unit");
        loadActivityUnit(unit);
        // Save state
        saveCurrentState(
            "activity",
            unit,
            parseInt(currentImages[currentIndex].match(/page(\d+)/)[1])
        );
    });
});

// ==========================
// NAVIGATION
// ==========================
prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        loadImage(currentImages[currentIndex]);
         // Save state
        saveCurrentState(
            currentImages[currentIndex].includes("student-book-pages") ? "student" : "activity",
            currentImages[currentIndex].match(/unit_(\d+)/)[1],
            currentImages[currentIndex].match(/page(\d+)/)[1]
        );
    }
});

nextBtn.addEventListener("click", () => {
    if (currentIndex < currentImages.length - 1) {
        currentIndex++;
        loadImage(currentImages[currentIndex]);
         // Save state
        saveCurrentState(
            currentImages[currentIndex].includes("student-book-pages") ? "student" : "activity",
            currentImages[currentIndex].match(/unit_(\d+)/)[1],
            currentImages[currentIndex].match(/page(\d+)/)[1]
        );
    }
});

// ==========================
// ZOOM SYSTEM
// ==========================

// Minimum and maximum zoom
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

// Apply zoom ONLY to the slide image
function applyZoom() {

    if (!slideImage.naturalWidth || !slideImage.naturalHeight) {
        return;
    }

    slideImage.style.width =
        (slideImage.naturalWidth * currentScale) + "px";

    slideImage.style.height =
        (slideImage.naturalHeight * currentScale) + "px";

    resizeEditCanvas();
}




// ==========================
// ANDROID / TOUCH — PINCH ZOOM
// ==========================

let pinchStartDistance = null;
let pinchStartScale = 1;


// Calculate distance between two fingers
function getTouchDistance(touch1, touch2) {

    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}


// Start pinch
slideContainer.addEventListener("touchstart", function(e) {

    if (e.touches.length !== 2) return;

    e.preventDefault();

    pinchStartDistance = getTouchDistance(
        e.touches[0],
        e.touches[1]
    );

    // Remember the zoom level when the pinch begins
    pinchStartScale = currentScale;

}, { passive: false });


// Continue pinch
slideContainer.addEventListener("touchmove", function(e) {

    if (e.touches.length !== 2) return;

    e.preventDefault();

    const currentDistance = getTouchDistance(
        e.touches[0],
        e.touches[1]
    );

    if (!pinchStartDistance) return;

    // How much the fingers moved apart/together
    const scaleChange =
        currentDistance / pinchStartDistance;

    // Calculate new zoom
    currentScale =
        pinchStartScale * scaleChange;

    // Limit zoom
    currentScale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, currentScale)
    );

    applyZoom();

}, { passive: false });


// Finish pinch
slideContainer.addEventListener("touchend", function(e) {

    if (e.touches.length < 2) {

        pinchStartDistance = null;

        // currentScale is deliberately NOT reset
        // The zoom remains exactly where the user left it.
    }

}, { passive: false });


// Also handle cancelled touches
slideContainer.addEventListener("touchcancel", function() {

    pinchStartDistance = null;

}, { passive: false });

// ==========================
// HOME BUTTON
// ==========================
homeBtn.addEventListener("click", function(e) {
    e.preventDefault();
    loadHome();
});

window.addEventListener("load", () => {
    const navigationEntries = performance.getEntriesByType("navigation");
    const isReload = navigationEntries.length > 0 && navigationEntries[0].type === "reload";

    if (isReload) {
        // Page was refreshed → restore previous state if exists
        const savedState = localStorage.getItem("pptkb1State");
        if (savedState) {
            const { bookType, unit, pageNum } = JSON.parse(savedState);
            if (bookType === "student") {
                loadStudentUnit(unit);
                currentIndex = currentImages.findIndex(src => src.includes(`page${pageNum}.JPG`));
                if (currentIndex >= 0) loadImage(currentImages[currentIndex]);
            } else if (bookType === "activity") {
                loadActivityUnit(unit);
                currentIndex = currentImages.findIndex(src => src.includes(`page${pageNum}.JPG`));
                if (currentIndex >= 0) loadImage(currentImages[currentIndex]);
            }
        } else {
            loadHome(); // fallback if nothing saved
        }
    } else {
        // First time opening → always Home
        loadHome();
    }
});

// ==========================
// AUDIO FUNCTIONALITY FOR ALL UNITS
// ==========================

audioBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
  // TOGGLE: hide if already visible
    if (audioListContainer.style.display === "flex") {
        audioListContainer.style.display = "none";
        return;
    }
    // Clear previous buttons
    audioListContainer.innerHTML = "";
    audioListContainer.style.display = "flex";

   if (!currentImages || currentImages.length === 0) {
    audioListContainer.style.display = "none";
    return;
}

const pageSrc = currentImages[currentIndex];

if (!pageSrc) {
    console.error("Audio error: current page is undefined.", {
        currentImages,
        currentIndex
    });

    audioListContainer.style.display = "none";
    return;
}

// Determine if Student or Activity Book
let bookType;

if (pageSrc.includes("student-book-pages")) {
    bookType = "student";
} 
else if (pageSrc.includes("activity-book-pages")) {
    bookType = "activity";
} 
else {
    audioListContainer.style.display = "none";
    return;
}

    // Extract unit number
    const unitMatch = pageSrc.match(/unit_(\d+)/i);
    if (!unitMatch) return;
    const unit = parseInt(unitMatch[1]);

    // Extract page number
    const pageMatch = pageSrc.match(/page(\d+)/i);
    if (!pageMatch) return;
    const pageNum = parseInt(pageMatch[1]);

    // Define audio tracks for all units (Student Book)
    const studentBookAudioTracks = {
        1: {8:["page8_Track_1.1","page8_Track_1.2"],9:["page9_Track_1.3","page9_Track_1.4"],10:["page10_Track_1.5"],11:["page11_Track_1.6","page11_Track_1.7"],12:["page12_Track_1.8","page12_Track_1.9"],13:["page13_Track_1.10","page13_Track_1.11","page13_Track_1.12"]},
        2: {16:["page16_Track_2.1","page16_Track_2.2","page16_Track_2.3"],17:["page17_Track_2.4","page17_Track_2.5"],18:["page18_Track_2.6"],19:["page19_Track_2.7","page19_Track_2.8","page19_Track_2.9"],20:["page20_Track_2.10","page20_Track_2.11"],21:["page21_Track_2.12","page21_Track_2.13","page21_Track_2.14","page21_Track_2.15"]},
        3: {23:["page23_Track_3.1"],24:["page24_Track_3.2","page24_Track_3.3"],25:["page25_Track_3.4","page25_Track_3.5","page25_Track_3.6"],26:["page26_Track_3.7","page26_Track_3.8"],27:["page27_Track_3.9"],28:["page28_Track_3.10","page28_Track_3.11"],29:["page29_Track_3.12"]},
        4: {31:["page31_Track_4.1"],32:["page32_Track_4.2"],33:["page33_Track_4.3","page33_Track_4.4","page33_Track_4.5","page33_Track_4.6"],34:["page34_Track_4.7","page34_Track_4.8"],35:["page35_Track_4.9","page35_Track_4.10"],36:["page36_Track_4.11","page36_Track_4.12","page36_Track_4.13"],38:["page38_Track_4.14","page38_Track_4.15","page38_Track_4.16","page38_Track_4.17"],39:["page39_Track_4.18","page39_Track_4.19","page39_Track_4.20"]},
        5: {42:["page42_Track_5.1","page42_Track_5.2"],43:["page43_Track_5.3","page43_Track_5.4","page43_Track_5.5","page43_Track_5.6"],44:["page44_Track_5.7"],45:["page45_Track_5.8","page45_Track_5.9"],46:["page46_Track_5.10","page46_Track_5.11"],47:["page47_Track_5.12"],48:["page48_Track_5.13"],49:["page49_Track_5.14","page49_Track_5.15","page49_Track_5.16","page49_Track_5.17"]},
        6: {52:["page52_Track_6.1","page52_Track_6.2"],53:["page53_Track_6.3","page53_Track_6.4"],54:["page54_Track_6.5","page54_Track_6.6","page54_Track_6.7","page54_Track_6.8"],55:["page55_Track_6.9","page55_Track_6.10"],56:["page56_Track_6.11"],57:["page57_Track_6.12","page57_Track_6.13"],58:["page58_Track_6.14","page58_Track_6.15"],59:["page59_Track_6.16"]},
        7: {62:["page62_Track_7.1","page62_Track_7.2"],63:["page63_Track_7.3"],64:["page64_Track_7.4"],65:["page65_Track_7.5","page65_Track_7.6","page65_Track_7.7"],66:["page66_Track_7.8"],67:["page67_Track_7.9"],69:["page69_Track_7.10","page69_Track_7.11"]},
        8: {72:["page72_Track_8.1","page72_Track_8.2","page72_Track_8.3"],73:["page73_Track_8.4","page73_Track_8.5"],74:["page74_Track_8.6"],75:["page75_Track_8.7","page75_Track_8.8","page75_Track_8.9"],76:["page76_Track_8.10"],78:["page78_Track_8.11","page78_Track_8.12"],79:["page79_Track_8.13"]},
        9: {82:["page82_Track_9.1","page82_Track_9.2","page82_Track_9.3","page82_Track_9.4","page82_Track_9.5"],83:["page83_Track_9.6","page83_Track_9.7"],84:["page84_Track_9.8","page84_Track_9.9","page84_Track_9.10","page84_Track_9.11"],85:["page85_Track_9.12"],86:["page86_Track_9.13"],87:["page87_Track_9.14"],88:["page88_Track_9.15"],89:["page89_Track_9.16","page89_Track_9.17","page89_Track_9.18","page89_Track_9.19","page89_Track_9.20"]},
        10: {92:["page92_Track_10.1","page92_Track_10.2"],93:["page93_Track_10.3","page93_Track_10.4","page93_Track_10.5","page93_Track_10.6"],94:["page94_Track_10.7"],95:["page95_Track_10.8","page95_Track_10.9"],97:["page97_Track_10.10"],99:["page99_Track_10.11"]},
        11: {102:["page102_Track_11.1"],103:["page103_Track_11.2","page103_Track_11.3","page103_Track_11.4"],104:["page104_Track_11.5","page104_Track_11.6"],105:["page105_Track_11.7"],106:["page106_Track_11.8"],107:["page107_Track_11.9"],108:["page108_Track_11.10"],109:["page109_Track_11.11"]},
        12: {112:["page112_Track_12.1","page112_Track_12.2"],113:["page113_Track_12.3","page113_Track_12.4"],114:["page114_Track_12.5","page114_Track_12.6"],115:["page115_Track_12.7","page115_Track_12.8"],118:["page118_Track_12.9"],119:["page119_Track_12.10"]},
        
    };

    // Define audio tracks for all units (Activity Book)
    const activityBookAudioTracks = {
        1: {4:["page4_Track_02"],6:["page6_Track_03"],7:["page7_Track_04"]},
        2: {10:["page10_Track_05"],12:["page12_Track_06"],16:["page16_Track_07"]},
        3: {18:["page18_Track_08"],19:["page19_Track_09"],20:["page20_Track_10"],21:["page21_Track_11"],22:["page22_Track_12"]},
        4: {24:["page24_Track_13"],25:["page25_Track_14"],26:["page26_Track_15"],28:["page28_Track_16"]},
        5: {34:["page34_Track_18"],36:["page36_Track_19"],38:["page38_Track_20"]},
        6: {40:["page40_Track_21"],41:["page41_Track_22"],42:["page42_Track_23"],46:["page46_Track_24"]},
        7: {48:["page48_Track_25"],50:["page50_Track_26"],52:["page52_Track_27"]},
        8: {54:["page54_Track_28"],55:["page55_Track_29"],56:["page56_Track_30","page56_Track_31"],57:["page57_Track_32"],60:["page60_Track_33"],62:["page62_Track_34"]},
        9: {64:["page64_Track_35"],66:["page66_Track_36"]},
        10: {70:["page70_Track_37"],72:["page72_Track_38"],73:["page73_Track_39"]},
        11: {78:["page78_Track_40"],80:["page80_Track_41"]},
        12: {84:["page84_Track_42"],86:["page86_Track_43"],87:["page87_Track_44"] }
    };

    // Pick the correct track list
    let tracks;
    if (bookType === "student") tracks = studentBookAudioTracks[unit] ? studentBookAudioTracks[unit][pageNum] || [] : [];
    else tracks = activityBookAudioTracks[unit] ? activityBookAudioTracks[unit][pageNum] || [] : [];

    if (tracks.length === 0) {
        
        return;
    }

    // Create buttons for each track
    tracks.forEach(track => {
        const btn = document.createElement("button");
        const trackNumber = track.split("_")[2]; // get number
        btn.textContent = `Audio ${trackNumber}`;

      btn.addEventListener("click", () => {
    const folder = bookType === "student" ? "student-book-audios" : "activity_book_audios";

    audioSource.src = `audios/${folder}/unit_${unit}/${track}.mp3`;

    audioPlayer.load();

    showAudioPlayer();

    audioPlayer.controls = true;
    audioPlayer.setAttribute("controlsList", "nodownload");
});

        audioListContainer.appendChild(btn);
    });
});

// Hide audio list if click outside
window.addEventListener("click", () => {
    audioListContainer.style.display = "none";
});
// ==========================
// VIDEO FUNCTIONALITY FOR UNIT 1
// ==========================

const videoBtn = document.querySelector('a img[alt="Videos"]').parentElement;
const videoListContainer = document.createElement("div");
videoListContainer.id = "video-list-container";
document.body.appendChild(videoListContainer);

const videoPlayer = document.getElementById("slide-video");
const videoSource = document.getElementById("video-source");
const hideVideoBtn = document.getElementById("hide-video-btn");

// Show video player and hide button
function showVideoPlayer() {
    videoPlayer.style.display = "block";
    hideVideoBtn.style.display = "inline-block";
}

// Hide video player when hide button is clicked
hideVideoBtn.addEventListener("click", () => {
    videoPlayer.pause();
    videoPlayer.style.display = "none";
    hideVideoBtn.style.display = "none";
});

// Double-click to toggle fullscreen
videoPlayer.addEventListener("dblclick", () => {
    if (!document.fullscreenElement) {
        videoPlayer.requestFullscreen().catch(err => console.log(err));
    } else {
        document.exitFullscreen();
    }
});

// Define videos for Unit 1
const unitVideos = {
    1: {
        7: ["Headway-Openers---Beginner---Unit-1"],
        10: ["Hw5e-Beginner-U01---Hello!"],
        },
    3: {
        24: ["br2_004_v1_1","br2_004_v1_2"],
        25: ["br2_004_v1_3"]
    },

    6: {
        44: ["br2_004_v2_1"],
        45: ["br2_004_v2_2","br2_004_v2_3"]
    },

    9: {
        64: ["br2_004_v3_1", "br2_004_v3_2"],
        65: ["br2_004_v3_3","br2_004_v3_4","br2_004_v3_5","br2_004_v3_6"]
    },

    12: {
        84: ["br2_004_v4_1"],
        85: ["br2_004_v4_2","br2_004_v4_3","br2_004_v4_4"]
    }
};
// Click event for video icon (Student Book only)
videoBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
   // TOGGLE: hide if already visible
    if (videoListContainer.style.display === "flex") {
        videoListContainer.style.display = "none";
        return;
    }

    // Clear previous buttons
    videoListContainer.innerHTML = "";
    videoListContainer.style.display = "flex";

    if (currentImages.length === 0) return;

    const pageSrc = currentImages[currentIndex];

    // ONLY show videos for Student Book pages
    if (!pageSrc.includes("student-book-pages")) return; // <- key change

    // Extract unit number
    const unitMatch = pageSrc.match(/unit_(\d+)/i);
    if (!unitMatch) return;
    const unit = parseInt(unitMatch[1]);

    // Extract page number
    const pageMatch = pageSrc.match(/page(\d+)/i);
    if (!pageMatch) return;
    const pageNum = parseInt(pageMatch[1]);

    // Get videos for this page
    const tracks = unitVideos[unit] ? unitVideos[unit][pageNum] || [] : [];

    if (tracks.length === 0) return; // <- do nothing if no videos

    tracks.forEach((track, index) => {
        const btn = document.createElement("button");
        btn.textContent = `Video ${index + 1}`;

        btn.addEventListener("click", () => {
            videoSource.src = `video/unit_${unit}/${track}.mp4`;
            videoPlayer.load();
            showVideoPlayer();
        });

        videoListContainer.appendChild(btn);
    });
});

// Hide video list if click outside
window.addEventListener("click", () => {
    videoListContainer.style.display = "none";
});
const gamesBtn =
    document.getElementById("games-btn");

const gamesHub =
    document.getElementById("games-hub");

const gameCards =
    document.querySelectorAll(".game-card");
  // ==========================
// GAMES BUTTON
// ==========================

gamesBtn.addEventListener("click", function(e) {

    e.preventDefault();
    e.stopPropagation();

    window.location.href = "https://play.poliglotaangola.com/";

});
// ==========================
// DRAWING TARGET SYSTEM (NEW CORE FIX)
// ==========================

const editCanvas = document.getElementById("edit-canvas");
const editCtx = editCanvas.getContext("2d");

const whiteboardCanvas = document.getElementById("whiteboard-canvas");
const whiteboardCtx = whiteboardCanvas.getContext("2d");

// ACTIVE CANVAS
let drawingCanvas = editCanvas;
let drawingCtx = editCtx;

// Switch drawing target
function setDrawingTarget(type) {

    if (type === "whiteboard") {
        drawingCanvas = whiteboardCanvas;
        drawingCtx = whiteboardCtx;
    } else {
        drawingCanvas = editCanvas;
        drawingCtx = editCtx;
    }

    updateCursor();
}

// ==========================
// EDIT TRAY TOGGLE SYSTEM
// ==========================

const editBtn = document.getElementById("edit-btn");
const editTray = document.getElementById("edit-tray");
const pencilTool = document.getElementById("pencil-tool");

editBtn.addEventListener("click", function(e) {

    e.preventDefault();
    e.stopPropagation();

    editTray.style.display =
        editTray.style.display === "flex"
            ? "none"
            : "flex";
});

// ==========================
// WHITEBOARD TOGGLE
// ==========================

const whiteboardBtn = document.getElementById("whiteboard-btn");
const whiteboard = document.getElementById("whiteboard");

whiteboardBtn.addEventListener("click", function(e) {

    e.preventDefault();
    e.stopPropagation();

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

// Hide whiteboard when changing pages
studentDropdownLinks.forEach(link => {

    link.addEventListener("click", () => {

        whiteboard.style.display = "none";
        editTray.style.display = "none";

        setDrawingTarget("slide");
    });
});

activityDropdownLinks.forEach(link => {

    link.addEventListener("click", () => {

        whiteboard.style.display = "none";
        editTray.style.display = "none";

        setDrawingTarget("slide");
    });
});

// ==========================
// TOOL SYSTEM
// ==========================

let currentTool = null;
function setTool(tool) {

    // toggle OFF
    if (currentTool === tool) {

        currentTool = null;

    } else {

        currentTool = tool;
    }

    updateToolUI();
    updateCursor();
}
const penTool = document.getElementById("pen-tool");
const eraserTool = document.getElementById("eraser-tool");
const highlightTool = document.getElementById("highlight-tool");
const textTool = document.getElementById("text-tool");
const clearTool = document.getElementById("clear-tool");

pencilTool.addEventListener("click", () => setTool("pencil"));
penTool.addEventListener("click", () => setTool("pen"));
eraserTool.addEventListener("click", () => setTool("eraser"));
highlightTool.addEventListener("click", () => setTool("marker"));

textTool.addEventListener("click", () => setTool("text"));
function updateToolUI() {

    const tools = {
        pencil: pencilTool,
        pen: penTool,
        eraser: eraserTool,
        marker: highlightTool,
        text: textTool
    };

    Object.values(tools).forEach(btn => {
        if (btn) btn.classList.remove("active-tool");
    });

    if (tools[currentTool]) {
        tools[currentTool].classList.add("active-tool");
    }
}
// ==========================
// CLEAR CURRENT CANVAS
// ==========================

clearTool.addEventListener("click", () => {

    const currentCanvasId = drawingCanvas.id;

    // Remove only strokes from current canvas
    strokes = strokes.filter(stroke => {
        return stroke.canvas !== currentCanvasId;
    });

    // Clear actual canvas
    if (currentCanvasId === "whiteboard-canvas") {

        whiteboardCtx.clearRect(
            0,
            0,
            whiteboardCanvas.width,
            whiteboardCanvas.height
        );

    } else {

        editCtx.clearRect(
            0,
            0,
            editCanvas.width,
            editCanvas.height
        );
    }

    redrawStrokes();
});
// ==========================
// CURSOR SYSTEM
// ==========================

function updateCursor() {

    if (currentTool === "text") {

        drawingCanvas.style.cursor = "text";

        // allow clicking textboxes
        editCanvas.style.pointerEvents = "none";

    } else {

        editCanvas.style.pointerEvents = "auto";

        if (currentTool === "eraser") {
            drawingCanvas.style.cursor = "crosshair";
        }

        else if (currentTool === "marker") {
            drawingCanvas.style.cursor = "cell";
        }

        else {
            drawingCanvas.style.cursor = "default";
        }
    }
}
// ==========================
// DRAWING ENGINE
// ==========================

let strokes = [];
let currentStroke = null;
let drawing = false;

let pencilSize = 3;

// ==========================
// RESIZE SYSTEM
// ==========================

function resizeEditCanvas() {

    const rect = slideImage.getBoundingClientRect();

    editCanvas.width = rect.width;
    editCanvas.height = rect.height;

    editCanvas.style.left = slideImage.offsetLeft + "px";
    editCanvas.style.top = slideImage.offsetTop + "px";

    redrawStrokes();
   
}

function resizeWhiteboardCanvas() {

    whiteboardCanvas.width = whiteboard.offsetWidth;
    whiteboardCanvas.height = whiteboard.offsetHeight;

    redrawStrokes();
}

window.addEventListener("resize", () => {

    resizeEditCanvas();
    resizeWhiteboardCanvas();
});

// ==========================
// POSITION SYSTEM
// ==========================

function getPos(e, canvas) {

    const rect = canvas.getBoundingClientRect();

    return {
        x: (e.clientX - rect.left) / canvas.width,
        y: (e.clientY - rect.top) / canvas.height
    };
}

// ==========================
// DRAW START
// ==========================

function startDrawing(e, canvas) {
if (!currentTool) return;
    const { x, y } = getPos(e, canvas);

    if (currentTool === "eraser") {

        drawing = true;

        eraseAt(x, y, canvas.id);

        redrawStrokes();

        return;
    }

    drawing = true;

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

// ==========================
// DRAW MOVE
// ==========================

function moveDrawing(e, canvas) {

    if (!drawing) return;

    const { x, y } = getPos(e, canvas);

    if (currentTool === "eraser") {

        eraseAt(x, y, canvas.id);

        redrawStrokes();

        return;
    }

    currentStroke.points.push({ x, y });

    redrawStrokes();
}

// ==========================
// DRAW STOP
// ==========================

function stopDrawing() {

    drawing = false;
}

// ==========================
// EDIT CANVAS EVENTS
// ==========================

editCanvas.addEventListener("mousedown", (e) => {
    startDrawing(e, editCanvas);
});

editCanvas.addEventListener("mousemove", (e) => {
    moveDrawing(e, editCanvas);
});

editCanvas.addEventListener("mouseup", stopDrawing);

editCanvas.addEventListener("mouseleave", stopDrawing);

// ==========================
// WHITEBOARD EVENTS
// ==========================

whiteboardCanvas.addEventListener("mousedown", (e) => {
    startDrawing(e, whiteboardCanvas);
});

whiteboardCanvas.addEventListener("mousemove", (e) => {
    moveDrawing(e, whiteboardCanvas);
});

whiteboardCanvas.addEventListener("mouseup", stopDrawing);

whiteboardCanvas.addEventListener("mouseleave", stopDrawing);

// ==========================
// ERASER SYSTEM
// ==========================

function eraseAt(x, y, canvasId) {

    const radius = 0.01;

    strokes = strokes.flatMap(stroke => {

        if (stroke.canvas !== canvasId) return [stroke];

        let newStrokes = [];
        let temp = [];

        for (let p of stroke.points) {

            const dx = p.x - x;
            const dy = p.y - y;

            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > radius) {

                temp.push(p);

            } else {

                if (temp.length) {

                    newStrokes.push({
                        type: "stroke",
                        canvas: stroke.canvas,
                        color: stroke.color,
                        size: stroke.size,
                        points: temp
                    });

                    temp = [];
                }
            }
        }

        if (temp.length) {

            newStrokes.push({
                type: "stroke",
                canvas: stroke.canvas,
                color: stroke.color,
                size: stroke.size,
                points: temp
            });
        }

        return newStrokes;
    });
}

// ==========================
// REDRAW SYSTEM
// ==========================

function redrawStrokes() {

    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);

    whiteboardCtx.clearRect(
        0,
        0,
        whiteboardCanvas.width,
        whiteboardCanvas.height
    );

    strokes.forEach(item => {

        let ctx;
        let canvas;

        if (item.canvas === "whiteboard-canvas") {

            ctx = whiteboardCtx;
            canvas = whiteboardCanvas;

        } else {

            ctx = editCtx;
            canvas = editCanvas;
        }

        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();

        item.points.forEach((p, i) => {

            const x = p.x * canvas.width;
            const y = p.y * canvas.height;

            if (i === 0) {

                ctx.moveTo(x, y);

            } else {

                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    });
}

// ==========================
// TEXT TOOL (FIXED VERSION)
// ==========================

let activeTextBox = null;

// click handler
editCanvas.addEventListener("click", handleTextClick);
whiteboardCanvas.addEventListener("click", handleTextClick);

function handleTextClick(e) {
    if (currentTool !== "text") return;

    const canvas = drawingCanvas;
    const rect = canvas.getBoundingClientRect();

    // FIX: correct absolute positioning (no shift left anymore)
const x = (e.clientX - rect.left) / rect.width;
const y = (e.clientY - rect.top) / rect.height;

    createTextBox(x, y, canvas);
}

// ==========================
// CREATE TEXT BOX (FIXED)
// ==========================
function createTextBox(x, y, canvas) {

    const box = document.createElement("div");

    box.contentEditable = true;
    box.classList.add("slide-textbox");

    box.dataset.x = x;
    box.dataset.y = y;
    box.dataset.canvas = canvas.id;

    box.style.position = "absolute";

    // POSITION
    const rect = canvas.getBoundingClientRect();

    box.style.left = (x * rect.width) + "px";
    box.style.top = (y * rect.height) + "px";

    // STYLE
    box.style.minWidth = "50px";
    box.style.minHeight = "20px";
    box.style.color = "red";
    box.style.fontSize = "28px";
    box.style.fontWeight = "bold";
    box.style.outline = "none";
    box.style.cursor = "move";
    box.style.zIndex = "999999"; // VERY IMPORTANT
    box.style.pointerEvents = "auto"; // VERY IMPORTANT

    // allow interaction
    box.style.userSelect = "text";

    canvas.parentElement.appendChild(box);

    box.focus();

    activeTextBox = box;

    showTextToolbar(box);

    enableDrag(box);
}

// ==========================
// TOOLBAR (FIXED POSITIONING)
// ==========================
const textToolbar = document.createElement("div");

textToolbar.style.position = "absolute";
textToolbar.style.display = "none";
textToolbar.style.gap = "6px";
textToolbar.style.padding = "5px";
textToolbar.style.background = "#fff";
textToolbar.style.border = "1px solid #ccc";
textToolbar.style.zIndex = "99999";
textToolbar.style.borderRadius = "6px";

document.body.appendChild(textToolbar);

function showTextToolbar(box) {

    textToolbar.innerHTML = "";

    textToolbar.style.display = "flex";

    // FIX: real screen position (not offsetLeft/Top)
    const rect = box.getBoundingClientRect();

    textToolbar.style.left = rect.left + "px";
    textToolbar.style.top = (rect.top - 40) + "px";

    // DELETE
    const del = document.createElement("button");
    del.innerText = "🗑️";
    del.onclick = () => {
        box.remove();
        textToolbar.style.display = "none";
    };

    // SIZE +
    const plus = document.createElement("button");
    plus.innerText = "A+";
    plus.onclick = () => {
        let size = parseInt(window.getComputedStyle(box).fontSize);
        box.style.fontSize = (size + 2) + "px";
    };

    // SIZE -
    const minus = document.createElement("button");
    minus.innerText = "A-";
    minus.onclick = () => {
        let size = parseInt(window.getComputedStyle(box).fontSize);
        if (size > 10) box.style.fontSize = (size - 2) + "px";
    };

    // COLORS
    const red = document.createElement("button");
    red.innerText = "🔴";
    red.onclick = () => box.style.color = "red";

    const black = document.createElement("button");
    black.innerText = "⚫";
    black.onclick = () => box.style.color = "black";

    const blue = document.createElement("button");
    blue.innerText = "🔵";
    blue.onclick = () => box.style.color = "blue";

    textToolbar.append(del, plus, minus, red, black, blue);
}

// hide toolbar when clicking outside
document.addEventListener("click", (e) => {
    if (e.target.contentEditable === "true") {
        activeTextBox = e.target;
        showTextToolbar(e.target);
    } else if (!textToolbar.contains(e.target)) {
        textToolbar.style.display = "none";
    }
});

// ==========================
// DRAG TEXT BOX (NEW FEATURE)
// ==========================
function enableDrag(el) {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    el.addEventListener("mousedown", (e) => {
        dragging = true;

        const rect = el.getBoundingClientRect();

        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragging) return;

        const parentRect = el.parentElement.getBoundingClientRect();

        el.style.left = (e.clientX - parentRect.left - offsetX) + "px";
        el.style.top = (e.clientY - parentRect.top - offsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
        dragging = false;
        document.body.style.userSelect = "auto";
    });
}
// ==========================
// INITIAL SETUP
// ==========================

window.addEventListener("load", () => {

    setDrawingTarget("slide");

    resizeEditCanvas();
    resizeWhiteboardCanvas();

    updateCursor(); // safe initial call

});

// ==========================
// CURSOR SYSTEM
// ==========================

function updateCursor() {

    if (!drawingCanvas) return;

    // NO TOOL SELECTED
    if (!currentTool) {
        drawingCanvas.style.cursor = "default";
        return;
    }

    // ERASER
    if (currentTool === "eraser") {
        drawingCanvas.style.cursor = "crosshair";
    }

    // TEXT TOOL
    else if (currentTool === "text") {
        drawingCanvas.style.cursor = "text";
    }

    // MARKER / HIGHLIGHT
    else if (currentTool === "marker") {
        drawingCanvas.style.cursor = "cell";
    }

    // DEFAULT FOR ALL OTHER TOOLS
    else {
        drawingCanvas.style.cursor = "pointer";
    }
}
