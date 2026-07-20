async function loadHistory() {

    const token =
        localStorage.getItem("token");

    try {

        const response =
            await fetch(
                "http://localhost:5000/api/history",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!data.success) {
            return;
        }

        let html = "";

        data.history.forEach(item => {

            html += `
            <tr>
                <td>${item.id}</td>
                <td>${item.type}</td>
                <td>${item.amount} ETB</td>
                <td>${item.status}</td>
                <td>${item.created_at}</td>
            </tr>
            `;

        });

        document.getElementById(
            "historyTable"
        ).innerHTML = html;

    } catch (error) {

        console.log(error);

    }

}

loadHistory();