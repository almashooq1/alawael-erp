# 🚀 خطة التطوير الفعلية - البدء الآن

**خطة عملية لبدء التطوير الموجه للفريق التقني**

**التاريخ**: 8 فبراير 2026  
**الحالة**: جاهز للتنفيذ الآن

---

## 🎯 المرحلة الأولى: البدء بـ Advanced Search

### ✅ المهمة 1: إعداد البيئة (يوم 1)

#### Backend Setup

```bash
# 1. تحديث package.json
npm install express-validator mongoose

# 2. إضافة مكتبات البحث
npm install fuse.js  # للبحث المحلي
# أو
npm install elasticsearch  # للبحث المتقدم في الإنتاج

# 3. التحقق من الإعدادات
npm test

# 4. بدء الخادم
npm start
```

#### Frontend Setup

```bash
# 1. تحديث dependencies
cd frontend
npm install axios

# 2. التحقق من البناء
npm run build

# 3. اختبارات البدء
npm test -- --passWithNoTests

# 4. بدء تطوير
npm start
```

#### Database Preparation

```javascript
// إضافة indexes للبحث السريع
db.products.createIndex({ name: 'text', description: 'text', sku: 'text' });
db.suppliers.createIndex({ name: 'text', contact: 'text' });
db.orders.createIndex({ status: 1, createdAt: -1 });
```

---

### ✅ المهمة 2: بناء Advanced Search (يوم 2-3)

#### الخطوة 1: إنشاء Route جديد

**ملف**: `backend/routes/search.js`

```javascript
import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Order from '../models/Order.js';

const router = express.Router();

// Advanced Search Route
router.post(
  '/advanced',
  asyncHandler(async (req, res) => {
    const { query, filters = {}, sort = { createdAt: -1 }, page = 1, limit = 20 } = req.body;

    // بناء MongoDB query
    let searchQuery = {};

    if (query) {
      searchQuery.$text = { $search: query };
    }

    // إضافة الفلترات
    if (filters.category) {
      searchQuery.category = filters.category;
    }
    if (filters.priceMin || filters.priceMax) {
      searchQuery.price = {};
      if (filters.priceMin) {
        searchQuery.price.$gte = filters.priceMin;
      }
      if (filters.priceMax) {
        searchQuery.price.$lte = filters.priceMax;
      }
    }
    if (filters.stock !== undefined) {
      searchQuery.$expr = {
        $gte: ['$stock', filters.stock],
      };
    }

    // تنفيذ البحث
    const skip = (page - 1) * limit;
    const results = await Product.find(searchQuery).sort(sort).skip(skip).limit(limit);

    const total = await Product.countDocuments(searchQuery);

    res.json({
      success: true,
      data: results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }),
);

// Filter Options Route
router.get(
  '/filters',
  asyncHandler(async (req, res) => {
    const categories = await Product.distinct('category');
    const priceRange = await Product.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]);

    res.json({
      categories,
      priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
    });
  }),
);

export default router;
```

#### الخطوة 2: تحديث Backend Routes

**ملف**: `backend/index.js`

```javascript
import searchRoutes from './routes/search.js';

// ... existing code ...

app.use('/api/search', searchRoutes);
```

#### الخطوة 3: بناء Frontend Component

