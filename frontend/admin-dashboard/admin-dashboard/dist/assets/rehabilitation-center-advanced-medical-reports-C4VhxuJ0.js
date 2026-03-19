import{a as l,A as r,c,r as d,s as o,b as p,d as h}from"./main-DFR0ngT_.js";class m{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=l,this.API_ENDPOINTS=r.advancedMedicalReports||{},this.connectionManager=c,this.realtimeSync=d,this.systemEnhancer=o,this.aiAssistant=p,this.advancedCache=h,this.reports=[],this.templates=[],this.sections=[],this.fields=[],this.generated=[],this.approvals=[],this.versions=[],this.analytics=[],this.currentView="reports",this.filters={status:"all",type:"all",category:"all",patient:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-medical-reports-management">
        <div class="reports-header">
          <h2>📄 نظام إدارة التقارير الطبية المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createReport()">
              <i class="fas fa-plus"></i> تقرير جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createTemplate()">
              <i class="fas fa-file-alt"></i> قالب جديد
            </button>
          </div>
        </div>

        <div class="reports-tabs">
          <button class="tab-btn ${this.currentView==="reports"?"active":""}" 
                  onclick="this.switchView('reports')">
            <i class="fas fa-file-medical"></i> التقارير
          </button>
          <button class="tab-btn ${this.currentView==="templates"?"active":""}" 
                  onclick="this.switchView('templates')">
            <i class="fas fa-file-alt"></i> القوالب
          </button>
          <button class="tab-btn ${this.currentView==="generated"?"active":""}" 
                  onclick="this.switchView('generated')">
            <i class="fas fa-file-pdf"></i> التقارير المولدة
          </button>
          <button class="tab-btn ${this.currentView==="approvals"?"active":""}" 
                  onclick="this.switchView('approvals')">
            <i class="fas fa-check-circle"></i> الموافقات
          </button>
          <button class="tab-btn ${this.currentView==="versions"?"active":""}" 
                  onclick="this.switchView('versions')">
            <i class="fas fa-code-branch"></i> الإصدارات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="reports-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="pending">قيد المراجعة</option>
            <option value="approved">موافق عليه</option>
            <option value="rejected">مرفوض</option>
            <option value="published">منشور</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="assessment">تقييم</option>
            <option value="progress">تقدم</option>
            <option value="discharge">خروج</option>
            <option value="summary">ملخص</option>
            <option value="custom">مخصص</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="reports-content" id="reportsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"reports":return this.renderReports();case"templates":return this.renderTemplates();case"generated":return this.renderGenerated();case"approvals":return this.renderApprovals();case"versions":return this.renderVersions();case"analytics":return this.renderAnalytics();default:return this.renderReports()}}renderReports(){const t=this.getFilteredData(this.reports);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-medical"></i>
          <p>لا توجد تقارير</p>
          <button class="btn btn-primary" onclick="this.createReport()">
            إضافة تقرير جديد
          </button>
        </div>
      `:`
      <div class="reports-list">
        ${t.map(e=>`
          <div class="report-card status-${e.status} type-${e.type}">
            <div class="report-header">
              <div class="report-info">
                <h3>${e.title||"تقرير"}</h3>
                <p class="report-patient">المريض: ${e.patientName||"غير محدد"}</p>
              </div>
              <div class="report-badges">
                <span class="status-badge status-${e.status}">${this.getStatusText(e.status)}</span>
                <span class="type-badge">${this.getTypeText(e.type)}</span>
              </div>
            </div>
            <div class="report-body">
              <div class="report-details">
                <div class="detail-item">
                  <span class="detail-label">الطبيب:</span>
                  <span class="detail-value">${e.providerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(e.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأقسام:</span>
                  <span class="detail-value">${e.sectionsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الإصدار:</span>
                  <span class="detail-value">${e.version||"1.0"}</span>
                </div>
              </div>
              ${e.summary?`
                <div class="report-summary">
                  <span class="summary-label">الملخص:</span>
                  <span class="summary-text">${e.summary.substring(0,150)}${e.summary.length>150?"...":""}</span>
                </div>
              `:""}
            </div>
            <div class="report-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewReport(${e.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.generateReport(${e.id})">
                <i class="fas fa-file-pdf"></i> توليد PDF
              </button>
              ${e.status==="draft"?`
                <button class="btn btn-sm btn-warning" onclick="this.submitForApproval(${e.id})">
                  <i class="fas fa-paper-plane"></i> إرسال للموافقة
                </button>
              `:""}
              <button class="btn btn-sm btn-secondary" onclick="this.editReport(${e.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTemplates(){return this.templates.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>لا توجد قوالب</p>
          <button class="btn btn-primary" onclick="this.createTemplate()">
            إضافة قالب جديد
          </button>
        </div>
      `:`
      <div class="templates-grid">
        ${this.templates.map(t=>`
          <div class="template-card">
            <div class="template-header">
              <h3>${t.name||"قالب"}</h3>
              <span class="template-category">${this.getCategoryText(t.category)}</span>
            </div>
            <div class="template-body">
              <div class="template-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأقسام:</span>
                  <span class="detail-value">${t.sectionsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الحقول:</span>
                  <span class="detail-value">${t.fieldsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">آخر استخدام:</span>
                  <span class="detail-value">${this.formatDate(t.lastUsed)}</span>
                </div>
              </div>
            </div>
            <div class="template-actions">
              <button class="btn btn-sm btn-primary" onclick="this.useTemplate(${t.id})">
                <i class="fas fa-check"></i> استخدام
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editTemplate(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderGenerated(){return this.generated.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-pdf"></i>
          <p>لا توجد تقارير مولدة</p>
        </div>
      `:`
      <div class="generated-list">
        ${this.generated.map(t=>`
          <div class="generated-card">
            <div class="generated-header">
              <h3>${t.reportTitle||"تقرير مولّد"}</h3>
              <span class="generated-date">${this.formatDateTime(t.generatedAt)}</span>
            </div>
            <div class="generated-body">
              <div class="generated-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${t.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحجم:</span>
                  <span class="detail-value">${t.fileSize||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الصيغة:</span>
                  <span class="detail-value">${t.format||"PDF"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${t.status||"مكتمل"}</span>
                </div>
              </div>
            </div>
            <div class="generated-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewGenerated(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.downloadGenerated(${t.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderApprovals(){return this.approvals.length===0?`
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>لا توجد موافقات</p>
        </div>
      `:`
      <div class="approvals-list">
        ${this.approvals.map(t=>`
          <div class="approval-card status-${t.status}">
            <div class="approval-header">
              <h3>${t.reportTitle||"موافقة"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="approval-body">
              <div class="approval-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${t.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الطلب:</span>
                  <span class="detail-value">${this.formatDate(t.requestDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المراجع:</span>
                  <span class="detail-value">${t.reviewerName||"غير محدد"}</span>
                </div>
                ${t.reviewDate?`
                  <div class="detail-item">
                    <span class="detail-label">تاريخ المراجعة:</span>
                    <span class="detail-value">${this.formatDate(t.reviewDate)}</span>
                  </div>
                `:""}
                ${t.comments?`
                  <div class="approval-comments">
                    <span class="comments-label">التعليقات:</span>
                    <span class="comments-text">${t.comments}</span>
                  </div>
                `:""}
              </div>
            </div>
            ${t.status==="pending"?`
              <div class="approval-actions">
                <button class="btn btn-sm btn-success" onclick="this.approveReport(${t.reportId})">
                  <i class="fas fa-check"></i> موافقة
                </button>
                <button class="btn btn-sm btn-danger" onclick="this.rejectReport(${t.reportId})">
                  <i class="fas fa-times"></i> رفض
                </button>
              </div>
            `:""}
          </div>
        `).join("")}
      </div>
    `}renderVersions(){return this.versions.length===0?`
        <div class="empty-state">
          <i class="fas fa-code-branch"></i>
          <p>لا توجد إصدارات</p>
        </div>
      `:`
      <div class="versions-list">
        ${this.versions.map(t=>`
          <div class="version-card ${t.current?"current":""}">
            <div class="version-header">
              <h3>الإصدار ${t.version||"1.0"}</h3>
              ${t.current?'<span class="current-badge">الحالي</span>':""}
            </div>
            <div class="version-body">
              <div class="version-details">
                <div class="detail-item">
                  <span class="detail-label">التقرير:</span>
                  <span class="detail-value">${t.reportTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإنشاء:</span>
                  <span class="detail-value">${this.formatDateTime(t.createdAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المنشئ:</span>
                  <span class="detail-value">${t.createdBy||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التغييرات:</span>
                  <span class="detail-value">${t.changesCount||0}</span>
                </div>
                ${t.changes?`
                  <div class="version-changes">
                    <span class="changes-label">قائمة التغييرات:</span>
                    <ul>
                      ${t.changes.map(e=>`
                        <li>${e}</li>
                      `).join("")}
                    </ul>
                  </div>
                `:""}
              </div>
            </div>
            <div class="version-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewVersion(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${t.current?"":`
                <button class="btn btn-sm btn-success" onclick="this.restoreVersion(${t.id})">
                  <i class="fas fa-undo"></i> استعادة
                </button>
              `}
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
              ${t.trend?`
                <div class="analytic-trend ${t.trend>0?"up":"down"}">
                  <i class="fas fa-arrow-${t.trend>0?"up":"down"}"></i>
                  ${Math.abs(t.trend)}%
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(t){let e=[...t];return this.filters.status!=="all"&&(e=e.filter(s=>s.status===this.filters.status)),this.filters.type!=="all"&&(e=e.filter(s=>s.type===this.filters.type)),this.filters.category!=="all"&&(e=e.filter(s=>s.category===this.filters.category)),this.filters.patient!=="all"&&(e=e.filter(s=>s.patientId===parseInt(this.filters.patient))),e}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,e,s,a,i,n]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.reports||"/api/advanced-medical-reports/reports"),this.apiClient.get(this.API_ENDPOINTS.templates||"/api/advanced-medical-reports/templates"),this.apiClient.get(this.API_ENDPOINTS.generated||"/api/advanced-medical-reports/generated"),this.apiClient.get(this.API_ENDPOINTS.approvals||"/api/advanced-medical-reports/approvals"),this.apiClient.get(this.API_ENDPOINTS.versions||"/api/advanced-medical-reports/versions"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-medical-reports/analytics")]);this.reports=t.data||[],this.templates=e.data||[],this.generated=s.data||[],this.approvals=a.data||[],this.versions=i.data||[],this.analytics=n.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading medical reports data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-medical-reports","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,e){this.filters[t]=e.target.value,this.updateContent()}handleSearch(t){this.updateContent()}updateContent(){const t=document.getElementById("reportsContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{draft:"مسودة",pending:"قيد المراجعة",approved:"موافق عليه",rejected:"مرفوض",published:"منشور"}[t]||t}getTypeText(t){return{assessment:"تقييم",progress:"تقدم",discharge:"خروج",summary:"ملخص",custom:"مخصص"}[t]||t}getCategoryText(t){return{general:"عام",specialized:"متخصص",emergency:"طوارئ"}[t]||t}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(t){return t?new Date(t).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedMedicalReports",JSON.stringify(this.reports)),localStorage.setItem("advancedTemplates",JSON.stringify(this.templates)),localStorage.setItem("advancedGenerated",JSON.stringify(this.generated)),localStorage.setItem("advancedApprovals",JSON.stringify(this.approvals)),localStorage.setItem("advancedVersions",JSON.stringify(this.versions)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.reports=JSON.parse(localStorage.getItem("advancedMedicalReports")||"[]"),this.templates=JSON.parse(localStorage.getItem("advancedTemplates")||"[]"),this.generated=JSON.parse(localStorage.getItem("advancedGenerated")||"[]"),this.approvals=JSON.parse(localStorage.getItem("advancedApprovals")||"[]"),this.versions=JSON.parse(localStorage.getItem("advancedVersions")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createReport=this.createReport.bind(this),this.createTemplate=this.createTemplate.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewReport=this.viewReport.bind(this),this.generateReport=this.generateReport.bind(this),this.submitForApproval=this.submitForApproval.bind(this),this.editReport=this.editReport.bind(this),this.useTemplate=this.useTemplate.bind(this),this.editTemplate=this.editTemplate.bind(this),this.viewGenerated=this.viewGenerated.bind(this),this.downloadGenerated=this.downloadGenerated.bind(this),this.approveReport=this.approveReport.bind(this),this.rejectReport=this.rejectReport.bind(this),this.viewVersion=this.viewVersion.bind(this),this.restoreVersion=this.restoreVersion.bind(this)}async createReport(){console.log("Create report")}async createTemplate(){console.log("Create template")}async viewReport(t){console.log("View report",t)}async generateReport(t){console.log("Generate report",t)}async submitForApproval(t){console.log("Submit for approval",t)}async editReport(t){console.log("Edit report",t)}async useTemplate(t){console.log("Use template",t)}async editTemplate(t){console.log("Edit template",t)}async viewGenerated(t){console.log("View generated",t)}async downloadGenerated(t){console.log("Download generated",t)}async approveReport(t){console.log("Approve report",t)}async rejectReport(t){console.log("Reject report",t)}async viewVersion(t){console.log("View version",t)}async restoreVersion(t){console.log("Restore version",t)}}export{m as default};
//# sourceMappingURL=rehabilitation-center-advanced-medical-reports-C4VhxuJ0.js.map
