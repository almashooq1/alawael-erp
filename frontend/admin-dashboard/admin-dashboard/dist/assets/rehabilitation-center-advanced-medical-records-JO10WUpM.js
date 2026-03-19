import{a as o,A as h,c as v,r as p,s as g,b as m,d as u}from"./main-DFR0ngT_.js";class f{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=o,this.API_ENDPOINTS=h.advancedMedicalRecords||{},this.connectionManager=v,this.realtimeSync=p,this.systemEnhancer=g,this.aiAssistant=m,this.advancedCache=u,this.records=[],this.diagnoses=[],this.treatments=[],this.labResults=[],this.imaging=[],this.notes=[],this.history=[],this.allergies=[],this.vaccinations=[],this.analytics=[],this.currentView="records",this.filters={status:"all",category:"all",patient:"all",provider:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-medical-records-management">
        <div class="records-header">
          <h2>📋 نظام إدارة الملفات الطبية المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createRecord()">
              <i class="fas fa-plus"></i> ملف طبي جديد
            </button>
            <button class="btn btn-secondary" onclick="this.importRecord()">
              <i class="fas fa-file-import"></i> استيراد ملف
            </button>
          </div>
        </div>

        <div class="records-tabs">
          <button class="tab-btn ${this.currentView==="records"?"active":""}" 
                  onclick="this.switchView('records')">
            <i class="fas fa-folder"></i> الملفات الطبية
          </button>
          <button class="tab-btn ${this.currentView==="diagnoses"?"active":""}" 
                  onclick="this.switchView('diagnoses')">
            <i class="fas fa-stethoscope"></i> التشخيصات
          </button>
          <button class="tab-btn ${this.currentView==="treatments"?"active":""}" 
                  onclick="this.switchView('treatments')">
            <i class="fas fa-heartbeat"></i> العلاجات
          </button>
          <button class="tab-btn ${this.currentView==="lab-results"?"active":""}" 
                  onclick="this.switchView('lab-results')">
            <i class="fas fa-flask"></i> نتائج المختبر
          </button>
          <button class="tab-btn ${this.currentView==="imaging"?"active":""}" 
                  onclick="this.switchView('imaging')">
            <i class="fas fa-x-ray"></i> الأشعة والتصوير
          </button>
          <button class="tab-btn ${this.currentView==="notes"?"active":""}" 
                  onclick="this.switchView('notes')">
            <i class="fas fa-sticky-note"></i> الملاحظات
          </button>
          <button class="tab-btn ${this.currentView==="history"?"active":""}" 
                  onclick="this.switchView('history')">
            <i class="fas fa-history"></i> التاريخ الطبي
          </button>
          <button class="tab-btn ${this.currentView==="allergies"?"active":""}" 
                  onclick="this.switchView('allergies')">
            <i class="fas fa-exclamation-triangle"></i> الحساسيات
          </button>
          <button class="tab-btn ${this.currentView==="vaccinations"?"active":""}" 
                  onclick="this.switchView('vaccinations')">
            <i class="fas fa-syringe"></i> التطعيمات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="records-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="archived">مؤرشف</option>
            <option value="closed">مغلق</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="general">عام</option>
            <option value="emergency">طوارئ</option>
            <option value="follow-up">متابعة</option>
            <option value="consultation">استشارة</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="records-content" id="recordsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"records":return this.renderRecords();case"diagnoses":return this.renderDiagnoses();case"treatments":return this.renderTreatments();case"lab-results":return this.renderLabResults();case"imaging":return this.renderImaging();case"notes":return this.renderNotes();case"history":return this.renderHistory();case"allergies":return this.renderAllergies();case"vaccinations":return this.renderVaccinations();case"analytics":return this.renderAnalytics();default:return this.renderRecords()}}renderRecords(){const a=this.getFilteredData(this.records);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-folder"></i>
          <p>لا توجد ملفات طبية</p>
          <button class="btn btn-primary" onclick="this.createRecord()">
            إضافة ملف طبي جديد
          </button>
        </div>
      `:`
      <div class="records-grid">
        ${a.map(s=>`
          <div class="record-card status-${s.status} category-${s.category}">
            <div class="record-header">
              <div class="record-info">
                <h3>${s.patientName||"غير محدد"}</h3>
                <p class="record-id">رقم الملف: ${s.recordNumber||"غير محدد"}</p>
              </div>
              <div class="record-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                <span class="category-badge">${this.getCategoryText(s.category)}</span>
              </div>
            </div>
            <div class="record-body">
              <div class="record-details">
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإنشاء:</span>
                  <span class="detail-value">${this.formatDate(s.createdAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">آخر تحديث:</span>
                  <span class="detail-value">${this.formatDate(s.updatedAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الطبيب المسؤول:</span>
                  <span class="detail-value">${s.providerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الزيارات:</span>
                  <span class="detail-value">${s.visitsCount||0}</span>
                </div>
              </div>
            </div>
            <div class="record-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewRecord(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editRecord(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
              <button class="btn btn-sm btn-info" onclick="this.downloadRecord(${s.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderDiagnoses(){return this.diagnoses.length===0?`
        <div class="empty-state">
          <i class="fas fa-stethoscope"></i>
          <p>لا توجد تشخيصات</p>
        </div>
      `:`
      <div class="diagnoses-list">
        ${this.diagnoses.map(a=>`
          <div class="diagnosis-card severity-${a.severity||"moderate"}">
            <div class="diagnosis-header">
              <h3>${a.name||"تشخيص"}</h3>
              <span class="severity-badge severity-${a.severity||"moderate"}">
                ${this.getSeverityText(a.severity||"moderate")}
              </span>
            </div>
            <div class="diagnosis-body">
              <div class="diagnosis-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الطبيب:</span>
                  <span class="detail-value">${a.providerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${a.status||"غير محدد"}</span>
                </div>
              </div>
              ${a.description?`
                <div class="diagnosis-description">
                  <p>${a.description}</p>
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTreatments(){return this.treatments.length===0?`
        <div class="empty-state">
          <i class="fas fa-heartbeat"></i>
          <p>لا توجد علاجات</p>
        </div>
      `:`
      <div class="treatments-list">
        ${this.treatments.map(a=>`
          <div class="treatment-card status-${a.status}">
            <div class="treatment-header">
              <h3>${a.name||"علاج"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="treatment-body">
              <div class="treatment-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${a.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${a.outcome||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderLabResults(){return this.labResults.length===0?`
        <div class="empty-state">
          <i class="fas fa-flask"></i>
          <p>لا توجد نتائج مختبر</p>
        </div>
      `:`
      <div class="lab-results-list">
        ${this.labResults.map(a=>`
          <div class="lab-result-card ${a.abnormal?"abnormal":"normal"}">
            <div class="lab-result-header">
              <h3>${a.testName||"فحص"}</h3>
              <span class="result-badge ${a.abnormal?"abnormal":"normal"}">
                ${a.abnormal?"غير طبيعي":"طبيعي"}
              </span>
            </div>
            <div class="lab-result-body">
              <div class="lab-result-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${a.value||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النطاق الطبيعي:</span>
                  <span class="detail-value">${a.normalRange||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderImaging(){return this.imaging.length===0?`
        <div class="empty-state">
          <i class="fas fa-x-ray"></i>
          <p>لا توجد صور أشعة</p>
        </div>
      `:`
      <div class="imaging-grid">
        ${this.imaging.map(a=>`
          <div class="imaging-card">
            <div class="imaging-header">
              <h3>${a.type||"صورة"}</h3>
              <span class="imaging-date">${this.formatDate(a.date)}</span>
            </div>
            <div class="imaging-body">
              <div class="imaging-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المنطقة:</span>
                  <span class="detail-value">${a.area||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${a.result||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="imaging-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewImage(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.downloadImage(${a.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderNotes(){return this.notes.length===0?`
        <div class="empty-state">
          <i class="fas fa-sticky-note"></i>
          <p>لا توجد ملاحظات</p>
        </div>
      `:`
      <div class="notes-list">
        ${this.notes.map(a=>`
          <div class="note-card type-${a.type||"general"}">
            <div class="note-header">
              <h3>${a.title||"ملاحظة"}</h3>
              <span class="note-date">${this.formatDateTime(a.date)}</span>
            </div>
            <div class="note-body">
              <p>${a.content||""}</p>
              <div class="note-meta">
                <span><i class="fas fa-user"></i> ${a.authorName||"غير محدد"}</span>
                <span><i class="fas fa-user-injured"></i> ${a.patientName||"غير محدد"}</span>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderHistory(){return this.history.length===0?`
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <p>لا يوجد تاريخ طبي</p>
        </div>
      `:`
      <div class="history-timeline">
        ${this.history.map(a=>`
          <div class="history-item">
            <div class="history-date">${this.formatDate(a.date)}</div>
            <div class="history-content">
              <h4>${a.title||"حدث"}</h4>
              <p>${a.description||""}</p>
              <span class="history-type">${this.getTypeText(a.type)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAllergies(){return this.allergies.length===0?`
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>لا توجد حساسيات مسجلة</p>
        </div>
      `:`
      <div class="allergies-list">
        ${this.allergies.map(a=>`
          <div class="allergy-card severity-${a.severity||"moderate"}">
            <div class="allergy-header">
              <h3>${a.allergen||"مادة مسببة للحساسية"}</h3>
              <span class="severity-badge severity-${a.severity||"moderate"}">
                ${this.getSeverityText(a.severity||"moderate")}
              </span>
            </div>
            <div class="allergy-body">
              <div class="allergy-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الأعراض:</span>
                  <span class="detail-value">${a.symptoms||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الاكتشاف:</span>
                  <span class="detail-value">${this.formatDate(a.discoveredDate)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderVaccinations(){return this.vaccinations.length===0?`
        <div class="empty-state">
          <i class="fas fa-syringe"></i>
          <p>لا توجد تطعيمات</p>
        </div>
      `:`
      <div class="vaccinations-list">
        ${this.vaccinations.map(a=>`
          <div class="vaccination-card ${a.completed?"completed":"pending"}">
            <div class="vaccination-header">
              <h3>${a.name||"تطعيم"}</h3>
              <span class="status-badge ${a.completed?"completed":"pending"}">
                ${a.completed?"مكتمل":"قيد الانتظار"}
              </span>
            </div>
            <div class="vaccination-body">
              <div class="vaccination-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الجرعة:</span>
                  <span class="detail-value">${a.dose||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموعد القادم:</span>
                  <span class="detail-value">${a.nextDoseDate?this.formatDate(a.nextDoseDate):"لا يوجد"}</span>
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
        ${this.analytics.map(a=>`
          <div class="analytic-card">
            <div class="analytic-header">
              <h3>${a.metric}</h3>
              <span class="analytic-value">${a.value}</span>
            </div>
            <div class="analytic-body">
              <p>${a.description||""}</p>
              ${a.trend?`
                <div class="analytic-trend ${a.trend>0?"up":"down"}">
                  <i class="fas fa-arrow-${a.trend>0?"up":"down"}"></i>
                  ${Math.abs(a.trend)}%
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(a){let s=[...a];return this.filters.status!=="all"&&(s=s.filter(t=>t.status===this.filters.status)),this.filters.category!=="all"&&(s=s.filter(t=>t.category===this.filters.category)),this.filters.patient!=="all"&&(s=s.filter(t=>t.patientId===parseInt(this.filters.patient))),this.filters.provider!=="all"&&(s=s.filter(t=>t.providerId===parseInt(this.filters.provider))),s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,s,t,e,i,n,l,d,r,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.records||"/api/advanced-medical-records/records"),this.apiClient.get(this.API_ENDPOINTS.diagnoses||"/api/advanced-medical-records/diagnoses"),this.apiClient.get(this.API_ENDPOINTS.treatments||"/api/advanced-medical-records/treatments"),this.apiClient.get(this.API_ENDPOINTS.labResults||"/api/advanced-medical-records/lab-results"),this.apiClient.get(this.API_ENDPOINTS.imaging||"/api/advanced-medical-records/imaging"),this.apiClient.get(this.API_ENDPOINTS.notes||"/api/advanced-medical-records/notes"),this.apiClient.get(this.API_ENDPOINTS.history||"/api/advanced-medical-records/history"),this.apiClient.get(this.API_ENDPOINTS.allergies||"/api/advanced-medical-records/allergies"),this.apiClient.get(this.API_ENDPOINTS.vaccinations||"/api/advanced-medical-records/vaccinations"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-medical-records/analytics")]);this.records=a.data||[],this.diagnoses=s.data||[],this.treatments=t.data||[],this.labResults=e.data||[],this.imaging=i.data||[],this.notes=n.data||[],this.history=l.data||[],this.allergies=d.data||[],this.vaccinations=r.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading medical records data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-medical-records","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,s){this.filters[a]=s.target.value,this.updateContent()}handleSearch(a){this.updateContent()}updateContent(){const a=document.getElementById("recordsContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",archived:"مؤرشف",closed:"مغلق"}[a]||a}getCategoryText(a){return{general:"عام",emergency:"طوارئ","follow-up":"متابعة",consultation:"استشارة"}[a]||a}getSeverityText(a){return{mild:"خفيف",moderate:"متوسط",severe:"شديد",critical:"حرج"}[a]||a}getTypeText(a){return{diagnosis:"تشخيص",treatment:"علاج",lab:"مختبر",imaging:"تصوير",note:"ملاحظة"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(a){return a?new Date(a).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedMedicalRecords",JSON.stringify(this.records)),localStorage.setItem("advancedDiagnoses",JSON.stringify(this.diagnoses)),localStorage.setItem("advancedTreatments",JSON.stringify(this.treatments)),localStorage.setItem("advancedLabResults",JSON.stringify(this.labResults)),localStorage.setItem("advancedImaging",JSON.stringify(this.imaging)),localStorage.setItem("advancedNotes",JSON.stringify(this.notes)),localStorage.setItem("advancedHistory",JSON.stringify(this.history)),localStorage.setItem("advancedAllergies",JSON.stringify(this.allergies)),localStorage.setItem("advancedVaccinations",JSON.stringify(this.vaccinations)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.records=JSON.parse(localStorage.getItem("advancedMedicalRecords")||"[]"),this.diagnoses=JSON.parse(localStorage.getItem("advancedDiagnoses")||"[]"),this.treatments=JSON.parse(localStorage.getItem("advancedTreatments")||"[]"),this.labResults=JSON.parse(localStorage.getItem("advancedLabResults")||"[]"),this.imaging=JSON.parse(localStorage.getItem("advancedImaging")||"[]"),this.notes=JSON.parse(localStorage.getItem("advancedNotes")||"[]"),this.history=JSON.parse(localStorage.getItem("advancedHistory")||"[]"),this.allergies=JSON.parse(localStorage.getItem("advancedAllergies")||"[]"),this.vaccinations=JSON.parse(localStorage.getItem("advancedVaccinations")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createRecord=this.createRecord.bind(this),this.importRecord=this.importRecord.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewRecord=this.viewRecord.bind(this),this.editRecord=this.editRecord.bind(this),this.downloadRecord=this.downloadRecord.bind(this),this.viewImage=this.viewImage.bind(this),this.downloadImage=this.downloadImage.bind(this)}async createRecord(){console.log("Create medical record")}async importRecord(){console.log("Import medical record")}async viewRecord(a){console.log("View medical record",a)}async editRecord(a){console.log("Edit medical record",a)}async downloadRecord(a){console.log("Download medical record",a)}async viewImage(a){console.log("View image",a)}async downloadImage(a){console.log("Download image",a)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-medical-records-JO10WUpM.js.map
