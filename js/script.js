// ============================================================
// POLIGLOTA — PRESENTATION / LESSON ENGINE
// ============================================================

// ============================================================
// DOM ELEMENTS
// ============================================================

const slideImage = document.getElementById("slide-image");
const slideContainer = document.querySelector(".slide-container");

const homeBtn = document.getElementById("home-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const audioBtn = document.getElementById("audio-btn");
const audioListContainer = document.getElementById("audio-list-container");
const audioPlayer = document.getElementById("slide-audio");
const audioSource = document.getElementById("audio-source");
const hideAudioBtn = document.getElementById("hide-audio-btn");

const videoBtn = document.querySelector(
    'a img[alt="Videos"]'
)?.parentElement;

const videoPlayer = document.getElementById("slide-video");
const videoSource = document.getElementById("video-source");
const hideVideoBtn = document.getElementById("hide-video-btn");

const editCanvas = document.getElementById("edit-canvas");
const whiteboardCanvas = document.getElementById("whiteboard-canvas");

const editBtn = document.getElementById("edit-btn");
const editTray = document.getElementById("edit-tray");

const whiteboardBtn = document.getElementById("whiteboard-btn");
const whiteboard = document.getElementById("whiteboard");


// ============================================================
// CREATE LESSON CONTAINER IF IT DOES NOT EXIST
// ============================================================
//
// Your current HTML does not contain:
//
// <div id="lesson-content-container"></div>
//
// Therefore we create it automatically instead of requiring
// another change to the HTML.
//

let lessonContentContainer =
    document.getElementById("lesson-content-container");

if (!lessonContentContainer) {

    lessonContentContainer = document.createElement("div");

    lessonContentContainer.id = "lesson-content-container";

    const slide = document.querySelector(".slide-container");

    if (slide && slide.parentElement) {

        slide.parentElement.insertBefore(
            lessonContentContainer,
            slide
        );

    } else {

        document.body.appendChild(lessonContentContainer);

    }
}


// ============================================================
// LESSON STATE
// ============================================================

let lessonCards = [];
let activeLessonCard = null;
let lessonMode = false;


// ============================================================
// BOOK STATE
// ============================================================

let currentImages = [];
let currentIndex = 0;
let currentScale = 1;


// ============================================================
// DROPDOWN ELEMENTS
// ============================================================

const studentDropdownLinks = document.querySelectorAll(
    "#students-book-dropdown .unit-item > a"
);

const activityDropdownLinks = document.querySelectorAll(
    "#activity-book-dropdown a"
);

const dropdownBtns = document.querySelectorAll(
    ".dropdown-btn"
);


// ============================================================
// CANVAS CONTEXTS
// ============================================================

const editCtx = editCanvas
    ? editCanvas.getContext("2d")
    : null;

const whiteboardCtx = whiteboardCanvas
    ? whiteboardCanvas.getContext("2d")
    : null;


// ============================================================
// DRAWING TARGET
// ============================================================

let drawingCanvas = editCanvas;
let drawingCtx = editCtx;


// ============================================================
// SAVE CURRENT PAGE STATE
// ============================================================

function saveCurrentState(bookType, unit, pageNum, lesson = null) {

    localStorage.setItem(
        "pptkb1State",
        JSON.stringify({
            bookType,
            unit,
            pageNum,
            lesson
        })
    );
}


// ============================================================
// DROPDOWN TOGGLE
// ============================================================

dropdownBtns.forEach(btn => {

    btn.addEventListener("click", (e) => {

        e.stopPropagation();

        const parentDropdown =
            btn.parentElement;

        document
            .querySelectorAll(".dropdown")
            .forEach(dropdown => {

                if (dropdown !== parentDropdown) {

                    dropdown.classList.remove("show");

                }

            });

        parentDropdown.classList.toggle("show");

    });

});


// ============================================================
// CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
// ============================================================

window.addEventListener("click", (e) => {

    if (
        e.target.closest(".dropdown") ||
        e.target.closest(".lesson-dropdown")
    ) {

        return;

    }

    document
        .querySelectorAll(".dropdown")
        .forEach(dropdown => {

            dropdown.classList.remove("show");

        });

    document
        .querySelectorAll(".lesson-dropdown")
        .forEach(menu => {

            menu.classList.remove("show");

        });

});


// ============================================================
// IMAGE FITTING
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

    const containerWidth =
        slideContainer.clientWidth;

    const containerHeight =
        slideContainer.clientHeight;

    const imgWidth =
        slideImage.naturalWidth;

    const imgHeight =
        slideImage.naturalHeight;

    const scaleX =
        containerWidth / imgWidth;

    const scaleY =
        containerHeight / imgHeight;

    currentScale =
        Math.min(scaleX, scaleY);

    slideImage.style.width =
        imgWidth * currentScale + "px";

    slideImage.style.height =
        imgHeight * currentScale + "px";

}


// ============================================================
// LOAD IMAGE
// ============================================================

function loadImage(src) {

    if (!src) return;

    slideImage.style.display = "none";

    slideImage.onload = function () {

        slideImage.style.display = "block";

        autoFitImage();

        resizeEditCanvas();

    };

    slideImage.onerror = function () {

        console.error(
            "Failed to load image:",
            src
        );

        slideImage.style.display = "none";

    };

    slideImage.src = src;

}


// ============================================================
// CLOSE LESSON MODE
// ============================================================

function exitLessonMode() {

    lessonMode = false;

    closeLessonCard();

    lessonCards = [];

    lessonContentContainer.innerHTML = "";

    lessonContentContainer.style.display =
        "none";

    slideImage.style.display =
        "block";

    if (editCanvas) {

        editCanvas.style.display =
            "block";

    }

}


// ============================================================
// HOME PAGE
// ============================================================

function loadHome() {

    exitLessonMode();

    currentImages = [];

    currentIndex = 0;

    currentScale = 1;

    loadImage(
        "images/homepage.jpg"
    );

    prevBtn.style.display =
        "none";

    nextBtn.style.display =
        "none";

    audioListContainer.style.display =
        "none";

    if (videoListContainer) {

        videoListContainer.style.display =
            "none";

    }

    if (audioPlayer) {

        audioPlayer.pause();

        audioPlayer.style.display =
            "none";

    }

    if (hideAudioBtn) {

        hideAudioBtn.style.display =
            "none";

    }

}


// ============================================================
// STUDENT BOOK PAGES
// ============================================================

