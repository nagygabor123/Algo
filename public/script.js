let countdownInterval;
let lastUpdateTime;
let selectedETF = 'SPXL'; // Set SPXL as default
let chart;
const correctCode = "1234"; // Change this to your desired access code

// Validate access code
function validateCode() {
    const enteredCode = document.getElementById('access-code').value;
    if (enteredCode === correctCode) {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        fetchData(); // Fetch data after showing the main content
        loadChart('1y', 'SPXL'); // Load SPXL chart by default
    } else {
        document.getElementById('error-message').style.display = 'block';
    }
}

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
            row.addEventListener('click', () => loadChart('1y', etf)); // Add click event to each ETF

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

// Function to load chart data
async function loadChart(period, etf = selectedETF) {
    if (!etf) return;

    selectedETF = etf;
    const chartContainer = document.getElementById('chart-container');
    chartContainer.style.display = 'block'; // Show the chart container

    try {
        const response = await fetch(`/chart-data?etf=${etf}&period=${period}`);
        const result = await response.json();
        const labels = result.dates;
        const prices = result.prices;

        if (chart) {
            chart.destroy(); // Destroy the old chart before creating a new one
        }

        const ctx = document.getElementById('etf-chart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${etf} Price`,
                    data: prices,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.2)',
                    fill: true,
                    pointRadius: 0, // Disable circles on the chart
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price',
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
    }
}


