import RiskAnalytics from './RiskAnalytics';
// مكتبات التصدير
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
  // تصدير PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Risk Report', 14, 16);
    (doc as any).autoTable({
      head: [['Title', 'Category', 'Likelihood', 'Impact', 'Risk Score', 'Owner', 'Status']],
      body: risksWithScore.map(r => [r.title, r.category, r.likelihood, r.impact, r.riskScore, r.owner, r.status]),
      startY: 22,
    });
    import { useTranslation } from '../i18n';
    return (
      <>
        <RiskAnalytics risks={risksWithScore} />
        doc.text(t('exportPDF') || 'Risk Report', 14, 16);
          <div style={{marginBottom:16}}>
          head: [[t('title'), t('category'), t('likelihood'), t('impact'), t('riskScore'), t('owner'), t('status')]],
            <ul>
              {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
            </ul>
          </div>
          <Table
            dataSource={risksWithScore}
            rowKey="_id"
            loading={loading}
            expandable={{
              expandedRowRender: (record) => (
                <div>
                  <b>المرفقات:</b>
                  <Upload
                    showUploadList={false}
                    customRequest={({ file }) => handleUpload(record._id, file)}
                  >
                    <Button icon={<UploadOutlined />}>رفع مرفق</Button>
                  </Upload>
                  <List
                    size="small"
                    dataSource={record.attachments || []}
                    renderItem={(item: any) => (
                      <List.Item>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <PaperClipOutlined /> {item.filename}
                        </a>
                        <span style={{marginLeft:8, color:'#888', fontSize:12}}>
                          ({item.uploadedBy})
                        </span>
                      </List.Item>
                    )}
                  />
                </div>
              ),
            }}
            columns={[
              { title: 'Title', dataIndex: 'title' },
              { title: 'Category', dataIndex: 'category' },
              { title: 'Likelihood', dataIndex: 'likelihood' },
              { title: 'Impact', dataIndex: 'impact' },
              { title: 'Risk Score', dataIndex: 'riskScore', render: (v:number) => <b style={{color:v>=15?'#e74c3c':v>=8?'#faad14':'#52c41a'}}>{v}</b> },
              { title: 'Owner', dataIndex: 'owner' },
              { title: 'Status', dataIndex: 'status' },
              {
                title: 'Actions',
                  { title: t('title') || 'Title', dataIndex: 'title' },
                  { title: t('category') || 'Category', dataIndex: 'category' },
                  { title: t('likelihood') || 'Likelihood', dataIndex: 'likelihood' },
                  { title: t('impact') || 'Impact', dataIndex: 'impact' },
                  { title: t('riskScore') || 'Risk Score', dataIndex: 'riskScore', render: (v:number) => <b style={{color:v>=15?'#e74c3c':v>=8?'#faad14':'#52c41a'}}>{v}</b> },
                  { title: t('owner') || 'Owner', dataIndex: 'owner' },
                  { title: t('status') || 'Status', dataIndex: 'status' },
                  {
                    title: t('actions') || 'Actions',
                    render: (_, record) => (
                      <>
                        <Button size="small" onClick={() => handleEdit(record)} style={{ marginRight: 8 }}>{t('editRisk') || 'Edit'}</Button>
                        <Button size="small" danger onClick={() => handleDelete(record._id)}>{t('deleteRisk') || 'Delete'}</Button>
                      </>
                    ),
                  },
              <Form.Item name="title" label="Title" rules={[{ required: true }]}> <Input /> </Form.Item>
              <Form.Item name="description" label="Description" rules={[{ required: true }]}> <Input.TextArea /> </Form.Item>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}> <Input /> </Form.Item>
              <Form.Item name="likelihood" label="Likelihood" rules={[{ required: true, type: 'number', min: 1, max: 5 }]}> <Input type="number" min={1} max={5} /> </Form.Item>
              <Form.Item name="impact" label="Impact" rules={[{ required: true, type: 'number', min: 1, max: 5 }]}> <Input type="number" min={1} max={5} /> </Form.Item>
              <Form.Item name="owner" label="Owner" rules={[{ required: true }]}> <Input /> </Form.Item>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}> <Select options={statusOptions} /> </Form.Item>
            </Form>
          </Modal>
              {/* Collaborative Assessment Modal */}
              <Modal
                open={collabModalOpen}
                onCancel={()=>setCollabModalOpen(false)}
                onOk={async ()=>{
                  // Prepare reviewers and scores
                  const validReviewers = reviewers.filter(r=>r.name.trim());
                  if(validReviewers.length<2){message.error('أدخل على الأقل مقيمين اثنين');return;}
                  const scores = validReviewers.map(r=>({likelihood:r.likelihood,impact:r.impact,score:r.likelihood*r.impact}));
                  try{
                    await axios.post('/api/risk-assessments',{
                      groupAssessment:true,
                      reviewers:validReviewers.map(r=>r.name),
                      scores,
                      notes:collabNotes
                    });
                    message.success('تم حفظ التقييم الجماعي');
                    setCollabModalOpen(false);
                    setReviewers([{name:'',likelihood:3,impact:3}]);
                    setCollabNotes('');
                  }catch(e){message.error('فشل حفظ التقييم الجماعي');}
                }}
                title="تقييم جماعي للمخاطر"
              >
                <div style={{marginBottom:8}}>أدخل أسماء المقيمين وقيمهم:</div>
                {reviewers.map((r,i)=>(
                  <Space key={i} style={{display:'flex',marginBottom:4}}>
                    <Input placeholder="اسم المقيم" value={r.name} onChange={e=>{
                      const arr=[...reviewers];arr[i].name=e.target.value;setReviewers(arr);
                    }} style={{width:120}}/>
                    <Input type="number" min={1} max={5} value={r.likelihood} onChange={e=>{
                      const arr=[...reviewers];arr[i].likelihood=Number(e.target.value);setReviewers(arr);
                    }} style={{width:80}} placeholder="احتمالية"/>
                    <Input type="number" min={1} max={5} value={r.impact} onChange={e=>{
                      const arr=[...reviewers];arr[i].impact=Number(e.target.value);setReviewers(arr);
                    }} style={{width:80}} placeholder="أثر"/>
                    <Button danger onClick={()=>{
                      const arr=[...reviewers];arr.splice(i,1);setReviewers(arr);
                    }} disabled={reviewers.length<=2}>حذف</Button>
                  </Space>
                ))}
                <Button onClick={()=>setReviewers([...reviewers,{name:'',likelihood:3,impact:3}])} style={{marginBottom:8}}>إضافة مقيم</Button>
                <Input.TextArea placeholder="ملاحظات جماعية (اختياري)" value={collabNotes} onChange={e=>setCollabNotes(e.target.value)} style={{marginTop:8}}/>
              </Modal>
          // Collaborative Assessment State
          const [collabModalOpen, setCollabModalOpen] = useState(false);
          const [reviewers, setReviewers] = useState([{ name: '', likelihood: 3, impact: 3 }]);
          const [collabNotes, setCollabNotes] = useState('');
        </Card>
      </>
    );
    fetchRisks();
    message.success('Risk deleted');
  };

  const handleAdd = () => {
    setEditingRisk(null);
    form.resetFields();
    setModalOpen(true);
  };


  const handleOk = async () => {
    const values = await form.validateFields();
    const riskScore = calculateRiskScore(values.likelihood, values.impact);
    let isHighRisk = riskScore >= 15;
    if (editingRisk) {
      await axios.put(`/api/risks/${editingRisk._id}`, values);
      message.success('Risk updated');
      if (isHighRisk) {
        message.warning('⚠️ تم تصعيد مخاطرة عالية!');
      }
    } else {
      await axios.post('/api/risks', values);
      message.success('Risk added');
      if (isHighRisk) {
        message.warning('⚠️ تم إضافة مخاطرة عالية!');
      }
    }
    setModalOpen(false);
    fetchRisks();
  };

  // حساب درجة المخاطر لكل عنصر
  const risksWithScore = risks.map(r => ({ ...r, riskScore: calculateRiskScore(r.likelihood, r.impact) }));
  const recommendations = getRiskRecommendations(risksWithScore);

  // رفع مرفق لمخاطرة
  const handleUpload = async (riskId: string, file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`/api/risks/${riskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('تم رفع المرفق بنجاح');
      fetchRisks();
    } catch (e) {
      message.error('فشل رفع المرفق');
    }
  };

  return (
    <Card
      title="Risk Management"
      extra={
        <>
          <Button onClick={handleAdd} style={{marginRight:8}}>Add Risk</Button>
                    <Button onClick={()=>setCollabModalOpen(true)} style={{marginRight:8}} type="dashed">تقييم جماعي</Button>
          <Button onClick={exportPDF} style={{marginRight:8}}>تصدير PDF</Button>
          <Button onClick={exportExcel}>تصدير Excel</Button>
        </>
      }
    >
      <div style={{marginBottom:16}}>
        <b>توصيات ذكية:</b>
        <ul>
          {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
        </ul>
      </div>
      <Table
        dataSource={risksWithScore}
        rowKey="_id"
        loading={loading}
        expandable={{
          expandedRowRender: (record) => (
            <div>
              <b>المرفقات:</b>
              <Upload
                showUploadList={false}
                customRequest={({ file }) => handleUpload(record._id, file)}
              >
                <Button icon={<UploadOutlined />}>رفع مرفق</Button>
              </Upload>
              <List
                size="small"
                dataSource={record.attachments || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      <PaperClipOutlined /> {item.filename}
                    </a>
                    <span style={{marginLeft:8, color:'#888', fontSize:12}}>
                      ({item.uploadedBy})
                    </span>
                  </List.Item>
                )}
              />
            </div>
          ),
        }}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Category', dataIndex: 'category' },
          { title: 'Likelihood', dataIndex: 'likelihood' },
          { title: 'Impact', dataIndex: 'impact' },
          { title: 'Risk Score', dataIndex: 'riskScore', render: (v:number) => <b style={{color:v>=15?'#e74c3c':v>=8?'#faad14':'#52c41a'}}>{v}</b> },
          { title: 'Owner', dataIndex: 'owner' },
          { title: 'Status', dataIndex: 'status' },
          {
            title: 'Actions',
            render: (_, record) => (
              <>
                <Button size="small" onClick={() => handleEdit(record)} style={{ marginRight: 8 }}>Edit</Button>
                <Button size="small" danger onClick={() => handleDelete(record._id)}>Delete</Button>
              </>
            ),
          },
        ]}
      />
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleOk}
        title={editingRisk ? 'Edit Risk' : 'Add Risk'}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}> <Input.TextArea /> </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="likelihood" label="Likelihood" rules={[{ required: true, type: 'number', min: 1, max: 5 }]}> <Input type="number" min={1} max={5} /> </Form.Item>
          <Form.Item name="impact" label="Impact" rules={[{ required: true, type: 'number', min: 1, max: 5 }]}> <Input type="number" min={1} max={5} /> </Form.Item>
          <Form.Item name="owner" label="Owner" rules={[{ required: true }]}> <Input /> </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}> <Select options={statusOptions} /> </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default RiskDashboard;
