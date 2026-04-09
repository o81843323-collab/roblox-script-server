const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

let validKeys = ["KEY123"];
let blacklist = [];

app.get("/getscript", (req, res) => {
    const key = req.query.key;

    if (!key) return res.send("INVALID_KEY");

    if (blacklist.includes(key)) {
        return res.send("BLACKLISTED");
    }

    if (!validKeys.includes(key)) {
        return res.send("INVALID_KEY");
    }

    res.send(`
        print("🔥 Script läuft ONLINE!")
    `);
});

app.listen(PORT, () => {
    console.log("Server läuft");
});
