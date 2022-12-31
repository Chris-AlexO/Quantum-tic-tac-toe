//imports
const express = require('./node_modules/express');
const app = express()
const port = 3000;

app.use(express.static('public'));
//app.use('/js', express.static(__dirname + "public/js"))
app.use('/js', express.static(__dirname + "public/js/drawGame.js"))
app.use('/js', express.static(__dirname + "public/js/canvas.js"))
app.use('/js', express.static(__dirname + "public/js/gameLogicjs"))
app.use('/js', express.static(__dirname + "public/js/atom.js"))
app.use('/js', express.static(__dirname + "public/js/placeOnBoard.js"))
app.use('/css', express.static(__dirname + "public/css/style.css"))

app.get("/", (req,res) => {
    res.sendFile(__dirname + "/views/index.html");
})
app.get("/local", (req, res) => {
    res.sendFile(__dirname + "/views/QTTTweb.html");
})

app.listen(port, ()=>console.info("listening on port"))