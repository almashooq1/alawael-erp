import{a as d,A as c,c as r,r as o,s as p,b as h,d as u}from"./main-DFR0ngT_.js";class f{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=d,this.API_ENDPOINTS=c.advancedFunding||{},this.connectionManager=r,this.realtimeSync=o,this.systemEnhancer=p,this.aiAssistant=h,this.advancedCache=u,this.grants=[],this.donations=[],this.funders=[],this.applications=[],this.budgets=[],this.expenses=[],this.analytics=[],this.currentView="grants",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-funding-management">
        <div class="funding-header">
          <h2>💰 نظام إدارة التمويل والمنح المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createGrant()">
              <i class="fas fa-plus"></i> منحة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.addDonation()">
              <i class="fas fa-hand-holding-heart"></i> تبرع جديد
            </button>
            <button class="btn btn-info" onclick="this.createApplication()">
              <i class="fas fa-file-alt"></i> طلب تمويل
            </button>
          </div>
        </div>

        <div class="funding-tabs">
          <button class="tab-btn ${this.currentView==="grants"?"active":""}" 
                  onclick="this.switchView('grants')">
            <i class="fas fa-money-bill-wave"></i> المنح
          </button>
          <button class="tab-btn ${this.currentView==="donations"?"active":""}" 
                  onclick="this.switchView('donations')">
            <i class="fas fa-hand-holding-heart"></i> التبرعات
          </button>
          <button class="tab-btn ${this.currentView==="funders"?"active":""}" 
                  onclick="this.switchView('funders')">
            <i class="fas fa-building"></i> الممولون
          </button>
          <button class="tab-btn ${this.currentView==="applications"?"active":""}" 
                  onclick="this.switchView('applications')">
            <i class="fas fa-file-alt"></i> الطلبات
          </button>
          <button class="tab-btn ${this.currentView==="budgets"?"active":""}" 
                  onclick="this.switchView('budgets')">
            <i class="fas fa-calculator"></i> الميزانيات
          </button>
          <button class="tab-btn ${this.currentView==="expenses"?"active":""}" 
                  onclick="this.switchView('expenses')">
            <i class="fas fa-receipt"></i> المصروفات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="funding-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="approved">موافق عليه</option>
            <option value="pending">قيد الانتظار</option>
            <option value="rejected">مرفوض</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="government">حكومي</option>
            <option value="private">خاص</option>
            <option value="international">دولي</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="funding-content" id="fundingContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"grants":return this.renderGrants();case"donations":return this.renderDonations();case"funders":return this.renderFunders();case"applications":return this.renderApplications();case"budgets":return this.renderBudgets();case"expenses":return this.renderExpenses();case"analytics":return this.renderAnalytics();default:return this.renderGrants()}}renderGrants(){const a=this.getFilteredData(this.grants);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-money-bill-wave"></i>
          <p>لا توجد منح</p>
          <button class="btn btn-primary" onclick="this.createGrant()">
            إضافة منحة جديدة
          </button>
        </div>
      `:`
      <div class="grants-list">
        ${a.map(t=>`
          <div class="grant-card status-${t.status}">
            <div class="grant-header">
              <h3>${t.title||"منحة"}</h3>
              <span class="grant-amount">${this.formatCurrency(t.amount)}</span>
            </div>
            <div class="grant-body">
              <div class="grant-details">
                <div class="detail-item">
                  <span class="detail-label">الممول:</span>
                  <span class="detail-value">${t.funderName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(t.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(t.endDate)||"مستمر"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المستخدم:</span>
                  <span class="detail-value">${this.formatCurrency(t.usedAmount||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المتبقي:</span>
                  <span class="detail-value">${this.formatCurrency((t.amount||0)-(t.usedAmount||0))}</span>
                </div>
              </div>
            </div>
            <div class="grant-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewGrant(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editGrant(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderDonations(){return this.donations.length===0?`
        <div class="empty-state">
          <i class="fas fa-hand-holding-heart"></i>
          <p>لا توجد تبرعات</p>
          <button class="btn btn-primary" onclick="this.addDonation()">
            إضافة تبرع جديد
          </button>
        </div>
      `:`
      <div class="donations-list">
        ${this.donations.map(a=>`
          <div class="donation-card">
            <div class="donation-header">
              <h3>${a.donorName||"متبرع"}</h3>
              <span class="donation-amount">${this.formatCurrency(a.amount)}</span>
            </div>
            <div class="donation-body">
              <div class="donation-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getDonationTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الغرض:</span>
                  <span class="detail-value">${a.purpose||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderFunders(){return this.funders.length===0?`
        <div class="empty-state">
          <i class="fas fa-building"></i>
          <p>لا يوجد ممولون</p>
        </div>
      `:`
      <div class="funders-grid">
        ${this.funders.map(a=>`
          <div class="funder-card">
            <div class="funder-header">
              <h3>${a.name||"ممول"}</h3>
              <span class="funder-type">${this.getTypeText(a.type)}</span>
            </div>
            <div class="funder-body">
              <div class="funder-details">
                <div class="detail-item">
                  <span class="detail-label">عدد المنح:</span>
                  <span class="detail-value">${a.grantsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إجمالي المبلغ:</span>
                  <span class="detail-value">${this.formatCurrency(a.totalAmount||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${a.email||"غير محدد"}</span>
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
    `}renderApplications(){return this.applications.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>لا توجد طلبات</p>
          <button class="btn btn-primary" onclick="this.createApplication()">
            إضافة طلب تمويل جديد
          </button>
        </div>
      `:`
      <div class="applications-list">
        ${this.applications.map(a=>`
          <div class="application-card status-${a.status}">
            <div class="application-header">
              <h3>${a.title||"طلب تمويل"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="application-body">
              <div class="application-details">
                <div class="detail-item">
                  <span class="detail-label">المبلغ المطلوب:</span>
                  <span class="detail-value">${this.formatCurrency(a.requestedAmount)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الممول:</span>
                  <span class="detail-value">${a.funderName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ التقديم:</span>
                  <span class="detail-value">${this.formatDate(a.submitDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ المراجعة:</span>
                  <span class="detail-value">${this.formatDate(a.reviewDate)||"لم يتم المراجعة"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderBudgets(){return this.budgets.length===0?`
        <div class="empty-state">
          <i class="fas fa-calculator"></i>
          <p>لا توجد ميزانيات</p>
        </div>
      `:`
      <div class="budgets-list">
        ${this.budgets.map(a=>`
          <div class="budget-card">
            <div class="budget-header">
              <h3>${a.title||"ميزانية"}</h3>
              <span class="budget-amount">${this.formatCurrency(a.totalAmount)}</span>
            </div>
            <div class="budget-body">
              <div class="budget-details">
                <div class="detail-item">
                  <span class="detail-label">المستخدم:</span>
                  <span class="detail-value">${this.formatCurrency(a.usedAmount||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المتبقي:</span>
                  <span class="detail-value">${this.formatCurrency((a.totalAmount||0)-(a.usedAmount||0))}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النسبة:</span>
                  <span class="detail-value">${Math.round((a.usedAmount||0)/(a.totalAmount||1)*100)}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفترة:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)} - ${this.formatDate(a.endDate)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderExpenses(){return this.expenses.length===0?`
        <div class="empty-state">
          <i class="fas fa-receipt"></i>
          <p>لا توجد مصروفات</p>
        </div>
      `:`
      <div class="expenses-list">
        ${this.expenses.map(a=>`
          <div class="expense-card">
            <div class="expense-header">
              <h3>${a.description||"مصروف"}</h3>
              <span class="expense-amount">${this.formatCurrency(a.amount)}</span>
            </div>
            <div class="expense-body">
              <div class="expense-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${a.category||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المشروع:</span>
                  <span class="detail-value">${a.projectName||"غير محدد"}</span>
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
    `}getFilteredData(a){let t=[...a];if(this.filters.status!=="all"&&(t=t.filter(s=>s.status===this.filters.status)),this.filters.type!=="all"&&(t=t.filter(s=>s.type===this.filters.type)),this.filters.search){const s=this.filters.search.toLowerCase();t=t.filter(e=>e.title&&e.title.toLowerCase().includes(s)||e.name&&e.name.toLowerCase().includes(s))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,t,s,e,i,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.grants||"/api/advanced-funding/grants"),this.apiClient.get(this.API_ENDPOINTS.donations||"/api/advanced-funding/donations"),this.apiClient.get(this.API_ENDPOINTS.funders||"/api/advanced-funding/funders"),this.apiClient.get(this.API_ENDPOINTS.applications||"/api/advanced-funding/applications"),this.apiClient.get(this.API_ENDPOINTS.budgets||"/api/advanced-funding/budgets"),this.apiClient.get(this.API_ENDPOINTS.expenses||"/api/advanced-funding/expenses"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-funding/analytics")]);this.grants=a.data||[],this.donations=t.data||[],this.funders=s.data||[],this.applications=e.data||[],this.budgets=i.data||[],this.expenses=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading funding data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-funding","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,t){this.filters[a]=t.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("fundingContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",approved:"موافق عليه",pending:"قيد الانتظار",rejected:"مرفوض"}[a]||a}getTypeText(a){return{government:"حكومي",private:"خاص",international:"دولي"}[a]||a}getDonationTypeText(a){return{cash:"نقدي",in_kind:"عيني",recurring:"متكرر",one_time:"مرة واحدة"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}formatCurrency(a){return a?`${a.toLocaleString("ar-SA")} ر.س`:"0 ر.س"}saveToLocalStorage(){try{localStorage.setItem("advancedGrants",JSON.stringify(this.grants)),localStorage.setItem("advancedDonations",JSON.stringify(this.donations)),localStorage.setItem("advancedFunders",JSON.stringify(this.funders)),localStorage.setItem("advancedApplications",JSON.stringify(this.applications)),localStorage.setItem("advancedBudgets",JSON.stringify(this.budgets)),localStorage.setItem("advancedExpenses",JSON.stringify(this.expenses)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.grants=JSON.parse(localStorage.getItem("advancedGrants")||"[]"),this.donations=JSON.parse(localStorage.getItem("advancedDonations")||"[]"),this.funders=JSON.parse(localStorage.getItem("advancedFunders")||"[]"),this.applications=JSON.parse(localStorage.getItem("advancedApplications")||"[]"),this.budgets=JSON.parse(localStorage.getItem("advancedBudgets")||"[]"),this.expenses=JSON.parse(localStorage.getItem("advancedExpenses")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createGrant=this.createGrant.bind(this),this.addDonation=this.addDonation.bind(this),this.createApplication=this.createApplication.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewGrant=this.viewGrant.bind(this),this.editGrant=this.editGrant.bind(this)}async createGrant(){console.log("Create grant")}async addDonation(){console.log("Add donation")}async createApplication(){console.log("Create application")}async viewGrant(a){console.log("View grant",a)}async editGrant(a){console.log("Edit grant",a)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-funding-BwFVG8lK.js.map
