const mongoose = require('mongoose');

// The mongoose.Schema constructor will allow the creation of a schema
const Schema = mongoose.Schema;
// Create a new product schema
const productSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	price: {
		type: Number,
		required: true
	},
	description: {
		type: String,
		required: true
	},
	imageUrl: {
		type: String,
		required: true
	},
	userId: {
		type: Schema.Types.ObjectId,
		// Refert to the 'User' model
		ref: 'User',
		required: true
	}
});

// 'model' is a function I call and is important for mongoose behind the scenes to connect a schema with a name
module.exports = mongoose.model('Product', productSchema);
