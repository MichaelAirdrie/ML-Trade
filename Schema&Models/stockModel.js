const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserPortfolioSchema = new Schema({
	userId: {
		type: String,
		required: true
	},
	portfolioID: {
		type: Number,
		required: true
	},
	portfolioName: {
		type: String,
		required: true
	},
	portfolioStocks: 
		[{type: String}]
	
}, { timestamps: true });



const Model = mongoose.model('userData', UserPortfolioSchema);
module.exports = Model;