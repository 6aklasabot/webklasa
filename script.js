/* =========================
   MOBILE MENU
   ========================= */

const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

if (menuBtn && navLinks) {

    menuBtn.addEventListener("click", function () {
        navLinks.classList.toggle("open");
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            navLinks.classList.remove("open");
        });
    });
}


/* =========================
   ROZKŁAD ZOOM
   ========================= */

const scheduleOverlay = document.getElementById("scheduleOverlay");
const scheduleZoomImage = document.getElementById("scheduleZoomImage");
const scheduleZoomLevel = document.getElementById("scheduleZoomLevel");

let scheduleZoom = 1;
let schedulePosX = 0;
let schedulePosY = 0;

let scheduleDragging = false;
let scheduleStartX = 0;
let scheduleStartY = 0;

let scheduleLastDistance = null;


/* UPDATE */

function updateScheduleZoom() {

    if (!scheduleZoomImage || !scheduleZoomLevel) return;

    scheduleZoomImage.style.transform =
        `translate(${schedulePosX}px, ${schedulePosY}px) scale(${scheduleZoom})`;

    scheduleZoomLevel.textContent =
        Math.round(scheduleZoom * 100) + "%";
}


/* OPEN */

function openScheduleImage(src) {

    if (!scheduleOverlay || !scheduleZoomImage) return;

    scheduleZoomImage.src = src;

    scheduleZoom = 1;
    schedulePosX = 0;
    schedulePosY = 0;

    updateScheduleZoom();

    scheduleOverlay.classList.add("active");

    document.body.style.overflow = "hidden";
}


/* CLOSE */

function closeScheduleImage(event) {

    if (!scheduleOverlay) return;

    if (
        event &&
        event.target !== scheduleOverlay &&
        event.target !== scheduleZoomImage
    ) {
        return;
    }

    scheduleOverlay.classList.remove("active");

    document.body.style.overflow = "";
}


/* PLUS */

function scheduleZoomIn(event) {

    if (event) event.stopPropagation();

    scheduleZoom = Math.min(5, scheduleZoom + 0.25);

    updateScheduleZoom();
}


/* MINUS */

function scheduleZoomOut(event) {

    if (event) event.stopPropagation();

    scheduleZoom = Math.max(0.5, scheduleZoom - 0.25);

    updateScheduleZoom();
}


/* RESET */

function scheduleZoomReset(event) {

    if (event) event.stopPropagation();

    scheduleZoom = 1;
    schedulePosX = 0;
    schedulePosY = 0;

    updateScheduleZoom();
}


/* TOUCH DISTANCE HELPER */

function getScheduleTouchDistance(touches) {

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.sqrt(dx * dx + dy * dy);
}


