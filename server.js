const express = require('express');
const yahooFinance = require('yahoo-finance2').default;

const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/api/etf/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const result = await yahooFinance.quote(symbol);
        res.json(result);
    } catch (error) {
        res.status(500).send('Hiba az adatok lekérése során');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
