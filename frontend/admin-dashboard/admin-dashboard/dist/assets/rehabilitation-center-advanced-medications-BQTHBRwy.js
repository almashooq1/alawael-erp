import{a as o,A as p,c as v,r as h,s as u,b as m,d as g}from"./main-DFR0ngT_.js";class y{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=o,this.API_ENDPOINTS=p.advancedMedications||{},this.connectionManager=v,this.realtimeSync=h,this.systemEnhancer=u,this.aiAssistant=m,this.advancedCache=g,this.medications=[],this.prescriptions=[],this.dosages=[],this.schedules=[],this.adherence=[],this.sideEffects=[],this.interactions=[],this.inventory=[],this.treatments=[],this.analytics=[],this.currentView="medications",this.filters={status:"all",category:"all",patient:"all",provider:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-medications-management">
        <div class="medications-header">
          <h2>💊 نظام إدارة الأدوية والعلاجات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createMedication()">
              <i class="fas fa-plus"></i> دواء جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createPrescription()">
              <i class="fas fa-prescription"></i> وصفة طبية جديدة
            </button>
          </div>
        </div>

        <div class="medications-tabs">
          <button class="tab-btn ${this.currentView==="medications"?"active":""}" 
                  onclick="this.switchView('medications')">
            <i class="fas fa-pills"></i> الأدوية
          </button>
          <button class="tab-btn ${this.currentView==="prescriptions"?"active":""}" 
                  onclick="this.switchView('prescriptions')">
            <i class="fas fa-prescription"></i> الوصفات
          </button>
          <button class="tab-btn ${this.currentView==="dosages"?"active":""}" 
                  onclick="this.switchView('dosages')">
            <i class="fas fa-syringe"></i> الجرعات
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}" 
                  onclick="this.switchView('schedules')">
            <i class="fas fa-calendar-alt"></i> الجداول
          </button>
          <button class="tab-btn ${this.currentView==="adherence"?"active":""}" 
                  onclick="this.switchView('adherence')">
            <i class="fas fa-check-circle"></i> الالتزام
          </button>
          <button class="tab-btn ${this.currentView==="side-effects"?"active":""}" 
                  onclick="this.switchView('side-effects')">
            <i class="fas fa-exclamation-triangle"></i> الآثار الجانبية
          </button>
          <button class="tab-btn ${this.currentView==="interactions"?"active":""}" 
                  onclick="this.switchView('interactions')">
            <i class="fas fa-link"></i> التفاعلات
          </button>
          <button class="tab-btn ${this.currentView==="inventory"?"active":""}" 
                  onclick="this.switchView('inventory')">
            <i class="fas fa-box"></i> المخزون
          </button>
          <button class="tab-btn ${this.currentView==="treatments"?"active":""}" 
                  onclick="this.switchView('treatments')">
            <i class="fas fa-heartbeat"></i> العلاجات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="medications-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="completed">مكتمل</option>
            <option value="discontinued">متوقف</option>
            <option value="expired">منتهي</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="antibiotic">مضاد حيوي</option>
            <option value="pain-relief">مسكن</option>
            <option value="vitamin">فيتامين</option>
            <option value="supplement">مكمل غذائي</option>
            <option value="therapy">علاجي</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="medications-content" id="medicationsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"medications":return this.renderMedications();case"prescriptions":return this.renderPrescriptions();case"dosages":return this.renderDosages();case"schedules":return this.renderSchedules();case"adherence":return this.renderAdherence();case"side-effects":return this.renderSideEffects();case"interactions":return this.renderInteractions();case"inventory":return this.renderInventory();case"treatments":return this.renderTreatments();case"analytics":return this.renderAnalytics();default:return this.renderMedications()}}renderMedications(){const s=this.getFilteredData(this.medications);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-pills"></i>
          <p>لا توجد أدوية</p>
          <button class="btn btn-primary" onclick="this.createMedication()">
            إضافة دواء جديد
          </button>
        </div>
      `:`
      <div class="medications-grid">
        ${s.map(t=>`
          <div class="medication-card status-${t.status} category-${t.category}">
            <div class="medication-header">
              <div class="medication-info">
                <h3>${t.name||"غير محدد"}</h3>
                <p class="medication-category">${this.getCategoryText(t.category)}</p>
              </div>
              <div class="medication-badges">
                <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
                ${t.expiringSoon?'<span class="expiring-badge">ينتهي قريباً</span>':""}
              </div>
            </div>
            <div class="medication-body">
              <div class="medication-details">
                <div class="detail-item">
                  <span class="detail-label">التركيز:</span>
                  <span class="detail-value">${t.strength||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الشكل:</span>
                  <span class="detail-value">${t.form||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(t.expiryDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الكمية المتاحة:</span>
                  <span class="detail-value">${t.quantity||0}</span>
                </div>
                ${t.description?`
                  <div class="medication-description">
                    <span class="description-label">الوصف:</span>
                    <span class="description-text">${t.description.substring(0,100)}${t.description.length>100?"...":""}</span>
                  </div>
                `:""}
              </div>
            </div>
            <div class="medication-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewMedication(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editMedication(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPrescriptions(){return this.prescriptions.length===0?`
        <div class="empty-state">
          <i class="fas fa-prescription"></i>
          <p>لا توجد وصفات طبية</p>
          <button class="btn btn-primary" onclick="this.createPrescription()">
            إضافة وصفة طبية جديدة
          </button>
        </div>
      `:`
      <div class="prescriptions-list">
        ${this.prescriptions.map(s=>{var t;return`
          <div class="prescription-card status-${s.status}">
            <div class="prescription-header">
              <div class="prescription-info">
                <h3>${s.patientName||"غير محدد"}</h3>
                <p class="prescription-provider">الطبيب: ${s.providerName||"غير محدد"}</p>
              </div>
              <div class="prescription-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                <span class="date-badge">${this.formatDate(s.date)}</span>
              </div>
            </div>
            <div class="prescription-body">
              <div class="prescription-medications">
                <h4>الأدوية:</h4>
                <ul>
                  ${((t=s.medications)==null?void 0:t.map(e=>`
                    <li>${e.name} - ${e.dosage} - ${e.frequency}</li>
                  `).join(""))||""}
                </ul>
              </div>
              <div class="prescription-details">
                <div class="detail-item">
                  <span class="detail-label">عدد الأدوية:</span>
                  <span class="detail-value">${s.medicationsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                ${s.instructions?`
                  <div class="prescription-instructions">
                    <span class="instructions-label">التعليمات:</span>
                    <span class="instructions-text">${s.instructions}</span>
                  </div>
                `:""}
              </div>
            </div>
            <div class="prescription-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewPrescription(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.dispensePrescription(${s.id})">
                <i class="fas fa-check"></i> صرف
              </button>
            </div>
          </div>
        `}).join("")}
      </div>
    `}renderDosages(){return this.dosages.length===0?`
        <div class="empty-state">
          <i class="fas fa-syringe"></i>
          <p>لا توجد جرعات</p>
        </div>
      `:`
      <div class="dosages-list">
        ${this.dosages.map(s=>`
          <div class="dosage-card">
            <div class="dosage-header">
              <h3>${s.medicationName||"جرعة"}</h3>
              <span class="dosage-patient">${s.patientName||"غير محدد"}</span>
            </div>
            <div class="dosage-body">
              <div class="dosage-details">
                <div class="detail-item">
                  <span class="detail-label">الجرعة:</span>
                  <span class="detail-value">${s.amount||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التكرار:</span>
                  <span class="detail-value">${s.frequency||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الطريقة:</span>
                  <span class="detail-value">${s.route||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوقت:</span>
                  <span class="detail-value">${this.formatDateTime(s.time)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSchedules(){return this.schedules.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-alt"></i>
          <p>لا توجد جداول</p>
        </div>
      `:`
      <div class="schedules-calendar">
        ${this.schedules.map(s=>`
          <div class="schedule-item">
            <div class="schedule-time">${this.formatTime(s.time)}</div>
            <div class="schedule-details">
              <h4>${s.medicationName||"غير محدد"}</h4>
              <p>${s.patientName||"غير محدد"}</p>
              <span class="schedule-dosage">${s.dosage||"غير محدد"}</span>
            </div>
            <div class="schedule-status">
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAdherence(){return this.adherence.length===0?`
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>لا توجد بيانات التزام</p>
        </div>
      `:`
      <div class="adherence-dashboard">
        ${this.adherence.map(s=>`
          <div class="adherence-card">
            <div class="adherence-header">
              <h3>${s.patientName||"غير محدد"}</h3>
              <span class="adherence-medication">${s.medicationName||"غير محدد"}</span>
            </div>
            <div class="adherence-body">
              <div class="adherence-metrics">
                <div class="metric-item">
                  <span class="metric-label">معدل الالتزام:</span>
                  <span class="metric-value">${s.adherenceRate||0}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">الجرعات المأخوذة:</span>
                  <span class="metric-value">${s.takenDoses||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">الجرعات المفقودة:</span>
                  <span class="metric-value">${s.missedDoses||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">الفترة:</span>
                  <span class="metric-value">${s.period||"غير محدد"}</span>
                </div>
              </div>
              <div class="adherence-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${s.adherenceRate||0}%"></div>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSideEffects(){return this.sideEffects.length===0?`
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>لا توجد آثار جانبية مسجلة</p>
        </div>
      `:`
      <div class="side-effects-list">
        ${this.sideEffects.map(s=>`
          <div class="side-effect-card severity-${s.severity||"mild"}">
            <div class="side-effect-header">
              <h3>${s.medicationName||"غير محدد"}</h3>
              <span class="severity-badge severity-${s.severity||"mild"}">
                ${this.getSeverityText(s.severity||"mild")}
              </span>
            </div>
            <div class="side-effect-body">
              <div class="side-effect-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوصف:</span>
                  <span class="detail-value">${s.description||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(s.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${s.resolved?"تم الحل":"قيد المتابعة"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderInteractions(){return this.interactions.length===0?`
        <div class="empty-state">
          <i class="fas fa-link"></i>
          <p>لا توجد تفاعلات دوائية</p>
        </div>
      `:`
      <div class="interactions-list">
        ${this.interactions.map(s=>`
          <div class="interaction-card severity-${s.severity||"moderate"}">
            <div class="interaction-header">
              <h3>${s.medication1} ↔ ${s.medication2}</h3>
              <span class="severity-badge severity-${s.severity||"moderate"}">
                ${this.getSeverityText(s.severity||"moderate")}
              </span>
            </div>
            <div class="interaction-body">
              <div class="interaction-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوصف:</span>
                  <span class="detail-value">${s.description||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التوصية:</span>
                  <span class="detail-value">${s.recommendation||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderInventory(){return this.inventory.length===0?`
        <div class="empty-state">
          <i class="fas fa-box"></i>
          <p>لا توجد بيانات مخزون</p>
        </div>
      `:`
      <div class="inventory-grid">
        ${this.inventory.map(s=>`
          <div class="inventory-card ${s.lowStock?"low-stock":""}">
            <div class="inventory-header">
              <h3>${s.medicationName||"غير محدد"}</h3>
              ${s.lowStock?'<span class="low-stock-badge">مخزون منخفض</span>':""}
            </div>
            <div class="inventory-body">
              <div class="inventory-details">
                <div class="detail-item">
                  <span class="detail-label">الكمية الحالية:</span>
                  <span class="detail-value">${s.currentQuantity||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحد الأدنى:</span>
                  <span class="detail-value">${s.minimumQuantity||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحد الأقصى:</span>
                  <span class="detail-value">${s.maximumQuantity||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(s.expiryDate)}</span>
                </div>
              </div>
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
        ${this.treatments.map(s=>`
          <div class="treatment-card status-${s.status}">
            <div class="treatment-header">
              <h3>${s.name||"علاج"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="treatment-body">
              <div class="treatment-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(s.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
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
        ${this.analytics.map(s=>`
          <div class="analytic-card">
            <div class="analytic-header">
              <h3>${s.metric}</h3>
              <span class="analytic-value">${s.value}</span>
            </div>
            <div class="analytic-body">
              <p>${s.description||""}</p>
              ${s.trend?`
                <div class="analytic-trend ${s.trend>0?"up":"down"}">
                  <i class="fas fa-arrow-${s.trend>0?"up":"down"}"></i>
                  ${Math.abs(s.trend)}%
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(s){let t=[...s];return this.filters.status!=="all"&&(t=t.filter(e=>e.status===this.filters.status)),this.filters.category!=="all"&&(t=t.filter(e=>e.category===this.filters.category)),this.filters.patient!=="all"&&(t=t.filter(e=>e.patientId===parseInt(this.filters.patient))),this.filters.provider!=="all"&&(t=t.filter(e=>e.providerId===parseInt(this.filters.provider))),t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,t,e,a,i,n,c,l,d,r]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.medications||"/api/advanced-medications/medications"),this.apiClient.get(this.API_ENDPOINTS.prescriptions||"/api/advanced-medications/prescriptions"),this.apiClient.get(this.API_ENDPOINTS.dosages||"/api/advanced-medications/dosages"),this.apiClient.get(this.API_ENDPOINTS.schedules||"/api/advanced-medications/schedules"),this.apiClient.get(this.API_ENDPOINTS.adherence||"/api/advanced-medications/adherence"),this.apiClient.get(this.API_ENDPOINTS.sideEffects||"/api/advanced-medications/side-effects"),this.apiClient.get(this.API_ENDPOINTS.interactions||"/api/advanced-medications/interactions"),this.apiClient.get(this.API_ENDPOINTS.inventory||"/api/advanced-medications/inventory"),this.apiClient.get(this.API_ENDPOINTS.treatments||"/api/advanced-medications/treatments"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-medications/analytics")]);this.medications=s.data||[],this.prescriptions=t.data||[],this.dosages=e.data||[],this.schedules=a.data||[],this.adherence=i.data||[],this.sideEffects=n.data||[],this.interactions=c.data||[],this.inventory=l.data||[],this.treatments=d.data||[],this.analytics=r.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading medications data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-medications","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,t){this.filters[s]=t.target.value,this.updateContent()}handleSearch(s){this.updateContent()}updateContent(){const s=document.getElementById("medicationsContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{active:"نشط",completed:"مكتمل",discontinued:"متوقف",expired:"منتهي"}[s]||s}getCategoryText(s){return{antibiotic:"مضاد حيوي","pain-relief":"مسكن",vitamin:"فيتامين",supplement:"مكمل غذائي",therapy:"علاجي"}[s]||s}getSeverityText(s){return{mild:"خفيف",moderate:"متوسط",severe:"شديد",critical:"حرج"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatTime(s){return s?new Date(s).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedMedications",JSON.stringify(this.medications)),localStorage.setItem("advancedPrescriptions",JSON.stringify(this.prescriptions)),localStorage.setItem("advancedDosages",JSON.stringify(this.dosages)),localStorage.setItem("advancedSchedules",JSON.stringify(this.schedules)),localStorage.setItem("advancedAdherence",JSON.stringify(this.adherence)),localStorage.setItem("advancedSideEffects",JSON.stringify(this.sideEffects)),localStorage.setItem("advancedInteractions",JSON.stringify(this.interactions)),localStorage.setItem("advancedInventory",JSON.stringify(this.inventory)),localStorage.setItem("advancedTreatments",JSON.stringify(this.treatments)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.medications=JSON.parse(localStorage.getItem("advancedMedications")||"[]"),this.prescriptions=JSON.parse(localStorage.getItem("advancedPrescriptions")||"[]"),this.dosages=JSON.parse(localStorage.getItem("advancedDosages")||"[]"),this.schedules=JSON.parse(localStorage.getItem("advancedSchedules")||"[]"),this.adherence=JSON.parse(localStorage.getItem("advancedAdherence")||"[]"),this.sideEffects=JSON.parse(localStorage.getItem("advancedSideEffects")||"[]"),this.interactions=JSON.parse(localStorage.getItem("advancedInteractions")||"[]"),this.inventory=JSON.parse(localStorage.getItem("advancedInventory")||"[]"),this.treatments=JSON.parse(localStorage.getItem("advancedTreatments")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createMedication=this.createMedication.bind(this),this.createPrescription=this.createPrescription.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewMedication=this.viewMedication.bind(this),this.editMedication=this.editMedication.bind(this),this.viewPrescription=this.viewPrescription.bind(this),this.dispensePrescription=this.dispensePrescription.bind(this)}async createMedication(){console.log("Create medication")}async createPrescription(){console.log("Create prescription")}async viewMedication(s){console.log("View medication",s)}async editMedication(s){console.log("Edit medication",s)}async viewPrescription(s){console.log("View prescription",s)}async dispensePrescription(s){console.log("Dispense prescription",s)}}export{y as default};
//# sourceMappingURL=rehabilitation-center-advanced-medications-BQTHBRwy.js.map
