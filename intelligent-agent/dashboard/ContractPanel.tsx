


import ContractActivityPanel from './ContractActivityPanel';
import SignaturePad from './SignaturePad';
import ExportFieldsSelector from './ExportFieldsSelector';


export default function ContractPanel() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', parties: '', startDate: '', endDate: '', value: '', terms: '', ownerId: '' });
  const [file, setFile] = useState<any>(null);
  // Export fields selector
  const [exportFields, setExportFields] = useState<string[]>(['title','parties','startDate','endDate','value','status']);
  const [exporting, setExporting] = useState(false);
  function handleExport() {
    setExporting(true);
    const params = new URLSearchParams();
    exportFields.forEach(f=>params.append('fields',f));
    fetch('/v1/contracts/export/csv?' + params.toString())
      .then(r=>r.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contracts_export.csv';
        a.click();
        setExporting(false);
      });
  }
  // Filters
  const [filters, setFilters] = useState({
    title: '',
    party: '',
    status: '',
    risk: '',
    minValue: '',
    maxValue: '',
    startDate: '',
    endDate: ''
  });
  // Smart search fetch
  function fetchContracts() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    fetch('/dashboard/contract/list?' + params.toString())
      .then(r=>r.json()).then(setContracts);
  }
  useEffect(() => { fetchContracts(); }, [filters]);
  function handleAdd(e:any) {
    e.preventDefault();
    fetch('/dashboard/contract/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, parties: form.parties.split(',').map((p:string)=>p.trim()), value: Number(form.value) })
    }).then(r=>r.json()).then(c=>setContracts(cs=>[...cs,c]));
  }
  function handleFileUpload(e:any, id:string) {
    const f = e.target.files[0];
    if (!f) return;
    const data = new FormData();
    data.append('file', f);
    fetch(`/dashboard/contract-file/attach/${id}`, { method: 'POST', body: data })
      .then(r=>r.json()).then(()=>alert('تم رفع الملف!'));
  }
  // Smart search/filter UI
  const [showLog, setShowLog] = useState<string|null>(null);
  const [signingId, setSigningId] = useState<string|null>(null);
  const [signatures, setSignatures] = useState<{[id:string]:string}>({});
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:900,margin:'auto'}}>
    <ExportFieldsSelector selected={exportFields} onChange={setExportFields} />
    <button onClick={handleExport} disabled={exporting || !exportFields.length} style={{marginBottom:16}}>
      {exporting ? 'جاري التصدير...' : 'تصدير العقود (حسب الحقول المختارة)'}
    </button>
    <h2>إدارة العقود</h2>
    <form onSubmit={handleAdd} style={{marginBottom:24}}>
      <input placeholder="عنوان العقد" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
      <input placeholder="الأطراف (مفصولة بفاصلة)" value={form.parties} onChange={e=>setForm(f=>({...f,parties:e.target.value}))} required />
      <input type="date" placeholder="تاريخ البداية" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} required />
      <input type="date" placeholder="تاريخ النهاية" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} required />
      <input type="number" placeholder="القيمة" value={form.value} onChange={e=>setForm(f=>({...f,value:e.target.value}))} required />
      <input placeholder="الشروط" value={form.terms} onChange={e=>setForm(f=>({...f,terms:e.target.value}))} required />
      <UserSelect value={form.ownerId} onChange={ownerId=>setForm(f=>({...f,ownerId}))} />
      <button type="submit">إضافة عقد</button>
    </form>
    {/* Smart search/filter bar */}
    <div style={{marginBottom:16,display:'flex',gap:8,flexWrap:'wrap'}}>
      <input placeholder="بحث بالعنوان" value={filters.title} onChange={e=>setFilters(f=>({...f,title:e.target.value}))} />
      <input placeholder="بحث بالطرف" value={filters.party} onChange={e=>setFilters(f=>({...f,party:e.target.value}))} />
      <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}>
        <option value="">كل الحالات</option>
        <option value="active">نشط</option>
        <option value="expired">منتهي</option>
        <option value="terminated">منتهي مبكراً</option>
        <option value="pending">معلق</option>
      </select>
      <select value={filters.risk} onChange={e=>setFilters(f=>({...f,risk:e.target.value}))}>
        <option value="">كل المخاطر</option>
        <option value="منخفض">منخفض</option>
        <option value="متوسط">متوسط</option>
        <option value="مرتفع">مرتفع</option>
      </select>
      <input type="number" placeholder="القيمة من" value={filters.minValue} onChange={e=>setFilters(f=>({...f,minValue:e.target.value}))} style={{width:90}} />
      <input type="number" placeholder="القيمة إلى" value={filters.maxValue} onChange={e=>setFilters(f=>({...f,maxValue:e.target.value}))} style={{width:90}} />
      <input type="date" placeholder="من تاريخ" value={filters.startDate} onChange={e=>setFilters(f=>({...f,startDate:e.target.value}))} />
      <input type="date" placeholder="إلى تاريخ" value={filters.endDate} onChange={e=>setFilters(f=>({...f,endDate:e.target.value}))} />
      <button type="button" onClick={()=>setFilters({title:'',party:'',status:'',risk:'',minValue:'',maxValue:'',startDate:'',endDate:''})}>مسح</button>
    </div>
    <table style={{width:'100%'}}><thead><tr><th>العنوان</th><th>الأطراف</th><th>البداية</th><th>النهاية</th><th>القيمة</th><th>الحالة</th><th>المخاطر</th><th>ملف</th><th>سجل النشاطات</th><th>توقيع إلكتروني</th></tr></thead>
      <tbody>
        {contracts.map(c=><React.Fragment key={c.id}>
          <tr>
            <td>{c.title}</td>
            <td>{c.parties.join(', ')}</td>
            <td>{c.startDate}</td>
            <td>{c.endDate}</td>
            <td>{c.value}</td>
            <td>{c.status}</td>
            <td>{c.riskLevel||'-'}</td>
            <td>
              <input type="file" onChange={e=>handleFileUpload(e, c.id)} />
              {c.metadata?.file && <a href={`/dashboard/contract-file/file/${c.id}`} target="_blank" rel="noopener noreferrer">تنزيل</a>}
            </td>
            <td>
              <button onClick={()=>setShowLog(showLog===c.id?null:c.id)}>{showLog===c.id?'إخفاء':'عرض'}</button>
            </td>
            <td>
              {c.metadata?.signature ? <img src={c.metadata.signature} alt="توقيع" style={{maxWidth:80,maxHeight:40,border:'1px solid #ccc'}} /> :
                <button onClick={()=>setSigningId(c.id)}>توقيع</button>}
            </td>
          </tr>
          {showLog===c.id && <tr><td colSpan={10}><ContractActivityPanel contractId={c.id} /></td></tr>}
          {signingId===c.id && <tr><td colSpan={10} style={{background:'#f9f9f9'}}>
            <SignaturePad onSave={dataUrl=>{
              setSignatures(s=>({...s,[c.id]:dataUrl}));
              setSigningId(null);
              // حفظ التوقيع في metadata
              fetch(`/dashboard/contract/update/${c.id}`, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({ metadata: { ...c.metadata, signature: dataUrl } })
              }).then(()=>fetchContracts());
            }} />
            <button onClick={()=>setSigningId(null)}>إلغاء</button>
          </td></tr>}
        </React.Fragment>)}
      </tbody>
    </table>
  </div>;
}