function loadStudentUnit(unitNumber) {

    exitLessonMode();

    currentImages = [];

    currentIndex = 0;

    currentScale = 1;

    const folderName =
        "unit_" + unitNumber;

    const basePath =
        `images/student-book-pages/${folderName}/`;

    // Student Book page ranges
    const pageRanges = {

        "1": [1, 12],
        "2": [13, 18],
        "3": [19, 26],
        "4": [27, 33],
        "5": [34, 37],
        "6": [38, 46],
        "7": [47, 53],
        "8": [54, 58],
        "9": [59, 66],
        "10": [67, 71],
        "11": [72, 78],
        "12": [79, 85]

    };

    const range =
        pageRanges[String(unitNumber)];

    if (!range) {

        console.warn(
            "No student book page range for Unit",
            unitNumber
        );

        return;

    }

    const start =
        range[0];

    const end =
        range[1];

    for (
        let page = start;
        page <= end;
        page++
    ) {

        currentImages.push(
            `${basePath}page${page}.JPG`
        );

    }

    if (currentImages.length > 1) {

        prevBtn.style.display =
            "block";

        nextBtn.style.display =
            "block";

    } else {

        prevBtn.style.display =
            "none";

        nextBtn.style.display =
            "none";

    }

    loadImage(
        currentImages[currentIndex]
    );

    saveCurrentState(
        "student",
        unitNumber,
        start
    );

}


// ============================================================
// ACTIVITY BOOK
// ============================================================

function loadActivityUnit(unitNumber) {

    exitLessonMode();

    currentImages = [];

    currentIndex = 0;

    currentScale = 1;

    const folderName =
        "unit_" + unitNumber;

    const basePath =
        `images/activity-book-pages/${folderName}/`;

    const pageNumbers = {

        "1": [106, 107],
        "2": [108, 109],
        "3": [110, 111],
        "4": [112, 113],
        "5": [114, 115],
        "6": [116, 117],
        "7": [118, 119],
        "8": [120, 121],
        "9": [122, 123],
        "10": [124, 125],
        "11": [126, 127],
        "12": [128, 129]

    };

    const pages =
        pageNumbers[String(unitNumber)] || [];

    pages.forEach(num => {

        currentImages.push(
            basePath +
            "page" +
            num +
            ".JPG"
        );

    });

    if (currentImages.length > 1) {

        prevBtn.style.display =
            "block";

        nextBtn.style.display =
            "block";

    } else {

        prevBtn.style.display =
            "none";

        nextBtn.style.display =
            "none";

    }

    if (currentImages.length > 0) {

        loadImage(
            currentImages[currentIndex]
        );

        saveCurrentState(
            "activity",
            unitNumber,
            pages[0]
        );

    }

}


// ============================================================
// STUDENT BOOK UNIT MENU
// ============================================================

studentDropdownLinks.forEach(link => {

    link.addEventListener("click", (e) => {

        e.preventDefault();

        e.stopPropagation();

        const unit =
            link.getAttribute("data-unit");

        const lessonMenu =
            link.parentElement.querySelector(
                ".lesson-dropdown"
            );

        if (!lessonMenu) {

            loadStudentUnit(unit);

            return;

        }

        document
            .querySelectorAll(".lesson-dropdown")
            .forEach(menu => {

                if (menu !== lessonMenu) {

                    menu.classList.remove("show");

                }

            });

        lessonMenu.classList.toggle("show");

    });

});


// ============================================================
// ACTIVITY BOOK MENU
// ============================================================

activityDropdownLinks.forEach(link => {

    link.addEventListener("click", (e) => {

        e.preventDefault();

        e.stopPropagation();

        const unit =
            link.getAttribute("data-unit");

        loadActivityUnit(unit);

        document
            .querySelectorAll(".dropdown")
            .forEach(dropdown => {

                dropdown.classList.remove("show");

            });

    });

});


// ============================================================
// LESSON CONTENT
// ============================================================
//
// Add lesson content here.
//
// Each lesson can contain:
// text
// audio
// video
//
// More content types can be added later.
//

function getLessonContent(unit, lesson) {

    const lessons = {

        // ====================================================
        // UNIT 1 — LESSON 1
        // ====================================================

        "1-1": [

            {
                type: "text",

                title: "Introduction",

                content: `
                    <h2>Welcome to the lesson</h2>

                    <p>
                        In this lesson we are going to learn
                        the basic vocabulary and expressions.
                    </p>
                `
            },

            {
                type: "text",

                title: "Vocabulary",

                content: `
                    <h2>New Vocabulary</h2>

                    <p>Hello</p>
                    <p>Good morning</p>
                    <p>Good afternoon</p>
                    <p>Good evening</p>
                `
            },

            {
                type: "audio",

                title: "Listen and Repeat",

                audio:
                    "audios/student-book-audios/unit_1/example.mp3"
            },

            {
                type: "video",

                title: "Watch the Video",

                video:
                    "video/unit_1/presentation1.mp4"
            }

        ]

    };

    return (
        lessons[
            `${unit}-${lesson}`
        ] || []
    );

}


// ============================================================
// RENDER LESSON CARDS
// ============================================================

function renderLessonCards(unit, lesson) {

    const content =
        getLessonContent(
            unit,
            lesson
        );

    lessonContentContainer.innerHTML =
        "";

    lessonContentContainer.style.display =
        "grid";

    slideImage.style.display =
        "none";

    if (editCanvas) {

        editCanvas.style.display =
            "none";

    }

    prevBtn.style.display =
        "none";

    nextBtn.style.display =
        "none";

    if (!content.length) {

        lessonContentContainer.innerHTML = `

            <div class="lesson-empty">

                <div class="lesson-empty-icon">
                    📚
                </div>

                <h2>
                    Lesson content coming soon
                </h2>

                <p>
                    This lesson has no content yet.
                </p>

            </div>

        `;

        return;

    }

    lessonCards =
        content;

    lessonMode =
        true;

    content.forEach((item, index) => {

        const card =
            document.createElement("div");

        card.className =
            "lesson-card";

        card.dataset.index =
            index;

        let cardContent =
            "";

        // ==================================================
        // TEXT CARD
        // ==================================================

        if (item.type === "text") {

            cardContent = `

                <div class="lesson-card-icon">
                    📖
                </div>

                <h2>
                    ${item.title || "Lesson"}
                </h2>

                <div class="lesson-card-content">

                    ${item.content || ""}

                </div>

            `;

        }

        // ==================================================
        // AUDIO CARD
        // ==================================================

        else if (item.type === "audio") {

            cardContent = `

                <div class="lesson-card-icon">
                    🎧
                </div>

                <h2>
                    ${item.title || "Audio"}
                </h2>

                <div class="lesson-card-content">

                    <p>
                        Listen to the audio
                        and complete the activity.
                    </p>

                    <audio
                        controls
                        preload="metadata"
                    >

                        <source
                            src="${item.audio}"
                            type="audio/mpeg"
                        >

                        Your browser does not
                        support audio playback.

                    </audio>

                </div>

            `;

        }

        // ==================================================
        // VIDEO CARD
        // ==================================================

        else if (item.type === "video") {

            cardContent = `

                <div class="lesson-card-icon">
                    🎥
                </div>

                <h2>
                    ${item.title || "Video"}
                </h2>

                <div class="lesson-card-content">

                    <video
                        controls
                        preload="metadata"
                    >

                        <source
                            src="${item.video}"
                            type="video/mp4"
                        >

                        Your browser does not
                        support video playback.

                    </video>

                </div>

            `;

        }

        // ==================================================
        // UNKNOWN TYPE
        // ==================================================

        else {

            cardContent = `

                <div class="lesson-card-icon">
                    📄
                </div>

                <h2>
                    ${item.title || "Lesson Content"}
                </h2>

                <div class="lesson-card-content">

                    ${item.content || ""}

                </div>

            `;

        }

        card.innerHTML =
            cardContent;

        // ==================================================
        // CARD CLICK
        // ==================================================

        card.addEventListener(
            "click",
            function (e) {

                // Do not expand when clicking
                // media controls.

                if (
                    e.target.closest("audio") ||
                    e.target.closest("video") ||
                    e.target.closest("button")
                ) {

                    return;

                }

                openLessonCard(card);

            }
        );

        lessonContentContainer.appendChild(
            card
        );

    });

}


