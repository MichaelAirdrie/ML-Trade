const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GoogleAuthSchema = new Schema({
	userId: {
		type: String,
		required: true
	},
	portfolioNameList: 
		[{type: String}]
	
}, { timestamps: true });

const Model = mongoose.model('users', GoogleAuthSchema);
module.exports = Model;