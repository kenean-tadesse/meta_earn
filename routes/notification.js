async function loadNotifications() {

    const token = localStorage.getItem("token");

    try {

        const response = await fetch(
            "https://meta-earn-14.onrender.com/api/notifications",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!data.success) {
            return;
        }

        let html = "";

        data.notifications.forEach(item => {

            html += `
            <div class="notification ${item.type}">
                <div class="title">${item.title}</div>
                <div class="message">${item.message}</div>
                <div class="time">${item.created_at}</div>
            </div>
            `;

        });

        document.getElementById(
            "notifications"
        ).innerHTML = html;

    } catch (error) {

        console.log(error);

    }

}

loadNotifications();