**ملف**: `frontend/src/components/SearchAdvanced.js`

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SearchAdvanced() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    priceMin: 0,
    priceMax: 100000,
    stock: 0,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  // جلب خيارات الفلتر
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await axios.get('/api/search/filters');
        setFilterOptions(response.data);
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };
    fetchFilters();
  }, []);

  // بحث متقدم
  const handleSearch = async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/search/advanced', {
        query,
        filters,
        page: pageNum,
        limit: 20,
      });
      setResults(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(pageNum);
    } catch (error) {
      console.error('Search error:', error);
      alert('خطأ في البحث');
    } finally {
      setLoading(false);
    }
  };

  // معالج الفلتر
  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name.includes('Price') ? parseFloat(value) : value,
    }));
  };

  return (
    <div className="search-advanced-container">
      <div className="search-header">
        <h1>🔍 بحث متقدم</h1>
      </div>

      <div className="search-section">
        {/* حقل البحث */}
        <div className="search-main">
          <input
            type="text"
            placeholder="ابحث عن منتج..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={() => handleSearch(1)} disabled={loading} className="search-button">
            {loading ? 'جاري البحث...' : 'بحث'}
          </button>
        </div>

        {/* الفلترات */}
        <div className="filters-section">
          <div className="filter-group">
            <label>الفئة</label>
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">الكل</option>
              {filterOptions.categories?.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              السعر: من {filters.priceMin} إلى {filters.priceMax}
            </label>
            <input
              type="range"
              name="priceMin"
              min="0"
              max={filterOptions.priceRange?.maxPrice || 100000}
              value={filters.priceMin}
              onChange={handleFilterChange}
            />
            <input
              type="range"
              name="priceMax"
              min="0"
              max={filterOptions.priceRange?.maxPrice || 100000}
              value={filters.priceMax}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label>حد أدنى للمخزون</label>
            <input type="number" name="stock" value={filters.stock} onChange={handleFilterChange} />
          </div>
        </div>
      </div>

      {/* النتائج */}
      <div className="results-section">
        {results.length > 0 && (
          <>
            <p className="results-count">وجدنا {pagination.total} منتج</p>
            <div className="product-grid">
              {results.map(product => (
                <div key={product._id} className="product-card">
                  <h3>{product.name}</h3>
                  <p className="sku">SKU: {product.sku}</p>
                  <p className="price">{product.price} ريال</p>
                  <p className="stock">المخزون: {product.stock}</p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                {Array.from({ length: pagination.pages }, (_, i) => (
                  <button key={i + 1} onClick={() => handleSearch(i + 1)} className={currentPage === i + 1 ? 'active' : ''}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SearchAdvanced;
```

#### الخطوة 4: تحديث Frontend App

**ملف**: `frontend/src/App.js`

```javascript
import SearchAdvanced from './components/SearchAdvanced';

// في JSX:
<Route path="/search" element={<SearchAdvanced />} />;
```

---

### ✅ المهمة 3: الاختبار (يوم 3-4)

#### Unit Tests للـ Backend

**ملف**: `backend/__tests__/search.test.cjs`

```javascript
const request = require('supertest');
const app = require('../index.js');

describe('Advanced Search API', () => {
  test('POST /api/search/advanced - بحث بسيط', async () => {
    const response = await request(app).post('/api/search/advanced').send({
      query: 'laptop',
      filters: {},
      page: 1,
      limit: 20,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('POST /api/search/advanced - بحث مع فلاتر', async () => {
    const response = await request(app)
      .post('/api/search/advanced')
      .send({
        query: '',
        filters: {
          category: 'Electronics',
          priceMin: 1000,
          priceMax: 10000,
        },
        page: 1,
        limit: 20,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeLessThanOrEqual(20);
  });

  test('GET /api/search/filters - جلب خيارات الفلتر', async () => {
    const response = await request(app).get('/api/search/filters');

    expect(response.status).toBe(200);
    expect(response.body.categories).toBeDefined();
    expect(response.body.priceRange).toBeDefined();
  });
});
```

#### Integration Tests

```bash
# تشغيل الاختبارات
npm test -- search.test.cjs

# يجب أن تمر جميع الاختبارات
# ✓ 3 اختبارات
# ✓ 0 failures
```

---

### ✅ المهمة 4: الدمج والإطلاق (يوم 4-5)

#### قائمة التحقق

- [ ] الكود يعمل محلياً بدون أخطاء
- [ ] جميع الاختبارات تمر (100%)
- [ ] لا توجد console errors
- [ ] الأداء جيد (response time < 500ms)
- [ ] Code review من فريق
- [ ] تحديث التوثيق

#### خطوات الدمج

```bash
# 1. إنشاء Branch جديد
git checkout -b feature/advanced-search

# 2. إضافة الملفات
git add backend/routes/search.js
git add frontend/src/components/SearchAdvanced.js
git add backend/__tests__/search.test.cjs

# 3. Commit
git commit -m "feat: add advanced search with filters

- Implement full-text search for products
- Add filtering by category, price, stock
- Create SearchAdvanced frontend component
- Add comprehensive unit tests
- Performance: < 500ms response time"

# 4. Push والـ PR
git push origin feature/advanced-search

# 5. Code Review وإذن من Lead
# ...

# 6. Merge للـ develop
git merge feature/advanced-search
```

---

## 📊 المرحلة الثانية: Redis Caching (الأسبوع التالي)

### المهام المرتبطة

```text
يوم 1:     Redux setup
يوم 2-3:   Caching implementation
يوم 4:     Testing
يوم 5:     Integration & Deployment
```

---

## ✅ معايير القبول (Definition of Done)

### للميزة الواحدة

```text
☑️ Code كامل وعاملي
☑️ Unit tests تمر (95%+)
☑️ Integration tests جاهزة
☑️ Code review اكتمل
☑️ Performance OK (< 500ms)
☑️ No console errors
☑️ Documentation updated
☑️ Ready for production
```

---

## 📈 معايير النجاح

### بعد 1 أسبوع من البدء

```text
✅ Advanced Search يعمل كاملاً
✅ الاختبارات تمر 100%
✅ الفريق متحمس
✅ المستخدمون سعداء
```

### بعد 2 أسبوع

```text
✅ Advanced Search في الإنتاج
✅ Redis Caching يعمل
✅ الأداء 3x أسرع
✅ الفريق متطور سريع
```

---

## 🎯 ملخص الأسبوع الأول

| اليوم     | المهمة         | الحالة |
| --------- | -------------- | ------ |
| **يوم 1** | إعداد البيئة   | ⏳     |
| **يوم 2** | بناء الـ Route | ⏳     |
| **يوم 3** | بناء Frontend  | ⏳     |
| **يوم 4** | الاختبارات     | ⏳     |
| **يوم 5** | الدمج والإطلاق | ⏳     |

---

<br>

**🚀 استعد للبدء الآن**

**📅 ابدأ بيوم 1: إعداد البيئة**

**🎉 النجاح في الطريق**
