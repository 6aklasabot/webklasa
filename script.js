const menu=document.querySelector(".menu-btn");const links=document.querySelector(".nav-links");menu.addEventListener("click",()=>links.classList.toggle("open"));document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));function openNewsImage(src) {
    const overlay = document.createElement("div");
    overlay.className = "news-image-overlay";

    overlay.innerHTML = `
        <button class="news-image-close" aria-label="Zamknij">×</button>

        <div class="news-image-controls">
            <button id="zoomOut">−</button>
            <button id="zoomReset">100%</button>
            <button id="zoomIn">+</button>
        </div>

        <div class="news-image-container">
            <img src="${src}" alt="Powiększony obraz" id="newsZoomImage">
        </div>
    `;

    document.body.appendChild(overlay);

    const img = overlay.querySelector("#newsZoomImage");
    const container = overlay.querySelector(".news-image-container");

    let scale = 1;
    let x = 0;
    let y = 0;

    function updateImage() {
        img.style.transform =
            `translate(${x}px, ${y}px) scale(${scale})`;

        overlay.querySelector("#zoomReset").textContent =
            Math.round(scale * 100) + "%";
    }

    function zoom(amount) {
        scale = Math.min(5, Math.max(0.5, scale + amount));
        updateImage();
    }

    overlay.querySelector("#zoomIn").onclick = () => zoom(0.25);
    overlay.querySelector("#zoomOut").onclick = () => zoom(-0.25);

    overlay.querySelector("#zoomReset").onclick = () => {
        scale = 1;
        x = 0;
        y = 0;
        updateImage();
    };

    // wheel
    container.addEventListener("wheel", (e) => {
        e.preventDefault();
        zoom(e.deltaY < 0 ? 0.25 : -0.25);
    }, { passive: false });

    // 2x click reset
    img.addEventListener("dblclick", () => {
        scale = 1;
        x = 0;
        y = 0;
        updateImage();
    });

    // drag
    let dragging = false;
    let startX = 0;
    let startY = 0;

    img.addEventListener("mousedown", (e) => {
        if (scale <= 1) return;

        dragging = true;
        startX = e.clientX - x;
        startY = e.clientY - y;
        img.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragging) return;

        x = e.clientX - startX;
        y = e.clientY - startY;

        updateImage();
    });

    document.addEventListener("mouseup", () => {
        dragging = false;
        img.style.cursor = "grab";
    });

    // X
    overlay.querySelector(".news-image-close").onclick = () => {
        overlay.remove();
    };

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // ESC
    function closeOnEscape(e) {
        if (e.key === "Escape") {
            overlay.remove();
            document.removeEventListener("keydown", closeOnEscape);
        }
    }

    document.addEventListener("keydown", closeOnEscape);

    updateImage();
}
