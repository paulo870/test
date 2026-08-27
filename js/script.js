const slideImage = document.getElementById("slide-image");
const slideContainer = document.querySelector(".slide-container");
const lessonContentContainer =
    document.getElementById("lesson-content-container");

let lessonCards = [];
let activeLessonCard = null;
let lessonMode = false;
const homeBtn = document.getElementById("home-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
document.addEventListener("DOMContentLoaded", () => {
    });
const studentDropdownLinks = document.querySelectorAll(
    "#students-book-dropdown .unit-item > a"
);
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

window.addEventListener("click", (e) => {

    if (
        e.target.closest(".dropdown") ||
        e.target.closest(".lesson-dropdown")
    ) {
        return;
    }

    document.querySelectorAll(".dropdown").forEach(d => {
        d.classList.remove("show");
    });

    document.querySelectorAll(".lesson-dropdown").forEach(menu => {
        menu.classList.remove("show");
    });

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

    slideImage.style.display = "none";

    slideImage.onload = function() {
        slideImage.style.display = "block";
        autoFitImage();
        resizeEditCanvas();
    };

    slideImage.onerror = function() {
        console.error("Failed to load image:", src);
        slideImage.style.display = "none";
    };

    slideImage.src = src;
}

// ==========================
// HOME PAGE
// ==========================
function loadHome() {

    lessonMode = false;

    closeLessonCard();

    lessonContentContainer.innerHTML = "";
    lessonContentContainer.style.display = "none";

    slideImage.style.display = "block";
    editCanvas.style.display = "block";

    currentImages = [];
    currentIndex = 0;

    loadImage("images/homepage.jpg");

    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
}

// ==========================
// STUDENT BOOK
// ==========================
function loadStudentUnit(unitNumber) {
    lessonMode = false;

closeLessonCard();

lessonContentContainer.innerHTML = "";
lessonContentContainer.style.display = "none";

slideImage.style.display = "block";
editCanvas.style.display = "block";
   

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
        case "1": pageNumbers = [106,107]; break;
        case "2": pageNumbers = [108,109]; break;
        case "3": pageNumbers = [110,111]; break;
        case "4": pageNumbers = [112,113]; break;
        case "5": pageNumbers = [114,115]; break;
        case "6": pageNumbers = [116,117]; break;
        case "7": pageNumbers = [118,119]; break;
        case "8": pageNumbers = [120,121]; break;
        case "9": pageNumbers = [122,123]; break;
        case "10": pageNumbers = [124,125]; break;
        case "11": pageNumbers = [126,127]; break;
        case "12": pageNumbers = [128,129]; break;
        default: pageNumbers = []; break;
    }

    pageNumbers.forEach(num => {
        currentImages.push(basePath + "page" + num + ".JPG");
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
// DROPDOWN EVENTS
// ==========================

studentDropdownLinks.forEach(link => {

    link.addEventListener("click", (e) => {

        e.preventDefault();
        e.stopPropagation();

        const unit = link.getAttribute("data-unit");

        // Find the lesson submenu belonging to this unit
        const lessonMenu = link.parentElement.querySelector(".lesson-dropdown");

        if (!lessonMenu) {
            console.log("No lesson dropdown found for Unit " + unit);
            return;
        }

        // Close other lesson menus
        document.querySelectorAll(".lesson-dropdown").forEach(menu => {
            if (menu !== lessonMenu) {
                menu.classList.remove("show");
            }
        });

        // Toggle this unit's lesson menu
        lessonMenu.classList.toggle("show");

    });

});
// ==========================
// GET LESSON PAGES
// ==========================

function getLessonPages(unit, lesson) {

 // ==========================
// LESSON CONTENT
// ==========================

function getLessonContent(unit, lesson) {

    const lessons = {

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
                audio: "audios/student-book-audios/unit_1/example.mp3"
            },

            {
                type: "video",
                title: "Watch the Video",
                video: "video/unit_1/presentation1.mp4"
            }
        ]

    };

    return lessons[`${unit}-${lesson}`] || [];
}
    // ==========================
// RENDER LESSON CARDS
// ==========================

function renderLessonCards(unit, lesson) {

    const content = getLessonContent(unit, lesson);

    lessonContentContainer.innerHTML = "";

    if (!content.length) {
        lessonContentContainer.innerHTML = `
            <div class="lesson-empty">
                <h2>Lesson content coming soon</h2>
                <p>This lesson has no content yet.</p>
            </div>
        `;

        return;
    }

    lessonCards = content;
    lessonMode = true;

    slideImage.style.display = "none";
    editCanvas.style.display = "none";

    lessonContentContainer.style.display = "grid";

    content.forEach((item, index) => {

        const card = document.createElement("div");

        card.className = "lesson-card";

        card.dataset.index = index;

        let cardContent = "";

        // TEXT
        if (item.type === "text") {

            cardContent = `
                <div class="lesson-card-icon">📖</div>

                <h2>${item.title}</h2>

                <div class="lesson-card-content">
                    ${item.content}
                </div>
            `;
        }

        // AUDIO
        else if (item.type === "audio") {

            cardContent = `
                <div class="lesson-card-icon">🎧</div>

                <h2>${item.title}</h2>

                <div class="lesson-card-content">

                    <audio controls>
                        <source src="${item.audio}" type="audio/mpeg">
                    </audio>

                </div>
            `;
        }

        // VIDEO
        else if (item.type === "video") {

            cardContent = `
                <div class="lesson-card-icon">🎥</div>

                <h2>${item.title}</h2>

                <div class="lesson-card-content">

                    <video controls>
                        <source src="${item.video}" type="video/mp4">
                    </video>

                </div>
            `;
        }

        card.innerHTML = cardContent;

        card.addEventListener("click", function(e) {

            // Don't expand when interacting with media controls
            if (
                e.target.closest("audio") ||
                e.target.closest("video") ||
                e.target.closest("button")
            ) {
                return;
            }

            openLessonCard(card);

        });

        lessonContentContainer.appendChild(card);

    });
}
    // ==========================
// OPEN LESSON CARD
// ==========================

function openLessonCard(card) {

    if (activeLessonCard === card) {

        closeLessonCard();

        return;
    }

    if (activeLessonCard) {
        activeLessonCard.classList.remove("expanded");
    }

    activeLessonCard = card;

    card.classList.add("expanded");

    lessonContentContainer.classList.add("focus-mode");

    document.body.classList.add("lesson-card-open");

}
    // ==========================
// CLOSE LESSON CARD
// ==========================

function closeLessonCard() {

    if (!activeLessonCard) return;

    activeLessonCard.classList.remove("expanded");

    activeLessonCard = null;

    lessonContentContainer.classList.remove("focus-mode");

    document.body.classList.remove("lesson-card-open");

}

    document.addEventListener("keydown", (e) => {

    if (e.key === "Escape" && activeLessonCard) {

        closeLessonCard();

    }

});
    
// ==========================
// LESSON MENU
// ==========================
const lessonDropdownLinks = document.querySelectorAll(".lesson-dropdown a");

lessonDropdownLinks.forEach(link => {

    link.addEventListener("click", (e) => {

        e.preventDefault();
        e.stopPropagation();

        const unit = link.getAttribute("data-unit");
        const lesson = link.getAttribute("data-lesson");

        console.log(
            "Opening Lesson:",
            unit,
            lesson
        );

        // Enable lesson mode
        lessonMode = true;

        // Hide image viewer
        slideImage.style.display = "none";

        // Hide drawing canvas
        editCanvas.style.display = "none";

        // Hide page navigation
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";

        // Hide audio/video menus
        audioListContainer.style.display = "none";

        if (videoListContainer) {
            videoListContainer.style.display = "none";
        }

        // Close whiteboard
        whiteboard.style.display = "none";
        editTray.style.display = "none";

        // Render lesson cards
        renderLessonCards(unit, lesson);

        // Save lesson state
        localStorage.setItem(
            "pptkb1State",
            JSON.stringify({
                bookType: "lesson",
                unit: unit,
                lesson: lesson
            })
        );

        // Close lesson dropdowns
        document
            .querySelectorAll(".lesson-dropdown")
            .forEach(menu => {
                menu.classList.remove("show");
            });

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
// COMPUTER — CTRL + MOUSE WHEEL
// ==========================

slideContainer.addEventListener("wheel", function(e) {

    if (!e.ctrlKey) return;

    e.preventDefault();

    if (e.deltaY < 0) {

        currentScale += 0.1;

    } else {

        currentScale -= 0.1;
    }

    currentScale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, currentScale)
    );

    applyZoom();

}, { passive: false });


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
            if (bookType === "lesson") {

    renderLessonCards(unit, lesson);

}
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

    if (currentImages.length === 0) return;

    const pageSrc = currentImages[currentIndex];

    // Determine if Student or Activity Book
    let bookType;
    if (pageSrc.includes("student-book-pages")) bookType = "student";
    else if (pageSrc.includes("activity-book-pages")) bookType = "activity";
    else return;

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
        1: {8:["page8_Track_1.1"],9:["page9_Track_1.2","page9_Track_1.3"],10:["br2_003_a1_4"]},
        2: {13:["br2_003_a2_1"],15:["br2_003_a2_2"],16:["br2_003_a2_3"]},
        3: {19:["br2_003_a3_1"],20:["br2_003_a3_2"],21:["br2_003_a3_3","br2_003_a3_4"],22:["br2_003_a3_5"]},
        4: {27:["br2_003_a4_1"],28:["br2_003_a4_2"],29:["br2_003_a4_3"],30:["br2_003_a4_4"]},
        5: {34:["br2_003_a5_1"],35:["br2_003_a5_2","br2_003_a5_3"],36:["br2_003_a5_4","br2_003_a5_5","br2_003_a5_6"]},
        6: {38:["br2_003_a6_1"],41:["br2_003_a6_2","br2_003_a6_3"],42:["br2_003_a6_4"],43:["br2_003_a6_5"]},
        7: {47:["br2_003_a7_1"],49:["br2_003_a7_2","br2_003_a7_3"],50:["br2_003_a7_4"]},
        8: {54:["br2_003_a8_1"],55:["br2_003_a8_2"],56:["br2_003_a8_3"]},
        9: {59:["br2_003_a9_1"],60:["br2_003_a9_2"],61:["br2_003_a9_3"],62:["br2_003_a9_4"],},
        10: {67:["br2_003_a10_1"],68:["br2_003_a10_2"],69:["br2_003_a10_3"],70:["br2_003_a10_4"]},
        11: {72:["br2_003_a11_1"],73:["br2_003_a11_1"],75:["br2_003_a11_2"],76:["br2_003_a11_3","br2_003_a11_4"]},
        12: {79:["br2_003_a12_1"],81:["br2_003_a12_2"],82:["br2_003_a12_3","br2_003_a12_4","br2_003_a12_5"],83:["br2_003_a12_6"]},
    };

    // Define audio tracks for all units (Activity Book)
    const activityBookAudioTracks = {
        1: {4:["page4_Track_02"],15:["br2_003_a2_2"],7:["page7_Track_04"]},
        2: {13:["br2_003_a2_1"],12:["page12_Track_06"],16:["page16_Track_07"]},
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
            const folder = bookType === "student" ? "student-book-audios" : "activity-book-audios";
            audioSource.src = `audios/${folder}/unit_${unit}/${track}.mp3`;
            audioPlayer.load();
            showAudioPlayer(); // <-- use the new function
            audioPlayer.controls = true;
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
// Define videos for Unit 1
const unitVideos = {
    1: {
        10: ["presentation1"],
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
    rerenderAllTextBoxes();
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