// ============================================================
// OPEN LESSON CARD
// ============================================================

function openLessonCard(card) {

    if (!card) return;

    if (activeLessonCard === card) {

        closeLessonCard();

        return;

    }

    if (activeLessonCard) {

        activeLessonCard.classList.remove(
            "expanded"
        );

    }

    activeLessonCard =
        card;

    card.classList.add(
        "expanded"
    );

    lessonContentContainer.classList.add(
        "focus-mode"
    );

    document.body.classList.add(
        "lesson-card-open"
    );

}


// ============================================================
// CLOSE LESSON CARD
// ============================================================

function closeLessonCard() {

    if (activeLessonCard) {

        activeLessonCard.classList.remove(
            "expanded"
        );

    }

    activeLessonCard =
        null;

    lessonContentContainer.classList.remove(
        "focus-mode"
    );

    document.body.classList.remove(
        "lesson-card-open"
    );

}


// ============================================================
// ESCAPE CLOSES EXPANDED CARD
// ============================================================

document.addEventListener(
    "keydown",
    (e) => {

        if (
            e.key === "Escape" &&
            activeLessonCard
        ) {

            closeLessonCard();

        }

    }
);


// ============================================================
// LESSON MENU
// ============================================================

const lessonDropdownLinks =
    document.querySelectorAll(
        ".lesson-dropdown a"
    );

lessonDropdownLinks.forEach(link => {

    link.addEventListener("click", (e) => {

        e.preventDefault();

        e.stopPropagation();

        const unit =
            link.getAttribute("data-unit");

        const lesson =
            link.getAttribute("data-lesson");

        console.log(
            "Opening Lesson:",
            unit,
            lesson
        );

        // ==================================================
        // LESSON MODE
        // ==================================================

        lessonMode =
            true;

        // ==================================================
        // HIDE IMAGE
        // ==================================================

        slideImage.style.display =
            "none";

        if (editCanvas) {

            editCanvas.style.display =
                "none";

        }

        // ==================================================
        // HIDE PAGE NAVIGATION
        // ==================================================

        prevBtn.style.display =
            "none";

        nextBtn.style.display =
            "none";

        // ==================================================
        // HIDE AUDIO / VIDEO
        // ==================================================

        audioListContainer.style.display =
            "none";

        if (videoListContainer) {

            videoListContainer.style.display =
                "none";

        }

        if (audioPlayer) {

            audioPlayer.pause();

            audioPlayer.style.display =
                "none";

        }

        if (hideAudioBtn) {

            hideAudioBtn.style.display =
                "none";

        }

        if (videoPlayer) {

            videoPlayer.pause();

            videoPlayer.style.display =
                "none";

        }

        if (hideVideoBtn) {

            hideVideoBtn.style.display =
                "none";

        }

        // ==================================================
        // CLOSE WHITEBOARD
        // ==================================================

        if (whiteboard) {

            whiteboard.style.display =
                "none";

        }

        if (editTray) {

            editTray.style.display =
                "none";

        }

        // ==================================================
        // RENDER LESSON
        // ==================================================

        renderLessonCards(
            unit,
            lesson
        );

        // ==================================================
        // SAVE LESSON STATE
        // ==================================================

        localStorage.setItem(
            "pptkb1State",
            JSON.stringify({

                bookType:
                    "lesson",

                unit:
                    unit,

                lesson:
                    lesson,

                pageNum:
                    null

            })
        );

        // ==================================================
        // CLOSE LESSON MENUS
        // ==================================================

        document
            .querySelectorAll(".lesson-dropdown")
            .forEach(menu => {

                menu.classList.remove(
                    "show"
                );

            });

    });

});


// ============================================================
// NAVIGATION — PREVIOUS
// ============================================================

prevBtn.addEventListener(
    "click",
    () => {

        if (
            lessonMode ||
            currentImages.length === 0
        ) {

            return;

        }

        if (currentIndex > 0) {

            currentIndex--;

            loadImage(
                currentImages[currentIndex]
            );

            savePageState();

        }

    }
);


// ============================================================
// NAVIGATION — NEXT
// ============================================================

nextBtn.addEventListener(
    "click",
    () => {

        if (
            lessonMode ||
            currentImages.length === 0
        ) {

            return;

        }

        if (
            currentIndex <
            currentImages.length - 1
        ) {

            currentIndex++;

            loadImage(
                currentImages[currentIndex]
            );

            savePageState();

        }

    }
);


// ============================================================
// SAVE CURRENT IMAGE PAGE
// ============================================================

function savePageState() {

    if (
        !currentImages.length ||
        lessonMode
    ) {

        return;

    }

    const src =
        currentImages[currentIndex];

    const unitMatch =
        src.match(/unit_(\d+)/i);

    const pageMatch =
        src.match(/page(\d+)/i);

    if (!unitMatch || !pageMatch) {

        return;

    }

    const bookType =
        src.includes(
            "student-book-pages"
        )
            ? "student"
            : "activity";

    saveCurrentState(
        bookType,
        unitMatch[1],
        pageMatch[1]
    );

}


// ============================================================
// ZOOM SYSTEM
// ============================================================

const MIN_ZOOM =
    0.1;

const MAX_ZOOM =
    5;


function applyZoom() {

    if (
        !slideImage ||
        !slideImage.naturalWidth ||
        !slideImage.naturalHeight
    ) {

        return;

    }

    slideImage.style.width =
        (
            slideImage.naturalWidth *
            currentScale
        ) + "px";

    slideImage.style.height =
        (
            slideImage.naturalHeight *
            currentScale
        ) + "px";

    resizeEditCanvas();

}


// ============================================================
// COMPUTER — CTRL + MOUSE WHEEL
// ============================================================

