/**
 * Unit tests for EcommerceService.js (751L)
 * Static class methods with Mongoose models
 */

/* ── helpers placed on global for jest.mock scope ── */
global.__mkEcomQ = () => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    exec: jest.fn().mockResolvedValue([]),
  };
  return q;
};

/* ── Mock models ── */
jest.mock('../../models/ecommerce.models', () => {
  const Q = global.__mkEcomQ;
  const mkModel = (extra = {}) => {
    const M = jest.fn(function (data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    });
    const q = Q();
    M.find = jest.fn().mockReturnValue(q);
    M.findOne = jest.fn().mockResolvedValue(null);
    M.findById = jest.fn().mockResolvedValue(null);
    M.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    M.countDocuments = jest.fn().mockResolvedValue(0);
    M.collection = { createIndex: jest.fn().mockResolvedValue(true) };
    Object.assign(M, extra);
    return M;
  };
  return {
    Product: mkModel(),
    Cart: mkModel(),
    Checkout: mkModel(),
    Coupon: mkModel(),
    Wishlist: mkModel(),
    InventoryLog: mkModel(),
  };
});

jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

const EcommerceService = require('../../services/EcommerceService');
const {
  Product,
  Cart,
  Checkout,
  Coupon,
  Wishlist,
  InventoryLog,
} = require('../../models/ecommerce.models');

