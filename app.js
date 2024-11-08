import axios from 'axios';
import NodeCache from 'node-cache';

const suggestionsCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
const answersCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

async function fetchAutocomplete(query) {
    const url = `https://fast-answer.mixksa.com/autocomplete?query=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    return response.data;
}

async function fetchAnswer(queryText) {
    const headers = {
        'Host': 'fast-answer.mixksa.com',
        'User -Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryGr1B5V5PR3qKv7gD',
    };
    const data = `------WebKitFormBoundaryGr1B5V5PR3qKv7gD\nContent-Disposition: form-data; name="query"\n\n${queryText}\n------WebKitFormBoundaryGr1B5V5PR3qKv7gD--\n;`;

    const response = await axios.post('https://fast-answer.mixksa.com/search', data, { headers });
    return response.data;
}

export default async function handler(req, res) {
    const { type, query } = req.query;

    if (!query) {
        return res.status(400).json({ status: 'fail', message: 'الرجاء توفير استعلام للبحث!' });
    }

    if (type === 'suggestions') {
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
    } else if (type === 'answer') {
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
    } else {
        res.status(400).json({ status: 'fail', message: 'الرجاء تحديد نوع الاستعلام (suggestions أو answer).' });
    }
}
