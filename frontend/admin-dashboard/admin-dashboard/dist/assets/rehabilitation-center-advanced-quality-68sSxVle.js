import{a as c,A as r,c as d,r as o,s as h,b as v,d as p}from"./main-DFR0ngT_.js";class f{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=c,this.API_ENDPOINTS=r.advancedQuality||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=h,this.aiAssistant=v,this.advancedCache=p,this.standards=[],this.audits=[],this.nonConformances=[],this.improvements=[],this.metrics=[],this.certifications=[],this.analytics=[],this.currentView="standards",this.filters={status:"all",category:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-quality-management">
        <div class="quality-header">
          <h2>⭐ نظام إدارة الجودة المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createStandard()">
              <i class="fas fa-plus"></i> معيار جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createAudit()">
              <i class="fas fa-clipboard-check"></i> تدقيق جديد
            </button>
          </div>
        </div>

        <div class="quality-tabs">
          <button class="tab-btn ${this.currentView==="standards"?"active":""}" 
                  onclick="this.switchView('standards')">
            <i class="fas fa-star"></i> المعايير
          </button>
          <button class="tab-btn ${this.currentView==="audits"?"active":""}" 
                  onclick="this.switchView('audits')">
            <i class="fas fa-clipboard-check"></i> التدقيقات
          </button>
          <button class="tab-btn ${this.currentView==="nonConformances"?"active":""}" 
                  onclick="this.switchView('nonConformances')">
            <i class="fas fa-exclamation-circle"></i> عدم المطابقة
          </button>
          <button class="tab-btn ${this.currentView==="improvements"?"active":""}" 
                  onclick="this.switchView('improvements')">
            <i class="fas fa-chart-line"></i> التحسينات
          </button>
          <button class="tab-btn ${this.currentView==="metrics"?"active":""}" 
                  onclick="this.switchView('metrics')">
            <i class="fas fa-tachometer-alt"></i> المقاييس
          </button>
          <button class="tab-btn ${this.currentView==="certifications"?"active":""}" 
                  onclick="this.switchView('certifications')">
            <i class="fas fa-certificate"></i> الشهادات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="quality-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">موافق عليه</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="quality-content" id="qualityContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"standards":return this.renderStandards();case"audits":return this.renderAudits();case"nonConformances":return this.renderNonConformances();case"improvements":return this.renderImprovements();case"metrics":return this.renderMetrics();case"certifications":return this.renderCertifications();case"analytics":return this.renderAnalytics();default:return this.renderStandards()}}renderStandards(){const t=this.getFilteredData(this.standards);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <p>لا توجد معايير</p>
          <button class="btn btn-primary" onclick="this.createStandard()">
            إضافة معيار جديد
          </button>
        </div>
      `:`
      <div class="standards-grid">
        ${t.map(a=>`
          <div class="standard-card status-${a.status}">
            <div class="standard-header">
              <h3>${a.name||"معيار"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="standard-body">
              <div class="standard-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${a.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الإصدار:</span>
                  <span class="detail-value">${a.version||"1.0"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإنشاء:</span>
                  <span class="detail-value">${this.formatDate(a.createdAt)}</span>
                </div>
              </div>
              ${a.description?`
                <div class="standard-description">
                  <p>${a.description.substring(0,150)}${a.description.length>150?"...":""}</p>
                </div>
              `:""}
            </div>
            <div class="standard-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewStandard(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editStandard(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAudits(){return this.audits.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-check"></i>
          <p>لا توجد تدقيقات</p>
          <button class="btn btn-primary" onclick="this.createAudit()">
            إضافة تدقيق جديد
          </button>
        </div>
      `:`
      <div class="audits-list">
        ${this.audits.map(t=>`
          <div class="audit-card status-${t.status}">
            <div class="audit-header">
              <h3>${t.title||"تدقيق"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="audit-body">
              <div class="audit-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${t.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.auditDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدقق:</span>
                  <span class="detail-value">${t.auditorName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${t.result||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderNonConformances(){return this.nonConformances.length===0?`
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>لا توجد حالات عدم مطابقة</p>
        </div>
      `:`
      <div class="non-conformances-list">
        ${this.nonConformances.map(t=>`
          <div class="nc-card severity-${t.severity||"medium"}">
            <div class="nc-header">
              <h3>${t.title||"عدم مطابقة"}</h3>
              <span class="severity-badge severity-${t.severity||"medium"}">
                ${this.getSeverityText(t.severity||"medium")}
              </span>
            </div>
            <div class="nc-body">
              <div class="nc-details">
                <div class="detail-item">
                  <span class="detail-label">المعيار:</span>
                  <span class="detail-value">${t.standardName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.identifiedDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(t.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderImprovements(){return this.improvements.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <p>لا توجد تحسينات</p>
        </div>
      `:`
      <div class="improvements-list">
        ${this.improvements.map(t=>`
          <div class="improvement-card status-${t.status}">
            <div class="improvement-header">
              <h3>${t.title||"تحسين"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="improvement-body">
              <div class="improvement-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${t.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(t.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${t.progress||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderMetrics(){return this.metrics.length===0?`
        <div class="empty-state">
          <i class="fas fa-tachometer-alt"></i>
          <p>لا توجد مقاييس</p>
        </div>
      `:`
      <div class="metrics-grid">
        ${this.metrics.map(t=>`
          <div class="metric-card">
            <div class="metric-header">
              <h3>${t.name||"مقياس"}</h3>
              <span class="metric-value">${t.value||0} ${t.unit||""}</span>
            </div>
            <div class="metric-body">
              <div class="metric-details">
                <div class="detail-item">
                  <span class="detail-label">الهدف:</span>
                  <span class="detail-value">${t.target||0} ${t.unit||""}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderCertifications(){return this.certifications.length===0?`
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <p>لا توجد شهادات</p>
        </div>
      `:`
      <div class="certifications-grid">
        ${this.certifications.map(t=>`
          <div class="cert-card status-${t.status}">
            <div class="cert-header">
              <h3>${t.name||"شهادة"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="cert-body">
              <div class="cert-details">
                <div class="detail-item">
                  <span class="detail-label">المؤسسة:</span>
                  <span class="detail-value">${t.issuer||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإصدار:</span>
                  <span class="detail-value">${this.formatDate(t.issueDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(t.expiryDate)||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAnalytics(){return this.analytics.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-bar"></i>
          <p>لا توجد بيانات تحليلية</p>
        </div>
      `:`
      <div class="analytics-dashboard">
        ${this.analytics.map(t=>`
          <div class="analytic-card">
            <div class="analytic-header">
              <h3>${t.metric}</h3>
              <span class="analytic-value">${t.value}</span>
            </div>
            <div class="analytic-body">
              <p>${t.description||""}</p>
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(t){let a=[...t];if(this.filters.status!=="all"&&(a=a.filter(s=>s.status===this.filters.status)),this.filters.category!=="all"&&(a=a.filter(s=>s.category===this.filters.category)),this.filters.search){const s=this.filters.search.toLowerCase();a=a.filter(i=>i.name&&i.name.toLowerCase().includes(s)||i.title&&i.title.toLowerCase().includes(s)||i.description&&i.description.toLowerCase().includes(s))}return a}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,a,s,i,e,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.standards||"/api/advanced-quality/standards"),this.apiClient.get(this.API_ENDPOINTS.audits||"/api/advanced-quality/audits"),this.apiClient.get(this.API_ENDPOINTS.nonConformances||"/api/advanced-quality/non-conformances"),this.apiClient.get(this.API_ENDPOINTS.improvements||"/api/advanced-quality/improvements"),this.apiClient.get(this.API_ENDPOINTS.metrics||"/api/advanced-quality/metrics"),this.apiClient.get(this.API_ENDPOINTS.certifications||"/api/advanced-quality/certifications"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-quality/analytics")]);this.standards=t.data||[],this.audits=a.data||[],this.nonConformances=s.data||[],this.improvements=i.data||[],this.metrics=e.data||[],this.certifications=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading quality data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-quality","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,a){this.filters[t]=a.target.value,this.updateContent()}handleSearch(t){this.filters.search=t.target.value,this.updateContent()}updateContent(){const t=document.getElementById("qualityContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{active:"نشط",inactive:"غير نشط",pending:"قيد الانتظار",approved:"موافق عليه",draft:"مسودة",completed:"مكتمل",inprogress:"قيد التنفيذ",valid:"صالح",expired:"منتهي"}[t]||t}getSeverityText(t){return{low:"منخفض",medium:"متوسط",high:"عالي",critical:"حرج"}[t]||t}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedStandards",JSON.stringify(this.standards)),localStorage.setItem("advancedAudits",JSON.stringify(this.audits)),localStorage.setItem("advancedNonConformances",JSON.stringify(this.nonConformances)),localStorage.setItem("advancedImprovements",JSON.stringify(this.improvements)),localStorage.setItem("advancedMetrics",JSON.stringify(this.metrics)),localStorage.setItem("advancedCertifications",JSON.stringify(this.certifications)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.standards=JSON.parse(localStorage.getItem("advancedStandards")||"[]"),this.audits=JSON.parse(localStorage.getItem("advancedAudits")||"[]"),this.nonConformances=JSON.parse(localStorage.getItem("advancedNonConformances")||"[]"),this.improvements=JSON.parse(localStorage.getItem("advancedImprovements")||"[]"),this.metrics=JSON.parse(localStorage.getItem("advancedMetrics")||"[]"),this.certifications=JSON.parse(localStorage.getItem("advancedCertifications")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createStandard=this.createStandard.bind(this),this.createAudit=this.createAudit.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewStandard=this.viewStandard.bind(this),this.editStandard=this.editStandard.bind(this)}async createStandard(){console.log("Create standard")}async createAudit(){console.log("Create audit")}async viewStandard(t){console.log("View standard",t)}async editStandard(t){console.log("Edit standard",t)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-quality-68sSxVle.js.map
