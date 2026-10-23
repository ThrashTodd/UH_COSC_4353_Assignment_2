(() => {
    const API = "http://127.0.0.1:8000";
    const grid = document.getElementById("dashboardServiceGrid");

    if (!grid) return;

    async function api(path) {
        const response = await fetch(API + path);

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        return response.json();
    }

    // Create one service card.
    function createServiceCard(service, queue) {
        const card = document.createElement("article");
        card.className = "service-card";

        const title = document.createElement("h4");
        title.textContent = service.name;

        const description = document.createElement("p");
        description.textContent = service.description;

        const meta = document.createElement("div");
        meta.className = "service-meta";

        const people = document.createElement("span");
        people.textContent = `${queue.waiting_count} waiting`;

        const wait = document.createElement("strong");
        const estimatedWait = queue.waiting_count * service.duration;
        wait.textContent = `~${estimatedWait} min`;

        meta.append(people, wait);

        const button = document.createElement("a");
        button.className = "btn btn-outline";
        button.textContent = "Join Queue";
        button.href =
            `join-queue.html?service=${encodeURIComponent(service.id)}`;

        card.append(title, description, meta, button);

        return card;
    }

    async function loadDashboardServices() {
        try {
            const services = await api("/services");
            const openServices = services.filter(service => service.isOpen);

            if (!openServices.length) {
                grid.textContent = "No services are currently available.";
                return;
            }

            const cards = await Promise.all(
                openServices.map(async service => {
                    const queue = await api(
                        `/queues/${encodeURIComponent(service.id)}`
                    );

                    return createServiceCard(service, queue);
                })
            );

            grid.replaceChildren(...cards);

        } catch (error) {
            console.error("Unable to load dashboard services:", error);
            grid.textContent = "Unable to load services. Check the backend connection.";
        }
    }

    loadDashboardServices();

    setInterval(loadDashboardServices, 10000);

    window.addEventListener("focus", loadDashboardServices);
})();
