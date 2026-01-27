import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Input, Modal, Form, Tag, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useI18n, I18nProvider } from './i18n';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  aiSummary?: string;
}

function KnowledgeArticlePanelInner() {
    const { t, lang, setLang } = useI18n();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(handler);
  }, [search]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null);
  const [form] = Form.useForm();
  // Smart suggestion state
  const [topQuestions, setTopQuestions] = useState<[string, number][]>([]);
  useEffect(() => {
    fetch('/dashboard/api/stats').then(r=>r.json()).then(data=>{
      if (data && Array.isArray(data.topQuestions)) setTopQuestions(data.topQuestions);
    });
  }, []);

  const fetchArticles = async (query?: string) => {
    setLoading(true);
    try {
      const url = query && query.trim()
        ? `/v1/knowledge/articles/search/${encodeURIComponent(query)}`
        : '/v1/knowledge/articles';
      const res = await fetch(url);
      setArticles(await res.json());
    } catch (e) {
      message.error(t('failedToLoadArticles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArticles(); }, []);
  // Fetch on debounced search
  useEffect(() => { if (debouncedSearch !== '') fetchArticles(debouncedSearch); }, [debouncedSearch]);

  const handleSearch = () => fetchArticles(search);

  const openModal = (article?: KnowledgeArticle) => {
    setEditing(article || null);
    setModalOpen(true);
    if (article) form.setFieldsValue(article);
    else form.resetFields();
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: t('confirmDelete') || 'تأكيد الحذف',
      content: t('areYouSureDelete') || 'هل أنت متأكد من حذف هذه المقالة؟',
      okText: t('delete') || 'حذف',
      cancelText: t('cancel') || 'إلغاء',
      onOk: async () => {
        await fetch(`/v1/knowledge/articles/${id}`, { method: 'DELETE' });
        message.success(t('deleted'));
        fetchArticles();
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await fetch(`/v1/knowledge/articles/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        message.success(t('updated'));
      } else {
        await fetch('/v1/knowledge/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        message.success(t('added'));
      }
      setModalOpen(false);
      fetchArticles();
    } catch (e) {
      // ignore
    }
  };

  // Find repeated question with no article
  const suggested = useMemo(() => {
    const threshold = 3;
    for (const [q, c] of topQuestions) {
      if (c >= threshold && !articles.some(a => a.title.trim() === q.trim())) {
        return { q, c };
      }
    }
    return null;
  }, [topQuestions, articles]);

  return (
    <div>
      {suggested && (
        <div style={{background:'#fffbe6',border:'1px solid #ffe58f',padding:16,borderRadius:8,marginBottom:24,boxShadow:'0 2px 8px #ffe58f'}}>
          <b>{t('smartSuggestion') || 'اقتراح ذكي:'}</b> {t('question') || 'السؤال'} <span style={{color:'#d4380d',fontWeight:'bold'}}>{suggested.q}</span> {t('repeated') || 'تكرر'} <span style={{color:'#d4380d'}}>{suggested.c} {t('times') || 'مرة'}</span> {t('notDocumentedAsArticle') || 'ولم يتم توثيقه كمقالة معرفة.'}<br/>
          <span>{t('recommendCreateArticle') || 'يوصى بإنشاء مقالة معرفة للإجابة عليه.'}</span>
          <div style={{marginTop:10}}>
            <Button type="primary" onClick={()=>{
              setEditing(null);
              setModalOpen(true);
              form.setFieldsValue({ title: suggested.q, content: '', tags: '' });
            }}>{t('createArticleForQuestion') || 'إنشاء مقالة لهذا السؤال'}</Button>
          </div>
        </div>
      )}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <Space>
          <Input
            placeholder={t('searchArticles') || 'بحث في المقالات...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>{t('search') || 'بحث'}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>{t('newArticle') || 'مقالة جديدة'}</Button>
        </Space>
        <label htmlFor="lang-switcher" style={{marginLeft:8,fontWeight:500}}>🌐</label>
        <select
          id="lang-switcher"
          aria-label="Language selector"
          value={lang}
          onChange={e=>setLang(e.target.value as 'ar'|'en'|'fr')}
          style={{padding:'2px 8px',fontSize:14,borderRadius:4,border:'1px solid #ccc',marginLeft:4}}
        >
          <option value="ar">🇸🇦 العربية</option>
          <option value="en">🇬🇧 English</option>
          <option value="fr">🇫🇷 Français</option>
        </select>
      </div>
      <Table
        dataSource={articles}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: t('title') || 'العنوان', dataIndex: 'title', key: 'title' },
          { title: t('tags') || 'الوسوم', dataIndex: 'tags', key: 'tags', render: (tags: string[]) => tags.map(tag => <Tag key={tag}>{tag}</Tag>) },
          { title: t('aiSummary') || 'الملخص الذكي', dataIndex: 'aiSummary', key: 'aiSummary', render: (s: string) => s || '-' },
          { title: t('createdAt') || 'تاريخ الإنشاء', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleString() },
          { title: t('updatedAt') || 'آخر تحديث', dataIndex: 'updatedAt', key: 'updatedAt', render: (d: string) => new Date(d).toLocaleString() },
          {
            title: t('actions') || 'إجراءات',
            key: 'actions',
            render: React.useMemo(() => (_: any, rec: KnowledgeArticle) => (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => openModal(rec)} />
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(rec.id)} />
              </Space>
            ), [])
          }
        ]}
      />
      <Modal
        open={modalOpen}
        title={editing ? t('editArticle') || 'تعديل مقالة' : t('addArticle') || 'إضافة مقالة'}
        onCancel={() => setModalOpen(false)}
        onOk={handleModalOk}
        okText={editing ? t('update') || 'تحديث' : t('add') || 'إضافة'}
        cancelText={t('cancel') || 'إلغاء'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('title') || 'العنوان'} rules={[{ required: true, message: t('titleRequired') || 'العنوان مطلوب' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label={t('content') || 'المحتوى'} rules={[{ required: true, message: t('contentRequired') || 'المحتوى مطلوب' }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
          <Form.Item name="tags" label={t('tags') || 'الوسوم'} rules={[{ required: true, message: t('tagsRequired') || 'أدخل وسوماً (مفصولة بفاصلة)' }]}>
            <Input placeholder={t('tagsPlaceholder') || 'مثال: إدارة, تقنية, ذكاء اصطناعي'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function KnowledgeArticlePanel() {
  return (
    <I18nProvider>
      <KnowledgeArticlePanelInner />
    </I18nProvider>
  );
}
