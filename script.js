const menu = document.querySelector(".menu-btn");
const links = document.querySelector(".nav-links");

menu.addEventListener("click", () => links.classList.toggle("open"));

document.querySelectorAll(".nav-links a").forEach(a =>
a.addEventListener("click", () => links.classList.remove("open"))
);

function openNewsImage(src) {
const overlay = document.createElement("div");
overlay.className = "news-image-overlay";

```
overlay.innerHTML = `
    <button class="news-image-close">×</button>

    <div class="news-image-controls">
        <button class="zoom-out">−</button>
        <span class="zoom-level">100%</span>
        <button class="zoom-in">+</button>
    </div>

    <img class="news-zoom-image" src="${src}" alt="Powiększony obraz">
`;

document.body.appendChild(overlay);

const img = overlay.querySelector(".news-zoom-image");
const zoomLevel = overlay.querySelector(".zoom-level");

let zoom = 1;
let posX = 0;
let posY = 0;

function update() {
    img.style.transform =
        `translate(${posX}px, ${posY}px) scale(${zoom})`;

    zoomLevel.textContent = Math.round(zoom * 100) + "%";
}

// zoom in
overlay.querySelector(".zoom-in").onclick = () => {
    zoom = Math.min(5, zoom + 0.25);
    update();
};

// zoom out
overlay.querySelector(".zoom-out").onclick = () => {
    zoom = Math.max(0.5, zoom - 0.25);
    update();
};

// reset
zoomLevel.onclick = () => {
    zoom = 1;
    posX = 0;
    posY = 0;
    update();
};

// mouse wheel
overlay.addEventListener("wheel", (e) => {
    e.preventDefault();

    zoom += e.deltaY < 0 ? 0.25 : -0.25;
    zoom = Math.max(0.5, Math.min(5, zoom));

    update();
}, { passive: false });

// drag
let dragging = false;
let startX;
let startY;

img.addEventListener("mousedown", (e) => {
    if (zoom <= 1) return;

    dragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
    img.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    posX = e.clientX - startX;
    posY = e.clientY - startY;

    update();
});

document.addEventListener("mouseup", () => {
    dragging = false;
    img.style.cursor = "grab";
});

// 2x click reset
img.addEventListener("dblclick", () => {
    zoom = 1;
    posX = 0;
    posY = 0;
    update();
});

// close button
overlay.querySelector(".news-image-close").onclick = () => {
    overlay.remove();
};

// close by clicking outside image
overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.remove();
    }
});

// esc
document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", esc);
    }
});

update();
```

}

/* =========================================================
funkcja dla rozklada == zoom
========================================================= */

