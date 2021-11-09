//stock Market stuff
const express = require ('express');
const app = express();
app.use(express.json());
const cookieParser = require("cookie-parser");
var exphbs = require('express-handlebars');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
var stockTicker = 'fb'
var apiString = "https://cloud.iexapis.com/";
var apiDataType = "stable/stock/";
var mongo = require('mongodb');
var passport = require('passport');
const mongoose = require('mongoose');
const PortfolioModel = require("./Schema&Models/stockModel");
var jwt = require('jsonwebtoken');

app.use(bodyParser.urlencoded({extended: false}));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use(express.json());
app.use(cookieParser());

const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = "125985736764-sjockqskggvontg0ad5t3je755tebjo0.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

//string to connect to mongoDB
if (process.env.MONGODB_URI){
	console.log("what");
	console.log(process.env.MONGODB_URI + "Hey");
	const uri = process.env.MONGODB_URI;
}
else{
	console.log("what2");
	uri = "mongodb+srv://MLStock:12345@nodeapp.fnwmx.mongodb.net/MLStock-db?retryWrites=true&w=majority";
}
uri = "mongodb+srv://MLStock:12345@nodeapp.fnwmx.mongodb.net/MLStock-db?retryWrites=true&w=majority"
//const uri = "mongodb+srv://MLStock:12345@nodeapp.fnwmx.mongodb.net/MLStock-db?retryWrites=true&w=majority";
//const client = new mongo.MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
//heroku config:set MONGODB_URI="mongodb+srv://MLStock:12345@nodeapp.fnwmx.mongodb.net/MLStock-db?retryWrites=true&w=majority"

mongoose.connect(uri,  { useNewUrlParser: true, useUnifiedTopology: true })
	.then((result) => startApp())
	.catch((err) => console.log("Error! ", err));

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
var callBackURL = "http://localhost:5000";
passport.use(new GoogleStrategy({
    clientID: "125985736764-sjockqskggvontg0ad5t3je755tebjo0.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: callBackURL
  },
  function(accessToken, refreshToken, profile, done) {
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });
  }
));

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] 
}));

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.post('/login', (req, res)=> {
	let token = req.body.token;
	//console.log(token);
	console.log("app.post /login's ClientID: ", CLIENT_ID);
		async function verify() {
	  		const ticket = await client.verifyIdToken({
	    	idToken: token,
	    	audience: CLIENT_ID 
	    	// Specify the CLIENT_ID of the app that accesses the backend
	      // Or, if multiple clients access the backend:
	      //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
	  		});
	  	const payload = ticket.getPayload();
	  	const userid = payload['sub'];
	  	//console.log(payload);
		}
	verify().then(()=>{
		res.cookie("session-token", token); 
		res.send('success'); 
		res.redirect('/portfolios.html');
	})
		.catch(console.error);
});
function checkAuthenticated(req, res, next){
	let token = req.cookies['session-token'];
	let user = {};
	async function verify() {
	  	const ticket = await client.verifyIdToken({
	    	idToken: token,
	    	audience: CLIENT_ID 
	  		});
	  	const payload = ticket.getPayload();
	  	const userid = payload['sub'];
	  	user.name = payload.name;
	  	user.email = payload.email;
	  	user.picture = payload.picture;
	  	console.log(payload);

		verify().then(()=>{
			req.user = user;
			next();
		})
		.catch(err =>{
			res.redirect('/login');
		});
	};
}
app.post('/logout', (req, res)=> {
	res.clearCookie('session-token');
	res.redirect('/login');
});

app.get('/add-Portfolio',  (req, res)=>{
	const data = new PortfolioModel({
		userId: "dev",
		portfolioID: 1,
		portfolioName: "Test2"
	});
	data.save()
		.then((result) => {
			res.send(result)
		})
		.catch((err) => {
			console.log(err);
		});
});

app.get('/all-Portfolios',  (req, res) =>{
	let user = req.user;
	PortfolioModel.find()
		.then((result) =>{
			res.send(result);
		})
		.catch((err) =>{
			console.log(err);
		});
})

app.get('/one-Portfolio', (req, res) =>{
	PortfolioModel.findById("6176906ca6ece51f2356f882")
		.then((result) =>{
			res.send(result);
		})
		.catch((err) =>{
			console.log(err);
		});
})
//res.redirect('/onePorfolio')
const lookupFields = [
	"latestPrice",
	"change",
	"changePercent",
	"avgTotalVolume",
	"week52High",
	"week52Low"
];	
function getPickedFields(fields, stocks){
	var selectedFields = {};
	for (var i = 0; i < fields.length; i++){
		if (stocks[fields[i]]){
		selectedFields[fields[i]] = stocks[fields[i]];
		}
	}
	//console.log(selectedFields);
	return selectedFields;
}
//bodyParser middle where?


function callApi(finishedApi, ticker, apiDataType){
request(apiString + apiDataType + ticker +"/quote?token=pk_5c761d09edfb4beabe74c628ef368295", {json: true}, (err, res, body) => {
	if (err) { return console.log(err); }
	if(res.statusCode === 200){ 
		//console.log(body);
		return finishedApi(body);
	}
});
}
//Express Middle Where???


//HandleBar Routes2

app.get('/', function (req, res) {
	callApi(function(doneApi, ticker, apiDataType) {
		res.render('home', {
    	stock: doneApi,
    	lookupFields: getPickedFields(lookupFields, doneApi)
    	});
	}, 'aapl', apiDataType);
});

app.post('/',  function (req, res) {
	
	callApi(function(doneApi) {
		//posted = req.body.stock_ticker;
		res.render('home', {
    	stock: doneApi,
    	lookupFields: getPickedFields(lookupFields, doneApi)
    	});
	}, req.body.stock_ticker, apiDataType);
});
//api key pk_5c761d09edfb4beabe74c628ef368295 

app.get('/about.html',  function (req, res) {
    res.render('about', {
    	about: "COMP4905 Thesis Project"
    });
});

app.get('/login', function (req, res) {
    res.render('login', {
    	email: "UserEmail"
    });
});

app.get('/privacy.html',  function (req, res) {
    res.render('privacy', {
    	email: "UserEmail"
    });
});

app.get('/terms.html',  function (req, res) {
    res.render('terms', {
    	email: "UserEmail"
    });
});

app.get('/machineLearning.html',  function (req, res) {
    res.render('machineLearning', {
    	email: "UserEmail",
    	portfolioArray: {
            "StockName": { "amountOwned": 1 },
            "StockName2": {"amountOwned": 2 }}
    });
});

app.get('/portfolio.html',  function (req, res) {
    res.render('portfolio', {
        title: "UserFromDataBase portfolio's",
        portfolioArray: {
            "StockName": { "amountOwned": 1 },
            "StockName2": {"amountOwned": 2 }}
    });
});

app.get('/portfolio.json', function (req, res) {
    console.log((path.normalize(__dirname + '/portfolio.json')));
    res.sendFile(path.normalize(__dirname + '/portfolio.json'))
});

const PORT = process.env.PORT || 5000;

function startApp(){
	app.use(express.static(path.join(__dirname, 'public')));
	app.listen(PORT, () => console.log("Server listening on ", PORT));
	console.log((path.normalize(__dirname + '/portfolio.json')));
}