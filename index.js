//stock Market stuff
const express = require ('express');
const app = express();
var exphbs = require('express-handlebars');
const path = require('path');
const request = require('request');
const bodyParser = require('body-parser');
var stockTicker = 'fb'
var apiString = "https://cloud.iexapis.com/";
var apiDataType = "stable/stock/";
const lookupFields = [
	"latestPrice",
	"change",
	"changePercent",
	"avgTotalVolume",
	"week52High",
	"week52Low"
];
function parseApiCall(filter, data){
	var ret = {};
	for (var i = 0; i < filter.length; i++){
			var key = filter[i];
			var dataf = data[filter[i]];
			var obj = {key : dataf};
			if (dataf){
				ret += obj;	
			}
		}
		return ret;
};
console.log(parseApiCall(lookupFields, {"latestPrice": "600", "change": "34", "hamburger": "no thanks"}));	
const test = "Hello";
//bodyParser middle where?
app.use(bodyParser.urlencoded({extended: false}));

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
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const hey = "hey whats up hello!"

//HandleBar Routes2

app.get('/', function (req, res) {
	callApi(function(doneApi, ticker, apiDataType) {
		res.render('home', {
    	stock: doneApi,
    	lookupFields: lookupFields
    	});
	}, 'aapl', apiDataType);
});

app.post('/', function (req, res) {
	
	callApi(function(doneApi) {
		//posted = req.body.stock_ticker;
		res.render('home', {
    	stock: doneApi,
    	lookupFields: lookupFields
    	});
	}, req.body.stock_ticker, apiDataType);
});
//api key pk_5c761d09edfb4beabe74c628ef368295 

app.get('/about.html', function (req, res) {
    res.render('about', {
    	about: "COMP4905 Thesis Project"
    });
});

const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log("Server listening on ", PORT));

