import{a as l,A as c,c as d,r as o,s as p,b as h,d as v}from"./main-DFR0ngT_.js";class b{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=l,this.API_ENDPOINTS=c.advancedPartnerships||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=p,this.aiAssistant=h,this.advancedCache=v,this.partnerships=[],this.partners=[],this.collaborations=[],this.projects=[],this.agreements=[],this.events=[],this.analytics=[],this.currentView="partnerships",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-partnerships-management">
        <div class="partnerships-header">
          <h2>🤝 نظام إدارة الشراكات والتعاون المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createPartnership()">
              <i class="fas fa-plus"></i> شراكة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createPartner()">
              <i class="fas fa-handshake"></i> شريك جديد
            </button>
          </div>
        </div>

        <div class="partnerships-tabs">
          <button class="tab-btn ${this.currentView==="partnerships"?"active":""}" 
                  onclick="this.switchView('partnerships')">
            <i class="fas fa-handshake"></i> الشراكات
          </button>
          <button class="tab-btn ${this.currentView==="partners"?"active":""}" 
                  onclick="this.switchView('partners')">
            <i class="fas fa-users"></i> الشركاء
          </button>
          <button class="tab-btn ${this.currentView==="collaborations"?"active":""}" 
                  onclick="this.switchView('collaborations')">
            <i class="fas fa-network-wired"></i> التعاونات
          </button>
          <button class="tab-btn ${this.currentView==="projects"?"active":""}" 
                  onclick="this.switchView('projects')">
            <i class="fas fa-project-diagram"></i> المشاريع
          </button>
          <button class="tab-btn ${this.currentView==="agreements"?"active":""}" 
                  onclick="this.switchView('agreements')">
            <i class="fas fa-file-contract"></i> الاتفاقيات
          </button>
          <button class="tab-btn ${this.currentView==="events"?"active":""}" 
                  onclick="this.switchView('events')">
            <i class="fas fa-calendar-alt"></i> الفعاليات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="partnerships-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="pending">قيد الانتظار</option>
            <option value="completed">مكتمل</option>
            <option value="suspended">معلق</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="strategic">استراتيجي</option>
            <option value="educational">تعليمي</option>
            <option value="medical">طبي</option>
            <option value="financial">مالي</option>
            <option value="research">بحثي</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="partnerships-content" id="partnershipsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"partnerships":return this.renderPartnerships();case"partners":return this.renderPartners();case"collaborations":return this.renderCollaborations();case"projects":return this.renderProjects();case"agreements":return this.renderAgreements();case"events":return this.renderEvents();case"analytics":return this.renderAnalytics();default:return this.renderPartnerships()}}renderPartnerships(){const a=this.getFilteredData(this.partnerships);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-handshake"></i>
          <p>لا توجد شراكات</p>
          <button class="btn btn-primary" onclick="this.createPartnership()">
            إضافة شراكة جديدة
          </button>
        </div>
      `:`
      <div class="partnerships-grid">
        ${a.map(s=>`
          <div class="partnership-card status-${s.status}">
            <div class="partnership-header">
              <div class="partnership-icon">
                <i class="fas fa-handshake"></i>
              </div>
              <div class="partnership-info">
                <h3>${s.name||"شراكة"}</h3>
                <p class="partnership-partner">${s.partnerName||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="partnership-body">
              <div class="partnership-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(s.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(s.endDate)||"مستمر"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">القيمة:</span>
                  <span class="detail-value">${this.formatCurrency(s.value)}</span>
                </div>
              </div>
            </div>
            <div class="partnership-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewPartnership(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editPartnership(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPartners(){return this.partners.length===0?`
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>لا يوجد شركاء</p>
          <button class="btn btn-primary" onclick="this.createPartner()">
            إضافة شريك جديد
          </button>
        </div>
      `:`
      <div class="partners-grid">
        ${this.partners.map(a=>`
          <div class="partner-card status-${a.status}">
            <div class="partner-header">
              <div class="partner-avatar">
                <i class="fas fa-building"></i>
              </div>
              <div class="partner-info">
                <h3>${a.name||"شريك"}</h3>
                <p class="partner-type">${this.getTypeText(a.type)}</p>
              </div>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="partner-body">
              <div class="partner-details">
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${a.email||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${a.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الشراكات:</span>
                  <span class="detail-value">${a.partnershipsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المشاريع:</span>
                  <span class="detail-value">${a.projectsCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderCollaborations(){return this.collaborations.length===0?`
        <div class="empty-state">
          <i class="fas fa-network-wired"></i>
          <p>لا توجد تعاونات</p>
        </div>
      `:`
      <div class="collaborations-list">
        ${this.collaborations.map(a=>`
          <div class="collaboration-card status-${a.status}">
            <div class="collaboration-header">
              <h3>${a.title||"تعاون"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="collaboration-body">
              <div class="collaboration-details">
                <div class="detail-item">
                  <span class="detail-label">الشريك:</span>
                  <span class="detail-value">${a.partnerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${a.progress||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderProjects(){return this.projects.length===0?`
        <div class="empty-state">
          <i class="fas fa-project-diagram"></i>
          <p>لا توجد مشاريع</p>
        </div>
      `:`
      <div class="projects-list">
        ${this.projects.map(a=>`
          <div class="project-card status-${a.status}">
            <div class="project-header">
              <h3>${a.name||"مشروع"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="project-body">
              <div class="project-details">
                <div class="detail-item">
                  <span class="detail-label">الشريك:</span>
                  <span class="detail-value">${a.partnerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الميزانية:</span>
                  <span class="detail-value">${this.formatCurrency(a.budget)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${a.progress||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAgreements(){return this.agreements.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-contract"></i>
          <p>لا توجد اتفاقيات</p>
        </div>
      `:`
      <div class="agreements-list">
        ${this.agreements.map(a=>`
          <div class="agreement-card status-${a.status}">
            <div class="agreement-header">
              <h3>${a.title||"اتفاقية"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="agreement-body">
              <div class="agreement-details">
                <div class="detail-item">
                  <span class="detail-label">الشريك:</span>
                  <span class="detail-value">${a.partnerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ التوقيع:</span>
                  <span class="detail-value">${this.formatDate(a.signDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(a.endDate)||"مستمر"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">القيمة:</span>
                  <span class="detail-value">${this.formatCurrency(a.value)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderEvents(){return this.events.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-alt"></i>
          <p>لا توجد فعاليات</p>
        </div>
      `:`
      <div class="events-list">
        ${this.events.map(a=>`
          <div class="event-card status-${a.status}">
            <div class="event-header">
              <h3>${a.title||"فعالية"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="event-body">
              <div class="event-details">
                <div class="detail-item">
                  <span class="detail-label">الشريك:</span>
                  <span class="detail-value">${a.partnerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكان:</span>
                  <span class="detail-value">${a.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الحضور:</span>
                  <span class="detail-value">${a.attendeesCount||0}</span>
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
    `}getFilteredData(a){let s=[...a];if(this.filters.status!=="all"&&(s=s.filter(t=>t.status===this.filters.status)),this.filters.type!=="all"&&(s=s.filter(t=>t.type===this.filters.type)),this.filters.search){const t=this.filters.search.toLowerCase();s=s.filter(e=>e.name&&e.name.toLowerCase().includes(t)||e.title&&e.title.toLowerCase().includes(t)||e.partnerName&&e.partnerName.toLowerCase().includes(t))}return s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,s,t,e,i,n,r]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.partnerships||"/api/advanced-partnerships/partnerships"),this.apiClient.get(this.API_ENDPOINTS.partners||"/api/advanced-partnerships/partners"),this.apiClient.get(this.API_ENDPOINTS.collaborations||"/api/advanced-partnerships/collaborations"),this.apiClient.get(this.API_ENDPOINTS.projects||"/api/advanced-partnerships/projects"),this.apiClient.get(this.API_ENDPOINTS.agreements||"/api/advanced-partnerships/agreements"),this.apiClient.get(this.API_ENDPOINTS.events||"/api/advanced-partnerships/events"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-partnerships/analytics")]);this.partnerships=a.data||[],this.partners=s.data||[],this.collaborations=t.data||[],this.projects=e.data||[],this.agreements=i.data||[],this.events=n.data||[],this.analytics=r.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading partnerships data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-partnerships","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,s){this.filters[a]=s.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("partnershipsContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",pending:"قيد الانتظار",completed:"مكتمل",suspended:"معلق",signed:"موقّع",expired:"منتهي"}[a]||a}getTypeText(a){return{strategic:"استراتيجي",educational:"تعليمي",medical:"طبي",financial:"مالي",research:"بحثي"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}formatCurrency(a){return a?`${a.toLocaleString("ar-SA")} ر.س`:"0 ر.س"}saveToLocalStorage(){try{localStorage.setItem("advancedPartnerships",JSON.stringify(this.partnerships)),localStorage.setItem("advancedPartners",JSON.stringify(this.partners)),localStorage.setItem("advancedCollaborations",JSON.stringify(this.collaborations)),localStorage.setItem("advancedProjects",JSON.stringify(this.projects)),localStorage.setItem("advancedAgreements",JSON.stringify(this.agreements)),localStorage.setItem("advancedEvents",JSON.stringify(this.events)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.partnerships=JSON.parse(localStorage.getItem("advancedPartnerships")||"[]"),this.partners=JSON.parse(localStorage.getItem("advancedPartners")||"[]"),this.collaborations=JSON.parse(localStorage.getItem("advancedCollaborations")||"[]"),this.projects=JSON.parse(localStorage.getItem("advancedProjects")||"[]"),this.agreements=JSON.parse(localStorage.getItem("advancedAgreements")||"[]"),this.events=JSON.parse(localStorage.getItem("advancedEvents")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createPartnership=this.createPartnership.bind(this),this.createPartner=this.createPartner.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewPartnership=this.viewPartnership.bind(this),this.editPartnership=this.editPartnership.bind(this)}async createPartnership(){console.log("Create partnership")}async createPartner(){console.log("Create partner")}async viewPartnership(a){console.log("View partnership",a)}async editPartnership(a){console.log("Edit partnership",a)}}export{b as default};
//# sourceMappingURL=rehabilitation-center-advanced-partnerships-fTH-Svjm.js.map
