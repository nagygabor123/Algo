const etfs = ['SPXL', 'TQQQ', 'UDOW', 'SOXL'];
const priceElements = {
    SPXL: document.getElementById('price-spxl'),
    TQQQ: document.getElementById('price-tqqq'),
    UDOW: document.getElementById('price-udow'),
    SOXL: document.getElementById('price-soxl'),
};
const signalElements = {
    SPXL: document.getElementById('signal-spxl'),
    TQQQ: document.getElementById('signal-tqqq'),
    UDOW: document.getElementById('signal-udow'),
    SOXL: document.getElementById('signal-soxl'),
};
const countdownElement = document.getElementById('countdown');

let refreshInterval = 60; // 60 másodperc

// Mozgóátlag periódusok
const movingAveragePeriods = {
    short: 50,  // Rövid távú mozgóátlag (50 napos SMA)
    long: 200,  // Hosszú távú mozgóátlag (200 napos SMA)
};

// Technikai indikátorok számítása
function calculateSMA(prices, period) {
    if (prices.length < period) return null;
    return (prices.slice(-period).reduce((a, b) => a + b, 0) / period).toFixed(2);
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period) return null;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i < period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;
    const rs = averageGain / averageLoss;
    return (100 - (100 / (1 + rs))).toFixed(2);
}

function calculateMACD(prices, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
    if (prices.length < longPeriod) return null;
    
    const shortEMA = calculateEMA(prices, shortPeriod);
    const longEMA = calculateEMA(prices, longPeriod);
    const macdLine = shortEMA - longEMA;

    const signalLine = calculateEMA(prices.slice(-signalPeriod), signalPeriod);
    const histogram = (macdLine - signalLine).toFixed(2);

    return { macdLine: macdLine.toFixed(2), signalLine: signalLine.toFixed(2), histogram };
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0]; // Kezdeti EMA érték

    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }

    return ema.toFixed(2);
}

// ETF adatok lekérése
async function fetchETFData(symbol) {
    try {
        const response = await axios.get(`/api/etf/${symbol}`);
        const data = response.data;
        const price = parseFloat(data.regularMarketPrice).toFixed(2);
        priceElements[symbol].textContent = `${price} USD`;
        generateTradeSignal(symbol, price);
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
    }
}

// Kereskedési jelzés generálása
function generateTradeSignal(symbol, price) {
    const prices = signalElements[symbol].prices || [];
    prices.push(price);

    // Csak az utolsó 1000 árat tároljuk
    if (prices.length > 1000) {
        prices.shift(); // Legkorábbi ár eltávolítása
    }

    signalElements[symbol].prices = prices;

    let signalText = 'N/A';
    let signalColor = '#ffffff'; // Fehér szín alapértelmezettként

    // Ha elegendő adat áll rendelkezésre a mozgóátlagokhoz és egyéb indikátorokhoz
    if (prices.length >= movingAveragePeriods.long) {
        const SMA_short = calculateSMA(prices, movingAveragePeriods.short);
        const SMA_long = calculateSMA(prices, movingAveragePeriods.long);
        const RSI = calculateRSI(prices);
        const MACD = calculateMACD(prices);

        if (SMA_short && SMA_long && RSI && MACD) {
            signalText = '';

            // SMA alapú jelzés
            if (SMA_short > SMA_long) {
                signalText += 'Long (SMA) ';
                signalColor = '#2ecc71'; // Zöld szín
            } else if (SMA_short < SMA_long) {
                signalText += 'Short (SMA) ';
                signalColor = '#e74c3c'; // Piros szín
            }

            // RSI alapú jelzés
            if (RSI > 70) {
                signalText += 'Overbought (RSI) ';
                signalColor = '#e74c3c'; // Piros szín
            } else if (RSI < 30) {
                signalText += 'Oversold (RSI) ';
                signalColor = '#2ecc71'; // Zöld szín
            }

            // MACD alapú jelzés
            if (MACD.histogram > 0) {
                signalText += 'Bullish (MACD) ';
                signalColor = '#2ecc71'; // Zöld szín
            } else if (MACD.histogram < 0) {
                signalText += 'Bearish (MACD) ';
                signalColor = '#e74c3c'; // Piros szín
            }

            // Breakout stratégia alapú jelzés
            const recentHigh = Math.max(...prices.slice(-10)); // Utolsó 10 árfolyamcsúcs
            const recentLow = Math.min(...prices.slice(-10));  // Utolsó 10 árfolyammélypont
            if (price > recentHigh) {
                signalText += 'Breakout Up (Breakout)';
                signalColor = '#2ecc71'; // Zöld szín
            } else if (price < recentLow) {
                signalText += 'Breakout Down (Breakout)';
                signalColor = '#e74c3c'; // Piros szín
            }

            if (!signalText) {
                signalText = 'N/A';
                signalColor = '#ffffff'; // Fehér szín, ha nincs egyértelmű jelzés
            }
        }
    }

    signalElements[symbol].textContent = signalText;
    signalElements[symbol].style.color = signalColor;
}

// Visszaszámláló frissítése
let countdownTimer;

function startCountdown() {
    let timeLeft = refreshInterval;
    countdownElement.textContent = `${timeLeft}s`;

    countdownTimer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = `${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            fetchAllData();
        }
    }, 1000);
}

function fetchAllData() {
    etfs.forEach(fetchETFData);
    startCountdown();
}

// Kezdő adatlekérés és visszaszámlálás indítása
fetchAllData();
