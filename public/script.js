let countdownInterval;
let lastUpdateTime;

async function fetchData() {
    try {
        const response = await fetch('/data');
        const result = await response.json();
        const data = result.data;
        lastUpdateTime = result.lastUpdateTime;

        const tableBody = document.getElementById('etf-table-body');
        tableBody.innerHTML = ''; // Clear existing data

        for (const [etf, info] of Object.entries(data)) {
            const row = document.createElement('tr');
            let signalClass = '';
            switch (info.signal) {
                case 'Buy':
                    signalClass = 'signal-buy';
                    break;
                case 'Breakout Buy':
                    signalClass = 'signal-breakout-buy';
                    break;
                case 'Sell':
                    signalClass = 'signal-sell';
                    break;
                case 'Breakout Sell':
                    signalClass = 'signal-breakout-sell';
                    break;
                case 'Hold':
                    signalClass = 'signal-hold';
                    break;
                default:
                    signalClass = '';
            }
            row.innerHTML = `
                <td>${etf}</td>
                <td>${info.price.toFixed(2)}</td>
                <td class="${signalClass}">${info.signal}</td>
            `;
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function updateCountdown() {
    const countdownElem = document.getElementById('countdown');
    const now = new Date();
    const lastUpdateDate = new Date(lastUpdateTime);
    const secondsSinceLastUpdate = Math.floor((now - lastUpdateDate) / 1000);
    const remainingTime = Math.max(60 - secondsSinceLastUpdate, 0);

    countdownElem.innerText = remainingTime;

    if (remainingTime <= 0) {
        fetchData(); // Fetch new data when countdown reaches zero
    }
}

countdownInterval = setInterval(updateCountdown, 1000); // Update countdown every second
fetchData(); // Initial data fetch
