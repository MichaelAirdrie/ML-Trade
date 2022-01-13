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
const fs = require('fs')
const ta = require('technicalindicators')//https://npm.io/package/technicalindicators

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
		console.log(apiString + apiDataType + ticker +"/quote?token=pk_5c761d09edfb4beabe74c628ef368295");
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
		console.log(apiString + apiDataType + ticker +"/time-series?token=pk_5c761d09edfb4beabe74c628ef368295");
		return finishedApi(body);
	}
	else{
		console.log(res.statusCode);
	}
});
}
//https://cloud.iexapis.com/stable/stock/goog/time-series/2020/?token=pk_5c761d09edfb4beabe74c628ef368295
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
    var data = readFile('./stockMarketData/AAPL2020-01-02.txt').toString();
		data = JSON.parse(data);
		analysis = tensorFlowML(data, ["open", "close"], "MA supportOrResistance RSI ROC");
		var totalGrowth = Math.round((((data[data.length - 1].close - data[0].close)/data[data.length - 1].close) * 10000) / 100) + "%";
		var analysisInOrder = SendIt(analysis);
		res.render('machineLearning', {
			title: "Analysis of Technical Indicators",
			title2: "Effectiveness of Each",
	    	analysis: analysisInOrder,
	    	totalGrowth: totalGrowth,
	    	stock: data[0].symbol
    });
});

app.get('/portfolio.html',  function (req, res) {
    res.render('portfolio', {
        title: "UserFromDataBase portfolio's",
        portfolioArray: {
            title: "Analysis of Technical Indicators",
            "StockName2": {"amountOwned": 2 }}
    });
});

app.get('/portfolio.json', function (req, res) {
    console.log((path.normalize(__dirname + '/portfolio.json')));
    res.sendFile(path.normalize(__dirname + '/portfolio.json'))
});

app.post('/machineLearning.html',  function (req, res) {
	console.log("we are expecting a time series");
	var callSeries = true;
	if (callSeries == true){
		callApiSeries(function(doneApi, ticker, apiDataType) {
			var analysis = tensorFlowML(doneApi, ["open", "close"], "MA supportOrResistance RSI ROC");
			var totalGrowth = Math.round((((doneApi[doneApi.length - 1].close - doneApi[0].close)/doneApi[doneApi.length - 1].close) * 10000) / 100) + "%";
			var analysisInOrder = {};
			var analysisInOrderKeys = ["Average Price Change Prediction When Correct", "Amount Guessed Correctly", "Average Price Change Prediction When Incorrect", "Amount Guessed Incorrectly", "Percentage Accumulated Over Time Period"];
			for (var i = 0; i < Object.keys(analysis).length; i++){
				var objAdded = {};
				for (var x = 0; x < analysisInOrderKeys.length; x++){
					objAdded[analysisInOrderKeys[x]] = analysis[Object.keys(analysis)[i]][x];
				}
				analysisInOrder[Object.keys(analysis)[i]] = objAdded;
			}
		writeFile(doneApi);
			res.render('machineLearning', {
			stock: doneApi[0].symbol,
	    	analysis: analysisInOrder,
	    	title: "Analysis of Technical Indicators",
	    	totalGrowth: totalGrowth,
	    	title2: "Effectiveness of Each"
	    	});
		}, req.body.stock_ticker, apiDataType);
	}
	else{
		var series = "series"
		var data = readFile('./stockMarketData/ENB2020-01-02.txt').toString();
		data = JSON.parse(data);
		analysis = tensorFlowML(data, ["open", "close"], "MA supportOrResistance RSI ROC");
		var totalGrowth = Math.round((((data[data.length - 1].close - data[0].close)/data[data.length - 1].close) * 10000) / 100) + "%";
		var analysisInOrder = SendIt(analysis);
		res.render('machineLearning', {
			title: "Analysis of Technical Indicators",
			title2: "Effectiveness of Each",
	    	analysis: analysisInOrder,
	    	totalGrowth: totalGrowth,
	    	stock: data[0].symbol
	    	});
	}
});
function SendIt(inputData){
	var analysisInOrder = {};
	var analysisInOrderKeys = ["Average Price Change Prediction When Correct", "Amount Guessed Correctly", "Average Price Change Prediction When Incorrect", "Amount Guessed Incorrectly", "Percentage Accumulated Over Time Period"];
	for (var i = 0; i < Object.keys(analysis).length; i++){
		var objAdded = {};
		for (var x = 0; x < analysisInOrderKeys.length; x++){
			objAdded[analysisInOrderKeys[x]] = analysis[Object.keys(analysis)[i]][x];
		}
		analysisInOrder[Object.keys(analysis)[i]] = objAdded;
	}
	return analysisInOrder;
}

