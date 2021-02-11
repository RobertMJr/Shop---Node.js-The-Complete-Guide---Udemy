const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	resetToken: String,
	resetTokenExpiration: Date,
	cart: {
		items: [
			{
				productId: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true
				},
				quantity: { type: Number, required: true }
			}
		]
	}
});

userSchema.methods.addToCart = function(product) {
	const cartProductIndex = this.cart.items.findIndex((cp) => {
		// cp - is the product in the items array
		// Return if product in the items's array's id matches the id of the product we are trying to add / insert
		// Used the '==' comparison operator as product_id is not a string
		// Found out that won't work as using double equals '==' to compare to objects will always return false
		// Fixed by converting both values to strings using the toString() method
		return cp.productId.toString() === product._id.toString();
	});
	let newQuantity = 1;
	// New array with all the items that are in the cart
	const updatedCartItems = [ ...this.cart.items ];
	// Check if the product exists
	if (cartProductIndex >= 0) {
		// If the product already exists update the quantity by adding one to it
		newQuantity = this.cart.items[cartProductIndex].quantity + 1;
		// Then update the cart for that item with that new quantity
		updatedCartItems[cartProductIndex].quantity = newQuantity;
	} else {
		// If the product is not already in the cart, push it into the array of cart items
		updatedCartItems.push({
			productId: product._id,
			quantity: newQuantity
		});
	}
	// Update the cart with the updated array of items that is 'updatedCartItems'
	const updatedCart = { items: updatedCartItems };
	this.cart = updatedCart;
	return this.save();
};

userSchema.methods.removeFromCart = function(productId) {
	const updatedCartItems = this.cart.items.filter((item) => {
		return item.productId.toString() !== productId.toString();
	});
	// Set the curent cat to be the updated cart
	this.cart.items = updatedCartItems;
	// Save changes
	return this.save();
};

userSchema.methods.clearCart = function() {
	this.cart = { items: [] };
	return this.save();
};

// 'model' is a function I call and is important for mongoose behind the scenes to connect a schema with a name
module.exports = mongoose.model('User', userSchema);
