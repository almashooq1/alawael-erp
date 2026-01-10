import{a as l,A as r,c as d,r as o,s as h,b as p,d as v}from"./main-DFR0ngT_.js";class m{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=l,this.API_ENDPOINTS=r.advancedBranches||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=h,this.aiAssistant=p,this.advancedCache=v,this.branches=[],this.mainBranch=null,this.connections=[],this.syncStatus=[],this.transfers=[],this.sharedResources=[],this.analytics=[],this.currentView="branches",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-branches-management">
        <div class="branches-header">
          <h2>🏢 نظام ربط الفروع مع الفرع الرئيسي المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createBranch()">
              <i class="fas fa-plus"></i> فرع جديد
            </button>
            <button class="btn btn-secondary" onclick="this.connectBranch()">
              <i class="fas fa-link"></i> ربط فرع
            </button>
            <button class="btn btn-info" onclick="this.syncAllBranches()">
              <i class="fas fa-sync"></i> مزامنة الكل
            </button>
          </div>
        </div>

        <div class="branches-tabs">
          <button class="tab-btn ${this.currentView==="branches"?"active":""}" 
                  onclick="this.switchView('branches')">
            <i class="fas fa-building"></i> الفروع
          </button>
          <button class="tab-btn ${this.currentView==="main-branch"?"active":""}" 
                  onclick="this.switchView('main-branch')">
            <i class="fas fa-home"></i> الفرع الرئيسي
          </button>
          <button class="tab-btn ${this.currentView==="connections"?"active":""}" 
                  onclick="this.switchView('connections')">
            <i class="fas fa-network-wired"></i> الاتصالات
          </button>
          <button class="tab-btn ${this.currentView==="sync"?"active":""}" 
                  onclick="this.switchView('sync')">
            <i class="fas fa-sync-alt"></i> المزامنة
          </button>
          <button class="tab-btn ${this.currentView==="transfers"?"active":""}" 
                  onclick="this.switchView('transfers')">
            <i class="fas fa-exchange-alt"></i> التحويلات
          </button>
          <button class="tab-btn ${this.currentView==="resources"?"active":""}" 
                  onclick="this.switchView('resources')">
            <i class="fas fa-share-alt"></i> الموارد المشتركة
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="branches-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="connected">متصل</option>
            <option value="disconnected">غير متصل</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="main">رئيسي</option>
            <option value="sub">فرعي</option>
            <option value="satellite">تابع</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="branches-content" id="branchesContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"branches":return this.renderBranches();case"main-branch":return this.renderMainBranch();case"connections":return this.renderConnections();case"sync":return this.renderSync();case"transfers":return this.renderTransfers();case"resources":return this.renderResources();case"analytics":return this.renderAnalytics();default:return this.renderBranches()}}renderBranches(){const a=this.getFilteredData(this.branches);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-building"></i>
          <p>لا توجد فروع</p>
          <button class="btn btn-primary" onclick="this.createBranch()">
            إضافة فرع جديد
          </button>
        </div>
      `:`
      <div class="branches-grid">
        ${a.map(s=>`
          <div class="branch-card status-${s.status}">
            <div class="branch-header">
              <div class="branch-icon">
                <i class="fas fa-${s.type==="main"?"home":"building"}"></i>
              </div>
              <div class="branch-info">
                <h3>${s.name||"فرع"}</h3>
                <p class="branch-code">${s.code||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="branch-body">
              <div class="branch-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${s.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${s.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">حالة الاتصال:</span>
                  <span class="detail-value ${s.connected?"connected":"disconnected"}">
                    ${s.connected?"متصل":"غير متصل"}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المرضى:</span>
                  <span class="detail-value">${s.patientsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الموظفين:</span>
                  <span class="detail-value">${s.staffCount||0}</span>
                </div>
              </div>
            </div>
            <div class="branch-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewBranch(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editBranch(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
              ${s.connected?`
                <button class="btn btn-sm btn-warning" onclick="this.disconnectBranch(${s.id})">
                  <i class="fas fa-unlink"></i> قطع
                </button>
              `:`
                <button class="btn btn-sm btn-success" onclick="this.connectBranch(${s.id})">
                  <i class="fas fa-link"></i> ربط
                </button>
              `}
            </div>
          </div>
        `).join("")}
      </div>
    `}renderMainBranch(){return this.mainBranch?`
      <div class="main-branch-dashboard">
        <div class="main-branch-card">
          <div class="main-branch-header">
            <div class="main-branch-icon">
              <i class="fas fa-home"></i>
            </div>
            <div class="main-branch-info">
              <h2>${this.mainBranch.name||"الفرع الرئيسي"}</h2>
              <p class="main-branch-code">${this.mainBranch.code||"غير محدد"}</p>
            </div>
            <span class="status-badge status-active">نشط</span>
          </div>
          <div class="main-branch-body">
            <div class="main-branch-details">
              <div class="detail-item">
                <span class="detail-label">الموقع:</span>
                <span class="detail-value">${this.mainBranch.location||"غير محدد"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">الهاتف:</span>
                <span class="detail-value">${this.mainBranch.phone||"غير محدد"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">البريد الإلكتروني:</span>
                <span class="detail-value">${this.mainBranch.email||"غير محدد"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">عدد الفروع المتصلة:</span>
                <span class="detail-value">${this.branches.filter(a=>a.connected&&a.type!=="main").length}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">إجمالي المرضى:</span>
                <span class="detail-value">${this.mainBranch.totalPatients||0}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">إجمالي الموظفين:</span>
                <span class="detail-value">${this.mainBranch.totalStaff||0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `:`
        <div class="empty-state">
          <i class="fas fa-home"></i>
          <p>لا يوجد فرع رئيسي محدد</p>
        </div>
      `}renderConnections(){return this.connections.length===0?`
        <div class="empty-state">
          <i class="fas fa-network-wired"></i>
          <p>لا توجد اتصالات</p>
        </div>
      `:`
      <div class="connections-list">
        ${this.connections.map(a=>`
          <div class="connection-card status-${a.status}">
            <div class="connection-header">
              <h3>${a.fromBranch} → ${a.toBranch}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="connection-body">
              <div class="connection-details">
                <div class="detail-item">
                  <span class="detail-label">نوع الاتصال:</span>
                  <span class="detail-value">${this.getConnectionTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الاتصال:</span>
                  <span class="detail-value">${this.formatDate(a.connectedAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">سرعة الاتصال:</span>
                  <span class="detail-value">${a.speed||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الاستقرار:</span>
                  <span class="detail-value">${a.stability||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSync(){return this.syncStatus.length===0?`
        <div class="empty-state">
          <i class="fas fa-sync-alt"></i>
          <p>لا توجد عمليات مزامنة</p>
        </div>
      `:`
      <div class="sync-list">
        ${this.syncStatus.map(a=>`
          <div class="sync-card status-${a.status}">
            <div class="sync-header">
              <h3>${a.branchName||"فرع"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="sync-body">
              <div class="sync-details">
                <div class="detail-item">
                  <span class="detail-label">نوع المزامنة:</span>
                  <span class="detail-value">${this.getSyncTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">آخر مزامنة:</span>
                  <span class="detail-value">${this.formatDate(a.lastSync)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${a.progress||0}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البيانات المزامنة:</span>
                  <span class="detail-value">${a.syncedRecords||0}</span>
                </div>
              </div>
              ${a.status==="syncing"?`
                <div class="sync-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${a.progress||0}%"></div>
                  </div>
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTransfers(){return this.transfers.length===0?`
        <div class="empty-state">
          <i class="fas fa-exchange-alt"></i>
          <p>لا توجد تحويلات</p>
        </div>
      `:`
      <div class="transfers-list">
        ${this.transfers.map(a=>`
          <div class="transfer-card status-${a.status}">
            <div class="transfer-header">
              <h3>${a.title||"تحويل"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="transfer-body">
              <div class="transfer-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${a.fromBranch||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${a.toBranch||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTransferTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderResources(){return this.sharedResources.length===0?`
        <div class="empty-state">
          <i class="fas fa-share-alt"></i>
          <p>لا توجد موارد مشتركة</p>
        </div>
      `:`
      <div class="resources-grid">
        ${this.sharedResources.map(a=>`
          <div class="resource-card status-${a.status}">
            <div class="resource-header">
              <h3>${a.name||"مورد"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="resource-body">
              <div class="resource-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getResourceTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفروع المشتركة:</span>
                  <span class="detail-value">${a.sharedBranches||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ المشاركة:</span>
                  <span class="detail-value">${this.formatDate(a.sharedAt)}</span>
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
    `}getFilteredData(a){let s=[...a];if(this.filters.status!=="all"&&(s=s.filter(t=>t.status===this.filters.status)),this.filters.type!=="all"&&(s=s.filter(t=>t.type===this.filters.type)),this.filters.search){const t=this.filters.search.toLowerCase();s=s.filter(e=>e.name&&e.name.toLowerCase().includes(t)||e.code&&e.code.toLowerCase().includes(t)||e.location&&e.location.toLowerCase().includes(t))}return s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,s,t,e,i,n,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.branches||"/api/advanced-branches/branches"),this.apiClient.get(this.API_ENDPOINTS.mainBranch||"/api/advanced-branches/main-branch"),this.apiClient.get(this.API_ENDPOINTS.connections||"/api/advanced-branches/connections"),this.apiClient.get(this.API_ENDPOINTS.syncStatus||"/api/advanced-branches/sync-status"),this.apiClient.get(this.API_ENDPOINTS.transfers||"/api/advanced-branches/transfers"),this.apiClient.get(this.API_ENDPOINTS.resources||"/api/advanced-branches/resources"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-branches/analytics")]);this.branches=a.data||[],this.mainBranch=s.data||null,this.connections=t.data||[],this.syncStatus=e.data||[],this.transfers=i.data||[],this.sharedResources=n.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading branches data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-branches","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,s){this.filters[a]=s.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("branchesContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",inactive:"غير نشط",connected:"متصل",disconnected:"غير متصل",syncing:"قيد المزامنة",completed:"مكتمل",pending:"قيد الانتظار",failed:"فشل"}[a]||a}getTypeText(a){return{main:"رئيسي",sub:"فرعي",satellite:"تابع"}[a]||a}getConnectionTypeText(a){return{direct:"مباشر",vpn:"VPN",cloud:"سحابي",api:"API"}[a]||a}getSyncTypeText(a){return{full:"كاملة",incremental:"تزايدية",manual:"يدوية",automatic:"تلقائية"}[a]||a}getTransferTypeText(a){return{patient:"مريض",staff:"موظف",data:"بيانات",resource:"مورد"}[a]||a}getResourceTypeText(a){return{equipment:"معدات",staff:"موظفين",data:"بيانات",service:"خدمة"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedBranches",JSON.stringify(this.branches)),localStorage.setItem("advancedMainBranch",JSON.stringify(this.mainBranch)),localStorage.setItem("advancedConnections",JSON.stringify(this.connections)),localStorage.setItem("advancedSyncStatus",JSON.stringify(this.syncStatus)),localStorage.setItem("advancedTransfers",JSON.stringify(this.transfers)),localStorage.setItem("advancedResources",JSON.stringify(this.sharedResources)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.branches=JSON.parse(localStorage.getItem("advancedBranches")||"[]"),this.mainBranch=JSON.parse(localStorage.getItem("advancedMainBranch")||"null"),this.connections=JSON.parse(localStorage.getItem("advancedConnections")||"[]"),this.syncStatus=JSON.parse(localStorage.getItem("advancedSyncStatus")||"[]"),this.transfers=JSON.parse(localStorage.getItem("advancedTransfers")||"[]"),this.sharedResources=JSON.parse(localStorage.getItem("advancedResources")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createBranch=this.createBranch.bind(this),this.connectBranch=this.connectBranch.bind(this),this.syncAllBranches=this.syncAllBranches.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewBranch=this.viewBranch.bind(this),this.editBranch=this.editBranch.bind(this),this.disconnectBranch=this.disconnectBranch.bind(this)}async createBranch(){console.log("Create branch")}async connectBranch(a){console.log("Connect branch",a)}async syncAllBranches(){console.log("Sync all branches")}async viewBranch(a){console.log("View branch",a)}async editBranch(a){console.log("Edit branch",a)}async disconnectBranch(a){console.log("Disconnect branch",a)}}export{m as default};
//# sourceMappingURL=rehabilitation-center-advanced-branches-DWGyVbU5.js.map
