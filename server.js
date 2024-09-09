const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const ti = require('technicalindicators');
const helmet = require('helmet');
const path = require('path');
const moment = require('moment-timezone');

const app = express();
const port = 3000;

let etfData = {
  SPXL: { price: 0, signal: '' },
  TQQQ: { price: 0, signal: '' },
  UDOW: { price: 0, signal: '' },
  SOXL: { price: 0, signal: '' },
};

let lastUpdateTime = moment().toISOString(); // Track last update time

app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "http://localhost:3000"],
    scriptSrc: ["'self'", "https://apis.google.com"],
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'"],
    frameSrc: ["'self'"],
    childSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
  }
}));

async function fetchAndAnalyze() {
  for (const etf of Object.keys(etfData)) {
    try {
      const quote = await yahooFinance.quote(etf);
      const price = quote.regularMarketPrice;
      etfData[etf].price = price;

      const chartData = await yahooFinance.chart(etf, { period1: '2023-01-01', interval: '1d' });
      //console.log(`chartData for ${etf}:`, chartData);  // Log the data structure

      // Ensure chartData is in the expected format
      if (chartData && Array.isArray(chartData.quotes)) {
        const closingPrices = chartData.quotes.map(day => day.close);

        const sma50 = ti.sma({ period: 50, values: closingPrices });
        const sma200 = ti.sma({ period: 200, values: closingPrices });
        const rsi = ti.rsi({ period: 14, values: closingPrices });
        const macd = ti.macd({ shortPeriod: 12, longPeriod: 26, signalPeriod: 9, values: closingPrices });

        let signal = 'Hold';
        if (price > sma50[sma50.length - 1] && price > sma200[sma200.length - 1]) {
          signal = 'Buy';
        } else if (price < sma50[sma50.length - 1] && price < sma200[sma200.length - 1]) {
          signal = 'Sell';
        }

        const previousHigh = Math.max(...closingPrices.slice(-60));
        const previousLow = Math.min(...closingPrices.slice(-60));

        if (price > previousHigh) {
          signal = 'Breakout Buy';
        } else if (price < previousLow) {
          signal = 'Breakout Sell';
        }

        etfData[etf].signal = signal;

        const timeInHungary = moment().tz('Europe/Budapest').format('YYYY-MM-DD HH:mm:ss');
        console.log(`${timeInHungary}: ${etf} price: ${price}, SMA50: ${sma50[sma50.length - 1]}, SMA200: ${sma200[sma200.length - 1]}, RSI: ${rsi[rsi.length - 1]}, MACD: ${macd[macd.length - 1].MACD}, Signal: ${macd[macd.length - 1].signal}, Signal: ${etfData[etf].signal}`);
      } else {
        console.error(`Unexpected chartData format for ${etf}`);
      }
    } catch (error) {
      console.error(`Error fetching data for ${etf}:`, error);
    }
  }
  lastUpdateTime = moment().toISOString(); // Update the last update time
}

setInterval(fetchAndAnalyze, 60000);

app.get('/data', (req, res) => {
  res.json({ data: etfData, lastUpdateTime });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