function writeFile(data){
	let name = "./stockMarketData/" + data[0].symbol + data[0].date +".txt";  
	fs.writeFile(name, JSON.stringify(data), (err) => {
    if (err) throw err;
});
}
function readFile(fileName){
return fs.readFileSync(fileName, (err, data) => {
    return data;
 })
}

//The label for all of these algorithms will be a binary choice to either buy or sell a stock.
//The features should vary depending on what the user is trying to test
//The final decision to buy or sell should be a a choice based on what each of these different TA algorithms suggest.
//need to make a function that takes in a tensor and gives a regression line for Technical Analysis.
//need to make a function that calculates points of support and resistance for Technical Analysis. 


function tensorFlowML(data, features, alg){ //data is what is returned from the Time Series API call. // features is what columns we are evaluating
	var MAIndicator = [];
	var SARIndicator = [];
	var RSIIndicator = [];
	var ROC = [];
	
	console.log(alg);
	//console.log(alg.includes("MA"));
	//data = JSON.parse(data);
	//console.log("JSON.parse(data): ", data);
	if (alg.includes("MA")){
		let values = [];
		for (var i = 0; i < data.length; i++){
			values.push((data[i].open + data[i].close)/2); //getting the data into a format where each day represents the midpoint between the open and closing price
		}
		const sma = ta.SMA
		const MA = sma.calculate({period: 20, values: values});
		var MAResult = [];
		for (var i = 0; i < data.length; i++){
			if (i > 1 && data[i].close < MA[i]* 1.02 && data[i].close > MA[i]* 0.98){//this means that the current price is falling below the 20 period moving average
				MAIndicator.push(1);
				MAResult.push("Within 2% " + "Moving Average at i: " + MA[i] + " Data at " + i + ": " + data[i].close);
			}
			else{
				MAIndicator.push(0);
				MAResult.push("Outside 2% " + "Moving Average at i: " + MA[i] + " Data at " + i + ": " + data[i].close);
			}
			//console.log(MAResult[i]);
		}
		console.log("Get Moving Average Done.");
		console.log(MAResult.length);
	}
	var supportAndResistance = [];
	if (alg.includes("supportOrResistance")){
		//console.log("Fibinachi candlestick measure for support and resistance");
		for (var i = 0; i < data.length; i++){
			if ((data[i].high - data[i].close) < (data[i].high - data[i].low)*0.382 && (data[i].high - data[i].open) < (data[i].high - data[i].low)*0.382){
								SARIndicator.push(1);
								supportAndResistance.push("upward high: " + data[i].high + " low: " + data[i].low + " open: " + data[i].open + " close: " + data[i].close + " " + data[i].date);
							} 
			else if ((data[i].high - data[i].close) > (data[i].high - data[i].low)*0.618 && (data[i].high - data[i].open) > (data[i].high - data[i].low)*0.618){
								SARIndicator.push(-1);
								supportAndResistance.push("downward high: " + data[i].high + " low: " + data[i].low + " open: " + data[i].open + " close: " + data[i].close + " " + data[i].date);
							}
			else{
				SARIndicator.push(0);
				supportAndResistance.push("none high: " + data[i].high + " low: " + data[i].low + " open: " + data[i].open + " close: " + data[i].close + " " + data[i].date);
			} //getting the data into a format where each day represents the midpoint between the open and closing price
			
		}
		//console.log("Get S&R Done.");
		//console.log(supportAndResistance.length);
	}
	
	//console.log(data);
	var closes = [];
		for (var i = 0; i < data.length; i++){
			closes.push((data[i].close)); 
		}
	//fills up and array with all the close values in the data
	let jsonObject = {Values: [], period: 14}; //creates a JsonObject to pass into to technical indicator library RSI calculator
	jsonObject.values = closes;
	if (alg.includes("RSI")){
		//console.log(jsonObject.values);
		let result = ta.RSI.calculate(jsonObject);
		console.log("set RSI Done.");
		result.unshift(50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50)//make it so that each it has the same number of entries as the other data
		//console.log(result.length);
		for (var i = 0; i < data.length; i++){
			if (result[i] > 70){
				RSIIndicator.push(-1); 
			}
			else if (result[i] < 30){
				RSIIndicator.push(1); 
			}
			else{
				RSIIndicator.push(0);
			}
			 
		}
		//console.log(RSIIndicator)
	}
	jsonObject = {Values: [], period: 12}
	jsonObject.values = closes;
	if (alg.includes("ROC")){
		//console.log(jsonObject.values);
		let result = ta.ROC.calculate(jsonObject);
		console.log("Get ROC Done");
		result.unshift(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)//make it so that each it has the same number of entries as the other data
		//console.log(result.length);
		
		for (var i = 0; i < data.length; i++){
			if (result[i] > 0){
				ROC.push(1); 
			}
			else if (result[i] < 0){
				ROC.push(-1); 
			}
			else{
				ROC.push(0);
			}
		}
		
	}
	analysis = {};
	analysis["MAIndicator"] = MAIndicator;
	analysis["SARIndicator"] = SARIndicator;
	analysis["ROC"] = ROC;
	analysis["RSIIndicator"] = RSIIndicator;
	//console.log(analysis);
	//console.log("MAIndicator: ", MAIndicator);
	//console.log("SARIndicator: ", SARIndicator);
	//console.log("RSIIndicator: ", RSIIndicator);
	//console.log("ROC: ", ROC);
	return MachineLearning(analysis, data);
}
function MachineLearning(indicators, data){
	let periodsInFuture = 1
	let accuracy = {};
	let ratiosList = {};
	for (let key in indicators){
		console.log(indicators[key])
		accuracy[key] = howRightAreWe(indicators[key], data, periodsInFuture)
		accuracy[key + "Correct?"] = [];
		accuracy[key + "Incorrect?"] = [];
		for (var i = 0; i < data.length - periodsInFuture; i++){
			if (indicators[key][i] != 0){
				if ((indicators[key][i] > 0 && accuracy[key][i] > 0) || (indicators[key][i] < 0 && accuracy[key][i] < 0)){
					accuracy[key + "Correct?"].push(Math.abs(accuracy[key][i]));
					accuracy[key + "Incorrect?"].push(0);
				}
				else{
					accuracy[key + "Incorrect?"].push(Math.abs(accuracy[key][i]));
					accuracy[key + "Correct?"].push(0);
				}
			}
			else{
				accuracy[key + "Correct?"].push(0);
				accuracy[key + "Incorrect?"].push(0);
			}
		}
		var ratios = getRatios(accuracy[key + "Correct?"], accuracy[key + "Incorrect?"])
		ratiosList[key] = ratios;
	}
	console.log(ratiosList);
	return ratiosList
	
}
function getRatios(correctValues, incorrectValues){
	numCorrect = 0;
	numIncorrect = 0;
	magnitudeCorrect = 0;
	magnitudeIncorrect = 0;
	for (var i = 0; i < correctValues.length; i++){
		if (correctValues[i] > 0){
			numCorrect += 1;
			magnitudeCorrect += correctValues[i];
		} 
		if (incorrectValues[i] > 0){
			numIncorrect += 1;
			magnitudeIncorrect += incorrectValues[i];
		} 
	}
	magnitudeCorrect = magnitudeCorrect/numCorrect;
	magnitudeIncorrect = magnitudeIncorrect/numIncorrect;
	totalProfitOrLoss = (1 + magnitudeCorrect)**numCorrect/((1 + magnitudeIncorrect)**numIncorrect);
	console.log("totalProfitOrLoss: ", totalProfitOrLoss);
	totalProfitOrLoss = Math.round((totalProfitOrLoss - 1) * 10000)/100 + "%";
	return [magnitudeCorrect, numCorrect, magnitudeIncorrect, numIncorrect, totalProfitOrLoss];
}
function howRightAreWe(oneIndicator, data, periodsInFuture){
	var averageChangeToFuturePoint = [];
	let change;
	for(var i = 0; i < data.length - periodsInFuture; i++){
		change = (data[i + periodsInFuture].close - data[i].close)/data[i].close;
		averageChangeToFuturePoint.push(change);
	}
	return averageChangeToFuturePoint;
}
const PORT = process.env.PORT || 5000;

function startApp(){
	app.use(express.static(path.join(__dirname, 'public')));
	app.listen(PORT, () => console.log("Server listening on ", PORT));
	console.log((path.normalize(__dirname + '/portfolio.json')));
}