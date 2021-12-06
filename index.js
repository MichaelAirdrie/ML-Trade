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
const UserModel = require("./Schema&Models/userModel");
var jwt = require('jsonwebtoken');
const tf = require('@tensorflow/tfjs');

app.use(bodyParser.urlencoded({extended: false}));

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.use(express.json());
app.use(cookieParser());

const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = "125985736764-sjockqskggvontg0ad5t3je755tebjo0.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

var userEmail = "default";

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
	  	userEmail = payload['email'];
	  	const userid = payload['sub'];
	  	//console.log(payload);
		}
	verify().then(()=>{
		res.cookie("session-token", token); 
		res.cookie("session-email", userEmail);
		res.send('success'); 
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

app.post('/add-Portfolio',  (req, res)=>{
	console.log("this is req.body.portfolio: ", req.body.portfolio);
	if (userEmail == "default"){
		userEmail = req.cookies["session-email"]
		const data = new UserModel({
		userId: userEmail,
		portfolioNamesList: [req.body.portfolio]
	});
	data.save()
		.then((result) => {
			console.log("added new user with userEmail: ", userEmail);
		})
		.catch((err) => {
			res.redirect('/login')
			console.log(err);
		});
	}
	if (userEmail != "default"){
	const data2 = new PortfolioModel({
		userId: userEmail,
		portfolioID: 1,
		portfolioName: req.body.portfolio,
		portfolioStocks: []
	});
	
	data2.save()
		.then((result) => {
			res.render('onePortfolio', {
    	portfolioName: req.body.portfolio,
    	portfolioArray: {}
    });
		})
		.catch((err) => {
			res.redirect('/login')
			console.log(err);
		});
		}

});

app.get('/all-Portfolios',  (req, res) =>{
	let user = req.user;
	console.log("we are in /all-Portfolios");
	PortfolioModel.find()
		.then((result) =>{
			res.send(result);
		})
		.catch((err) =>{
			console.log(err);
		});
})

app.get('/one-Portfolio', (req, res) =>{
	console.log("one-Portfolio with name ", req)
	PortfolioModel.find({portfolioName : req.body.portfolio})
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

function callApiSeries(finishedApi, ticker, apiDataType){
	console.log("making request to api \n ", apiString + apiDataType + ticker +"/time-series?token=pk_5c761d09edfb4beabe74c628ef368295");
request(apiString + apiDataType + ticker +"/time-series/2020/?token=pk_5c761d09edfb4beabe74c628ef368295", {json: true}, (err, res, body) => {
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
    	email: userEmail
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

app.post('/machineLearning.html',  function (req, res) {
	console.log("we are expecting a time series");
	callApiSeries(function(doneApi) {
		tensorFlowML(doneApi, ["open", "close"], "MA");
		//posted = req.body.stock_ticker;
		res.render('machineLearning', {
    	series: doneApi
    	});
	}, req.body.stock_ticker, apiDataType);
});
//The label for all of these algorithms will be a binary choice to either buy or sell a stock.
//The features should vary depending on what the user is trying to test
//The final decision to buy or sell should be a a choice based on what each of these different TA algorithms suggest.
//need to make a function that takes in a tensor and gives a regression line for Technical Analysis.
//need to make a function that calculates points of support and resistance for Technical Analysis. 

function calculateItemsSum(data, start, stop) { //https://dirask.com/posts/JavaScript-moving-average-DZPeaj
	let sum = 0;
  	for (var j = start; j < stop; ++j) {
      	sum += data[j];
    }
  	return sum;
};

function caculateMovingAverage(data, window) { //https://dirask.com/posts/JavaScript-moving-average-DZPeaj
    const steps = data.length - window;
	const result = [ ];
    for (let i = 0; i < steps; ++i) {
        const sum = calculateItemsSum(data, i, i + window);
        result.push(sum / window);
    }
  	return result;
};

function tensorFlowML(data, features, alg){ //data is what is returned from the Time Series API call. // features is what columns we are evaluating
	data = [{"close":2987.03,"high":3020.6899,"low":2982.4,"open":3000,"symbol":"GOOG","volume":919407,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-08","updated":1636423565000,"changeOverTime":0,"marketChangeOverTime":0,"uOpen":3000,"uClose":2987.03,"uHigh":3020.6899,"uLow":2982.4,"uVolume":919407,"fOpen":3000,"fClose":2987.03,"fHigh":3020.6899,"fLow":2982.4,"fVolume":919407,"label":"Nov 8, 21","change":0,"changePercent":0},{"close":2984.97,"high":3007.57,"low":2950.14,"open":2994.92,"symbol":"GOOG","volume":843778,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-09","updated":1636529833000,"changeOverTime":-0.0006896482459166463,"marketChangeOverTime":-0.0006896482459166463,"uOpen":2994.92,"uClose":2984.97,"uHigh":3007.57,"uLow":2950.14,"uVolume":843778,"fOpen":2994.92,"fClose":2984.97,"fHigh":3007.57,"fLow":2950.14,"fVolume":843778,"label":"Nov 9, 21","change":-2.0600000000004,"changePercent":-0.0007},{"close":2932.52,"high":2973.9999,"low":2906.5,"open":2960.195,"symbol":"GOOG","volume":1135416,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-10","updated":1636596413000,"changeOverTime":-0.018248896060635553,"marketChangeOverTime":-0.018248896060635553,"uOpen":2960.195,"uClose":2932.52,"uHigh":2973.9999,"uLow":2906.5,"uVolume":1135416,"fOpen":2960.195,"fClose":2932.52,"fHigh":2973.9999,"fLow":2906.5,"fVolume":1135416,"label":"Nov 10, 21","change":-52.44999999999982,"changePercent":-0.0176},{"close":2934.96,"high":2970.045,"low":2933.89,"open":2942.14,"symbol":"GOOG","volume":623155,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-11","updated":1636684784000,"changeOverTime":-0.01743203114799656,"marketChangeOverTime":-0.01743203114799656,"uOpen":2942.14,"uClose":2934.96,"uHigh":2970.045,"uLow":2933.89,"uVolume":623155,"fOpen":2942.14,"fClose":2934.96,"fHigh":2970.045,"fLow":2933.89,"fVolume":623155,"label":"Nov 11, 21","change":2.4400000000000546,"changePercent":0.0008},{"close":2992.91,"high":2997.19,"low":2929.08,"open":2956.63,"symbol":"GOOG","volume":852383,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-12","updated":1636773860000,"changeOverTime":0.0019685105271790553,"marketChangeOverTime":0.0019685105271790553,"uOpen":2956.63,"uClose":2992.91,"uHigh":2997.19,"uLow":2929.08,"uVolume":852383,"fOpen":2956.63,"fClose":2992.91,"fHigh":2997.19,"fLow":2929.08,"fVolume":852383,"label":"Nov 12, 21","change":57.94999999999982,"changePercent":0.0197},{"close":2987.76,"high":3009.54,"low":2973.05,"open":3000,"symbol":"GOOG","volume":812367,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-15","updated":1637028533000,"changeOverTime":0.0002443899123878964,"marketChangeOverTime":0.0002443899123878964,"uOpen":3000,"uClose":2987.76,"uHigh":3009.54,"uLow":2973.05,"uVolume":812367,"fOpen":3000,"fClose":2987.76,"fHigh":3009.54,"fLow":2973.05,"fVolume":812367,"label":"Nov 15, 21","change":-5.149999999999636,"changePercent":-0.0017},{"close":2981.52,"high":2996.65,"low":2967,"open":2983.41,"symbol":"GOOG","volume":862743,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-16","updated":1637114885000,"changeOverTime":-0.001844641667475793,"marketChangeOverTime":-0.001844641667475793,"uOpen":2983.41,"uClose":2981.52,"uHigh":2996.65,"uLow":2967,"uVolume":862743,"fOpen":2983.41,"fClose":2981.52,"fHigh":2996.65,"fLow":2967,"fVolume":862743,"label":"Nov 16, 21","change":-6.2400000000002365,"changePercent":-0.0021},{"close":2981.24,"high":2992.52,"low":2971.26,"open":2984.58,"symbol":"GOOG","volume":764541,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-17","updated":1637200495000,"changeOverTime":-0.0019383802640082015,"marketChangeOverTime":-0.0019383802640082015,"uOpen":2984.58,"uClose":2981.24,"uHigh":2992.52,"uLow":2971.26,"uVolume":764541,"fOpen":2984.58,"fClose":2981.24,"fHigh":2992.52,"fLow":2971.26,"fVolume":764541,"label":"Nov 17, 21","change":-0.2800000000002001,"changePercent":-0.0001},{"close":3014.18,"high":3032.2,"low":2979.97,"open":2982.92,"symbol":"GOOG","volume":1334120,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-18","updated":1637286799000,"changeOverTime":0.00908929605661799,"marketChangeOverTime":0.00908929605661799,"uOpen":2982.92,"uClose":3014.18,"uHigh":3032.2,"uLow":2979.97,"uVolume":1334120,"fOpen":2982.92,"fClose":3014.18,"fHigh":3032.2,"fLow":2979.97,"fVolume":1334120,"label":"Nov 18, 21","change":32.940000000000055,"changePercent":0.011},{"close":2999.05,"high":3037,"low":2997.75,"open":3020,"symbol":"GOOG","volume":989148,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-19","updated":1637374996000,"changeOverTime":0.004024064036852654,"marketChangeOverTime":0.004024064036852654,"uOpen":3020,"uClose":2999.05,"uHigh":3037,"uLow":2997.75,"uVolume":989148,"fOpen":3020,"fClose":2999.05,"fHigh":3037,"fLow":2997.75,"fVolume":989148,"label":"Nov 19, 21","change":-15.129999999999654,"changePercent":-0.005},{"close":2941.57,"high":3014.89,"low":2940.11,"open":3002.8352,"symbol":"GOOG","volume":1231385,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-22","updated":1637634203000,"changeOverTime":-0.015219130708429455,"marketChangeOverTime":-0.015219130708429455,"uOpen":3002.8352,"uClose":2941.57,"uHigh":3014.89,"uLow":2940.11,"uVolume":1231385,"fOpen":3002.8352,"fClose":2941.57,"fHigh":3014.89,"fLow":2940.11,"fVolume":1231385,"label":"Nov 22, 21","change":-57.48000000000002,"changePercent":-0.0192},{"close":2935.14,"high":2953.88,"low":2897.79,"open":2942.26,"symbol":"GOOG","volume":906657,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-23","updated":1637720682000,"changeOverTime":-0.017371770621654393,"marketChangeOverTime":-0.017371770621654393,"uOpen":2942.26,"uClose":2935.14,"uHigh":2953.88,"uLow":2897.79,"uVolume":906657,"fOpen":2942.26,"fClose":2935.14,"fHigh":2953.88,"fLow":2897.79,"fVolume":906657,"label":"Nov 23, 21","change":-6.430000000000291,"changePercent":-0.0022},{"close":2934.35,"high":2940,"low":2903.98,"open":2927,"symbol":"GOOG","volume":823203,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-24","updated":1637806073000,"changeOverTime":-0.017636247376156346,"marketChangeOverTime":-0.017636247376156346,"uOpen":2927,"uClose":2934.35,"uHigh":2940,"uLow":2903.98,"uVolume":823203,"fOpen":2927,"fClose":2934.35,"fHigh":2940,"fLow":2903.98,"fVolume":823203,"label":"Nov 24, 21","change":-0.7899999999999636,"changePercent":-0.0003},{"close":2856.12,"high":2905.9404,"low":2849.71,"open":2900.31,"symbol":"GOOG","volume":849606,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-26","updated":1637979637000,"changeOverTime":-0.04382614168588876,"marketChangeOverTime":-0.04382614168588876,"uOpen":2900.31,"uClose":2856.12,"uHigh":2905.9404,"uLow":2849.71,"uVolume":849606,"fOpen":2900.31,"fClose":2856.12,"fHigh":2905.9404,"fLow":2849.71,"fVolume":849606,"label":"Nov 26, 21","change":-78.23000000000002,"changePercent":-0.0267},{"close":2922.28,"high":2937.24,"low":2885.97,"open":2885.97,"symbol":"GOOG","volume":1313806,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-29","updated":1638238010000,"changeOverTime":-0.021677050448103967,"marketChangeOverTime":-0.021677050448103967,"uOpen":2885.97,"uClose":2922.28,"uHigh":2937.24,"uLow":2885.97,"uVolume":1313806,"fOpen":2885.97,"fClose":2922.28,"fHigh":2937.24,"fLow":2885.97,"fVolume":1313806,"label":"Nov 29, 21","change":66.16000000000031,"changePercent":0.0232},{"close":2849.04,"high":2932.57,"low":2841.32,"open":2909.005,"symbol":"GOOG","volume":2079526,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-11-30","updated":1638361585000,"changeOverTime":-0.04619638905534937,"marketChangeOverTime":-0.04619638905534937,"uOpen":2909.005,"uClose":2849.04,"uHigh":2932.57,"uLow":2841.32,"uVolume":2079526,"fOpen":2909.005,"fClose":2849.04,"fHigh":2932.57,"fLow":2841.32,"fVolume":2079526,"label":"Nov 30, 21","change":-73.24000000000024,"changePercent":-0.0251},{"close":2832.36,"high":2929.9825,"low":2830,"open":2884.25,"symbol":"GOOG","volume":1427289,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-12-01","updated":1638409685000,"changeOverTime":-0.05178053116306166,"marketChangeOverTime":-0.05178053116306166,"uOpen":2884.25,"uClose":2832.36,"uHigh":2929.9825,"uLow":2830,"uVolume":1427289,"fOpen":2884.25,"fClose":2832.36,"fHigh":2929.9825,"fLow":2830,"fVolume":1427289,"label":"Dec 1, 21","change":-16.679999999999836,"changePercent":-0.0059},{"close":2875.53,"high":2893.5,"low":2819.64,"open":2836.48,"symbol":"GOOG","volume":1062535,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-12-02","updated":1638526787000,"changeOverTime":-0.037328048261985984,"marketChangeOverTime":-0.037328048261985984,"uOpen":2836.48,"uClose":2875.53,"uHigh":2893.5,"uLow":2819.64,"uVolume":1062535,"fOpen":2836.48,"fClose":2875.53,"fHigh":2893.5,"fLow":2819.64,"fVolume":1062535,"label":"Dec 2, 21","change":43.17000000000007,"changePercent":0.0152},{"close":2850.41,"high":2904.2599,"low":2823,"open":2889.91,"symbol":"GOOG","volume":1334374,"id":"HISTORICAL_PRICES","key":"GOOG","subkey":"","date":"2021-12-03","updated":1638586395000,"changeOverTime":-0.04573773949374473,"marketChangeOverTime":-0.04573773949374473,"uOpen":2889.91,"uClose":2850.41,"uHigh":2904.2599,"uLow":2823,"uVolume":1334374,"fOpen":2889.91,"fClose":2850.41,"fHigh":2904.2599,"fLow":2823,"fVolume":1334374,"label":"Dec 3, 21","change":-25.120000000000346,"changePercent":-0.0087}]
	var alg = "MA" 
	if (alg == "MA"){
		var toTensor = [];
		for (var i = 0; i < data.length; i++){
			toTensor.push((data[i].open + data[i].close)/2); //getting the data into a format where each day represents the midpoint between the open and closing price
			console.log(toTensor[i]);
		}
		var MA = [];
		var MAWindow = 20;
		var MAResult = [];
		MA = caculateMovingAverage(toTensor, MAWindow)
		console.log(MA); //20 period moving average indicator
		for (var i = 0; i < data.length; i++){
			if (i > 1 && data[i] < MA[i]* 1.02 && data[i] > MA[i]* 0.98){//this means that the current price is falling below the 20 period moving average
				MAResult.push("Within 2% ", "Moving Average at i: ", MA[i], " Data at i: ", Data[i]);
			}
			else{
				MAResult.push("Outside 2% ", "Moving Average at i: ", MA[i], " Data at i: ", Data[i]);
			}
			console.log(MAResult[i]);
		}

	}
	var supportAndResistance = []
	alg = "support or resistance";
	if (alg == "support or resistance"){
		console.log("Fibinachi candlestick measure for support and resistance");
		for (var i = 0; i < data.length; i++){
			if ((data[i].high - data[i].close) < (data[i].high - data[i].low)*0.382 && (data[i].high - data[i].open) < (data[i].high - data[i].low)*0.382){
				supportAndResistance.push("upward\n high: ", data[i].high, " low: ", data[i].low, " open: ", data[i].open, " close: ", data[i].close, " ", data[i].date);
			} 
			else if ((data[i].high - data[i].close) > (data[i].high - data[i].low)*0.618 && (data[i].high - data[i].open) > (data[i].high - data[i].low)*0.618){
				supportAndResistance.push("downward\n high: ", data[i].high, " low: ", data[i].low, " open: ", data[i].open, " close: ", data[i].close, " ", data[i].date);
			}
			else{
				supportAndResistance.push("none\n high: ", data[i].high, " low: ", data[i].low, " open: ", data[i].open, " close: ", data[i].close, " ", data[i].date);
			} //getting the data into a format where each day represents the midpoint between the open and closing price
			//console.log(supportAndResistance[i]);
		}
	}
	
	//console.log(data);
}
const PORT = process.env.PORT || 5000;

function startApp(){
	app.use(express.static(path.join(__dirname, 'public')));
	app.listen(PORT, () => console.log("Server listening on ", PORT));
	console.log((path.normalize(__dirname + '/portfolio.json')));
}