describe('EcommerceService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ═══════════════ getProducts ═══════════════ */
  describe('getProducts', () => {
    it('returns products with pagination', async () => {
      const q = global.__mkEcomQ();
      q.select.mockReturnValue(q);
      q.lean = undefined; // chain ends at select
      // Make find return the chainable
      Product.find.mockReturnValue(q);
      Product.countDocuments.mockResolvedValue(42);

      const res = await EcommerceService.getProducts({ page: 2, limit: 10 });
      expect(Product.find).toHaveBeenCalled();
      expect(res.pagination.total).toBe(42);
      expect(res.pagination.page).toBe(2);
    });

    it('applies search filter', async () => {
      const q = global.__mkEcomQ();
      q.select.mockReturnValue(q);
      Product.find.mockReturnValue(q);
      Product.countDocuments.mockResolvedValue(0);

      await EcommerceService.getProducts({ search: 'test' });
      const filter = Product.find.mock.calls[0][0];
      expect(filter.$or).toBeDefined();
    });

    it('applies price range filter', async () => {
      const q = global.__mkEcomQ();
      q.select.mockReturnValue(q);
      Product.find.mockReturnValue(q);
      Product.countDocuments.mockResolvedValue(0);

      await EcommerceService.getProducts({ minPrice: 50, maxPrice: 200 });
      const filter = Product.find.mock.calls[0][0];
      expect(filter.finalPrice.$gte).toBe(50);
      expect(filter.finalPrice.$lte).toBe(200);
    });
  });

  /* ═══════════════ getProductDetails ═══════════════ */
  describe('getProductDetails', () => {
    it('returns product', async () => {
      const prod = { _id: 'p1', name: 'Widget' };
      Product.findById.mockResolvedValue(prod);
      const res = await EcommerceService.getProductDetails('p1');
      expect(res.name).toBe('Widget');
    });

    it('throws if not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(EcommerceService.getProductDetails('x')).rejects.toThrow('Product not found');
    });
  });

  /* ═══════════════ searchProducts ═══════════════ */
  describe('searchProducts', () => {
    it('attempts text search then falls back to regex', async () => {
      const q = global.__mkEcomQ();
      q.lean.mockResolvedValue([{ name: 'item' }]);
      // Make find() with text search throw to trigger fallback
      Product.find.mockImplementation(filter => {
        if (filter && filter.$text) {
          const err = new Error('text index not found');
          return {
            sort: () => ({
              limit: () => ({
                lean: () => {
                  throw err;
                },
              }),
            }),
          };
        }
        return q;
      });

      const res = await EcommerceService.searchProducts('test');
      expect(res).toBeDefined();
    });
  });

  /* ═══════════════ addToCart ═══════════════ */
  describe('addToCart', () => {
    it('creates new cart and adds item', async () => {
      const prod = { _id: 'p1', totalStock: 10, finalPrice: 99 };
      Product.findById.mockResolvedValue(prod);
      Cart.findOne.mockResolvedValue(null);

      const cartInstance = { userId: 'u1', items: [], save: jest.fn().mockResolvedValue(true) };
      Cart.mockImplementation(function (data) {
        Object.assign(cartInstance, data);
        return cartInstance;
      });

      const res = await EcommerceService.addToCart('u1', 'p1', 2);
      expect(res.success).toBe(true);
      expect(cartInstance.items.length).toBe(1);
    });

    it('throws when insufficient stock', async () => {
      Product.findById.mockResolvedValue({ _id: 'p1', totalStock: 1 });
      await expect(EcommerceService.addToCart('u1', 'p1', 5)).rejects.toThrow('1 items in stock');
    });

    it('throws when product not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(EcommerceService.addToCart('u1', 'p1', 1)).rejects.toThrow('Product not found');
    });

    it('increments quantity of existing cart item', async () => {
      Product.findById.mockResolvedValue({ _id: 'p1', totalStock: 20, finalPrice: 50 });
      const existingItem = { productId: { toString: () => 'p1' }, quantity: 3, variant: null };
      const cart = { userId: 'u1', items: [existingItem], save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);

      await EcommerceService.addToCart('u1', 'p1', 2, null);
      expect(existingItem.quantity).toBe(5);
    });
  });

  /* ═══════════════ getCart ═══════════════ */
  describe('getCart', () => {
    it('returns existing cart', async () => {
      const q = { populate: jest.fn().mockResolvedValue({ items: [] }) };
      Cart.findOne.mockReturnValue(q);
      const res = await EcommerceService.getCart('u1');
      expect(res).toBeDefined();
    });

    it('creates new cart if none exists', async () => {
      Cart.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      const cartInst = { save: jest.fn().mockResolvedValue(true) };
      Cart.mockImplementation(() => cartInst);
      const res = await EcommerceService.getCart('u1');
      expect(cartInst.save).toHaveBeenCalled();
    });
  });

  /* ═══════════════ updateCartItem ═══════════════ */
  describe('updateCartItem', () => {
    it('updates item quantity', async () => {
      const item = { productId: { toString: () => 'p1' }, quantity: 1 };
      const cart = { items: [item], save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);

      const res = await EcommerceService.updateCartItem('u1', 'p1', 5);
      expect(item.quantity).toBe(5);
    });

    it('removes item when quantity <= 0', async () => {
      const item = { productId: { toString: () => 'p1' }, quantity: 1 };
      const cart = { items: [item], save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);

      await EcommerceService.updateCartItem('u1', 'p1', 0);
      expect(cart.items.length).toBe(0);
    });

    it('throws if cart not found', async () => {
      Cart.findOne.mockResolvedValue(null);
      await expect(EcommerceService.updateCartItem('u1', 'p1', 1)).rejects.toThrow(
        'Cart not found'
      );
    });

    it('throws if item not in cart', async () => {
      Cart.findOne.mockResolvedValue({ items: [] });
      await expect(EcommerceService.updateCartItem('u1', 'p1', 1)).rejects.toThrow(
        'Item not found in cart'
      );
    });
  });

  /* ═══════════════ removeFromCart ═══════════════ */
  describe('removeFromCart', () => {
    it('removes item from cart', async () => {
      const item = { productId: { toString: () => 'p1' } };
      const cart = { items: [item], save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);

      await EcommerceService.removeFromCart('u1', 'p1');
      expect(cart.items.length).toBe(0);
    });

    it('throws if cart not found', async () => {
      Cart.findOne.mockResolvedValue(null);
      await expect(EcommerceService.removeFromCart('u1', 'p1')).rejects.toThrow('Cart not found');
    });
  });

  /* ═══════════════ clearCart ═══════════════ */
  describe('clearCart', () => {
    it('empties cart items', async () => {
      const cart = { items: [{ x: 1 }], save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);
      await EcommerceService.clearCart('u1');
      expect(cart.items.length).toBe(0);
    });
  });

  /* ═══════════════ applyCoupon ═══════════════ */
  describe('applyCoupon', () => {
    it('applies percentage coupon', async () => {
      const cart = {
        subtotal: 200,
        coupon: null,
        discount: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      Cart.findOne.mockResolvedValue(cart);
      Coupon.findOne.mockResolvedValue({
        code: 'SAVE20',
        discountType: 'percentage',
        discountValue: 20,
        maxUses: 100,
        usedCount: 5,
        minPurchaseAmount: 50,
      });

      const res = await EcommerceService.applyCoupon('u1', 'SAVE20');
      expect(res.success).toBe(true);
      expect(res.discount).toBe(40); // 20% of 200
    });

    it('applies fixed coupon', async () => {
      const cart = { subtotal: 200, save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);
      Coupon.findOne.mockResolvedValue({
        code: 'FLAT50',
        discountType: 'fixed',
        discountValue: 50,
        minPurchaseAmount: 100,
      });

      const res = await EcommerceService.applyCoupon('u1', 'FLAT50');
      expect(res.discount).toBe(50);
    });

    it('throws for invalid coupon', async () => {
      Cart.findOne.mockResolvedValue({ subtotal: 200 });
      Coupon.findOne.mockResolvedValue(null);
      await expect(EcommerceService.applyCoupon('u1', 'BAD')).rejects.toThrow(
        'Invalid or expired coupon'
      );
    });

    it('respects maxDiscount cap on percentage coupon', async () => {
      const cart = { subtotal: 1000, save: jest.fn().mockResolvedValue(true) };
      Cart.findOne.mockResolvedValue(cart);
      Coupon.findOne.mockResolvedValue({
        discountType: 'percentage',
        discountValue: 50,
        maxDiscount: 100,
        minPurchaseAmount: 0,
      });

      const res = await EcommerceService.applyCoupon('u1', 'BIG');
      expect(res.discount).toBe(100); // capped at maxDiscount
    });
  });

  /* ═══════════════ createCheckoutSession ═══════════════ */
  describe('createCheckoutSession', () => {
    it('creates checkout session', async () => {
      const cart = {
        items: [{ productId: 'p1', quantity: 2 }],
        subtotal: 200,
        tax: 30,
        shipping: 10,
        discount: 0,
        total: 240,
      };
      Cart.findOne.mockResolvedValue(cart);

      const savedCheckout = { sessionId: 'sess123', save: jest.fn().mockResolvedValue(true) };
      Checkout.mockImplementation(function (data) {
        Object.assign(savedCheckout, data);
        return savedCheckout;
      });

      const res = await EcommerceService.createCheckoutSession('u1', { city: 'Riyadh' });
      expect(res.success).toBe(true);
      expect(res.checkout).toBeDefined();
    });

    it('throws when cart is empty', async () => {
      Cart.findOne.mockResolvedValue({ items: [] });
      await expect(EcommerceService.createCheckoutSession('u1', {})).rejects.toThrow(
        'Cart is empty'
      );
    });

    it('throws when cart not found', async () => {
      Cart.findOne.mockResolvedValue(null);
      await expect(EcommerceService.createCheckoutSession('u1', {})).rejects.toThrow(
        'Cart is empty'
      );
    });
  });

  /* ═══════════════ updateCheckoutPayment ═══════════════ */
  describe('updateCheckoutPayment', () => {
    it('simulates successful payment in dev mode', async () => {
      const old = process.env.NODE_ENV;
      delete process.env.NODE_ENV;
      delete process.env.PAYMENT_GATEWAY;

      const checkout = {
        sessionId: 's1',
        expiresAt: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(true),
      };
      Checkout.findOne.mockResolvedValue(checkout);

      const res = await EcommerceService.updateCheckoutPayment('s1', { method: 'card' });
      expect(res.success).toBe(true);
      expect(checkout.paymentStatus).toBe('completed');

      process.env.NODE_ENV = old;
    });

    it('throws if session not found', async () => {
      Checkout.findOne.mockResolvedValue(null);
      await expect(EcommerceService.updateCheckoutPayment('bad_session', {})).rejects.toThrow(
        'Checkout session not found'
      );
    });

    it('throws if session expired', async () => {
      Checkout.findOne.mockResolvedValue({
        sessionId: 's1',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(EcommerceService.updateCheckoutPayment('s1', {})).rejects.toThrow(
        'Checkout session expired'
      );
    });
  });

  /* ═══════════════ Wishlist ═══════════════ */
  describe('addToWishlist', () => {
    it('creates new wishlist and adds item', async () => {
      Wishlist.findOne.mockResolvedValue(null);
      const wl = { items: [], save: jest.fn().mockResolvedValue(true) };
      Wishlist.mockImplementation(() => wl);

      await EcommerceService.addToWishlist('u1', 'p1');
      expect(wl.items.length).toBe(1);
    });

    it('does not add duplicate', async () => {
      const wl = {
        items: [{ productId: { toString: () => 'p1' } }],
        save: jest.fn().mockResolvedValue(true),
      };
      Wishlist.findOne.mockResolvedValue(wl);
      await EcommerceService.addToWishlist('u1', 'p1');
      expect(wl.items.length).toBe(1);
    });
  });

  describe('removeFromWishlist', () => {
    it('removes item from wishlist', async () => {
      const wl = {
        items: [{ productId: { toString: () => 'p1' } }],
        save: jest.fn().mockResolvedValue(true),
      };
      Wishlist.findOne.mockResolvedValue(wl);
      await EcommerceService.removeFromWishlist('u1', 'p1');
      expect(wl.items.length).toBe(0);
    });
  });

  describe('getWishlist', () => {
    it('returns existing wishlist', async () => {
      const q = { populate: jest.fn().mockResolvedValue({ items: [{ x: 1 }] }) };
      Wishlist.findOne.mockReturnValue(q);
      const res = await EcommerceService.getWishlist('u1');
      expect(res.items.length).toBe(1);
    });
  });

  /* ═══════════════ Inventory ═══════════════ */
  describe('logInventoryChange', () => {
    it('creates inventory log', async () => {
      const logInst = { save: jest.fn().mockResolvedValue(true), productId: 'p1' };
      InventoryLog.mockImplementation(function (data) {
        Object.assign(logInst, data);
        return logInst;
      });
      const res = await EcommerceService.logInventoryChange('p1', 'stock_in', 10, 'restock');
      expect(logInst.save).toHaveBeenCalled();
    });
  });

  /* ═══════════════ Product queries ═══════════════ */
  describe('getSimilarProducts', () => {
    it('returns similar products', async () => {
      Product.findById.mockResolvedValue({ category: 'electronics' });
      const q = global.__mkEcomQ();
      q.lean.mockResolvedValue([{ name: 'similar' }]);
      Product.find.mockReturnValue(q);
      const res = await EcommerceService.getSimilarProducts('p1');
      expect(res).toEqual([{ name: 'similar' }]);
    });

    it('throws if product not found', async () => {
      Product.findById.mockResolvedValue(null);
      await expect(EcommerceService.getSimilarProducts('x')).rejects.toThrow('Product not found');
    });
  });

  describe('getFeaturedProducts', () => {
    it('queries featured products', async () => {
      const q = global.__mkEcomQ();
      q.lean.mockResolvedValue([{ name: 'featured' }]);
      Product.find.mockReturnValue(q);
      const res = await EcommerceService.getFeaturedProducts();
      expect(Product.find).toHaveBeenCalledWith(expect.objectContaining({ isFeatured: true }));
    });
  });

  describe('getNewProducts', () => {
    it('queries recent products', async () => {
      const q = global.__mkEcomQ();
      q.lean.mockResolvedValue([]);
      Product.find.mockReturnValue(q);
      await EcommerceService.getNewProducts(10, 7);
      expect(Product.find).toHaveBeenCalled();
    });
  });

  /* ═══════════════ Reviews ═══════════════ */
  describe('addProductReview', () => {
    it('adds a review and recalculates rating', async () => {
      const product = {
        _id: 'p1',
        reviews: [],
        rating: { average: 0, count: 0 },
        save: jest.fn().mockResolvedValue(true),
      };
      Product.findById.mockResolvedValue(product);

      const res = await EcommerceService.addProductReview('p1', 'u1', 4, 'Great', 'Excellent!');
      expect(res.success).toBe(true);
      expect(product.reviews.length).toBe(1);
      expect(parseFloat(product.rating.average)).toBe(4);
    });

    it('throws for invalid rating', async () => {
      await expect(
        EcommerceService.addProductReview('p1', 'u1', 0, 'Bad', 'Terrible')
      ).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('throws for duplicate review', async () => {
      const product = {
        reviews: [{ userId: { toString: () => 'u1' } }],
      };
      Product.findById.mockResolvedValue(product);
      await expect(
        EcommerceService.addProductReview('p1', 'u1', 5, 'Again', 'Dup')
      ).rejects.toThrow('already reviewed');
    });
  });

  /* ═══════════════ updateProductStock ═══════════════ */
  describe('updateProductStock', () => {
    it('reduces stock and logs change', async () => {
      const product = { _id: 'p1', totalStock: 10, save: jest.fn().mockResolvedValue(true) };
      Product.findById.mockResolvedValue(product);

      // Mock logInventoryChange via InventoryLog
      const logInst = { save: jest.fn().mockResolvedValue(true) };
      InventoryLog.mockImplementation(function (data) {
        Object.assign(logInst, data);
        return logInst;
      });

      const res = await EcommerceService.updateProductStock('p1', 3);
      expect(product.totalStock).toBe(7);
    });

    it('throws when insufficient stock', async () => {
      Product.findById.mockResolvedValue({ _id: 'p1', totalStock: 2 });
      await expect(EcommerceService.updateProductStock('p1', 5)).rejects.toThrow(
        'Insufficient stock'
      );
    });
  });
});