if (scheduleOverlay && scheduleZoomImage && scheduleZoomLevel) {

    /* RESET BY CLICKING PERCENTAGE */

    scheduleZoomLevel.onclick = function (event) {

        event.stopPropagation();

        scheduleZoom = 1;
        schedulePosX = 0;
        schedulePosY = 0;

        updateScheduleZoom();
    };


    /* MOUSE WHEEL */

    scheduleOverlay.addEventListener("wheel", function (event) {

        event.preventDefault();

        if (event.deltaY < 0) {
            scheduleZoom += 0.25;
        } else {
            scheduleZoom -= 0.25;
        }

        scheduleZoom = Math.max(0.5, Math.min(5, scheduleZoom));

        updateScheduleZoom();

    }, { passive: false });


    /* PC DRAG */

    scheduleZoomImage.addEventListener("mousedown", function (event) {

        if (scheduleZoom <= 1) return;

        event.preventDefault();

        scheduleDragging = true;

        scheduleStartX = event.clientX - schedulePosX;
        scheduleStartY = event.clientY - schedulePosY;

        scheduleZoomImage.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", function (event) {

        if (!scheduleDragging) return;

        schedulePosX = event.clientX - scheduleStartX;
        schedulePosY = event.clientY - scheduleStartY;

        updateScheduleZoom();
    });

    document.addEventListener("mouseup", function () {

        scheduleDragging = false;

        scheduleZoomImage.style.cursor = "grab";
    });


    /* DOUBLE CLICK RESET */

    scheduleZoomImage.addEventListener("dblclick", function () {

        scheduleZoom = 1;
        schedulePosX = 0;
        schedulePosY = 0;

        updateScheduleZoom();
    });


    /* PHONE PINCH */

    scheduleZoomImage.addEventListener("touchstart", function (event) {

        event.preventDefault();

        if (event.touches.length === 2) {

            scheduleLastDistance = getScheduleTouchDistance(event.touches);

            scheduleDragging = false;

        } else if (event.touches.length === 1 && scheduleZoom > 1) {

            scheduleDragging = true;

            scheduleStartX = event.touches[0].clientX - schedulePosX;
            scheduleStartY = event.touches[0].clientY - schedulePosY;
        }

    }, { passive: false });


    scheduleZoomImage.addEventListener("touchmove", function (event) {

        event.preventDefault();

        /* PINCH */

        if (event.touches.length === 2) {

            const distance = getScheduleTouchDistance(event.touches);

            if (scheduleLastDistance !== null) {

                const difference = distance - scheduleLastDistance;

                scheduleZoom += difference * 0.005;

                scheduleZoom = Math.max(0.5, Math.min(5, scheduleZoom));

                updateScheduleZoom();
            }

            scheduleLastDistance = distance;

            return;
        }

        /* DRAG */

        if (event.touches.length === 1 && scheduleDragging) {

            schedulePosX = event.touches[0].clientX - scheduleStartX;
            schedulePosY = event.touches[0].clientY - scheduleStartY;

            updateScheduleZoom();
        }

    }, { passive: false });


    scheduleZoomImage.addEventListener("touchend", function (event) {

        if (event.touches.length < 2) {
            scheduleLastDistance = null;
        }

        if (event.touches.length === 0) {
            scheduleDragging = false;
        }
    });


    /* ESC */

    document.addEventListener("keydown", function (event) {

        if (
            event.key === "Escape" &&
            scheduleOverlay.classList.contains("active")
        ) {

            scheduleOverlay.classList.remove("active");

            document.body.style.overflow = "";
        }
    });
}


/* =========================
   ZAMIANY - AUTOMATYCZNE "DZISIAJ / JUTRO"
   (etykiety zawsze zgodne z dzisiejszą datą, nawet jeśli
   strona została wygenerowana wczoraj)
   ========================= */

(function () {

    const cards = document.querySelectorAll(".subst-day[data-date]");

    if (!cards.length) return;

    function isoDate(d) {
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return d.getFullYear() + "-" + m + "-" + day;
    }

    function updateSubstitutionLabels() {

        const now = new Date();
        const today = isoDate(now);
        const tomorrow = isoDate(
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        );

        cards.forEach(function (card) {

            const date = card.dataset.date;
            const label = card.querySelector(".subst-label");

            if (date === today) {
                label.textContent = "Dzisiaj";
                card.hidden = false;
            } else if (date === tomorrow) {
                label.textContent = "Jutro";
                card.hidden = false;
            } else {
                /* nieaktualne dane z przeszłości */
                card.hidden = date < today;
            }
        });
    }

    updateSubstitutionLabels();

    setInterval(updateSubstitutionLabels, 60 * 1000);

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) updateSubstitutionLabels();
    });
})();


/* =========================
   ROZKŁAD - POBIERZ / DRUKUJ
   (zawsze używa aktualnego zdjęcia z .schedule-img)
   ========================= */

async function downloadSchedule() {

    const img = document.querySelector(".schedule-img");

    if (!img) return;

    const url = img.src;

    const name =
        decodeURIComponent(url.split("?")[0].split("/").pop()) || "rozklad.png";

    try {

        const response = await fetch(url);

        if (!response.ok) throw new Error("HTTP " + response.status);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = name;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(function () {
            URL.revokeObjectURL(blobUrl);
        }, 1000);

    } catch (error) {

        /* plan awaryjny: otwórz zdjęcie w nowej karcie */
        window.open(url, "_blank");
    }
}

function printSchedule() {

    const img = document.querySelector(".schedule-img");

    if (!img) return;

    let area = document.getElementById("schedulePrintArea");

    if (!area) {
        area = document.createElement("div");
        area.id = "schedulePrintArea";
        document.body.appendChild(area);
    }

    area.innerHTML = "";

    const printImg = new Image();

    printImg.alt = "Rozkład";

    printImg.onload = function () {
        document.body.classList.add("printing-schedule");
        window.print();
    };

    area.appendChild(printImg);

    printImg.src = img.src;
}

window.addEventListener("afterprint", function () {
    document.body.classList.remove("printing-schedule");
});
