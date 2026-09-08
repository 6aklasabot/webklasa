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

    scheduleZoomImage.style.transform =
        `translate(${schedulePosX}px, ${schedulePosY}px) scale(${scheduleZoom})`;

    scheduleZoomLevel.textContent =
        Math.round(scheduleZoom * 100) + "%";
}


/* OPEN */

function openScheduleImage(src) {

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

    event.stopPropagation();

    scheduleZoom = Math.min(
        5,
        scheduleZoom + 0.25
    );

    updateScheduleZoom();
}


/* MINUS */

function scheduleZoomOut(event) {

    event.stopPropagation();

    scheduleZoom = Math.max(
        0.5,
        scheduleZoom - 0.25
    );

    updateScheduleZoom();
}


/* RESET */

function scheduleZoomReset(event) {

    event.stopPropagation();

    scheduleZoom = 1;
    schedulePosX = 0;
    schedulePosY = 0;

    updateScheduleZoom();
}


/* RESET BY CLICKING PERCENTAGE */

scheduleZoomLevel.onclick = function(event) {

    event.stopPropagation();

    scheduleZoom = 1;
    schedulePosX = 0;
    schedulePosY = 0;

    updateScheduleZoom();
};


/* =========================
   MOUSE WHEEL
   ========================= */

scheduleOverlay.addEventListener("wheel", function(event) {

    event.preventDefault();

    if (event.deltaY < 0) {
        scheduleZoom += 0.25;
    } else {
        scheduleZoom -= 0.25;
    }

    scheduleZoom = Math.max(
        0.5,
        Math.min(5, scheduleZoom)
    );

    updateScheduleZoom();

}, { passive: false });


/* =========================
   PC DRAG
   ========================= */

scheduleZoomImage.addEventListener("mousedown", function(event) {

    if (scheduleZoom <= 1) return;

    event.preventDefault();

    scheduleDragging = true;

    scheduleStartX =
        event.clientX - schedulePosX;

    scheduleStartY =
        event.clientY - schedulePosY;

    scheduleZoomImage.style.cursor = "grabbing";
});


document.addEventListener("mousemove", function(event) {

    if (!scheduleDragging) return;

    schedulePosX =
        event.clientX - scheduleStartX;

    schedulePosY =
        event.clientY - scheduleStartY;

    updateScheduleZoom();
});


document.addEventListener("mouseup", function() {

    scheduleDragging = false;

    scheduleZoomImage.style.cursor = "grab";
});


/* =========================
   DOUBLE CLICK RESET
   ========================= */

scheduleZoomImage.addEventListener("dblclick", function() {

    scheduleZoom = 1;
    schedulePosX = 0;
    schedulePosY = 0;

    updateScheduleZoom();
});


/* =========================
   PHONE PINCH
   ========================= */

function getScheduleTouchDistance(touches) {

    const dx =
        touches[0].clientX -
        touches[1].clientX;

    const dy =
        touches[0].clientY -
        touches[1].clientY;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}


scheduleZoomImage.addEventListener("touchstart", function(event) {

    event.preventDefault();

    if (event.touches.length === 2) {

        scheduleLastDistance =
            getScheduleTouchDistance(event.touches);

        scheduleDragging = false;

    } else if (
        event.touches.length === 1 &&
        scheduleZoom > 1
    ) {

        scheduleDragging = true;

        scheduleStartX =
            event.touches[0].clientX - schedulePosX;

        scheduleStartY =
            event.touches[0].clientY - schedulePosY;
    }

}, { passive: false });


scheduleZoomImage.addEventListener("touchmove", function(event) {

    event.preventDefault();


    /* PINCH */

    if (event.touches.length === 2) {

        const distance =
            getScheduleTouchDistance(event.touches);

        if (scheduleLastDistance !== null) {

            const difference =
                distance - scheduleLastDistance;

            scheduleZoom += difference * 0.005;

            scheduleZoom = Math.max(
                0.5,
                Math.min(5, scheduleZoom)
            );

            updateScheduleZoom();
        }

        scheduleLastDistance = distance;

        return;
    }


    /* DRAG */

    if (
        event.touches.length === 1 &&
        scheduleDragging
    ) {

        schedulePosX =
            event.touches[0].clientX - scheduleStartX;

        schedulePosY =
            event.touches[0].clientY - scheduleStartY;

        updateScheduleZoom();
    }

}, { passive: false });


scheduleZoomImage.addEventListener("touchend", function(event) {

    if (event.touches.length < 2) {
        scheduleLastDistance = null;
    }

    if (event.touches.length === 0) {
        scheduleDragging = false;
    }

});


/* =========================
   ESC
   ========================= */

document.addEventListener("keydown", function(event) {

    if (
        event.key === "Escape" &&
        scheduleOverlay.classList.contains("active")
    ) {

        scheduleOverlay.classList.remove("active");

        document.body.style.overflow = "";
    }

});
