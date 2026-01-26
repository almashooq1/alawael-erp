// ============================================================
// Knowledge Management System - Practical Application Examples
// أمثلة عملية لاستخدام نظام إدارة المعرفة
// ============================================================

/**
 * EXAMPLE 1: Using Knowledge Search in a React Component
 * مثال 1: استخدام البحث في مكون React
 */

import React, { useState } from 'react';
import KnowledgeSearch from './components/KnowledgeBase/KnowledgeSearch';

export function MedicalDashboard() {
  return (
    <div className="dashboard">
      <h1>لوحة التحكم الطبية</h1>
      <p>ابحث عن البروتوكولات والإجراءات</p>
      <KnowledgeSearch />
    </div>
  );
}

/**
 * EXAMPLE 2: Searching for Articles Programmatically
 * مثال 2: البحث عن المقالات برمجياً
 */

import axios from 'axios';

async function searchTherapeuticProtocols(keyword) {
  try {
    const response = await axios.get('http://localhost:3001/api/knowledge/search', {
      params: {
        q: keyword,
        category: 'therapeutic_protocols',
        limit: 20,
      },
    });

    console.log('نتائج البحث:', response.data.data.results);
    return response.data.data.results;
  } catch (error) {
    console.error('خطأ في البحث:', error);
  }
}

// الاستخدام:
// searchTherapeuticProtocols('علاج الحالة الحادة')

/**
 * EXAMPLE 3: Creating a New Knowledge Article
 * مثال 3: إنشاء مقالة معرفة جديدة
 */

