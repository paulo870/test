/* ============================================================
   PRESENTATION PLUS
   LESSON CARD VERSION
============================================================ */


/* ============================================================
   BASIC ELEMENTS
============================================================ */

const slideImage =
    document.getElementById("slide-image");

const slideContainer =
    document.querySelector(".slide-container");

const homeBtn =
    document.getElementById("home-btn");

const prevBtn =
    document.getElementById("prev-btn");

const nextBtn =
    document.getElementById("next-btn");

const lessonCardsContainer =
    document.getElementById("lesson-cards-container");

const viewerTitle =
    document.getElementById("viewer-title");

const viewerSubtitle =
    document.getElementById("viewer-subtitle");


/* ============================================================
   NAVIGATION ELEMENTS
============================================================ */

const studentDropdownLinks =
    document.querySelectorAll(
        "#students-book-dropdown .unit-item > a"
    );

const activityDropdownLinks =
    document.querySelectorAll(
        "#activity-book-dropdown a"
    );

const dropdownBtns =
    document.querySelectorAll(".dropdown-btn");


/* ============================================================
   AUDIO
============================================================ */

const audioBtn =
    document.getElementById("audio-btn");

const audioListContainer =
    document.getElementById("audio-list-container");

const audioPlayer =
    document.getElementById("slide-audio");

const audioSource =
    document.getElementById("audio-source");

const hideAudioBtn =
    document.getElementById("hide-audio-btn");


function showAudioPlayer() {

    audioPlayer.parentElement.style.display = "block";

    hideAudioBtn.style.display = "inline-block";

}


hideAudioBtn.addEventListener(
    "click",
    () => {

        audioPlayer.pause();

        audioPlayer.parentElement.style.display =
            "none";

        hideAudioBtn.style.display =
            "none";

    }
);


/* ============================================================
   MAIN STATE
============================================================ */

let currentImages = [];

let currentIndex = 0;

let currentScale = 1;


/* ============================================================
   LESSON STATE
============================================================ */

let currentLessonUnit = null;

let currentLessonNumber = null;

let currentLessonCards = [];

let isLessonCardMode = false;


/* ============================================================
   LESSON CARD COUNT
============================================================ */

const DEFAULT_LESSON_CARD_COUNT = 8;


/* ============================================================
   GENERATE LESSON CARDS
============================================================ */

function generateLessonCards(
    count = DEFAULT_LESSON_CARD_COUNT
) {

    const cards = [];

    for (let i = 1; i <= count; i++) {

        cards.push({

            id: i,

            title:
                `Lesson Part ${i}`,

            type:
                "empty",

            content:
                null

        });

    }

    return cards;

}


/* ============================================================
   LOAD LESSON
============================================================ */

function loadLessonCards(unit, lesson) {

    currentLessonUnit =
        String(unit);

    currentLessonNumber =
        String(lesson);

    currentLessonCards =
        generateLessonCards();

    isLessonCardMode = true;


    /* -----------------------------------------
       Hide old image
    ----------------------------------------- */

    slideImage.style.display =
        "none";


    /* -----------------------------------------
       Hide navigation
    ----------------------------------------- */

    prevBtn.style.display =
        "none";

    nextBtn.style.display =
        "none";


    /* -----------------------------------------
       Show cards
    ----------------------------------------- */

    lessonCardsContainer.classList.add(
        "active"
    );


    /* -----------------------------------------
       Header
    ----------------------------------------- */

    viewerTitle.textContent =
        `Unit ${unit} — Lesson ${lesson}`;

    viewerSubtitle.textContent =
        "Choose a lesson part";


    /* -----------------------------------------
       Render
    ----------------------------------------- */

    renderLessonCards();

}


/* ============================================================
   RENDER LESSON CARDS
============================================================ */

function renderLessonCards() {

    lessonCardsContainer.innerHTML = "";


    currentLessonCards.forEach(card => {

        const cardElement =
            document.createElement("div");

        cardElement.className =
            "lesson-card";

        cardElement.dataset.cardId =
            card.id;


        cardElement.innerHTML = `

            <div class="lesson-card-inner">

                <div class="lesson-card-front">

                    <div class="lesson-card-number">
                        ${card.id}
                    </div>

                    <h3>
                        ${escapeHTML(card.title)}
                    </h3>

                    <span class="lesson-card-open">
                        Press to open
                    </span>

                </div>


                <div class="lesson-card-content">

                    <button
                        class="lesson-card-close"
                        type="button"
                    >
                        ×
                    </button>


                    <div class="lesson-card-expanded-content">

                        ${renderLessonCardContent(card)}

                    </div>

                </div>

            </div>

        `;


        /* -------------------------------------
           OPEN
        ------------------------------------- */

        cardElement.addEventListener(
            "click",
            () => {

                openLessonCard(
                    cardElement
                );

            }
        );


        /* -------------------------------------
           CLOSE
        ------------------------------------- */

        const closeButton =
            cardElement.querySelector(
                ".lesson-card-close"
            );


        closeButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeLessonCard(
                    cardElement
                );

            }
        );


        lessonCardsContainer.appendChild(
            cardElement
        );

    });

}


/* ============================================================
   RENDER CARD CONTENT
============================================================ */

