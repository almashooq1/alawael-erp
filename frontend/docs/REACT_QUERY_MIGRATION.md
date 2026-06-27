# دليل الهجرة إلى React Query

## لماذا React Query؟

| المشكلة (القديم) | الحل (React Query) |
|------------------|-------------------|
| `useEffect` + `useState` + `useCallback` في كل component | Hook واحد يفعل كل شيء |
| لا caching — يُعيد جلب البيانات في كل navigation | Caching ذكي مع staleTime |
| لا background refetch | Refetch تلقائي عند window focus |
| لا error handling موحد | Error handling مدمج |
| لا loading states موحدة | `isLoading`, `isFetching` مدمجين |
| لا optimistic updates | مدمج في `useMutation` |
| لا prefetching | `queryClient.prefetchQuery` |
| Cache invalidation يدوي | `invalidateQueries` تلقائي |

## الهجرة خطوة بخطوة

### الخطوة 1: تثبيت React Query

```bash
cd frontend
npm install @tanstack/react-query
```

### الخطوة 2: إضافة QueryProvider

تم بالفعل في `src/providers/QueryProvider.jsx` و `src/App.js`.

### الخطوة 3: استخدام الـ Hooks

#### مثال 1: Dashboard Summary

```jsx
// BEFORE (الطريقة القديمة)
import { useState, useEffect } from 'react';
import apiClient from '../services/api.client';

function DashboardSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/api/v1/dashboard/summary')
      .then(res => setData(res.data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div>خطأ!</div>;
  return <div>{data.summary}</div>;
}

// AFTER (React Query)
import { useDashboardSummary } from '../hooks/useDashboard';

function DashboardSummary() {
  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) return <div>جاري التحميل...</div>;
  if (error) return <div>خطأ: {error.message}</div>;
  return <div>{data.summary}</div>;
}
```

#### مثال 2: Search with debouncing

```jsx
// BEFORE
import { useState, useEffect } from 'react';

function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      apiClient.get('/api/v1/search', { params: { q: query } })
        .then(res => setResults(res.data));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return <div>...</div>;
}

// AFTER
import { useSearchSuggestions } from '../hooks/useSearch';

function SearchBox() {
  const [query, setQuery] = useState('');
  const { data: suggestions, isLoading } = useSearchSuggestions(query);

  return <div>...</div>;
}
```

#### مثال 3: Mutation with cache invalidation

```jsx
// BEFORE
function UpdateUserRole({ userId }) {
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (role) => {
    setUpdating(true);
    await apiClient.put(`/api/v1/rbac-admin/users/${userId}/role`, { role });
    // Manual cache invalidation??
    setUpdating(false);
  };

  return <button onClick={() => handleUpdate('admin')}>تحديث</button>;
}

// AFTER
import { useUpdateUserRole } from '../hooks/useRbac';

function UpdateUserRole({ userId }) {
  const { mutate, isPending } = useUpdateUserRole();

  const handleUpdate = (role) => {
    mutate({ userId, role });
  };

  return (
    <button onClick={() => handleUpdate('admin')} disabled={isPending}>
      {isPending ? 'جاري التحديث...' : 'تحديث'}
    </button>
  );
}
```

### الخطوة 4: Prefetching للسرعة

```jsx
import { useDashboardPrefetch } from '../hooks/useDashboard';

function Sidebar() {
  const { prefetch } = useDashboardPrefetch();

  return (
    <nav>
      <Link
        to="/dashboard"
        onMouseEnter={() => prefetch()} // Prefetch on hover!
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

## الـ Hooks المتاحة

| Hook | الوصف | الـ API |
|------|-------|---------|
| `useDashboardSummary` | ملخص Dashboard | `dashboardAPI.getSummary` |
| `useDashboardServices` | قائمة الخدمات | `dashboardAPI.getServices` |
| `useTopKPIs(limit)` | Top KPIs | `dashboardAPI.getTopKPIs` |
| `useModules` | قائمة Modules | `modulesAPI.getModules` |
| `useModule(key)` | Module محدد | `modulesAPI.getModuleData` |
| `useSearchFullText(q)` | بحث نصي | `searchAPI.fullText` |
| `useSearchFuzzy(q)` | بحث تقريب | `searchAPI.fuzzy` |
| `useSearchSuggestions(q)` | اقتراحات | `searchAPI.suggestions` |
| `useRoles` | قائمة Roles | `rbacAPI.getRoles` |
| `useRoleDetail(role)` | Role محدد | `rbacAPI.getRoleDetail` |
| `usePermissions` | الصلاحيات | `rbacAPI.getPermissions` |
| `useUserPermissions(userId)` | صلاحيات User | `rbacAPI.getUserPermissions` |
| `useUpdateUserRole` | تحديث Role | `rbacAPI.updateUserRole` |
| `useUpdateUserPermissions` | تحديث صلاحيات | `rbacAPI.updateUserPermissions` |
| `useGenericList` | أي List | `apiClient.get` |
| `useGenericDetail` | أي Detail | `apiClient.get` |
| `useGenericMutation` | أي Mutation | `apiClient.post/put/delete` |

## DevTools

في development mode، React Query DevTools يظهر تلقائياً في أسفل اليمين. يتيح لك:
- رؤية كل الـ queries والـ caches
- إبطال cache يدوياً
- تعديل query data للـ testing
- رؤية network activity

## استفسارات؟

راجع:
- [React Query Docs](https://tanstack.com/query/latest)
- `src/hooks/useDashboard.js` — مثال كامل
- `src/components/dashboard/DashboardWithRQ.jsx` — demo component