slideContainer.addEventListener(
    "wheel",
    function (e) {

        if (!e.ctrlKey) {

            return;

        }

        e.preventDefault();

        if (e.deltaY < 0) {

            currentScale +=
                0.1;

        } else {

            currentScale -=
                0.1;

        }

        currentScale =
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    currentScale
                )
            );

        applyZoom();

    },
    {
        passive: false
    }
);


// ============================================================
// ANDROID / TOUCH PINCH ZOOM
// ============================================================

let pinchStartDistance =
    null;

let pinchStartScale =
    1;


function getTouchDistance(
    touch1,
    touch2
) {

    const dx =
        touch2.clientX -
        touch1.clientX;

    const dy =
        touch2.clientY -
        touch1.clientY;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


slideContainer.addEventListener(
    "touchstart",
    function (e) {

        if (
            e.touches.length !== 2
        ) {

            return;

        }

        e.preventDefault();

        pinchStartDistance =
            getTouchDistance(
                e.touches[0],
                e.touches[1]
            );

        pinchStartScale =
            currentScale;

    },
    {
        passive: false
    }
);


slideContainer.addEventListener(
    "touchmove",
    function (e) {

        if (
            e.touches.length !== 2
        ) {

            return;

        }

        e.preventDefault();

        if (
            !pinchStartDistance
        ) {

            return;

        }

        const currentDistance =
            getTouchDistance(
                e.touches[0],
                e.touches[1]
            );

        const scaleChange =
            currentDistance /
            pinchStartDistance;

        currentScale =
            pinchStartScale *
            scaleChange;

        currentScale =
            Math.max(
                MIN_ZOOM,
                Math.min(
                    MAX_ZOOM,
                    currentScale
                )
            );

        applyZoom();

    },
    {
        passive: false
    }
);


slideContainer.addEventListener(
    "touchend",
    function (e) {

        if (
            e.touches.length < 2
        ) {

            pinchStartDistance =
                null;

        }

    },
    {
        passive: false
    }
);


slideContainer.addEventListener(
    "touchcancel",
    function () {

        pinchStartDistance =
            null;

    },
    {
        passive: false
    }
);


// ============================================================
// HOME BUTTON
// ============================================================

homeBtn.addEventListener(
    "click",
    function (e) {

        e.preventDefault();

        loadHome();

    }
);


// ============================================================
// AUDIO PLAYER
// ============================================================

function showAudioPlayer() {

    if (audioPlayer) {

        audioPlayer.style.display =
            "block";

    }

    if (hideAudioBtn) {

        hideAudioBtn.style.display =
            "inline-block";

    }

}


if (hideAudioBtn) {

    hideAudioBtn.addEventListener(
        "click",
        () => {

            if (audioPlayer) {

                audioPlayer.pause();

                audioPlayer.style.display =
                    "none";

            }

            hideAudioBtn.style.display =
                "none";

        }
    );

}


// ============================================================
// AUDIO FUNCTIONALITY
// ============================================================

const studentBookAudioTracks = {

    1: {
        8: ["page8_Track_1.1"],
        9: [
            "page9_Track_1.2",
            "page9_Track_1.3"
        ],
        10: ["br2_003_a1_4"]
    },

    2: {
        13: ["br2_003_a2_1"],
        15: ["br2_003_a2_2"],
        16: ["br2_003_a2_3"]
    },

    3: {
        19: ["br2_003_a3_1"],
        20: ["br2_003_a3_2"],
        21: [
            "br2_003_a3_3",
            "br2_003_a3_4"
        ],
        22: ["br2_003_a3_5"]
    },

    4: {
        27: ["br2_003_a4_1"],
        28: ["br2_003_a4_2"],
        29: ["br2_003_a4_3"],
        30: ["br2_003_a4_4"]
    },

    5: {
        34: ["br2_003_a5_1"],
        35: [
            "br2_003_a5_2",
            "br2_003_a5_3"
        ],
        36: [
            "br2_003_a5_4",
            "br2_003_a5_5",
            "br2_003_a5_6"
        ]
    },

    6: {
        38: ["br2_003_a6_1"],
        41: [
            "br2_003_a6_2",
            "br2_003_a6_3"
        ],
        42: ["br2_003_a6_4"],
        43: ["br2_003_a6_5"]
    },

    7: {
        47: ["br2_003_a7_1"],
        49: [
            "br2_003_a7_2",
            "br2_003_a7_3"
        ],
        50: ["br2_003_a7_4"]
    },

    8: {
        54: ["br2_003_a8_1"],
        55: ["br2_003_a8_2"],
        56: ["br2_003_a8_3"]
    },

    9: {
        59: ["br2_003_a9_1"],
        60: ["br2_003_a9_2"],
        61: ["br2_003_a9_3"],
        62: ["br2_003_a9_4"]
    },

    10: {
        67: ["br2_003_a10_1"],
        68: ["br2_003_a10_2"],
        69: ["br2_003_a10_3"],
        70: ["br2_003_a10_4"]
    },

    11: {
        72: ["br2_003_a11_1"],
        73: ["br2_003_a11_1"],
        75: ["br2_003_a11_2"],
        76: [
            "br2_003_a11_3",
            "br2_003_a11_4"
        ]
    },

    12: {
        79: ["br2_003_a12_1"],
        81: ["br2_003_a12_2"],
        82: [
            "br2_003_a12_3",
            "br2_003_a12_4",
            "br2_003_a12_5"
        ],
        83: ["br2_003_a12_6"]
    }

};


const activityBookAudioTracks = {

    1: {
        4: ["page4_Track_02"],
        15: ["br2_003_a2_2"],
        7: ["page7_Track_04"]
    },

    2: {
        13: ["br2_003_a2_1"],
        12: ["page12_Track_06"],
        16: ["page16_Track_07"]
    },

    3: {
        18: ["page18_Track_08"],
        19: ["page19_Track_09"],
        20: ["page20_Track_10"],
        21: ["page21_Track_11"],
        22: ["page22_Track_12"]
    },

    4: {
        24: ["page24_Track_13"],
        25: ["page25_Track_14"],
        26: ["page26_Track_15"],
        28: ["page28_Track_16"]
    },

    5: {
        34: ["page34_Track_18"],
        36: ["page36_Track_19"],
        38: ["page38_Track_20"]
    },

    6: {
        40: ["page40_Track_21"],
        41: ["page41_Track_22"],
        42: ["page42_Track_23"],
        46: ["page46_Track_24"]
    },

    7: {
        48: ["page48_Track_25"],
        50: ["page50_Track_26"],
        52: ["page52_Track_27"]
    },

    8: {
        54: ["page54_Track_28"],
        55: ["page55_Track_29"],
        56: [
            "page56_Track_30",
            "page56_Track_31"
        ],
        57: ["page57_Track_32"],
        60: ["page60_Track_33"],
        62: ["page62_Track_34"]
    },

    9: {
        64: ["page64_Track_35"],
        66: ["page66_Track_36"]
    },

    10: {
        70: ["page70_Track_37"],
        72: ["page72_Track_38"],
        73: ["page73_Track_39"]
    },

    11: {
        78: ["page78_Track_40"],
        80: ["page80_Track_41"]
    },

    12: {
        84: ["page84_Track_42"],
        86: ["page86_Track_43"],
        87: ["page87_Track_44"]
    }

};


audioBtn.addEventListener(
    "click",
    function (e) {

        e.preventDefault();

        e.stopPropagation();

        if (lessonMode) {

            return;

        }

        if (
            audioListContainer.style.display ===
            "flex"
        ) {

            audioListContainer.style.display =
                "none";

            return;

        }

        audioListContainer.innerHTML =
            "";

        audioListContainer.style.display =
            "flex";

        if (
            currentImages.length === 0
        ) {

            return;

        }

        const pageSrc =
            currentImages[currentIndex];

        let bookType;

        if (
            pageSrc.includes(
                "student-book-pages"
            )
        ) {

            bookType =
                "student";

        } else if (
            pageSrc.includes(
                "activity-book-pages"
            )
        ) {

            bookType =
                "activity";

        } else {

            return;

        }

        const unitMatch =
            pageSrc.match(
                /unit_(\d+)/i
            );

        const pageMatch =
            pageSrc.match(
                /page(\d+)/i
            );

        if (
            !unitMatch ||
            !pageMatch
        ) {

            return;

        }

        const unit =
            parseInt(
                unitMatch[1]
            );

        const pageNum =
            parseInt(
                pageMatch[1]
            );

        const source =
            bookType === "student"
                ? studentBookAudioTracks
                : activityBookAudioTracks;

        const tracks =
            source[unit]?.[pageNum] || [];

        if (!tracks.length) {

            audioListContainer.innerHTML = `

                <div class="no-media-message">
                    No audio available for this page.
                </div>

            `;

            return;

        }

        tracks.forEach(
            (track, index) => {

                const btn =
                    document.createElement(
                        "button"
                    );

                btn.textContent =
                    `Audio ${index + 1}`;

                btn.addEventListener(
                    "click",
                    (event) => {

                        event.stopPropagation();

                        const folder =
                            bookType === "student"
                                ? "student-book-audios"
                                : "activity-book-audios";

                        audioSource.src =
                            `audios/${folder}/unit_${unit}/${track}.mp3`;

                        audioPlayer.load();

                        showAudioPlayer();

                        audioPlayer.controls =
                            true;

                    }
                );

                audioListContainer.appendChild(
                    btn
                );

            }
        );

    }
);


// ============================================================
// VIDEO SYSTEM
// ============================================================

const videoListContainer =
    document.createElement("div");

videoListContainer.id =
    "video-list-container";

document.body.appendChild(
    videoListContainer
);


function showVideoPlayer() {

    videoPlayer.style.display =
        "block";

    hideVideoBtn.style.display =
        "inline-block";

}


hideVideoBtn.addEventListener(
    "click",
    () => {

        videoPlayer.pause();

        videoPlayer.style.display =
            "none";

        hideVideoBtn.style.display =
            "none";

    }
);


videoPlayer.addEventListener(
    "dblclick",
    () => {

        if (
            !document.fullscreenElement
        ) {

            videoPlayer
                .requestFullscreen()
                .catch(
                    err =>
                        console.log(err)
                );

        } else {

            document.exitFullscreen();

        }

    }
);


// ============================================================
// VIDEOS BY UNIT / PAGE
// ============================================================

const unitVideos = {

    1: {
        10: [
            "presentation1"
        ]
    },

    3: {
        24: [
            "br2_004_v1_1",
            "br2_004_v1_2"
        ],
        25: [
            "br2_004_v1_3"
        ]
    },

    6: {
        44: [
            "br2_004_v2_1"
        ],
        45: [
            "br2_004_v2_2",
            "br2_004_v2_3"
        ]
    },

    9: {
        64: [
            "br2_004_v3_1",
            "br2_004_v3_2"
        ],
        65: [
            "br2_004_v3_3",
            "br2_004_v3_4",
            "br2_004_v3_5",
            "br2_004_v3_6"
        ]
    },

    12: {
        84: [
            "br2_004_v4_1"
        ],
        85: [
            "br2_004_v4_2",
            "br2_004_v4_3",
            "br2_004_v4_4"
        ]
    }

};


if (videoBtn) {

    videoBtn.addEventListener(
        "click",
        function (e) {

            e.preventDefault();

            e.stopPropagation();

            if (lessonMode) {

                return;

            }

            if (
                videoListContainer.style.display ===
                "flex"
            ) {

                videoListContainer.style.display =
                    "none";

                return;

            }

            videoListContainer.innerHTML =
                "";

            videoListContainer.style.display =
                "flex";

            if (
                currentImages.length === 0
            ) {

                return;

            }

            const pageSrc =
                currentImages[currentIndex];

            if (
                !pageSrc.includes(
                    "student-book-pages"
                )
            ) {

                return;

            }

            const unitMatch =
                pageSrc.match(
                    /unit_(\d+)/i
                );

            const pageMatch =
                pageSrc.match(
                    /page(\d+)/i
                );

            if (
                !unitMatch ||
                !pageMatch
            ) {

                return;

            }

            const unit =
                parseInt(
                    unitMatch[1]
                );

            const pageNum =
                parseInt(
                    pageMatch[1]
                );

            const tracks =
                unitVideos[unit]?.[pageNum] || [];

            if (!tracks.length) {

                videoListContainer.innerHTML = `

                    <div class="no-media-message">
                        No video available for this page.
                    </div>

                `;

                return;

            }

            tracks.forEach(
                (track, index) => {

                    const btn =
                        document.createElement(
                            "button"
                        );

                    btn.textContent =
                        `Video ${index + 1}`;

                    btn.addEventListener(
                        "click",
                        (event) => {

                            event.stopPropagation();

                            videoSource.src =
                                `video/unit_${unit}/${track}.mp4`;

                            videoPlayer.load();

                            showVideoPlayer();

                        }
                    );

                    videoListContainer.appendChild(
                        btn
                    );

                }
            );

        }
    );

}


// ============================================================
// CLOSE MEDIA LISTS WHEN CLICKING OUTSIDE
// ============================================================

window.addEventListener(
    "click",
    () => {

        audioListContainer.style.display =
            "none";

        videoListContainer.style.display =
            "none";

    }
);


// ============================================================
// DRAWING SYSTEM
// ============================================================

function setDrawingTarget(type) {

    if (type === "whiteboard") {

        drawingCanvas =
            whiteboardCanvas;

        drawingCtx =
            whiteboardCtx;

    } else {

        drawingCanvas =
            editCanvas;

        drawingCtx =
            editCtx;

    }

    updateCursor();

}


// ============================================================
// EDIT TRAY
// ============================================================

const pencilTool =
    document.getElementById("pencil-tool");

const penTool =
    document.getElementById("pen-tool");

const eraserTool =
    document.getElementById("eraser-tool");

const highlightTool =
    document.getElementById("highlight-tool");

const textTool =
    document.getElementById("text-tool");

const clearTool =
    document.getElementById("clear-tool");


editBtn.addEventListener(
    "click",
    function (e) {

        e.preventDefault();

        e.stopPropagation();

        editTray.style.display =
            editTray.style.display === "flex"
                ? "none"
                : "flex";

    }
);


// ============================================================
// WHITEBOARD
// ============================================================

whiteboardBtn.addEventListener(
    "click",
    function (e) {

        e.preventDefault();

        e.stopPropagation();

        if (
            whiteboard.style.display ===
            "flex"
        ) {

            whiteboard.style.display =
                "none";

            editTray.style.display =
                "none";

            setDrawingTarget(
                "slide"
            );

        } else {

            whiteboard.style.display =
                "flex";

            editTray.style.display =
                "flex";

            resizeWhiteboardCanvas();

            setDrawingTarget(
                "whiteboard"
            );

        }

    }
);


// ============================================================
// HIDE WHITEBOARD WHEN CHANGING CONTENT
// ============================================================

function closeDrawingTools() {

    whiteboard.style.display =
        "none";

    editTray.style.display =
        "none";

    setDrawingTarget(
        "slide"
    );

}


studentDropdownLinks.forEach(
    link => {

        link.addEventListener(
            "click",
            closeDrawingTools
        );

    }
);


activityDropdownLinks.forEach(
    link => {

        link.addEventListener(
            "click",
            closeDrawingTools
        );

    }
);


// ============================================================
// TOOL SYSTEM
// ============================================================

let currentTool =
    null;


function setTool(tool) {

    if (
        currentTool === tool
    ) {

        currentTool =
            null;

    } else {

        currentTool =
            tool;

    }

    updateToolUI();

    updateCursor();

}


pencilTool.addEventListener(
    "click",
    () => setTool("pencil")
);

penTool.addEventListener(
    "click",
    () => setTool("pen")
);

eraserTool.addEventListener(
    "click",
    () => setTool("eraser")
);

highlightTool.addEventListener(
    "click",
    () => setTool("marker")
);

textTool.addEventListener(
    "click",
    () => setTool("text")
);


function updateToolUI() {

    const tools = {

        pencil:
            pencilTool,

        pen:
            penTool,

        eraser:
            eraserTool,

        marker:
            highlightTool,

        text:
            textTool

    };

    Object.values(tools)
        .forEach(btn => {

            if (btn) {

                btn.classList.remove(
                    "active-tool"
                );

            }

        });

    if (
        tools[currentTool]
    ) {

        tools[currentTool]
            .classList.add(
                "active-tool"
            );

    }

}


// ============================================================
// CLEAR CANVAS
// ============================================================

let strokes = [];


clearTool.addEventListener(
    "click",
    () => {

        if (!drawingCanvas) return;

        const canvasId =
            drawingCanvas.id;

        strokes =
            strokes.filter(
                stroke =>
                    stroke.canvas !== canvasId
            );

        if (
            canvasId ===
            "whiteboard-canvas"
        ) {

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

    }
);


// ============================================================
// CURSOR SYSTEM
// ============================================================

function updateCursor() {

    if (!drawingCanvas) {

        return;

    }

    if (!currentTool) {

        drawingCanvas.style.cursor =
            "default";

        return;

    }

    if (
        currentTool === "eraser"
    ) {

        drawingCanvas.style.cursor =
            "crosshair";

    } else if (
        currentTool === "text"
    ) {

        drawingCanvas.style.cursor =
            "text";

    } else if (
        currentTool === "marker"
    ) {

        drawingCanvas.style.cursor =
            "cell";

    } else {

        drawingCanvas.style.cursor =
            "pointer";

    }

}


// ============================================================
// DRAWING ENGINE
// ============================================================

let currentStroke =
    null;

let drawing =
    false;

let pencilSize =
    3;


// ============================================================
// RESIZE EDIT CANVAS
// ============================================================

function resizeEditCanvas() {

    if (
        !editCanvas ||
        !slideImage
    ) {

        return;

    }

    const rect =
        slideImage.getBoundingClientRect();

    if (
        rect.width <= 0 ||
        rect.height <= 0
    ) {

        return;

    }

    editCanvas.width =
        rect.width;

    editCanvas.height =
        rect.height;

    editCanvas.style.left =
        slideImage.offsetLeft +
        "px";

    editCanvas.style.top =
        slideImage.offsetTop +
        "px";

    redrawStrokes();

    rerenderAllTextBoxes();

}


// ============================================================
// RESIZE WHITEBOARD
// ============================================================

function resizeWhiteboardCanvas() {

    if (
        !whiteboardCanvas ||
        !whiteboard
    ) {

        return;

    }

    whiteboardCanvas.width =
        whiteboard.offsetWidth;

    whiteboardCanvas.height =
        whiteboard.offsetHeight;

    redrawStrokes();

}


// ============================================================
// WINDOW RESIZE
// ============================================================

window.addEventListener(
    "resize",
    () => {

        resizeEditCanvas();

        resizeWhiteboardCanvas();

    }
);


// ============================================================
// NORMALIZED POSITION
// ============================================================

function getPos(
    e,
    canvas
) {

    const rect =
        canvas.getBoundingClientRect();

    return {

        x:
            (e.clientX - rect.left) /
            rect.width,

        y:
            (e.clientY - rect.top) /
            rect.height

    };

}


// ============================================================
// START DRAWING
// ============================================================

function startDrawing(
    e,
    canvas
) {

    if (!currentTool) {

        return;

    }

    const {
        x,
        y
    } =
        getPos(
            e,
            canvas
        );

    if (
        currentTool ===
        "eraser"
    ) {

        drawing =
            true;

        eraseAt(
            x,
            y,
            canvas.id
        );

        redrawStrokes();

        return;

    }

    drawing =
        true;

    let color =
        "red";

    let size =
        pencilSize;

    if (
        currentTool ===
        "pen"
    ) {

        color =
            "blue";

        size =
            4;

    }

    if (
        currentTool ===
        "marker"
    ) {

        color =
            "rgba(255,255,0,0.4)";

        size =
            18;

    }

    currentStroke = {

        type:
            "stroke",

        canvas:
            canvas.id,

        color:
            color,

        size:
            size,

        points: [
            {
                x,
                y
            }
        ]

    };

    strokes.push(
        currentStroke
    );

}


// ============================================================
// MOVE DRAWING
// ============================================================

function moveDrawing(
    e,
    canvas
) {

    if (!drawing) {

        return;

    }

    const {
        x,
        y
    } =
        getPos(
            e,
            canvas
        );

    if (
        currentTool ===
        "eraser"
    ) {

        eraseAt(
            x,
            y,
            canvas.id
        );

        redrawStrokes();

        return;

    }

    if (!currentStroke) {

        return;

    }

    currentStroke.points.push(
        {
            x,
            y
        }
    );

    redrawStrokes();

}


// ============================================================
// STOP DRAWING
// ============================================================

function stopDrawing() {

    drawing =
        false;

    currentStroke =
        null;

}


// ============================================================
// EDIT CANVAS EVENTS
// ============================================================

editCanvas.addEventListener(
    "mousedown",
    e =>
        startDrawing(
            e,
            editCanvas
        )
);

editCanvas.addEventListener(
    "mousemove",
    e =>
        moveDrawing(
            e,
            editCanvas
        )
);

editCanvas.addEventListener(
    "mouseup",
    stopDrawing
);

editCanvas.addEventListener(
    "mouseleave",
    stopDrawing
);


// ============================================================
// WHITEBOARD EVENTS
// ============================================================

whiteboardCanvas.addEventListener(
    "mousedown",
    e =>
        startDrawing(
            e,
            whiteboardCanvas
        )
);

whiteboardCanvas.addEventListener(
    "mousemove",
    e =>
        moveDrawing(
            e,
            whiteboardCanvas
        )
);

whiteboardCanvas.addEventListener(
    "mouseup",
    stopDrawing
);

whiteboardCanvas.addEventListener(
    "mouseleave",
    stopDrawing
);


// ============================================================
// ERASER
// ============================================================

function eraseAt(
    x,
    y,
    canvasId
) {

    const radius =
        0.01;

    strokes =
        strokes.flatMap(
            stroke => {

                if (
                    stroke.canvas !==
                    canvasId
                ) {

                    return [stroke];

                }

                const pieces =
                    [];

                let temp =
                    [];

                for (
                    const p of stroke.points
                ) {

                    const dx =
                        p.x - x;

                    const dy =
                        p.y - y;

                    const dist =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );

                    if (
                        dist > radius
                    ) {

                        temp.push(p);

                    } else {

                        if (
                            temp.length
                        ) {

                            pieces.push({

                                type:
                                    "stroke",

                                canvas:
                                    stroke.canvas,

                                color:
                                    stroke.color,

                                size:
                                    stroke.size,

                                points:
                                    temp

                            });

                            temp =
                                [];

                        }

                    }

                }

                if (
                    temp.length
                ) {

                    pieces.push({

                        type:
                            "stroke",

                        canvas:
                            stroke.canvas,

                        color:
                            stroke.color,

                        size:
                            stroke.size,

                        points:
                            temp

                    });

                }

                return pieces;

            }
        );

}


// ============================================================
// REDRAW STROKES
// ============================================================

function redrawStrokes() {

    if (
        !editCtx ||
        !whiteboardCtx
    ) {

        return;

    }

    editCtx.clearRect(
        0,
        0,
        editCanvas.width,
        editCanvas.height
    );

    whiteboardCtx.clearRect(
        0,
        0,
        whiteboardCanvas.width,
        whiteboardCanvas.height
    );

    strokes.forEach(
        item => {

            let ctx;
            let canvas;

            if (
                item.canvas ===
                "whiteboard-canvas"
            ) {

                ctx =
                    whiteboardCtx;

                canvas =
                    whiteboardCanvas;

            } else {

                ctx =
                    editCtx;

                canvas =
                    editCanvas;

            }

            ctx.strokeStyle =
                item.color;

            ctx.lineWidth =
                item.size;

            ctx.lineCap =
                "round";

            ctx.lineJoin =
                "round";

            ctx.beginPath();

            item.points.forEach(
                (p, i) => {

                    const x =
                        p.x *
                        canvas.width;

                    const y =
                        p.y *
                        canvas.height;

                    if (
                        i === 0
                    ) {

                        ctx.moveTo(
                            x,
                            y
                        );

                    } else {

                        ctx.lineTo(
                            x,
                            y
                        );

                    }

                }
            );

            ctx.stroke();

        }
    );

}


// ============================================================
// TEXT TOOL
// ============================================================

let activeTextBox =
    null;


editCanvas.addEventListener(
    "click",
    handleTextClick
);

whiteboardCanvas.addEventListener(
    "click",
    handleTextClick
);


function handleTextClick(e) {

    if (
        currentTool !==
        "text"
    ) {

        return;

    }

    const canvas =
        drawingCanvas;

    const rect =
        canvas.getBoundingClientRect();

    const x =
        (e.clientX - rect.left) /
        rect.width;

    const y =
        (e.clientY - rect.top) /
        rect.height;

    createTextBox(
        x,
        y,
        canvas
    );

}


// ============================================================
// CREATE TEXT BOX
// ============================================================

function createTextBox(
    x,
    y,
    canvas
) {

    const box =
        document.createElement(
            "div"
        );

    box.contentEditable =
        "true";

    box.classList.add(
        "slide-textbox"
    );

    box.dataset.x =
        x;

    box.dataset.y =
        y;

    box.dataset.canvas =
        canvas.id;

    box.style.position =
        "absolute";

    const rect =
        canvas.getBoundingClientRect();

    box.style.left =
        x * rect.width +
        "px";

    box.style.top =
        y * rect.height +
        "px";

    box.style.minWidth =
        "50px";

    box.style.minHeight =
        "20px";

    box.style.color =
        "red";

    box.style.fontSize =
        "28px";

    box.style.fontWeight =
        "bold";

    box.style.outline =
        "none";

    box.style.cursor =
        "move";

    box.style.zIndex =
        "999999";

    box.style.pointerEvents =
        "auto";

    box.style.userSelect =
        "text";

    canvas.parentElement.appendChild(
        box
    );

    box.focus();

    activeTextBox =
        box;

    showTextToolbar(
        box
    );

    enableDrag(
        box
    );

}


// ============================================================
// TEXT TOOLBAR
// ============================================================

const textToolbar =
    document.createElement(
        "div"
    );

textToolbar.style.position =
    "fixed";

textToolbar.style.display =
    "none";

textToolbar.style.gap =
    "6px";

textToolbar.style.padding =
    "5px";

textToolbar.style.background =
    "#fff";

textToolbar.style.border =
    "1px solid #ccc";

textToolbar.style.zIndex =
    "999999";

textToolbar.style.borderRadius =
    "6px";

document.body.appendChild(
    textToolbar
);


// ============================================================
// SHOW TEXT TOOLBAR
// ============================================================

function showTextToolbar(
    box
) {

    textToolbar.innerHTML =
        "";

    textToolbar.style.display =
        "flex";

    const rect =
        box.getBoundingClientRect();

    textToolbar.style.left =
        rect.left +
        "px";

    textToolbar.style.top =
        Math.max(
            5,
            rect.top - 45
        ) +
        "px";


    // DELETE

    const del =
        document.createElement(
            "button"
        );

    del.innerText =
        "🗑️";

    del.onclick =
        () => {

            box.remove();

            textToolbar.style.display =
                "none";

            activeTextBox =
                null;

        };


    // SIZE +

    const plus =
        document.createElement(
            "button"
        );

    plus.innerText =
        "A+";

    plus.onclick =
        () => {

            let size =
                parseInt(
                    window.getComputedStyle(
                        box
                    ).fontSize
                );

            box.style.fontSize =
                (
                    size + 2
                ) +
                "px";

            showTextToolbar(
                box
            );

        };


    // SIZE -

    const minus =
        document.createElement(
            "button"
        );

    minus.innerText =
        "A-";

    minus.onclick =
        () => {

            let size =
                parseInt(
                    window.getComputedStyle(
                        box
                    ).fontSize
                );

            if (
                size > 10
            ) {

                box.style.fontSize =
                    (
                        size - 2
                    ) +
                    "px";

            }

            showTextToolbar(
                box
            );

        };


    // RED

    const red =
        document.createElement(
            "button"
        );

    red.innerText =
        "🔴";

    red.onclick =
        () => {

            box.style.color =
                "red";

        };


    // BLACK

    const black =
        document.createElement(
            "button"
        );

    black.innerText =
        "⚫";

    black.onclick =
        () => {

            box.style.color =
                "black";

        };


    // BLUE

    const blue =
        document.createElement(
            "button"
        );

    blue.innerText =
        "🔵";

    blue.onclick =
        () => {

            box.style.color =
                "blue";

        };


    textToolbar.append(
        del,
        plus,
        minus,
        red,
        black,
        blue
    );

}


// ============================================================
// TEXT BOX CLICK
// ============================================================

document.addEventListener(
    "click",
    (e) => {

        const editable =
            e.target.closest(
                '[contenteditable="true"]'
            );

        if (editable) {

            activeTextBox =
                editable;

            showTextToolbar(
                editable
            );

        } else if (
            !textToolbar.contains(
                e.target
            )
        ) {

            textToolbar.style.display =
                "none";

        }

    }
);


// ============================================================
// DRAG TEXT BOX
// ============================================================

function enableDrag(el) {

    let offsetX =
        0;

    let offsetY =
        0;

    let dragging =
        false;


    el.addEventListener(
        "mousedown",
        (e) => {

            if (
                e.target !== el
            ) {

                return;

            }

            dragging =
                true;

            const rect =
                el.getBoundingClientRect();

            offsetX =
                e.clientX -
                rect.left;

            offsetY =
                e.clientY -
                rect.top;

            document.body.style.userSelect =
                "none";

        }
    );


    function move(e) {

        if (!dragging) {

            return;

        }

        const parentRect =
            el.parentElement.getBoundingClientRect();

        el.style.left =
            (
                e.clientX -
                parentRect.left -
                offsetX
            ) +
            "px";

        el.style.top =
            (
                e.clientY -
                parentRect.top -
                offsetY
            ) +
            "px";

    }


    function stop() {

        dragging =
            false;

        document.body.style.userSelect =
            "auto";

    }


    document.addEventListener(
        "mousemove",
        move
    );

    document.addEventListener(
        "mouseup",
        stop
    );

}


// ============================================================
// RERENDER TEXT BOXES
// ============================================================

function rerenderAllTextBoxes() {

    document
        .querySelectorAll(
            ".slide-textbox"
        )
        .forEach(
            box => {

                const canvasId =
                    box.dataset.canvas;

                const canvas =
                    document.getElementById(
                        canvasId
                    );

                if (!canvas) {

                    return;

                }

                const rect =
                    canvas.getBoundingClientRect();

                const x =
                    parseFloat(
                        box.dataset.x
                    );

                const y =
                    parseFloat(
                        box.dataset.y
                    );

                if (
                    Number.isNaN(x) ||
                    Number.isNaN(y)
                ) {

                    return;

                }

                box.style.left =
                    x * rect.width +
                    "px";

                box.style.top =
                    y * rect.height +
                    "px";

            }
        );

}


// ============================================================
// INITIAL SETUP
// ============================================================

window.addEventListener(
    "load",
    () => {

        setDrawingTarget(
            "slide"
        );

        resizeEditCanvas();

        resizeWhiteboardCanvas();

        updateCursor();

    }
);


// ============================================================
// RESTORE PREVIOUS STATE
// ============================================================

window.addEventListener(
    "load",
    () => {

        const navigationEntries =
            performance.getEntriesByType(
                "navigation"
            );

        const isReload =
            navigationEntries.length > 0 &&
            navigationEntries[0].type ===
                "reload";

        const savedState =
            localStorage.getItem(
                "pptkb1State"
            );


        // ==================================================
        // RELOAD
        // ==================================================

        if (
            isReload &&
            savedState
        ) {

            try {

                const state =
                    JSON.parse(
                        savedState
                    );

                const {
                    bookType,
                    unit,
                    pageNum,
                    lesson
                } =
                    state;


                // ==========================================
                // RESTORE LESSON
                // ==========================================

                if (
                    bookType ===
                    "lesson"
                ) {

                    if (
                        unit &&
                        lesson
                    ) {

                        renderLessonCards(
                            unit,
                            lesson
                        );

                    } else {

                        loadHome();

                    }

                    return;

                }


                // ==========================================
                // RESTORE STUDENT BOOK
                // ==========================================

                if (
                    bookType ===
                    "student"
                ) {

                    loadStudentUnit(
                        unit
                    );

                    const index =
                        currentImages.findIndex(
                            src =>
                                src.includes(
                                    `page${pageNum}.JPG`
                                )
                        );

                    if (
                        index >= 0
                    ) {

                        currentIndex =
                            index;

                        loadImage(
                            currentImages[
                                currentIndex
                            ]
                        );

                    }

                    return;

                }


                // ==========================================
                // RESTORE ACTIVITY BOOK
                // ==========================================

                if (
                    bookType ===
                    "activity"
                ) {

                    loadActivityUnit(
                        unit
                    );

                    const index =
                        currentImages.findIndex(
                            src =>
                                src.includes(
                                    `page${pageNum}.JPG`
                                )
                        );

                    if (
                        index >= 0
                    ) {

                        currentIndex =
                            index;

                        loadImage(
                            currentImages[
                                currentIndex
                            ]
                        );

                    }

                    return;

                }

                loadHome();

            } catch (error) {

                console.error(
                    "Could not restore saved state:",
                    error
                );

                loadHome();

            }

        } else {

            // ==============================================
            // FIRST OPEN
            // ==============================================

            loadHome();

        }

    }
);
