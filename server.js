const express = require('express');
const yahooFinance = require('yahoo-finance2').default;
const ti = require('technicalindicators');
const helmet = require('helmet');
const path = require('path');
const moment = require('moment-timezone');
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

let etfData = {
  SPXL: { price: 0, signal: '' },
  TQQQ: { price: 0, signal: '' },
  UDOW: { price: 0, signal: '' },
  SOXL: { price: 0, signal: '' },
};

let previousSignals = {
  SPXL: '',
  TQQQ: '',
  UDOW: '',
  SOXL: ''
};

let lastUpdateTime = moment().toISOString(); // Track last update time

app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());

// Nodemailer transporter beállítása
const transporter = nodemailer.createTransport({
  service: 'gmail', // Gmail használata, cserélheted másik szolgáltatóra
  auth: {
    user: 'my.algo0909@gmail.com', // Felhasználónév, cseréld ki a saját email címedre
    pass: 'cqoc rciw saeu avsw ' // Jelszó, cseréld ki a saját email jelszavadra
  }
});

// Send email notification for buy/sell signals
function sendEmail(etf, price, sma50, sma200, rsi, macdSignal, signal, timeInHungary) {
  const mailOptions = {
    from: 'my.algo0909@gmail.com',
    to: 'nagy.gabor@diak.szbi-pg.hu', // Címzett email cím
    subject: `Trade Signal Alert for ${etf}`,
    text: `Signal for ${etf} generated at ${timeInHungary}:
    - Price: ${price}
    - SMA50: ${sma50}
    - SMA200: ${sma200}
    - RSI: ${rsi}
    - MACD Signal: ${macdSignal}
    - Signal: ${signal}`
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Function to calculate EMA
function calculateEMA(values, period) {
  const k = 2 / (period + 1);
  let ema = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema[i] = (values[i] * k) + (ema[i - 1] * (1 - k));
  }
  return ema;
}

async function fetchAndAnalyze() {
  for (const etf of Object.keys(etfData)) {
    try {
      const quote = await yahooFinance.quote(etf);
      const price = quote.regularMarketPrice;
      etfData[etf].price = price;

      const chartData = await yahooFinance.chart(etf, { period1: '2023-01-01', interval: '1d' });

      if (chartData && Array.isArray(chartData.quotes)) {
        const closingPrices = chartData.quotes.map(day => day.close);

        const sma50 = ti.sma({ period: 50, values: closingPrices });
        const sma200 = ti.sma({ period: 200, values: closingPrices });
        const rsi = ti.rsi({ period: 14, values: closingPrices });

        const ema12 = calculateEMA(closingPrices, 12);
        const ema26 = calculateEMA(closingPrices, 26);

        if (ema12.length >= 26) {
          const macdLine = ema12.slice(-1)[0] - ema26.slice(-1)[0];
          const signalLine = calculateEMA(ema12.slice(-26), 9).slice(-1)[0];
          const macdHistogram = macdLine - signalLine;

          let macdSignal = 'Hold';
          if (macdLine > signalLine && macdHistogram > 0) {
            macdSignal = 'Buy';
          } else if (macdLine < signalLine && macdHistogram < 0) {
            macdSignal = 'Sell';
          }

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
          console.log(`${timeInHungary}: ${etf} price: ${price}, SMA50: ${sma50[sma50.length - 1]}, SMA200: ${sma200[sma200.length - 1]}, RSI: ${rsi[rsi.length - 1]}, MACD-Signal: ${macdSignal}, Signal: ${etfData[etf].signal}`);

          // Ellenőrizzük, hogy a jelzés változott-e, és ha igen, küldünk emailt
          if (previousSignals[etf] !== signal) {
            sendEmail(etf, price, sma50[sma50.length - 1], sma200[sma200.length - 1], rsi[rsi.length - 1], macdSignal, signal, timeInHungary);
            previousSignals[etf] = signal; // Frissítjük az előző jelet
          }
        } else {
          console.error(`Not enough data for MACD calculation for ${etf}`);
        }
      } else {
        console.error(`Unexpected chartData format for ${etf}`);
      }
    } catch (error) {
      console.error(`Error fetching data for ${etf}:`, error);
    }
  }
  lastUpdateTime = moment().toISOString();
}

setInterval(fetchAndAnalyze, 60000);

app.get('/data', (req, res) => {
  res.json({ data: etfData, lastUpdateTime });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