async function createCaseStudy() {
  try {
    const newArticle = {
      title: 'دراسة حالة: مريض يعاني من مرض مزمن',
      description: 'دراسة شاملة لحالة مريض تم علاجه بنجاح',
      content: `
# المقدمة
شرح المرض والأعراض الأولية

# التشخيص
خطوات التشخيص المتبعة

# العلاج
الخطة العلاجية والنتائج

# الخلاصات
الدروس المستفادة
      `,
      category: 'case_studies',
      tags: ['حالة حقيقية', 'نجاح', 'مرض مزمن'],
    };

    const response = await axios.post('http://localhost:3001/api/knowledge/articles', newArticle, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    console.log('تم إنشاء المقالة:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('خطأ في إنشاء المقالة:', error);
  }
}

/**
 * EXAMPLE 4: Rating an Article
 * مثال 4: تقييم مقالة
 */

async function rateArticle(articleId, rating, feedback) {
  try {
    const response = await axios.post(
      `http://localhost:3001/api/knowledge/articles/${articleId}/rate`,
      {
        rating, // 1-5
        helpful: rating >= 4,
        feedback,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    console.log('تم حفظ التقييم:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('خطأ في التقييم:', error);
  }
}

// الاستخدام:
// rateArticle('article-id-123', 5, 'مقالة رائعة ومفيدة جداً')

/**
 * EXAMPLE 5: Fetching Trending Articles
 * مثال 5: الحصول على المقالات الشهيرة
 */

async function getTrendingArticles() {
  try {
    const response = await axios.get('http://localhost:3001/api/knowledge/trending?limit=5');

    console.log('المقالات الشهيرة:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('خطأ في جلب المقالات:', error);
  }
}

/**
 * EXAMPLE 6: Custom Search Component
 * مثال 6: مكون بحث مخصص
 */

import React, { useState, useEffect } from 'react';

export function CustomKnowledgeSearch({ onlyBestPractices = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = { q: query };
      if (onlyBestPractices) {
        params.category = 'best_practices';
      }

      const response = await axios.get('http://localhost:3001/api/knowledge/search', { params });

      setResults(response.data.data.results);
    } catch (error) {
      console.error('خطأ في البحث:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="ابحث هنا..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'جاري البحث...' : 'بحث'}
        </button>
      </form>

      <div className="results">
        {results.map(article => (
          <div key={article._id} className="result-item">
            <h3>{article.title}</h3>
            <p>{article.description}</p>
            <span>⭐ {article.ratings?.average || 0}/5</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * EXAMPLE 7: Analytics & Statistics
 * مثال 7: الإحصائيات والتحليلات
 */

async function getSystemStatistics() {
  try {
    const response = await axios.get('http://localhost:3001/api/knowledge/analytics/stats', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const { stats, totalArticles, totalViews } = response.data.data;

    console.log('الإحصائيات:');
    console.log(`- إجمالي المقالات: ${totalArticles}`);
    console.log(`- إجمالي المشاهدات: ${totalViews}`);
    console.log('- المقالات حسب التصنيف:');

    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} مقالات (${stat.totalViews} مشاهدة)`);
    });

    return { stats, totalArticles, totalViews };
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);
  }
}

/**
 * EXAMPLE 8: Popular Search Queries
 * مثال 8: الاستعلامات البحثية الشهيرة
 */

async function getPopularSearches() {
  try {
    const response = await axios.get(
      'http://localhost:3001/api/knowledge/analytics/searches?days=30',
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );

    console.log('أكثر الاستعلامات البحثية خلال 30 يوم:');
    response.data.data.forEach((search, index) => {
      console.log(`${index + 1}. "${search._id}" - ${search.count} مرة`);
    });

    return response.data.data;
  } catch (error) {
    console.error('خطأ في جلب البحث:', error);
  }
}

/**
 * EXAMPLE 9: Get Articles by Category
 * مثال 9: الحصول على المقالات حسب التصنيف
 */

async function getArticlesByCategory(category, page = 1) {
  try {
    const response = await axios.get(`http://localhost:3001/api/knowledge/categories/${category}`, {
      params: {
        page,
        limit: 10,
      },
    });

    const { articles, pagination } = response.data.data;

    console.log(`المقالات في تصنيف "${category}":`);
    articles.forEach(article => {
      console.log(`- ${article.title} (${article.views} مشاهدة)`);
    });

    console.log(`الصفحة ${pagination.page} من ${pagination.pages}`);

    return { articles, pagination };
  } catch (error) {
    console.error('خطأ في جلب المقالات:', error);
  }
}

// الاستخدام:
// getArticlesByCategory('best_practices', 1)

/**
 * EXAMPLE 10: Integration with User Dashboard
 * مثال 10: التكامل مع لوحة المستخدم الشخصية
 */

export function UserDashboard({ userId }) {
  const [topRatedArticles, setTopRatedArticles] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    // جلب أفضل المقالات
    axios
      .get('http://localhost:3001/api/knowledge/top-rated?limit=5')
      .then(res => setTopRatedArticles(res.data.data))
      .catch(err => console.error(err));

    // جلب الاستعلامات الشهيرة
    axios
      .get('http://localhost:3001/api/knowledge/analytics/searches?days=7')
      .then(res => setRecentSearches(res.data.data.slice(0, 5)))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="dashboard">
      <section>
        <h2>أفضل المقالات التقييماً</h2>
        <ul>
          {topRatedArticles.map(article => (
            <li key={article._id}>
              <a href={`/knowledge/${article.slug}`}>
                {article.title} ⭐ {article.ratings?.average}/5
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>الاستعلامات الشهيرة</h2>
        <ul>
          {recentSearches.map((search, idx) => (
            <li key={idx}>
              <a href={`/knowledge?q=${search._id}`}>
                {search._id} ({search.count} بحث)
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * EXAMPLE 11: Advanced Search with Filters
 * مثال 11: بحث متقدم مع مرشحات
 */

async function advancedSearch({ query, category, tags, minRating = 0, sortBy = 'relevance' }) {
  try {
    const params = {
      q: query,
      limit: 50,
    };

    if (category) params.category = category;
    if (tags && tags.length > 0) params.tags = tags.join(',');

    const response = await axios.get('http://localhost:3001/api/knowledge/search', { params });

    let results = response.data.data.results;

    // Client-side filtering
    if (minRating > 0) {
      results = results.filter(article => (article.ratings?.average || 0) >= minRating);
    }

    // Sorting
    if (sortBy === 'views') {
      results.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'rating') {
      results.sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));
    }

    return results;
  } catch (error) {
    console.error('خطأ في البحث المتقدم:', error);
  }
}

// الاستخدام:
// advancedSearch({
//   query: 'علاج',
//   category: 'therapeutic_protocols',
//   tags: ['علاج', 'أساسي'],
//   minRating: 4,
//   sortBy: 'rating'
// })

/**
 * EXAMPLE 12: Creating Knowledge Base Widget
 * مثال 12: إنشاء أداة قاعدة معرفة
 */

export function KnowledgeWidget({ limit = 3 }) {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    axios
      .get(`http://localhost:3001/api/knowledge/trending?limit=${limit}`)
      .then(res => setArticles(res.data.data))
      .catch(err => console.error(err));
  }, [limit]);

  return (
    <div className="knowledge-widget">
      <h3>📚 مقالات شهيرة</h3>
      <ul className="articles-list">
        {articles.map(article => (
          <li key={article._id}>
            <a href={`/knowledge/${article.slug}`} title={article.title}>
              {article.title.substring(0, 30)}...
            </a>
            <span className="views">👁️ {article.views}</span>
          </li>
        ))}
      </ul>
      <a href="/knowledge" className="view-all">
        عرض جميع المقالات →
      </a>
    </div>
  );
}

// ============================================================
// النتيجة النهائية: نظام متكامل جاهز للاستخدام
// ============================================================

console.log(`
✅ أمثلة عملية شاملة
✅ جاهز للنسخ واللصق
✅ يغطي جميع الحالات الشائعة
✅ مع شرح وتعليقات
✅ بالعربية والإنجليزية
`);