function renderLessonCardContent(card) {


    /* -----------------------------------------
       EMPTY
    ----------------------------------------- */

    if (
        !card.content ||
        card.type === "empty"
    ) {

        return `

            <div class="lesson-card-placeholder">

                <div class="placeholder-icon">
                    +
                </div>

                <h3>
                    ${escapeHTML(card.title)}
                </h3>

                <p>
                    Lesson content will be loaded here.
                </p>

            </div>

        `;

    }


    /* -----------------------------------------
       TEXT
    ----------------------------------------- */

    if (card.type === "text") {

        return `

            <div class="lesson-text-content">

                ${card.content}

            </div>

        `;

    }


    /* -----------------------------------------
       AUDIO
    ----------------------------------------- */

    if (card.type === "audio") {

        return `

            <div class="lesson-audio-content">

                <h2>
                    ${escapeHTML(card.title)}
                </h2>

                <audio controls>

                    <source
                        src="${escapeAttribute(card.content)}"
                        type="audio/mpeg"
                    >

                    Your browser does not support audio.

                </audio>

            </div>

        `;

    }


    /* -----------------------------------------
       VIDEO
    ----------------------------------------- */

    if (card.type === "video") {

        return `

            <div class="lesson-video-content">

                <video
                    controls
                    playsinline
                >

                    <source
                        src="${escapeAttribute(card.content)}"
                        type="video/mp4"
                    >

                    Your browser does not support video.

                </video>

            </div>

        `;

    }


    /* -----------------------------------------
       IMAGE
    ----------------------------------------- */

    if (card.type === "image") {

        return `

            <div class="lesson-image-content">

                <img
                    src="${escapeAttribute(card.content)}"
                    alt="${escapeAttribute(card.title)}"
                >

            </div>

        `;

    }


    return `

        <div class="lesson-card-placeholder">

            <p>
                Content unavailable.
            </p>

        </div>

    `;

}


/* ============================================================
   OPEN CARD
============================================================ */

function openLessonCard(cardElement) {

    document
        .querySelectorAll(
            ".lesson-card.expanded"
        )
        .forEach(card => {

            if (card !== cardElement) {

                card.classList.remove(
                    "expanded"
                );

            }

        });


    cardElement.classList.add(
        "expanded"
    );

}


/* ============================================================
   CLOSE CARD
============================================================ */

function closeLessonCard(cardElement) {

    cardElement.classList.remove(
        "expanded"
    );

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value == null ? "" : String(value);

    return div.innerHTML;

}


function escapeAttribute(value) {

    return escapeHTML(value)
        .replace(/"/g, "&quot;");

}


/* ============================================================
   SAVE STATE
============================================================ */

function saveCurrentState(
    bookType,
    unit,
    pageNum
) {

    localStorage.setItem(
        "pptkb1State",
        JSON.stringify({

            bookType,
            unit,
            pageNum

        })
    );

}


/* ============================================================
   DROPDOWN TOGGLE
============================================================ */

dropdownBtns.forEach(btn => {

    btn.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            const parentDropdown =
                btn.parentElement;


            document
                .querySelectorAll(
                    ".dropdown"
                )
                .forEach(dropdown => {

                    if (
                        dropdown !==
                        parentDropdown
                    ) {

                        dropdown.classList.remove(
                            "show"
                        );

                    }

                });


            parentDropdown.classList.toggle(
                "show"
            );

        }
    );

});


/* ============================================================
   CLOSE DROPDOWNS
============================================================ */

window.addEventListener(
    "click",
    event => {

        if (
            event.target.closest(
                ".dropdown"
            ) ||
            event.target.closest(
                ".lesson-dropdown"
            )
        ) {

            return;

        }


        document
            .querySelectorAll(
                ".dropdown"
            )
            .forEach(dropdown => {

                dropdown.classList.remove(
                    "show"
                );

            });


        document
            .querySelectorAll(
                ".lesson-dropdown"
            )
            .forEach(menu => {

                menu.classList.remove(
                    "show"
                );

            });

    }
);


/* ============================================================
   IMAGE FIT
============================================================ */

