const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Server läuft");
});

app.get("/getscript", (req, res) => {

    const script = `
print("🔥 Script läuft!")
`;

    res.send(script);
});

app.listen(PORT, () => {
    console.log("Server läuft");
});
