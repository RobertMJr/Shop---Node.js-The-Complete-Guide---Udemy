const path = require('path');

const express = require('express');
const { body } = require('express-validator');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// Use the controller defined for the adding of a product
// The controller holds the logic of what should be done
// isAuth is the handler that checks if the user is loged in
// The arguments are parsed from left to right
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', isAuth, adminController.getProducts);

// /admin/add-product => POST
router.post(
	'/add-product',
	[
		body('title').isString().isLength({ min: 3 }).trim(),
		body('price').isFloat(),
		body('description').isLength({ min: 5, max: 400 }).trim()
	],
	isAuth,
	adminController.postAddProduct
);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
	'/edit-product',
	[
		body('title').isString().isLength({ min: 3 }).trim(),
		body('price').isFloat(),
		body('description').isLength({ min: 5, max: 400 }).trim()
	],
	isAuth,
	adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
