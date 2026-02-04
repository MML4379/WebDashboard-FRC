const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 5810;

app.use(cors()); // CORS header
app.use(express.json()); // JSON

function randNum() {
    for (let i = 0; i < 128; i++) {
        return Math.round(Math.floor(Math.random(i) * 1000));
    }
}

app.use(express.static(path.join(__dirname, "public")));

// Random values until we have access to our RoboRIO
app.get('/api/status', (req, res) => {
    let rx = randNum();
    let a = randNum();

    let status = {
        randomNumber: {
            title: "Random Number",
            data: rx
        },
        otherData: {
            title: "Other Data",
            data: a
        }
    };

    res.status(200).json(status);
});

app.get("*Dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}.`);
});