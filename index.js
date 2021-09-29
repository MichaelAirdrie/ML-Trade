//stock Market stuff
const express = require ('express');
const app = express();
var exphbs  = require('express-handlebars');
const path = require('path');

//Express Middle Where???
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const hey = "hey whats up hello!"

//HandleBar Routes
app.get('/', function (req, res) {
    res.render('home', {
    	stuff: "this is stuff...",
    	hello: hey
    });
});

const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log("Server listening on ", PORT));

