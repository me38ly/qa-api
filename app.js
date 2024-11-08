const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const suggestionsCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
const answersCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const app = express();

const allowedOrigins = ['https://ejabati.wuaze.com'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use((err, req, res, next) => {
    if (err) {
        res.status(500).json({ status: 'fail', message: 'حدث خطأ! يرجى المحاولة مجددًا أو التواصل مع الدعم.' });
    } else {
        next();
    }
});

async function fetchAnswer(queryText) {
    const headers = {
        'Host': 'fast-answer.mixksa.com',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryGr1B5V5PR3qKv7gD',
    };
    const data = `------WebKitFormBoundaryGr1B5V5PR3qKv7gD\nContent-Disposition: form-data; name="query"\n\n${queryText}\n------WebKitFormBoundaryGr1B5V5PR3qKv7gD--\n;`

    const response = await axios.post('https://fast-answer.mixksa.com/search', data, { headers });
    return response.data;
}

async function fetchAutocomplete(query) {
    const url = `https://fast-answer.mixksa.com/autocomplete?query=${encodeURIComponent(query)};`
    const response = await axios.get(url);
    return response.data;
}

app.get('/suggestions', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ status: 'fail', message: 'الرجاء توفير استعلام للبحث!!' });
    }

    if (suggestionsCache.has(query)) {
        return res.json({ status: 'ok', results: suggestionsCache.get(query) });
    } else {
        try {
            const results = await fetchAutocomplete(query);
            suggestionsCache.set(query, results);
            res.json({ status: 'ok', results });
        } catch (error) {
            res.status(500).json({ status: 'fail', message: 'حدث خطأ أثناء جلب البيانات.' });
        }
    }
});

app.get('/answer', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ status: 'fail', message: 'الرجاء توفير استعلام للبحث!' });
    }

    if (answersCache.has(query)) {
        return res.json({ status: 'ok', results: answersCache.get(query) });
    } else {
        try {
            const results = await fetchAnswer(query);
            const question = results.results.matches[0].question;
            const answer = results.results.matches[0].answer;
            const data = { question, answer };
            answersCache.set(query, data);
            res.json({ status: 'ok', results: data });
        } catch (error) {
            res.status(500).json({ status: 'fail', message: 'حدث خطأ أثناء جلب البيانات.' });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});