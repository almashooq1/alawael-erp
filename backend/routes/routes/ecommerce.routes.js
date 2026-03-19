/**
 * E-Commerce Routes
 * Product catalog, shopping cart, and checkout endpoints
 */

const express = require('express');
const router = express.Router();
const EcommerceService = require('../services/EcommerceService');
const authenticate = require('../middleware/authenticate');

/**
 * PRODUCT ROUTES
 */

/**
 * GET /api/ecommerce/products
 * Get products with filtering and pagination
 */
router.get('/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await EcommerceService.getProducts({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/products/search/:query
 * Search products
 */
router.get('/products/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    const results = await EcommerceService.searchProducts(query, parseInt(limit));

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/products/featured
 * Get featured products
 */
router.get('/products/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const featured = await EcommerceService.getFeaturedProducts(parseInt(limit));

    res.json({
      success: true,
      data: featured,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/products/new
 * Get new products
 */
router.get('/products/new', async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const newProducts = await EcommerceService.getNewProducts(
      parseInt(limit),
      parseInt(days)
    );

    res.json({
      success: true,
      data: newProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/products/:id
 * Get product details
 */
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await EcommerceService.getProductDetails(id);

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/products/:id/similar
 * Get similar products
 */
router.get('/products/:id/similar', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const similar = await EcommerceService.getSimilarProducts(
      id,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: similar,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ecommerce/products/:id/reviews
 * Add product review
 */
router.post('/products/:id/reviews', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.id;

    const result = await EcommerceService.addProductReview(
      id,
      userId,
      rating,
      title,
      comment
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * SHOPPING CART ROUTES
 */

/**
 * POST /api/ecommerce/cart
 * Add item to cart
 */
router.post('/cart', authenticate, async (req, res) => {
  try {
    const { productId, quantity, variant } = req.body;
    const userId = req.user.id;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ error: 'productId and quantity required' });
    }

    const result = await EcommerceService.addToCart(
      userId,
      productId,
      quantity,
      variant
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/cart
 * Get shopping cart
 */
router.get('/cart', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await EcommerceService.getCart(userId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/ecommerce/cart/:productId
 * Update cart item quantity
 */
router.put('/cart/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }

    const cart = await EcommerceService.updateCartItem(
      userId,
      productId,
      quantity
    );

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/ecommerce/cart/:productId
 * Remove item from cart
 */
router.delete('/cart/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await EcommerceService.removeFromCart(userId, productId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/ecommerce/cart
 * Clear shopping cart
 */
router.delete('/cart', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await EcommerceService.clearCart(userId);

    res.json({
      success: true,
      data: cart,
      message: 'Cart cleared',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ecommerce/cart/coupon
 * Apply coupon to cart
 */
router.post('/cart/coupon', authenticate, async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.user.id;

    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code required' });
    }

    const result = await EcommerceService.applyCoupon(userId, couponCode);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * CHECKOUT ROUTES
 */

/**
 * POST /api/ecommerce/checkout
 * Create checkout session
 */
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address required' });
    }

    const result = await EcommerceService.createCheckoutSession(
      userId,
      shippingAddress
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/ecommerce/checkout/:sessionId
 * Get checkout details
 */
router.get('/checkout/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const checkout = await EcommerceService.getCheckout(sessionId);

    res.json({
      success: true,
      data: checkout,
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /api/ecommerce/checkout/:sessionId/payment
 * Process payment
 */
router.put('/checkout/:sessionId/payment', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { method, cardToken, paypalEmail } = req.body;

    if (!method) {
      return res.status(400).json({ error: 'Payment method required' });
    }

    const result = await EcommerceService.updateCheckoutPayment(sessionId, {
      method,
      cardToken,
      paypalEmail,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * WISHLIST ROUTES
 */

/**
 * GET /api/ecommerce/wishlist
 * Get user's wishlist
 */
router.get('/wishlist', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await EcommerceService.getWishlist(userId);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ecommerce/wishlist/:productId
 * Add product to wishlist
 */
router.post('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const wishlist = await EcommerceService.addToWishlist(userId, productId);

    res.status(201).json({
      success: true,
      data: wishlist,
      message: 'Product added to wishlist',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/ecommerce/wishlist/:productId
 * Remove product from wishlist
 */
router.delete('/wishlist/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const wishlist = await EcommerceService.removeFromWishlist(
      userId,
      productId
    );

    res.json({
      success: true,
      data: wishlist,
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