function autoFitImage() {

    if (
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
        Math.min(
            scaleX,
            scaleY
        );


    slideImage.style.width =
        imgWidth *
        currentScale +
        "px";


    slideImage.style.height =
        imgHeight *
        currentScale +
        "px";

}


/* ============================================================
   LOAD IMAGE
============================================================ */

function loadImage(src) {

    if (!src) {

        return;

    }


    isLessonCardMode =
        false;


    lessonCardsContainer.classList.remove(
        "active"
    );


    slideImage.style.display =
        "none";


    slideImage.onload =
        function() {

            slideImage.style.display =
                "block";

            autoFitImage();

            resizeEditCanvas();

        };


    slideImage.onerror =
        function() {

            console.error(
                "Failed to load image:",
                src
            );

            slideImage.style.display =
                "none";

        };


    slideImage.src =
        src;

}


/* ============================================================
   HOME
============================================================ */

function loadHome() {

    isLessonCardMode =
        false;

    currentLessonUnit =
        null;

    currentLessonNumber =
        null;


    lessonCardsContainer.classList.remove(
        "active"
    );


    currentImages =
        [];

    currentIndex =
        0;


    viewerTitle.textContent =
        "Presentation Plus";

    viewerSubtitle.textContent =
        "Select a lesson to begin";


    loadImage(
        "images/homepage.jpg"
    );


    prevBtn.style.display =
        "none";

    nextBtn.style.display =
        "none";

}


/* ============================================================
   STUDENT BOOK UNIT
============================================================ */

function loadStudentUnit(unitNumber) {

    isLessonCardMode =
        false;

    lessonCardsContainer.classList.remove(
        "active"
    );


    currentImages =
        [];

    currentIndex =
        0;


    const folderName =
        "unit_" +
        unitNumber;

    const basePath =
        `images/student-book-pages/${folderName}/`;


    let pageNumbers = [];


    switch (String(unitNumber)) {

        case "1":
            pageNumbers =
                [10,11,12,13,14,15,16,17,18];
            break;

        case "2":
            pageNumbers =
                [12,13,14,15,16,17];
            break;

        case "3":
            pageNumbers =
                [18,19,20,21,22,23,24,25];
            break;

        case "4":
            pageNumbers =
                [26,27,28,29,30,31];
            break;

        case "5":
            pageNumbers =
                [32,33,34,35,36,37];
            break;

        case "6":
            pageNumbers =
                [38,39,40,41,42,43,44,45];
            break;

        case "7":
            pageNumbers =
                [46,47,48,49,50,51];
            break;

        case "8":
            pageNumbers =
                [52,53,54,55,56,57];
            break;

        case "9":
            pageNumbers =
                [58,59,60,61,62,63,64,65];
            break;

        case "10":
            pageNumbers =
                [66,67,68,69,70,71];
            break;

        case "11":
            pageNumbers =
                [72,73,74,75,76,77];
            break;

        case "12":
            pageNumbers =
                [78,79,80,81,82,83,84,85];
            break;

    }


    pageNumbers.forEach(num => {

        currentImages.push(
            basePath +
            "page" +
            num +
            ".jpg"
        );

    });


    if (currentImages.length) {

        loadImage(
            currentImages[currentIndex]
        );

    }


    prevBtn.style.display =
        "block";

    nextBtn.style.display =
        "block";


    viewerTitle.textContent =
        `Student Book — Unit ${unitNumber}`;

    viewerSubtitle.textContent =
        "Student Book pages";

}


/* ============================================================
   ACTIVITY BOOK UNIT
============================================================ */

function loadActivityUnit(unitNumber) {

    isLessonCardMode =
        false;

    lessonCardsContainer.classList.remove(
        "active"
    );


    currentImages =
        [];

    currentIndex =
        0;


    const folderName =
        "unit_" +
        unitNumber;

    const basePath =
        `images/activity-book-pages/${folderName}/`;


    let pageNumbers = [];


    switch (String(unitNumber)) {

        case "1":
            pageNumbers =
                [106,107];
            break;

        case "2":
            pageNumbers =
                [108,109];
            break;

        case "3":
            pageNumbers =
                [110,111];
            break;

        case "4":
            pageNumbers =
                [112,113];
            break;

        case "5":
            pageNumbers =
                [114,115];
            break;

        case "6":
            pageNumbers =
                [116,117];
            break;

        case "7":
            pageNumbers =
                [118,119];
            break;

        case "8":
            pageNumbers =
                [120,121];
            break;

        case "9":
            pageNumbers =
                [122,123];
            break;

        case "10":
            pageNumbers =
                [124,125];
            break;

        case "11":
            pageNumbers =
                [126,127];
            break;

        case "12":
            pageNumbers =
                [128,129];
            break;

    }


    pageNumbers.forEach(num => {

        currentImages.push(
            basePath +
            "page" +
            num +
            ".JPG"
        );

    });


    if (currentImages.length) {

        loadImage(
            currentImages[currentIndex]
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


    viewerTitle.textContent =
        `Activity Book — Unit ${unitNumber}`;

    viewerSubtitle.textContent =
        "Activity Book pages";

}


/* ============================================================
   STUDENT UNIT CLICK
============================================================ */

studentDropdownLinks.forEach(link => {

    link.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            const unit =
                link.getAttribute(
                    "data-unit"
                );


            const lessonMenu =
                link.parentElement.querySelector(
                    ".lesson-dropdown"
                );


            if (!lessonMenu) {

                return;

            }


            document
                .querySelectorAll(
                    ".lesson-dropdown"
                )
                .forEach(menu => {

                    if (
                        menu !==
                        lessonMenu
                    ) {

                        menu.classList.remove(
                            "show"
                        );

                    }

                });


            lessonMenu.classList.toggle(
                "show"
            );

        }
    );

});


/* ============================================================
   LESSON LINKS
============================================================ */

const lessonDropdownLinks =
    document.querySelectorAll(
        ".lesson-dropdown a"
    );


lessonDropdownLinks.forEach(link => {

    link.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            const unit =
                link.getAttribute(
                    "data-unit"
                );

            const lesson =
                link.getAttribute(
                    "data-lesson"
                );


            console.log(
                "Opening Unit:",
                unit,
                "Lesson:",
                lesson
            );


            /* -----------------------------------
               NEW CARD SYSTEM
            ----------------------------------- */

            loadLessonCards(
                unit,
                lesson
            );


            /* -----------------------------------
               SAVE LESSON STATE
            ----------------------------------- */

            saveCurrentState(
                "lesson",
                unit,
                lesson
            );


            /* -----------------------------------
               CLOSE MENUS
            ----------------------------------- */

            document
                .querySelectorAll(
                    ".lesson-dropdown"
                )
                .forEach(menu => {

                    menu.classList.remove(
                        "show"
                    );

                });

        }
    );

});


