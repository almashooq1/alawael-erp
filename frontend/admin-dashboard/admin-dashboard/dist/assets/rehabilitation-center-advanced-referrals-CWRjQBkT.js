import{a as n,A as l,c,r as d,s as o,b as h,d as p}from"./main-DFR0ngT_.js";class f{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=n,this.API_ENDPOINTS=l.advancedReferrals||{},this.connectionManager=c,this.realtimeSync=d,this.systemEnhancer=o,this.aiAssistant=h,this.advancedCache=p,this.referrals=[],this.transfers=[],this.referralSources=[],this.referralDestinations=[],this.followUps=[],this.analytics=[],this.currentView="referrals",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-referrals-management">
        <div class="referrals-header">
          <h2>🔄 نظام إدارة الإحالات والتحويلات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createReferral()">
              <i class="fas fa-plus"></i> إحالة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createTransfer()">
              <i class="fas fa-exchange-alt"></i> تحويل جديد
            </button>
            <button class="btn btn-info" onclick="this.addSource()">
              <i class="fas fa-building"></i> مصدر جديد
            </button>
          </div>
        </div>

        <div class="referrals-tabs">
          <button class="tab-btn ${this.currentView==="referrals"?"active":""}" 
                  onclick="this.switchView('referrals')">
            <i class="fas fa-arrow-right"></i> الإحالات
          </button>
          <button class="tab-btn ${this.currentView==="transfers"?"active":""}" 
                  onclick="this.switchView('transfers')">
            <i class="fas fa-exchange-alt"></i> التحويلات
          </button>
          <button class="tab-btn ${this.currentView==="sources"?"active":""}" 
                  onclick="this.switchView('sources')">
            <i class="fas fa-building"></i> المصادر
          </button>
          <button class="tab-btn ${this.currentView==="destinations"?"active":""}" 
                  onclick="this.switchView('destinations')">
            <i class="fas fa-map-marker-alt"></i> الوجهات
          </button>
          <button class="tab-btn ${this.currentView==="follow-ups"?"active":""}" 
                  onclick="this.switchView('follow-ups')">
            <i class="fas fa-tasks"></i> المتابعات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="referrals-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">موافق عليه</option>
            <option value="rejected">مرفوض</option>
            <option value="completed">مكتمل</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="internal">داخلي</option>
            <option value="external">خارجي</option>
            <option value="emergency">طوارئ</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="referrals-content" id="referralsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"referrals":return this.renderReferrals();case"transfers":return this.renderTransfers();case"sources":return this.renderSources();case"destinations":return this.renderDestinations();case"follow-ups":return this.renderFollowUps();case"analytics":return this.renderAnalytics();default:return this.renderReferrals()}}renderReferrals(){const a=this.getFilteredData(this.referrals);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-arrow-right"></i>
          <p>لا توجد إحالات</p>
          <button class="btn btn-primary" onclick="this.createReferral()">
            إضافة إحالة جديدة
          </button>
        </div>
      `:`
      <div class="referrals-list">
        ${a.map(s=>`
          <div class="referral-card status-${s.status}">
            <div class="referral-header">
              <h3>${s.patientName||"مريض"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="referral-body">
              <div class="referral-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${s.fromSource||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${s.toDestination||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السبب:</span>
                  <span class="detail-value">${s.reason||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="referral-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewReferral(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editReferral(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTransfers(){return this.transfers.length===0?`
        <div class="empty-state">
          <i class="fas fa-exchange-alt"></i>
          <p>لا توجد تحويلات</p>
          <button class="btn btn-primary" onclick="this.createTransfer()">
            إضافة تحويل جديد
          </button>
        </div>
      `:`
      <div class="transfers-list">
        ${this.transfers.map(a=>`
          <div class="transfer-card status-${a.status}">
            <div class="transfer-header">
              <h3>${a.patientName||"مريض"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="transfer-body">
              <div class="transfer-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${a.fromLocation||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${a.toLocation||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السبب:</span>
                  <span class="detail-value">${a.reason||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSources(){return this.referralSources.length===0?`
        <div class="empty-state">
          <i class="fas fa-building"></i>
          <p>لا توجد مصادر</p>
          <button class="btn btn-primary" onclick="this.addSource()">
            إضافة مصدر جديد
          </button>
        </div>
      `:`
      <div class="sources-grid">
        ${this.referralSources.map(a=>`
          <div class="source-card">
            <div class="source-header">
              <h3>${a.name||"مصدر"}</h3>
              <span class="source-type">${this.getSourceTypeText(a.type)}</span>
            </div>
            <div class="source-body">
              <div class="source-details">
                <div class="detail-item">
                  <span class="detail-label">عدد الإحالات:</span>
                  <span class="detail-value">${a.referralsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${a.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${a.email||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderDestinations(){return this.referralDestinations.length===0?`
        <div class="empty-state">
          <i class="fas fa-map-marker-alt"></i>
          <p>لا توجد وجهات</p>
        </div>
      `:`
      <div class="destinations-grid">
        ${this.referralDestinations.map(a=>`
          <div class="destination-card">
            <div class="destination-header">
              <h3>${a.name||"وجهة"}</h3>
              <span class="destination-type">${this.getDestinationTypeText(a.type)}</span>
            </div>
            <div class="destination-body">
              <div class="destination-details">
                <div class="detail-item">
                  <span class="detail-label">عدد الإحالات:</span>
                  <span class="detail-value">${a.referralsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${a.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${a.phone||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderFollowUps(){return this.followUps.length===0?`
        <div class="empty-state">
          <i class="fas fa-tasks"></i>
          <p>لا توجد متابعات</p>
        </div>
      `:`
      <div class="follow-ups-list">
        ${this.followUps.map(a=>`
          <div class="follow-up-card status-${a.status}">
            <div class="follow-up-header">
              <h3>${a.patientName||"مريض"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="follow-up-body">
              <div class="follow-up-details">
                <div class="detail-item">
                  <span class="detail-label">الإحالة:</span>
                  <span class="detail-value">${a.referralId||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الملاحظات:</span>
                  <span class="detail-value">${a.notes||"لا توجد ملاحظات"}</span>
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
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(a){let s=[...a];if(this.filters.status!=="all"&&(s=s.filter(e=>e.status===this.filters.status)),this.filters.type!=="all"&&(s=s.filter(e=>e.type===this.filters.type)),this.filters.search){const e=this.filters.search.toLowerCase();s=s.filter(t=>t.patientName&&t.patientName.toLowerCase().includes(e)||t.fromSource&&t.fromSource.toLowerCase().includes(e)||t.toDestination&&t.toDestination.toLowerCase().includes(e))}return s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,s,e,t,i,r]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.referrals||"/api/advanced-referrals/referrals"),this.apiClient.get(this.API_ENDPOINTS.transfers||"/api/advanced-referrals/transfers"),this.apiClient.get(this.API_ENDPOINTS.sources||"/api/advanced-referrals/sources"),this.apiClient.get(this.API_ENDPOINTS.destinations||"/api/advanced-referrals/destinations"),this.apiClient.get(this.API_ENDPOINTS.followUps||"/api/advanced-referrals/follow-ups"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-referrals/analytics")]);this.referrals=a.data||[],this.transfers=s.data||[],this.referralSources=e.data||[],this.referralDestinations=t.data||[],this.followUps=i.data||[],this.analytics=r.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading referrals data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-referrals","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,s){this.filters[a]=s.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("referralsContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{pending:"قيد الانتظار",approved:"موافق عليه",rejected:"مرفوض",completed:"مكتمل"}[a]||a}getTypeText(a){return{internal:"داخلي",external:"خارجي",emergency:"طوارئ"}[a]||a}getSourceTypeText(a){return{hospital:"مستشفى",clinic:"عيادة",center:"مركز",other:"أخرى"}[a]||a}getDestinationTypeText(a){return{hospital:"مستشفى",clinic:"عيادة",center:"مركز",specialist:"أخصائي",other:"أخرى"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedReferrals",JSON.stringify(this.referrals)),localStorage.setItem("advancedTransfers",JSON.stringify(this.transfers)),localStorage.setItem("advancedReferralSources",JSON.stringify(this.referralSources)),localStorage.setItem("advancedReferralDestinations",JSON.stringify(this.referralDestinations)),localStorage.setItem("advancedFollowUps",JSON.stringify(this.followUps)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.referrals=JSON.parse(localStorage.getItem("advancedReferrals")||"[]"),this.transfers=JSON.parse(localStorage.getItem("advancedTransfers")||"[]"),this.referralSources=JSON.parse(localStorage.getItem("advancedReferralSources")||"[]"),this.referralDestinations=JSON.parse(localStorage.getItem("advancedReferralDestinations")||"[]"),this.followUps=JSON.parse(localStorage.getItem("advancedFollowUps")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createReferral=this.createReferral.bind(this),this.createTransfer=this.createTransfer.bind(this),this.addSource=this.addSource.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewReferral=this.viewReferral.bind(this),this.editReferral=this.editReferral.bind(this)}async createReferral(){console.log("Create referral")}async createTransfer(){console.log("Create transfer")}async addSource(){console.log("Add source")}async viewReferral(a){console.log("View referral",a)}async editReferral(a){console.log("Edit referral",a)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-referrals-CWRjQBkT.js.map
