const menu=document.querySelector(".menu-btn");const links=document.querySelector(".nav-links");menu.addEventListener("click",()=>links.classList.toggle("open"));document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));function openNewsImage(src) {
    const overlay = document.createElement("div");

    overlay.className = "news-image-overlay";

    overlay.innerHTML = `
        <button class="news-image-close" aria-label="Zamknij">×</button>
        <img src="${src}" alt="Powiększony obraz">
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", function(e) {
        if (e.target === overlay || e.target.classList.contains("news-image-close")) {
            overlay.remove();
        }
    });

    document.addEventListener("keydown", function closeOnEscape(e) {
        if (e.key === "Escape") {
            overlay.remove();
            document.removeEventListener("keydown", closeOnEscape);
        }
    });
}