function openScheduleImage(src) {

```
const overlay = document.createElement("div");
overlay.className = "schedule-image-overlay";

overlay.innerHTML = `
    <button class="schedule-image-close">×</button>

    <div class="schedule-image-controls">
        <button class="schedule-zoom-out">−</button>
        <span class="schedule-zoom-level">100%</span>
        <button class="schedule-zoom-in">+</button>
        <button class="schedule-zoom-reset">↻</button>
    </div>

    <img
        class="schedule-zoom-image"
        src="${src}"
        alt="Powiększony rozkład"
        draggable="false"
    >
`;

document.body.appendChild(overlay);

const img = overlay.querySelector(".schedule-zoom-image");
const zoomLevel = overlay.querySelector(".schedule-zoom-level");

let zoom = 1;
let posX = 0;
let posY = 0;

let dragging = false;
let startX = 0;
let startY = 0;

let lastTouchDistance = null;


/* upd */

function update() {

    img.style.transform =
        `translate(${posX}px, ${posY}px) scale(${zoom})`;

    zoomLevel.textContent =
        Math.round(zoom * 100) + "%";
}


/* zoomin */

overlay.querySelector(".schedule-zoom-in").onclick = () => {

    zoom = Math.min(5, zoom + 0.25);

    update();
};


/* zoom out */

overlay.querySelector(".schedule-zoom-out").onclick = () => {

    zoom = Math.max(0.5, zoom - 0.25);

    update();
};


/* reset */

overlay.querySelector(".schedule-zoom-reset").onclick = () => {

    zoom = 1;
    posX = 0;
    posY = 0;

    update();
};


/* procent = reset */

zoomLevel.onclick = () => {

    zoom = 1;
    posX = 0;
    posY = 0;

    update();
};


/* =====================================================
   komp kalosiko
   ===================================================== */

overlay.addEventListener("wheel", (e) => {

    e.preventDefault();

    zoom += e.deltaY < 0 ? 0.25 : -0.25;

    zoom = Math.max(
        0.5,
        Math.min(5, zoom)
    );

    update();

}, { passive: false });


/* =====================================================
   komp drag
   ===================================================== */

img.addEventListener("mousedown", (e) => {

    if (zoom <= 1) return;

    e.preventDefault();

    dragging = true;

    startX = e.clientX - posX;
    startY = e.clientY - posY;

    img.style.cursor = "grabbing";
});


document.addEventListener("mousemove", (e) => {

    if (!dragging) return;

    posX = e.clientX - startX;
    posY = e.clientY - startY;

    update();
});


document.addEventListener("mouseup", () => {

    dragging = false;

    img.style.cursor = "grab";
});


/* =====================================================
   2x click reset
   ===================================================== */

img.addEventListener("dblclick", () => {

    zoom = 1;
    posX = 0;
    posY = 0;

    update();
});


/* =====================================================
   dwa palca telefon
   ===================================================== */

function getTouchDistance(touches) {

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


/* =====================================================
   klik telefon
   ===================================================== */

img.addEventListener("touchstart", (e) => {

    e.preventDefault();


    /* Two fingers = pinch */

    if (e.touches.length === 2) {

        lastTouchDistance =
            getTouchDistance(e.touches);

        dragging = false;

        return;
    }


    /* One finger = drag */

    if (e.touches.length === 1 && zoom > 1) {

        dragging = true;

        startX =
            e.touches[0].clientX - posX;

        startY =
            e.touches[0].clientY - posY;
    }

}, { passive: false });


/* =====================================================
   klik ruchac
   ===================================================== */

img.addEventListener("touchmove", (e) => {

    e.preventDefault();


    /* dwa palca zoom */

    if (e.touches.length === 2) {

        const distance =
            getTouchDistance(e.touches);

        if (lastTouchDistance !== null) {

            const difference =
                distance - lastTouchDistance;

            zoom += difference * 0.005;

            zoom = Math.max(
                0.5,
                Math.min(5, zoom)
            );

            update();
        }

        lastTouchDistance = distance;

        return;
    }


    /* One finger = MOVE */

    if (
        e.touches.length === 1 &&
        dragging &&
        zoom > 1
    ) {

        posX =
            e.touches[0].clientX - startX;

        posY =
            e.touches[0].clientY - startY;

        update();
    }

}, { passive: false });


/* =====================================================
   telefon touch end
   ===================================================== */

img.addEventListener("touchend", (e) => {

    if (e.touches.length < 2) {

        lastTouchDistance = null;
    }

    if (e.touches.length === 0) {

        dragging = false;
    }

});


/* =====================================================
   zakryc
   ===================================================== */

overlay.querySelector(".schedule-image-close").onclick = () => {

    overlay.remove();

    document.body.style.overflow = "";
};


/* =====================================================
   klik po bg zakryc
   ===================================================== */

overlay.addEventListener("click", (e) => {

    if (e.target === overlay) {

        overlay.remove();

        document.body.style.overflow = "";
    }
});


/* =====================================================
   ESC = CLOSE
   ===================================================== */

document.addEventListener("keydown", function esc(e) {

    if (e.key === "Escape") {

        overlay.remove();

        document.body.style.overflow = "";

        document.removeEventListener(
            "keydown",
            esc
        );
    }
});


/* Prevent page scrolling */

document.body.style.overflow = "hidden";


update();
```

}
