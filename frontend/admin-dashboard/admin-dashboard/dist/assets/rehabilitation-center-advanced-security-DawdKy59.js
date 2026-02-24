import{a as c,A as d,c as r,r as o,s as p,b as v,d as h}from"./main-DFR0ngT_.js";class m{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=c,this.API_ENDPOINTS=d.advancedSecurity||{},this.connectionManager=r,this.realtimeSync=o,this.systemEnhancer=p,this.aiAssistant=v,this.advancedCache=h,this.incidents=[],this.risks=[],this.policies=[],this.trainings=[],this.equipment=[],this.inspections=[],this.analytics=[],this.currentView="incidents",this.filters={status:"all",severity:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-security-management">
        <div class="security-header">
          <h2>🔒 نظام إدارة الأمن والسلامة المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createIncident()">
              <i class="fas fa-plus"></i> حادث جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createRisk()">
              <i class="fas fa-exclamation-triangle"></i> خطر جديد
            </button>
          </div>
        </div>

        <div class="security-tabs">
          <button class="tab-btn ${this.currentView==="incidents"?"active":""}" 
                  onclick="this.switchView('incidents')">
            <i class="fas fa-exclamation-circle"></i> الحوادث
          </button>
          <button class="tab-btn ${this.currentView==="risks"?"active":""}" 
                  onclick="this.switchView('risks')">
            <i class="fas fa-exclamation-triangle"></i> المخاطر
          </button>
          <button class="tab-btn ${this.currentView==="policies"?"active":""}" 
                  onclick="this.switchView('policies')">
            <i class="fas fa-file-alt"></i> السياسات
          </button>
          <button class="tab-btn ${this.currentView==="trainings"?"active":""}" 
                  onclick="this.switchView('trainings')">
            <i class="fas fa-graduation-cap"></i> التدريبات
          </button>
          <button class="tab-btn ${this.currentView==="equipment"?"active":""}" 
                  onclick="this.switchView('equipment')">
            <i class="fas fa-shield-alt"></i> المعدات
          </button>
          <button class="tab-btn ${this.currentView==="inspections"?"active":""}" 
                  onclick="this.switchView('inspections')">
            <i class="fas fa-search"></i> التفتيشات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="security-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="reported">مبلغ عنه</option>
            <option value="investigating">قيد التحقيق</option>
            <option value="resolved">محلول</option>
            <option value="closed">مغلق</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('severity', event)">
            <option value="all">جميع المستويات</option>
            <option value="low">منخفض</option>
            <option value="medium">متوسط</option>
            <option value="high">عالي</option>
            <option value="critical">حرج</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="security-content" id="securityContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"incidents":return this.renderIncidents();case"risks":return this.renderRisks();case"policies":return this.renderPolicies();case"trainings":return this.renderTrainings();case"equipment":return this.renderEquipment();case"inspections":return this.renderInspections();case"analytics":return this.renderAnalytics();default:return this.renderIncidents()}}renderIncidents(){const s=this.getFilteredData(this.incidents);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-exclamation-circle"></i>
          <p>لا توجد حوادث</p>
          <button class="btn btn-primary" onclick="this.createIncident()">
            إضافة حادث جديد
          </button>
        </div>
      `:`
      <div class="incidents-list">
        ${s.map(t=>`
          <div class="incident-card severity-${t.severity||"medium"} status-${t.status}">
            <div class="incident-header">
              <div class="incident-info">
                <h3>${t.title||"حادث"}</h3>
                <p class="incident-date">${this.formatDateTime(t.occurredAt)}</p>
              </div>
              <div class="incident-badges">
                <span class="severity-badge severity-${t.severity||"medium"}">
                  ${this.getSeverityText(t.severity||"medium")}
                </span>
                <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
              </div>
            </div>
            <div class="incident-body">
              <div class="incident-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${t.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${t.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المبلغ:</span>
                  <span class="detail-value">${t.reportedBy||"غير محدد"}</span>
                </div>
                ${t.injuriesCount?`
                  <div class="detail-item">
                    <span class="detail-label">عدد الإصابات:</span>
                    <span class="detail-value">${t.injuriesCount}</span>
                  </div>
                `:""}
              </div>
              ${t.description?`
                <div class="incident-description">
                  <p>${t.description.substring(0,150)}${t.description.length>150?"...":""}</p>
                </div>
              `:""}
            </div>
            <div class="incident-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewIncident(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${t.status==="reported"?`
                <button class="btn btn-sm btn-warning" onclick="this.investigateIncident(${t.id})">
                  <i class="fas fa-search"></i> تحقق
                </button>
              `:""}
              ${t.status==="investigating"?`
                <button class="btn btn-sm btn-success" onclick="this.resolveIncident(${t.id})">
                  <i class="fas fa-check"></i> حل
                </button>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRisks(){return this.risks.length===0?`
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>لا توجد مخاطر</p>
          <button class="btn btn-primary" onclick="this.createRisk()">
            إضافة خطر جديد
          </button>
        </div>
      `:`
      <div class="risks-grid">
        ${this.risks.map(s=>`
          <div class="risk-card severity-${s.severity||"medium"}">
            <div class="risk-header">
              <h3>${s.name||"خطر"}</h3>
              <span class="severity-badge severity-${s.severity||"medium"}">
                ${this.getSeverityText(s.severity||"medium")}
              </span>
            </div>
            <div class="risk-body">
              <div class="risk-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${s.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الاحتمالية:</span>
                  <span class="detail-value">${s.probability||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التأثير:</span>
                  <span class="detail-value">${s.impact||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(s.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPolicies(){return this.policies.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>لا توجد سياسات</p>
        </div>
      `:`
      <div class="policies-list">
        ${this.policies.map(s=>`
          <div class="policy-card status-${s.status}">
            <div class="policy-header">
              <h3>${s.title||"سياسة"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="policy-body">
              <div class="policy-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الإصدار:</span>
                  <span class="detail-value">${s.version||"1.0"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإصدار:</span>
                  <span class="detail-value">${this.formatDate(s.issueDate)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTrainings(){return this.trainings.length===0?`
        <div class="empty-state">
          <i class="fas fa-graduation-cap"></i>
          <p>لا توجد تدريبات</p>
        </div>
      `:`
      <div class="trainings-list">
        ${this.trainings.map(s=>`
          <div class="training-card status-${s.status}">
            <div class="training-header">
              <h3>${s.title||"تدريب"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="training-body">
              <div class="training-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المشاركين:</span>
                  <span class="detail-value">${s.participantsCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderEquipment(){return this.equipment.length===0?`
        <div class="empty-state">
          <i class="fas fa-shield-alt"></i>
          <p>لا توجد معدات</p>
        </div>
      `:`
      <div class="equipment-grid">
        ${this.equipment.map(s=>`
          <div class="equipment-card status-${s.status}">
            <div class="equipment-header">
              <h3>${s.name||"معدة"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="equipment-body">
              <div class="equipment-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${s.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الصيانة:</span>
                  <span class="detail-value">${this.formatDate(s.lastMaintenanceDate)||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ انتهاء الصلاحية:</span>
                  <span class="detail-value">${this.formatDate(s.expiryDate)||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderInspections(){return this.inspections.length===0?`
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>لا توجد تفتيشات</p>
        </div>
      `:`
      <div class="inspections-list">
        ${this.inspections.map(s=>`
          <div class="inspection-card status-${s.status}">
            <div class="inspection-header">
              <h3>${s.title||"تفتيش"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="inspection-body">
              <div class="inspection-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.inspectionDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المفتش:</span>
                  <span class="detail-value">${s.inspectorName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${s.result||"غير محدد"}</span>
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
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(s){let t=[...s];if(this.filters.status!=="all"&&(t=t.filter(i=>i.status===this.filters.status)),this.filters.severity!=="all"&&(t=t.filter(i=>i.severity===this.filters.severity)),this.filters.search){const i=this.filters.search.toLowerCase();t=t.filter(a=>a.title&&a.title.toLowerCase().includes(i)||a.name&&a.name.toLowerCase().includes(i)||a.description&&a.description.toLowerCase().includes(i))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,t,i,a,e,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.incidents||"/api/advanced-security/incidents"),this.apiClient.get(this.API_ENDPOINTS.risks||"/api/advanced-security/risks"),this.apiClient.get(this.API_ENDPOINTS.policies||"/api/advanced-security/policies"),this.apiClient.get(this.API_ENDPOINTS.trainings||"/api/advanced-security/trainings"),this.apiClient.get(this.API_ENDPOINTS.equipment||"/api/advanced-security/equipment"),this.apiClient.get(this.API_ENDPOINTS.inspections||"/api/advanced-security/inspections"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-security/analytics")]);this.incidents=s.data||[],this.risks=t.data||[],this.policies=i.data||[],this.trainings=a.data||[],this.equipment=e.data||[],this.inspections=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading security data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-security","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,t){this.filters[s]=t.target.value,this.updateContent()}handleSearch(s){this.filters.search=s.target.value,this.updateContent()}updateContent(){const s=document.getElementById("securityContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{reported:"مبلغ عنه",investigating:"قيد التحقيق",resolved:"محلول",closed:"مغلق",active:"نشط",inactive:"غير نشط",scheduled:"مجدول",completed:"مكتمل",passed:"نجح",failed:"فشل",valid:"صالح",expired:"منتهي"}[s]||s}getSeverityText(s){return{low:"منخفض",medium:"متوسط",high:"عالي",critical:"حرج"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedIncidents",JSON.stringify(this.incidents)),localStorage.setItem("advancedRisks",JSON.stringify(this.risks)),localStorage.setItem("advancedPolicies",JSON.stringify(this.policies)),localStorage.setItem("advancedTrainings",JSON.stringify(this.trainings)),localStorage.setItem("advancedEquipment",JSON.stringify(this.equipment)),localStorage.setItem("advancedInspections",JSON.stringify(this.inspections)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.incidents=JSON.parse(localStorage.getItem("advancedIncidents")||"[]"),this.risks=JSON.parse(localStorage.getItem("advancedRisks")||"[]"),this.policies=JSON.parse(localStorage.getItem("advancedPolicies")||"[]"),this.trainings=JSON.parse(localStorage.getItem("advancedTrainings")||"[]"),this.equipment=JSON.parse(localStorage.getItem("advancedEquipment")||"[]"),this.inspections=JSON.parse(localStorage.getItem("advancedInspections")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createIncident=this.createIncident.bind(this),this.createRisk=this.createRisk.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewIncident=this.viewIncident.bind(this),this.investigateIncident=this.investigateIncident.bind(this),this.resolveIncident=this.resolveIncident.bind(this)}async createIncident(){console.log("Create incident")}async createRisk(){console.log("Create risk")}async viewIncident(s){console.log("View incident",s)}async investigateIncident(s){console.log("Investigate incident",s)}async resolveIncident(s){console.log("Resolve incident",s)}}export{m as default};
//# sourceMappingURL=rehabilitation-center-advanced-security-DawdKy59.js.map
