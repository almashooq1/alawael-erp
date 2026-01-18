import re

with open('backend/services/advancedSearchService.js', 'r', encoding='utf-8') as f:
    content = f.read()

methods = '''
  // Levenshtein distance
  levenshteinDistance(str1, str2) {
    const m = str1.length, n = str2.length;
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[0][i] = i;
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = str1[j - 1] === str2[i - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[n][m];
  }

  // Fuzzy search
  fuzzySearch(data, query, field, returnSimilarity) {
    if (!Array.isArray(data) || !query) return [];
    const q = query.toLowerCase();
    const results = [];
    data.forEach(item => {
      const value = String(item[field] || '').toLowerCase();
      const distance = this.levenshteinDistance(q, value);
      const similarity = 1 - distance / Math.max(q.length, value.length);
      if (similarity >= 0.7) results.push(returnSimilarity ? {...item, similarity} : item);
    });
    return results;
  }

  // Compound search
  compoundSearch(data, options = {}) {
    const { query = '', filters = [], fields = null, sort = null } = options;
    if (!Array.isArray(data)) return [];
    let results = [...data];
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(item => Object.values(item).some(val => val && String(val).toLowerCase().includes(q)));
    }
    if (Array.isArray(filters) && filters.length > 0) {
      results = results.filter(item => filters.every(filter => {
        const { field, operator, value } = filter;
        const itemValue = item[field];
        switch (operator) {
          case 'equals': return itemValue === value;
          case 'notEquals': return itemValue !== value;
          case 'contains': return String(itemValue).includes(value);
          case 'gt': return itemValue > value;
          case 'lt': return itemValue < value;
          case 'gte': return itemValue >= value;
          case 'lte': return itemValue <= value;
          case 'in': return Array.isArray(value) && value.includes(itemValue);
          default: return true;
        }
      }));
    }
    if (sort && sort.field) {
      results.sort((a, b) => {
        const comp = a[sort.field] < b[sort.field] ? -1 : a[sort.field] > b[sort.field] ? 1 : 0;
        return sort.direction === 'desc' ? -comp : comp;
      });
    }
    if (Array.isArray(fields) && fields.length > 0) {
      results = results.map(item => {
        const selected = {};
        fields.forEach(f => { selected[f] = item[f]; });
        return selected;
      });
    }
    return results;
  }'''

content = re.sub(r'(\n}\s*\n\nmodule\.exports)', methods + r'\1', content)

with open('backend/services/advancedSearchService.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Methods added successfully')