/* ============================================================
   ACTIVITY LINKS
============================================================ */

activityDropdownLinks.forEach(link => {

    link.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            const unit =
                link.getAttribute(
                    "data-unit"
                );


            loadActivityUnit(
                unit
            );


            if (
                currentImages.length
            ) {

                const match =
                    currentImages[
                        currentIndex
                    ].match(
                        /page(\d+)/i
                    );


                if (match) {

                    saveCurrentState(
                        "activity",
                        unit,
                        parseInt(
                            match[1]
                        )
                    );

                }

            }

        }
    );

});


/* ============================================================
   PREVIOUS
============================================================ */

prevBtn.addEventListener(
    "click",
    () => {

        if (isLessonCardMode) {

            return;

        }


        if (
            currentIndex > 0
        ) {

            currentIndex--;

            loadImage(
                currentImages[
                    currentIndex
                ]
            );


            saveImageState();

        }

    }
);


/* ============================================================
   NEXT
============================================================ */

nextBtn.addEventListener(
    "click",
    () => {

        if (isLessonCardMode) {

            return;

        }


        if (
            currentIndex <
            currentImages.length - 1
        ) {

            currentIndex++;

            loadImage(
                currentImages[
                    currentIndex
                ]
            );


            saveImageState();

        }

    }
);


/* ============================================================
   SAVE IMAGE STATE
============================================================ */

function saveImageState() {

    if (
        !currentImages.length
    ) {

        return;

    }


    const src =
        currentImages[
            currentIndex
        ];


    const unitMatch =
        src.match(
            /unit_(\d+)/i
        );

    const pageMatch =
        src.match(
            /page(\d+)/i
        );


    if (
        !unitMatch ||
        !pageMatch
    ) {

        return;

    }


    saveCurrentState(

        src.includes(
            "student-book-pages"
        )
            ? "student"
            : "activity",

        unitMatch[1],

        pageMatch[1]

    );

}


/* ============================================================
   ZOOM
============================================================ */

const MIN_ZOOM = 0.1;

const MAX_ZOOM = 5;


function applyZoom() {

    if (
        !slideImage.naturalWidth ||
        !slideImage.naturalHeight
    ) {

        return;

    }


    slideImage.style.width =
        slideImage.naturalWidth *
        currentScale +
        "px";


    slideImage.style.height =
        slideImage.naturalHeight *
        currentScale +
        "px";


    resizeEditCanvas();

}


/* ============================================================
   CTRL + WHEEL
============================================================ */

