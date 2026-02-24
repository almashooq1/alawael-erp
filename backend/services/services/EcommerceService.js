/**
 * E-Commerce Service
 * Handles shopping cart, checkout, and product management
 */

const {
  Product,
  Cart,
  Checkout,
  Coupon,
  Wishlist,
  InventoryLog,
} = require('../models/ecommerce.models');

class EcommerceService {
  /**
   * GET PRODUCTS
   * Retrieve products with filtering, sorting, and pagination
   */
  static async getProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    try {
      const skip = (page - 1) * limit;

      // Build filter
      const filter = { isActive: true };
      if (category) filter.category = category;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
      if (minPrice || maxPrice) {
        filter.finalPrice = {};
        if (minPrice) filter.finalPrice.$gte = minPrice;
        if (maxPrice) filter.finalPrice.$lte = maxPrice;
      }

      // Query
      const products = await Product.find(filter)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .select('-reviews -variants'); // Exclude heavy data

      const total = await Product.countDocuments(filter);

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * GET PRODUCT DETAILS
   * Get single product with full details
   */
  static async getProductDetails(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      return product;
    } catch (error) {
      throw new Error(`Failed to get product: ${error.message}`);
    }
  }

  /**
   * SEARCH PRODUCTS
   * Full-text search with relevance scoring
   */
  static async searchProducts(query, limit = 20) {
    try {
      // Create text index if not exists
      await Product.collection.createIndex({
        name: 'text',
        description: 'text',
      });

      const results = await Product.find(
        { $text: { $search: query }, isActive: true },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();

      return results;
    } catch (_error) {  // eslint-disable-line no-unused-vars
      // Fallback: error details not needed, just use regex search
      return await Product.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
        isActive: true,
      })
        .limit(limit)
        .lean();
    }
  }

  /**
   * ADD TO CART
   * Add product to shopping cart
   */
  static async addToCart(userId, productId, quantity, variant) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Check stock
      if (product.totalStock < quantity) {
        throw new Error(`Only ${product.totalStock} items in stock`);
      }

      // Get or create cart
      let cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }

      // Check if product already in cart
      const existingItem = cart.items.find(
        item =>
          item.productId.toString() === productId &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({
          productId,
          quantity,
          price: product.finalPrice,
          variant,
        });
      }

      await cart.save();

      return {
        success: true,
        cart,
        message: 'Product added to cart',
      };
    } catch (error) {
      throw new Error(`Failed to add to cart: ${error.message}`);
    }
  }

  /**
   * GET CART
   * Retrieve user's shopping cart
   */
  static async getCart(userId) {
    try {
      let cart = await Cart.findOne({ userId }).populate(
        'items.productId',
        'name price finalPrice images'
      );

      if (!cart) {
        cart = new Cart({ userId });
        await cart.save();
      }

      return cart;
    } catch (error) {
      throw new Error(`Failed to get cart: ${error.message}`);
    }
  }

  /**
   * UPDATE CART ITEM
   * Update quantity for item in cart
   */
  static async updateCartItem(userId, productId, quantity) {
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) throw new Error('Cart not found');

      const item = cart.items.find(i => i.productId.toString() === productId);
      if (!item) throw new Error('Item not found in cart');

      if (quantity <= 0) {
        // Remove item
        cart.items = cart.items.filter(
          i => i.productId.toString() !== productId
        );
      } else {
        item.quantity = quantity;
      }

      await cart.save();
      return cart;
    } catch (error) {
      throw new Error(`Failed to update cart: ${error.message}`);
    }
  }

  /**
   * REMOVE FROM CART
   * Remove item from cart
   */
  static async removeFromCart(userId, productId) {
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) throw new Error('Cart not found');

      cart.items = cart.items.filter(
        i => i.productId.toString() !== productId
      );

      await cart.save();
      return cart;
    } catch (error) {
      throw new Error(`Failed to remove from cart: ${error.message}`);
    }
  }

  /**
   * CLEAR CART
   * Empty all items from cart
   */
  static async clearCart(userId) {
    try {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
      return cart;
    } catch (error) {
      throw new Error(`Failed to clear cart: ${error.message}`);
    }
  }

  /**
   * APPLY COUPON
   * Apply discount coupon to cart
   */
  static async applyCoupon(userId, couponCode) {
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart) throw new Error('Cart not found');

      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() },
      });

      if (!coupon) throw new Error('Invalid or expired coupon');

      // Check usage
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new Error('Coupon usage limit reached');
      }

      // Check minimum purchase
      if (cart.subtotal < coupon.minPurchaseAmount) {
        throw new Error(
          `Minimum purchase ${coupon.minPurchaseAmount} required`
        );
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discountType === 'percentage') {
        discount = (cart.subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
      } else {
        discount = coupon.discountValue;
      }

      cart.coupon = couponCode;
      cart.discount = discount;
      await cart.save();

      return {
        success: true,
        cart,
        discount,
        message: 'Coupon applied',
      };
    } catch (error) {
      throw new Error(`Failed to apply coupon: ${error.message}`);
    }
  }

  /**
   * CREATE CHECKOUT SESSION
   * Initialize checkout process
   */
  static async createCheckoutSession(userId, shippingData) {
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const checkout = new Checkout({
        userId,
        sessionId,
        items: cart.items,
        shippingAddress: shippingData,
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping: cart.shipping,
        discount: cart.discount,
        total: cart.total,
        status: 'checkout',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
      });

      await checkout.save();

      return {
        success: true,
        sessionId: checkout.sessionId,
        checkout,
      };
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * UPDATE CHECKOUT PAYMENT
   * Update payment method and process payment
   */
  static async updateCheckoutPayment(sessionId, paymentData) {
    try {
      const checkout = await Checkout.findOne({ sessionId });
      if (!checkout) throw new Error('Checkout session not found');

      if (checkout.expiresAt < new Date()) {
        throw new Error('Checkout session expired');
      }

      checkout.paymentMethod = paymentData.method;
      checkout.paymentStatus = 'processing';
      checkout.status = 'payment_pending';

      // TODO: Integrate with payment gateway (Stripe, PayPal, etc.)
      // For now, simulate successful payment
      checkout.paymentStatus = 'completed';
      checkout.status = 'confirmed';

      await checkout.save();

      return {
        success: true,
        checkout,
        message: 'Payment processed successfully',
      };
    } catch (error) {
      throw new Error(`Failed to process payment: ${error.message}`);
    }
  }

  /**
   * GET CHECKOUT DETAILS
   * Retrieve checkout session details
   */
  static async getCheckout(sessionId) {
    try {
      const checkout = await Checkout.findOne({ sessionId });
      if (!checkout) throw new Error('Checkout session not found');

      return checkout;
    } catch (error) {
      throw new Error(`Failed to get checkout: ${error.message}`);
    }
  }

  /**
   * ADD TO WISHLIST
   * Add product to wishlist
   */
  static async addToWishlist(userId, productId) {
    try {
      let wishlist = await Wishlist.findOne({ userId });
      if (!wishlist) {
        wishlist = new Wishlist({ userId });
      }

      // Check if already in wishlist
      if (!wishlist.items.find(i => i.productId.toString() === productId)) {
        wishlist.items.push({ productId });
      }

      await wishlist.save();
      return wishlist;
    } catch (error) {
      throw new Error(`Failed to add to wishlist: ${error.message}`);
    }
  }

  /**
   * REMOVE FROM WISHLIST
   * Remove product from wishlist
   */
  static async removeFromWishlist(userId, productId) {
    try {
      const wishlist = await Wishlist.findOne({ userId });
      if (wishlist) {
        wishlist.items = wishlist.items.filter(
          i => i.productId.toString() !== productId
        );
        await wishlist.save();
      }
      return wishlist;
    } catch (error) {
      throw new Error(`Failed to remove from wishlist: ${error.message}`);
    }
  }

  /**
   * GET WISHLIST
   * Retrieve user's wishlist
   */
  static async getWishlist(userId) {
    try {
      let wishlist = await Wishlist.findOne({ userId }).populate(
        'items.productId',
        'name price finalPrice images rating'
      );

      if (!wishlist) {
        wishlist = new Wishlist({ userId });
        await wishlist.save();
      }

      return wishlist;
    } catch (error) {
      throw new Error(`Failed to get wishlist: ${error.message}`);
    }
  }

  /**
   * LOG INVENTORY
   * Track inventory changes
   */
  static async logInventoryChange(productId, action, quantity, reference) {
    try {
      const log = new InventoryLog({
        productId,
        action,
        quantity,
        reference,
        createdAt: new Date(),
      });

      await log.save();
      return log;
    } catch (error) {
      throw new Error(`Failed to log inventory: ${error.message}`);
    }
  }

  /**
   * GET SIMILAR PRODUCTS
   * Get products similar to given product
   */
  static async getSimilarProducts(productId, limit = 5) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      const similar = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        isActive: true,
      })
        .limit(limit)
        .lean();

      return similar;
    } catch (error) {
      throw new Error(`Failed to get similar products: ${error.message}`);
    }
  }

  /**
   * GET FEATURED PRODUCTS
   * Get featured products for homepage
   */
  static async getFeaturedProducts(limit = 10) {
    try {
      const featured = await Product.find({
        isFeatured: true,
        isActive: true,
      })
        .limit(limit)
        .lean();

      return featured;
    } catch (error) {
      throw new Error(`Failed to get featured products: ${error.message}`);
    }
  }

  /**
   * GET NEW PRODUCTS
   * Get recently added products
   */
  static async getNewProducts(limit = 10, days = 30) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const newProducts = await Product.find({
        createdAt: { $gte: since },
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return newProducts;
    } catch (error) {
      throw new Error(`Failed to get new products: ${error.message}`);
    }
  }

  /**
   * ADD PRODUCT REVIEW
   * Add review and rating to product
   */
  static async addProductReview(productId, userId, rating, title, comment) {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Check for duplicate review
      const existingReview = product.reviews.find(
        r => r.userId.toString() === userId
      );
      if (existingReview) {
        throw new Error('You have already reviewed this product');
      }

      // Add review
      product.reviews.push({
        userId,
        rating,
        title,
        comment,
      });

      // Recalculate average rating
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
      product.rating.average = (totalRating / product.reviews.length).toFixed(2);
      product.rating.count = product.reviews.length;

      await product.save();

      return {
        success: true,
        product,
        message: 'Review added successfully',
      };
    } catch (error) {
      throw new Error(`Failed to add review: ${error.message}`);
    }
  }

  /**
   * UPDATE PRODUCT STOCK
   * Update product stock after order
   */
  static async updateProductStock(productId, quantitySold) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      if (product.totalStock < quantitySold) {
        throw new Error('Insufficient stock');
      }

      product.totalStock -= quantitySold;
      await product.save();

      // Log the change
      await this.logInventoryChange(
        productId,
        'stock_out',
        quantitySold,
        'order'
      );

      return product;
    } catch (error) {
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  }
}

module.exports = EcommerceService;
