/**
 * E-Commerce Routes
 * Product catalog, shopping cart, and checkout endpoints
 */

const express = require('express');
const safeError = require('../utils/safeError');
const router = express.Router();
const EcommerceService = require('../services/EcommerceService');
const { authenticateToken: authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

// RBAC Integration (Role-Based Access Control)
let createRBACMiddleware;
try {
  const rbacModule = require('../rbac');
  createRBACMiddleware = rbacModule.createRBACMiddleware;
} catch (err) {
  logger.warn('[E-Commerce Routes] RBAC module not available, using fallback');
  createRBACMiddleware = permission => (req, res, _next) => {
    logger.warn(`RBAC middleware unavailable, blocking request for permission: ${permission}`);
    return res
      .status(503)
      .json({ success: false, message: 'Authorization service temporarily unavailable' });
  };
}

/**
 * PRODUCT ROUTES
 */

/**
 * GET /api/ecommerce/products
 * Get products with filtering and pagination
 * @requires Permission: ecommerce:read
 */
router.get('/products', createRBACMiddleware(['ecommerce:read']), async (req, res) => {
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
    safeError(res, error, 'ecommerce');
  }
});

/**
 * GET /api/ecommerce/products/search/:query
 * Search products
 * @requires Permission: ecommerce:read
 */
router.get(
  '/products/search/:query',
  createRBACMiddleware(['ecommerce:read']),
  async (req, res) => {
    try {
      const { query } = req.params;
      const { limit = 20 } = req.query;

      const results = await EcommerceService.searchProducts(query, parseInt(limit));

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      safeError(res, error, 'ecommerce');
    }
  }
);

/**
 * GET /api/ecommerce/products/featured
 * Get featured products
 * @requires Permission: ecommerce:read
 */
router.get('/products/featured', createRBACMiddleware(['ecommerce:read']), async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const featured = await EcommerceService.getFeaturedProducts(parseInt(limit));

    res.json({
      success: true,
      data: featured,
    });
  } catch (error) {
    safeError(res, error, 'ecommerce');
  }
});

/**
 * GET /api/ecommerce/products/new
 * Get new products
 */
router.get('/products/new', async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const newProducts = await EcommerceService.getNewProducts(parseInt(limit), parseInt(days));

    res.json({
      success: true,
      data: newProducts,
    });
  } catch (error) {
    safeError(res, error, 'ecommerce');
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
    res.status(404).json({ error: 'خطأ في البيانات المدخلة' });
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

    const similar = await EcommerceService.getSimilarProducts(id, parseInt(limit));

    res.json({
      success: true,
      data: similar,
    });
  } catch (error) {
    safeError(res, error, 'ecommerce');
  }
});

/**
 * POST /api/ecommerce/products/:id/reviews
 * Add product review
 */
router.post('/products/:id/reviews', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.id;

    const result = await EcommerceService.addProductReview(id, userId, rating, title, comment);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * SHOPPING CART ROUTES
 */

/**
 * POST /api/ecommerce/cart
 * Add item to cart
 */
router.post('/cart', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { productId, quantity, variant } = req.body;
    const userId = req.user.id;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'productId and quantity required' });
    }

    const result = await EcommerceService.addToCart(userId, productId, quantity, variant);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * GET /api/ecommerce/cart
 * Get shopping cart
 */
router.get('/cart', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await EcommerceService.getCart(userId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    safeError(res, error, 'ecommerce');
  }
});

/**
 * PUT /api/ecommerce/cart/:productId
 * Update cart item quantity
 */
router.put('/cart/:productId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }

    const cart = await EcommerceService.updateCartItem(userId, productId, quantity);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * DELETE /api/ecommerce/cart/:productId
 * Remove item from cart
 */
router.delete('/cart/:productId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await EcommerceService.removeFromCart(userId, productId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * DELETE /api/ecommerce/cart
 * Clear shopping cart
 */
router.delete('/cart', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await EcommerceService.clearCart(userId);

    res.json({
      success: true,
      data: cart,
      message: 'Cart cleared',
    });
  } catch (error) {
    safeError(res, error, 'ecommerce');
  }
});

/**
 * POST /api/ecommerce/cart/coupon
 * Apply coupon to cart
 */
router.post('/cart/coupon', authenticate, requireBranchAccess, async (req, res) => {
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
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * CHECKOUT ROUTES
 */

/**
 * POST /api/ecommerce/checkout
 * Create checkout session
 */
router.post('/checkout', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address required' });
    }

    const result = await EcommerceService.createCheckoutSession(userId, shippingAddress);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * GET /api/ecommerce/checkout/:sessionId
 * Get checkout details
 */
router.get('/checkout/:sessionId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const checkout = await EcommerceService.getCheckout(sessionId);

    res.json({
      success: true,
      data: checkout,
    });
  } catch (error) {
    res.status(404).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * PUT /api/ecommerce/checkout/:sessionId/payment
 * Process payment
 */
router.put('/checkout/:sessionId/payment', authenticate, requireBranchAccess, async (req, res) => {
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
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * WISHLIST ROUTES
 */

/**
 * GET /api/ecommerce/wishlist
 * Get user's wishlist
 */
router.get('/wishlist', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlist = await EcommerceService.getWishlist(userId);

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    safeError(res, error, 'ecommerce');
  }
});

/**
 * POST /api/ecommerce/wishlist/:productId
 * Add product to wishlist
 */
router.post('/wishlist/:productId', authenticate, requireBranchAccess, async (req, res) => {
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
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * DELETE /api/ecommerce/wishlist/:productId
 * Remove product from wishlist
 */
router.delete('/wishlist/:productId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const wishlist = await EcommerceService.removeFromWishlist(userId, productId);

    res.json({
      success: true,
      data: wishlist,
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    res.status(400).json({ error: 'خطأ في البيانات المدخلة' });
  }
});

/**
 * ORDER ROUTES
 * مسارات الطلبات
 */

/**
 * GET /ecommerce/orders
 * List all orders for the current user (or all orders for admin)
 */
router.get('/orders', async (req, res) => {
  try {
    const { _status, page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data: [],
      pagination: { page: +page, limit: +limit, total: 0 },
      message: 'قائمة الطلبات',
    });
  } catch (error) {
    safeError(res, error, 'fetching orders');
  }
});

/**
 * GET /ecommerce/orders/:id
 * Get a single order
 */
router.get('/orders/:id', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.params.id,
        items: [],
        totalAmount: 0,
        status: 'pending',
        createdAt: null,
      },
      message: 'بيانات الطلب',
    });
  } catch (error) {
    safeError(res, error, 'fetching order');
  }
});

module.exports = router;