slideContainer.addEventListener(
    "wheel",
    event => {

        if (!event.ctrlKey) {

            return;

        }


        event.preventDefault();


        if (
            event.deltaY < 0
        ) {

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


/* ============================================================
   PINCH ZOOM
============================================================ */

let pinchStartDistance = null;

let pinchStartScale = 1;


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
    event => {

        if (
            event.touches.length !==
            2
        ) {

            return;

        }


        event.preventDefault();


        pinchStartDistance =
            getTouchDistance(
                event.touches[0],
                event.touches[1]
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
    event => {

        if (
            event.touches.length !==
            2
        ) {

            return;

        }


        event.preventDefault();


        const distance =
            getTouchDistance(
                event.touches[0],
                event.touches[1]
            );


        if (
            !pinchStartDistance
        ) {

            return;

        }


        const scaleChange =
            distance /
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
    () => {

        pinchStartDistance =
            null;

    }
);


slideContainer.addEventListener(
    "touchcancel",
    () => {

        pinchStartDistance =
            null;

    }
);


/* ============================================================
   HOME BUTTON
============================================================ */

homeBtn.addEventListener(
    "click",
    event => {

        event.preventDefault();

        loadHome();

    }
);


/* ============================================================
   AUDIO BUTTON
============================================================ */

audioBtn.addEventListener(
    "click",
    event => {

        event.preventDefault();

        event.stopPropagation();


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
            !currentImages.length
        ) {

            return;

        }


        const pageSrc =
            currentImages[
                currentIndex
            ];


        let bookType;


        if (
            pageSrc.includes(
                "student-book-pages"
            )
        ) {

            bookType =
                "student";

        }

        else if (
            pageSrc.includes(
                "activity-book-pages"
            )
        ) {

            bookType =
                "activity";

        }

        else {

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


        const studentBookAudioTracks = {

            1: {
                8: [
                    "page8_Track_1.1"
                ],
                9: [
                    "page9_Track_1.2",
                    "page9_Track_1.3"
                ],
                10: [
                    "br2_003_a1_4"
                ]
            },

            2: {
                13: [
                    "br2_003_a2_1"
                ],
                15: [
                    "br2_003_a2_2"
                ],
                16: [
                    "br2_003_a2_3"
                ]
            },

            3: {
                19: [
                    "br2_003_a3_1"
                ],
                20: [
                    "br2_003_a3_2"
                ],
                21: [
                    "br2_003_a3_3",
                    "br2_003_a3_4"
                ],
                22: [
                    "br2_003_a3_5"
                ]
            },

            4: {
                27: [
                    "br2_003_a4_1"
                ],
                28: [
                    "br2_003_a4_2"
                ],
                29: [
                    "br2_003_a4_3"
                ],
                30: [
                    "br2_003_a4_4"
                ]
            },

            5: {
                34: [
                    "br2_003_a5_1"
                ],
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
                38: [
                    "br2_003_a6_1"
                ],
                41: [
                    "br2_003_a6_2",
                    "br2_003_a6_3"
                ],
                42: [
                    "br2_003_a6_4"
                ],
                43: [
                    "br2_003_a6_5"
                ]
            },

            7: {
                47: [
                    "br2_003_a7_1"
                ],
                49: [
                    "br2_003_a7_2",
                    "br2_003_a7_3"
                ],
                50: [
                    "br2_003_a7_4"
                ]
            },

            8: {
                54: [
                    "br2_003_a8_1"
                ],
                55: [
                    "br2_003_a8_2"
                ],
                56: [
                    "br2_003_a8_3"
                ]
            },

            9: {
                59: [
                    "br2_003_a9_1"
                ],
                60: [
                    "br2_003_a9_2"
                ],
                61: [
                    "br2_003_a9_3"
                ],
                62: [
                    "br2_003_a9_4"
                ]
            },

            10: {
                67: [
                    "br2_003_a10_1"
                ],
                68: [
                    "br2_003_a10_2"
                ],
                69: [
                    "br2_003_a10_3"
                ],
                70: [
                    "br2_003_a10_4"
                ]
            },

            11: {
                72: [
                    "br2_003_a11_1"
                ],
                73: [
                    "br2_003_a11_1"
                ],
                75: [
                    "br2_003_a11_2"
                ],
                76: [
                    "br2_003_a11_3",
                    "br2_003_a11_4"
                ]
            },

            12: {
                79: [
                    "br2_003_a12_1"
                ],
                81: [
                    "br2_003_a12_2"
                ],
                82: [
                    "br2_003_a12_3",
                    "br2_003_a12_4",
                    "br2_003_a12_5"
                ],
                83: [
                    "br2_003_a12_6"
                ]
            }

        };


        const activityBookAudioTracks = {

            1: {
                4: [
                    "page4_Track_02"
                ],
                15: [
                    "br2_003_a2_2"
                ],
                7: [
                    "page7_Track_04"
                ]
            },

            2: {
                13: [
                    "br2_003_a2_1"
                ],
                12: [
                    "page12_Track_06"
                ],
                16: [
                    "page16_Track_07"
                ]
            },

            3: {
                18: [
                    "page18_Track_08"
                ],
                19: [
                    "page19_Track_09"
                ],
                20: [
                    "page20_Track_10"
                ],
                21: [
                    "page21_Track_11"
                ],
                22: [
                    "page22_Track_12"
                ]
            },

            4: {
                24: [
                    "page24_Track_13"
                ],
                25: [
                    "page25_Track_14"
                ],
                26: [
                    "page26_Track_15"
                ],
                28: [
                    "page28_Track_16"
                ]
            },

            5: {
                34: [
                    "page34_Track_18"
                ],
                36: [
                    "page36_Track_19"
                ],
                38: [
                    "page38_Track_20"
                ]
            },

            6: {
                40: [
                    "page40_Track_21"
                ],
                41: [
                    "page41_Track_22"
                ],
                42: [
                    "page42_Track_23"
                ],
                46: [
                    "page46_Track_24"
                ]
            },

            7: {
                48: [
                    "page48_Track_25"
                ],
                50: [
                    "page50_Track_26"
                ],
                52: [
                    "page52_Track_27"
                ]
            },

            8: {
                54: [
                    "page54_Track_28"
                ],
                55: [
                    "page55_Track_29"
                ],
                56: [
                    "page56_Track_30",
                    "page56_Track_31"
                ],
                57: [
                    "page57_Track_32"
                ],
                60: [
                    "page60_Track_33"
                ],
                62: [
                    "page62_Track_34"
                ]
            },

            9: {
                64: [
                    "page64_Track_35"
                ],
                66: [
                    "page66_Track_36"
                ]
            },

            10: {
                70: [
                    "page70_Track_37"
                ],
                72: [
                    "page72_Track_38"
                ],
                73: [
                    "page73_Track_39"
                ]
            },

            11: {
                78: [
                    "page78_Track_40"
                ],
                80: [
                    "page80_Track_41"
                ]
            },

            12: {
                84: [
                    "page84_Track_42"
                ],
                86: [
                    "page86_Track_43"
                ],
                87: [
                    "page87_Track_44"
                ]
            }

        };


        let tracks = [];


        if (
            bookType ===
            "student"
        ) {

            tracks =
                studentBookAudioTracks[
                    unit
                ]?.[
                    pageNum
                ] || [];

        }

        else {

            tracks =
                activityBookAudioTracks[
                    unit
                ]?.[
                    pageNum
                ] || [];

        }


        if (!tracks.length) {

            audioListContainer.innerHTML =
                "<span>No audio available.</span>";

            return;

        }


        tracks.forEach(
            (track, index) => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.textContent =
                    `Audio ${index + 1}`;


                button.addEventListener(
                    "click",
                    () => {

                        const folder =
                            bookType ===
                            "student"

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
                    button
                );

            }
        );

    }
);


/* ============================================================
   HIDE AUDIO LIST
============================================================ */

window.addEventListener(
    "click",
    () => {

        audioListContainer.style.display =
            "none";

    }
);


/* ============================================================
   VIDEO SYSTEM
============================================================ */

const videoBtn =
    document.getElementById(
        "video-btn"
    );

const videoListContainer =
    document.createElement(
        "div"
    );

videoListContainer.id =
    "video-list-container";

document.body.appendChild(
    videoListContainer
);


const videoPlayer =
    document.getElementById(
        "slide-video"
    );

const videoSource =
    document.getElementById(
        "video-source"
    );

const hideVideoBtn =
    document.getElementById(
        "hide-video-btn"
    );


function showVideoPlayer() {

    videoPlayer.parentElement.style.display =
        "block";

}


hideVideoBtn.addEventListener(
    "click",
    () => {

        videoPlayer.pause();

        videoPlayer.parentElement.style.display =
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
                    error =>
                        console.log(
                            error
                        )
                );

        }

        else {

            document.exitFullscreen();

        }

    }
);


/* ============================================================
   VIDEO DATA
============================================================ */

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


/* ============================================================
   VIDEO BUTTON
============================================================ */

videoBtn.addEventListener(
    "click",
    event => {

        event.preventDefault();

        event.stopPropagation();


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
            !currentImages.length
        ) {

            return;

        }


        const pageSrc =
            currentImages[
                currentIndex
            ];


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
            unitVideos[
                unit
            ]?.[
                pageNum
            ] || [];


        if (!tracks.length) {

            return;

        }


        tracks.forEach(
            (track, index) => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.textContent =
                    `Video ${index + 1}`;


                button.addEventListener(
                    "click",
                    () => {

                        videoSource.src =
                            `video/unit_${unit}/${track}.mp4`;


                        videoPlayer.load();

                        showVideoPlayer();

                    }
                );


                videoListContainer.appendChild(
                    button
                );

            }
        );

    }
);


/* ============================================================
   HIDE VIDEO LIST
============================================================ */

window.addEventListener(
    "click",
    () => {

        videoListContainer.style.display =
            "none";

    }
);


/* ============================================================
   DRAWING SYSTEM
============================================================ */

const editCanvas =
    document.getElementById(
        "edit-canvas"
    );

const editCtx =
    editCanvas.getContext(
        "2d"
    );


const whiteboardCanvas =
    document.getElementById(
        "whiteboard-canvas"
    );

const whiteboardCtx =
    whiteboardCanvas.getContext(
        "2d"
    );


let drawingCanvas =
    editCanvas;

let drawingCtx =
    editCtx;


function setDrawingTarget(
    type
) {

    if (
        type ===
        "whiteboard"
    ) {

        drawingCanvas =
            whiteboardCanvas;

        drawingCtx =
            whiteboardCtx;

    }

    else {

        drawingCanvas =
            editCanvas;

        drawingCtx =
            editCtx;

    }


    updateCursor();

}


/* ============================================================
   EDIT TRAY
============================================================ */

const editBtn =
    document.getElementById(
        "edit-btn"
    );

const editTray =
    document.getElementById(
        "edit-tray"
    );

const pencilTool =
    document.getElementById(
        "pencil-tool"
    );


editBtn.addEventListener(
    "click",
    event => {

        event.preventDefault();

        event.stopPropagation();


        editTray.style.display =
            editTray.style.display ===
            "flex"

                ? "none"

                : "flex";

    }
);


/* ============================================================
   WHITEBOARD
============================================================ */

const whiteboardBtn =
    document.getElementById(
        "whiteboard-btn"
    );

const whiteboard =
    document.getElementById(
        "whiteboard"
    );


whiteboardBtn.addEventListener(
    "click",
    event => {

        event.preventDefault();

        event.stopPropagation();


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

        }

        else {

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


/* ============================================================
   HIDE WHITEBOARD WHEN OPENING UNIT/LESSON
============================================================ */

function hideWhiteboard() {

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
            hideWhiteboard
        );

    }
);


activityDropdownLinks.forEach(
    link => {

        link.addEventListener(
            "click",
            hideWhiteboard
        );

    }
);


lessonDropdownLinks.forEach(
    link => {

        link.addEventListener(
            "click",
            hideWhiteboard
        );

    }
);


/* ============================================================
   TOOL SYSTEM
============================================================ */

let currentTool =
    null;


function setTool(tool) {

    if (
        currentTool ===
        tool
    ) {

        currentTool =
            null;

    }

    else {

        currentTool =
            tool;

    }


    updateToolUI();

    updateCursor();

}


const penTool =
    document.getElementById(
        "pen-tool"
    );

const eraserTool =
    document.getElementById(
        "eraser-tool"
    );

const highlightTool =
    document.getElementById(
        "highlight-tool"
    );

const textTool =
    document.getElementById(
        "text-tool"
    );

const clearTool =
    document.getElementById(
        "clear-tool"
    );


pencilTool.addEventListener(
    "click",
    () =>
        setTool("pencil")
);

penTool.addEventListener(
    "click",
    () =>
        setTool("pen")
);

eraserTool.addEventListener(
    "click",
    () =>
        setTool("eraser")
);

highlightTool.addEventListener(
    "click",
    () =>
        setTool("marker")
);

textTool.addEventListener(
    "click",
    () =>
        setTool("text")
);


/* ============================================================
   TOOL UI
============================================================ */

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


    Object.values(
        tools
    ).forEach(
        button => {

            if (button) {

                button.classList.remove(
                    "active-tool"
                );

            }

        }
    );


    if (
        tools[currentTool]
    ) {

        tools[currentTool].classList.add(
            "active-tool"
        );

    }

}


