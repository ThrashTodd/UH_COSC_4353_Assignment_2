(function () {
    const API = "http://127.0.0.1:8000";

    function getInitials(name) {
        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0].toUpperCase())
            .join("");
    }

    function displayUser(name) {
        document.querySelectorAll("[data-current-username]")
            .forEach(element => {
                element.textContent = name;
            });

        document.querySelectorAll("[data-current-initials]")
            .forEach(element => {
                element.textContent = getInitials(name);
            });
    }

    async function initializePage() {
        console.log("QueueSmart app.js loaded");

        const username = localStorage.getItem("currentUser");
        console.log("Current username:", username);

        if (!username) {
            window.location.replace("index.html");
            return;
        }

        // Display the name immediately.
        displayUser(username);

        const logoutBtn = document.getElementById("logoutBtn");

        if (logoutBtn) {
            logoutBtn.addEventListener("click", function (event) {
                event.preventDefault();

                localStorage.removeItem("currentUser");
                sessionStorage.removeItem("currentUser");

                window.location.replace("index.html");
            });
        } else {
            console.warn("Logout button not found");
        }

        // Sidebar menu.
        const menuBtn = document.getElementById("menuBtn");
        const sidebar = document.getElementById("sidebar");

        menuBtn?.addEventListener("click", function () {
            sidebar?.classList.toggle("open");
        });

        try {
            const response = await fetch(
                `${API}/users/${encodeURIComponent(username)}`
            );

            if (response.status === 404) {
                localStorage.removeItem("currentUser");
                window.location.replace("index.html");
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const user = await response.json();

            if (user.role !== "user") {
                window.location.replace(
                    user.role === "admin"
                        ? "admin.html"
                        : "index.html"
                );
                return;
            }

            displayUser(user.username);

        } catch (error) {
            console.error("Backend account lookup failed:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializePage,
            { once: true }
        );
    } else {
        initializePage();
    }
})();
