const mongoose = require('mongoose');
const fileHelper = require('../util/file');
const { validationResult } = require('express-validator');
const Product = require('../models/product');
const { getProduct } = require('./shop');

exports.getAddProduct = (req, res, next) => {
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product',
		editing: false,
		hasError: false,
		errorMessage: null,
		validationErrors: []
	});
};

exports.postAddProduct = (req, res, next) => {
	const { title, price, description } = req.body;
	const image = req.file;
	if (!image) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			hasError: true,
			product: {
				title: title,
				price: price,
				description: description
			},
			errorMessage: 'Attached file is not an image.',
			validationErrors: []
		});
	}
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product',
			editing: false,
			hasError: true,
			product: {
				title: title,
				price: price,
				description: description
			},
			errorMessage: errors.array()[0].msg,
			validationErrors: errors.array()
		});
	}

	const imageUrl = image.path;

	const product = new Product({
		title: title,
		price: price,
		description: description,
		imageUrl: imageUrl,
		userId: req.user._id
	});
	product
		.save()
		.then((result) => {
			// console.log(result);
			console.log('Created Product!');
			res.redirect('/admin/products');
		})
		.catch((err) => {
			// return res.status(500).render('admin/edit-product', {
			// 	pageTitle: 'Add Product',
			// 	path: '/admin/add-product',
			// 	editing: false,
			// 	hasError: true,
			// 	product: {
			// 		title: title,
			// 		imageUrl: imageUrl,
			// 		price: price,
			// 		description: description
			// 	},
			// 	errorMessage: 'Database operation failed, please try again.',
			// 	validationErrors: []
			// });
			// res.redirect('/500');
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.getEditProduct = (req, res, next) => {
	// Assigns the query param edit to the variable editMode. (localhost:3000/admin/edit-product/12234?edit=true)
	// Pay attention that the returned value by req.query.edit is a string. Ex: "true"
	const editMode = req.query.edit;
	if (!editMode) {
		return res.redirect('/');
	}
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return res.redirect('/');
			}
			res.render('admin/edit-product', {
				pageTitle: 'Edit Product',
				path: '/admin/edit-product',
				editing: editMode,
				product: product,
				hasError: false,
				errorMessage: null,
				validationErrors: []
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.postEditProduct = (req, res, next) => {
	// req.body.productId comes from the edit-product.ejs, where I added a hidden input element, it's name is used here to extract that id
	const prodId = req.body.productId;
	const updatedTitle = req.body.title;
	const updatedPrice = req.body.price;
	const image = req.file;
	const updatedDesc = req.body.description;

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render('admin/edit-product', {
			pageTitle: 'Edit Product',
			path: '/admin/edit-product',
			editing: true,
			hasError: true,
			product: {
				title: updatedTitle,
				price: updatedPrice,
				description: updatedDesc,
				_id: prodId
			},
			errorMessage: errors.array()[0].msg,
			validationErrors: errors.array()
		});
	}
	Product.findById(prodId)
		.then((product) => {
			if (product.userId.toString() !== req.user._id.toString()) {
				return res.redirect('/');
			}
			product.title = updatedTitle;
			product.price = updatedPrice;
			product.description = updatedDesc;
			if (image) {
				fileHelper.deleteFile(product.imageUrl);
				product.imageUrl = image.path;
			}
			return product.save().then((result) => {
				console.log('UPDATED PRODUCT!');
				// Moved the redirect inside this 'then' block as if it were outside it'd be executed before the promise is returned
				// We would still see the old values on the page since the redirect happens before the promise is returned and the database updated
				res.redirect('/admin/products');
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.getProducts = (req, res, next) => {
	Product.find({ userId: req.user._id })
		// Select which information to extract
		// .select('title price -_id')
		// Populate the products with the details from the user
		// .populate('userId', 'name')
		.then((products) => {
			res.render('admin/products', {
				pageTitle: 'Admin Products',
				prods: products,
				path: '/admin/products'
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(err);
		});
};

exports.deleteProduct = (req, res, next) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return next(new Error('Product not found.'));
			}
			// Deletes the uploaded image for the product
			fileHelper.deleteFile(product.imageUrl);
			return Product.deleteOne({ _id: prodId, userId: req.user._id });
		})
		.then(() => {
			console.log('DESTROYED PRODUCT');
			res.status(200).json({ message: 'Success!' });
		})
		.catch((err) => {
			res.status(500).json({ message: 'Deleting product failed.' });
		});
};
