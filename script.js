const menu=document.querySelector(".menu-btn");const links=document.querySelector(".nav-links");menu.addEventListener("click",()=>links.classList.toggle("open"));document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));function openNewsImage(src) {
    const overlay = document.createElement("div");
    overlay.className = "news-image-overlay";

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

    // wyjsc knopka
    overlay.querySelector(".news-image-close").onclick = () => {
        overlay.remove();
    };

    // wyjsc 2
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
}