/* ============================================================
   STROKES
============================================================ */

let strokes = [];

let currentStroke =
    null;

let drawing =
    false;

let pencilSize =
    3;


/* ============================================================
   CLEAR CANVAS
============================================================ */

clearTool.addEventListener(
    "click",
    () => {

        const canvasId =
            drawingCanvas.id;


        strokes =
            strokes.filter(
                stroke =>
                    stroke.canvas !==
                    canvasId
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

        }

        else {

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


/* ============================================================
   CURSOR
============================================================ */

function updateCursor() {

    if (
        !drawingCanvas
    ) {

        return;

    }


    if (
        !currentTool
    ) {

        drawingCanvas.style.cursor =
            "default";

        return;

    }


    if (
        currentTool ===
        "eraser"
    ) {

        drawingCanvas.style.cursor =
            "crosshair";

    }

    else if (
        currentTool ===
        "text"
    ) {

        drawingCanvas.style.cursor =
            "text";

    }

    else if (
        currentTool ===
        "marker"
    ) {

        drawingCanvas.style.cursor =
            "cell";

    }

    else {

        drawingCanvas.style.cursor =
            "pointer";

    }

}


/* ============================================================
   RESIZE CANVAS
============================================================ */

function resizeEditCanvas() {

    const rect =
        slideImage.getBoundingClientRect();


    if (
        !rect.width ||
        !rect.height
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


function resizeWhiteboardCanvas() {

    whiteboardCanvas.width =
        whiteboard.offsetWidth;

    whiteboardCanvas.height =
        whiteboard.offsetHeight;


    redrawStrokes();

}


window.addEventListener(
    "resize",
    () => {

        resizeEditCanvas();

        resizeWhiteboardCanvas();

    }
);


/* ============================================================
   POSITION
============================================================ */

function getPos(
    event,
    canvas
) {

    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            (event.clientX -
                rect.left) /
            canvas.width,

        y:
            (event.clientY -
                rect.top) /
            canvas.height

    };

}


/* ============================================================
   DRAW START
============================================================ */

function startDrawing(
    event,
    canvas
) {

    if (
        !currentTool
    ) {

        return;

    }


    const {
        x,
        y
    } =
        getPos(
            event,
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

        color,

        size,

        points:
            [
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


/* ============================================================
   DRAW MOVE
============================================================ */

function moveDrawing(
    event,
    canvas
) {

    if (
        !drawing
    ) {

        return;

    }


    const {
        x,
        y
    } =
        getPos(
            event,
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


    if (
        currentStroke
    ) {

        currentStroke.points.push(
            {
                x,
                y
            }
        );

    }


    redrawStrokes();

}


/* ============================================================
   STOP DRAWING
============================================================ */

function stopDrawing() {

    drawing =
        false;

    currentStroke =
        null;

}


/* ============================================================
   CANVAS EVENTS
============================================================ */

editCanvas.addEventListener(
    "mousedown",
    event =>
        startDrawing(
            event,
            editCanvas
        )
);

editCanvas.addEventListener(
    "mousemove",
    event =>
        moveDrawing(
            event,
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


whiteboardCanvas.addEventListener(
    "mousedown",
    event =>
        startDrawing(
            event,
            whiteboardCanvas
        )
);

whiteboardCanvas.addEventListener(
    "mousemove",
    event =>
        moveDrawing(
            event,
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


/* ============================================================
   ERASER
============================================================ */

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

                    return [
                        stroke
                    ];

                }


                const newStrokes =
                    [];

                let temp =
                    [];


                for (
                    const point
                    of stroke.points
                ) {

                    const dx =
                        point.x -
                        x;

                    const dy =
                        point.y -
                        y;


                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (
                        distance >
                        radius
                    ) {

                        temp.push(
                            point
                        );

                    }

                    else {

                        if (
                            temp.length
                        ) {

                            newStrokes.push({

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

                    newStrokes.push({

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


                return newStrokes;

            }
        );

}


/* ============================================================
   REDRAW
============================================================ */

function redrawStrokes() {

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

            }

            else {

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
                (
                    point,
                    index
                ) => {

                    const x =
                        point.x *
                        canvas.width;

                    const y =
                        point.y *
                        canvas.height;


                    if (
                        index ===
                        0
                    ) {

                        ctx.moveTo(
                            x,
                            y
                        );

                    }

                    else {

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


/* ============================================================
   TEXT TOOL
============================================================ */

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


function handleTextClick(event) {

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
        (event.clientX -
            rect.left) /
        rect.width;


    const y =
        (event.clientY -
            rect.top) /
        rect.height;


    createTextBox(
        x,
        y,
        canvas
    );

}


/* ============================================================
   CREATE TEXT BOX
============================================================ */

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
        true;

    box.classList.add(
        "slide-textbox"
    );


    box.dataset.x =
        x;

    box.dataset.y =
        y;

    box.dataset.canvas =
        canvas.id;


    box.style.left =
        x *
        canvas.getBoundingClientRect().width +
        "px";


    box.style.top =
        y *
        canvas.getBoundingClientRect().height +
        "px";


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


/* ============================================================
   TEXT TOOLBAR
============================================================ */

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

        };


    const plus =
        document.createElement(
            "button"
        );

    plus.innerText =
        "A+";


    plus.onclick =
        () => {

            const size =
                parseInt(
                    window
                        .getComputedStyle(
                            box
                        )
                        .fontSize
                );


            box.style.fontSize =
                size +
                2 +
                "px";

        };


    const minus =
        document.createElement(
            "button"
        );

    minus.innerText =
        "A-";


    minus.onclick =
        () => {

            const size =
                parseInt(
                    window
                        .getComputedStyle(
                            box
                        )
                        .fontSize
                );


            if (
                size > 10
            ) {

                box.style.fontSize =
                    size -
                    2 +
                    "px";

            }

        };


    const red =
        document.createElement(
            "button"
        );

    red.innerText =
        "🔴";

    red.onclick =
        () =>
            box.style.color =
                "red";


    const black =
        document.createElement(
            "button"
        );

    black.innerText =
        "⚫";

    black.onclick =
        () =>
            box.style.color =
                "black";


    const blue =
        document.createElement(
            "button"
        );

    blue.innerText =
        "🔵";

    blue.onclick =
        () =>
            box.style.color =
                "blue";


    textToolbar.append(
        del,
        plus,
        minus,
        red,
        black,
        blue
    );

}


/* ============================================================
   TEXT TOOLBAR CLICK
============================================================ */

document.addEventListener(
    "click",
    event => {

        if (
            event.target.contentEditable ===
            "true"
        ) {

            activeTextBox =
                event.target;

            showTextToolbar(
                event.target
            );

        }

        else if (
            !textToolbar.contains(
                event.target
            )
        ) {

            textToolbar.style.display =
                "none";

        }

    }
);


/* ============================================================
   DRAG TEXT BOX
============================================================ */

function enableDrag(el) {

    let offsetX =
        0;

    let offsetY =
        0;

    let dragging =
        false;


    el.addEventListener(
        "mousedown",
        event => {

            dragging =
                true;


            const rect =
                el.getBoundingClientRect();


            offsetX =
                event.clientX -
                rect.left;


            offsetY =
                event.clientY -
                rect.top;


            document.body.style.userSelect =
                "none";

        }
    );


    document.addEventListener(
        "mousemove",
        event => {

            if (
                !dragging
            ) {

                return;

            }


            const parentRect =
                el.parentElement
                    .getBoundingClientRect();


            el.style.left =
                event.clientX -
                parentRect.left -
                offsetX +
                "px";


            el.style.top =
                event.clientY -
                parentRect.top -
                offsetY +
                "px";

        }
    );


    document.addEventListener(
        "mouseup",
        () => {

            dragging =
                false;

            document.body.style.userSelect =
                "auto";

        }
    );

}


/* ============================================================
   TEXT BOX RERENDER
============================================================ */

function rerenderAllTextBoxes() {

    document
        .querySelectorAll(
            ".slide-textbox"
        )
        .forEach(
            box => {

                const canvas =
                    document.getElementById(
                        box.dataset.canvas
                    );


                if (
                    !canvas
                ) {

                    return;

                }


                const rect =
                    canvas.getBoundingClientRect();


                box.style.left =
                    parseFloat(
                        box.dataset.x
                    ) *
                    rect.width +
                    "px";


                box.style.top =
                    parseFloat(
                        box.dataset.y
                    ) *
                    rect.height +
                    "px";

            }
        );

}


/* ============================================================
   INITIAL LOAD
============================================================ */

window.addEventListener(
    "load",
    () => {

        setDrawingTarget(
            "slide"
        );


        resizeEditCanvas();

        resizeWhiteboardCanvas();

        updateCursor();


        /* -------------------------------------
           ALWAYS START HOME
        ------------------------------------- */

        loadHome();

    }
);


/* ============================================================
   ESC CLOSES EXPANDED CARD
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        document
            .querySelectorAll(
                ".lesson-card.expanded"
            )
            .forEach(
                card =>
                    card.classList.remove(
                        "expanded"
                    )
            );

    }
);
