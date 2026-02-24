import{a as r,A as c,c as d,r as o,s as h,b as p,d as u}from"./main-DFR0ngT_.js";class g{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=r,this.API_ENDPOINTS=c.advancedResearch||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=h,this.aiAssistant=p,this.advancedCache=u,this.researchProjects=[],this.studies=[],this.publications=[],this.researchers=[],this.funding=[],this.collaborations=[],this.analytics=[],this.currentView="projects",this.filters={status:"all",category:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-research-management">
        <div class="research-header">
          <h2>🔬 نظام إدارة الأبحاث والدراسات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createProject()">
              <i class="fas fa-plus"></i> مشروع بحثي جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createStudy()">
              <i class="fas fa-book"></i> دراسة جديدة
            </button>
            <button class="btn btn-info" onclick="this.addResearcher()">
              <i class="fas fa-user-graduate"></i> باحث جديد
            </button>
          </div>
        </div>

        <div class="research-tabs">
          <button class="tab-btn ${this.currentView==="projects"?"active":""}" 
                  onclick="this.switchView('projects')">
            <i class="fas fa-project-diagram"></i> المشاريع البحثية
          </button>
          <button class="tab-btn ${this.currentView==="studies"?"active":""}" 
                  onclick="this.switchView('studies')">
            <i class="fas fa-book"></i> الدراسات
          </button>
          <button class="tab-btn ${this.currentView==="publications"?"active":""}" 
                  onclick="this.switchView('publications')">
            <i class="fas fa-file-alt"></i> المنشورات
          </button>
          <button class="tab-btn ${this.currentView==="researchers"?"active":""}" 
                  onclick="this.switchView('researchers')">
            <i class="fas fa-user-graduate"></i> الباحثون
          </button>
          <button class="tab-btn ${this.currentView==="funding"?"active":""}" 
                  onclick="this.switchView('funding')">
            <i class="fas fa-dollar-sign"></i> التمويل
          </button>
          <button class="tab-btn ${this.currentView==="collaborations"?"active":""}" 
                  onclick="this.switchView('collaborations')">
            <i class="fas fa-handshake"></i> التعاونات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="research-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="completed">مكتمل</option>
            <option value="pending">قيد الانتظار</option>
            <option value="suspended">معلق</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="clinical">سريري</option>
            <option value="theoretical">نظري</option>
            <option value="applied">تطبيقي</option>
            <option value="longitudinal">طولاني</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="research-content" id="researchContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"projects":return this.renderProjects();case"studies":return this.renderStudies();case"publications":return this.renderPublications();case"researchers":return this.renderResearchers();case"funding":return this.renderFunding();case"collaborations":return this.renderCollaborations();case"analytics":return this.renderAnalytics();default:return this.renderProjects()}}renderProjects(){const a=this.getFilteredData(this.researchProjects);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-project-diagram"></i>
          <p>لا توجد مشاريع بحثية</p>
          <button class="btn btn-primary" onclick="this.createProject()">
            إضافة مشروع بحثي جديد
          </button>
        </div>
      `:`
      <div class="projects-grid">
        ${a.map(t=>`
          <div class="project-card status-${t.status}">
            <div class="project-header">
              <h3>${t.title||"مشروع بحثي"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="project-body">
              <div class="project-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${this.getCategoryText(t.category)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الباحث الرئيسي:</span>
                  <span class="detail-value">${t.principalResearcher||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(t.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${t.progress||0}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الميزانية:</span>
                  <span class="detail-value">${this.formatCurrency(t.budget)}</span>
                </div>
              </div>
            </div>
            <div class="project-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewProject(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editProject(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderStudies(){return this.studies.length===0?`
        <div class="empty-state">
          <i class="fas fa-book"></i>
          <p>لا توجد دراسات</p>
          <button class="btn btn-primary" onclick="this.createStudy()">
            إضافة دراسة جديدة
          </button>
        </div>
      `:`
      <div class="studies-list">
        ${this.studies.map(a=>`
          <div class="study-card status-${a.status}">
            <div class="study-header">
              <h3>${a.title||"دراسة"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="study-body">
              <div class="study-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getStudyTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">حجم العينة:</span>
                  <span class="detail-value">${a.sampleSize||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(a.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPublications(){return this.publications.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>لا توجد منشورات</p>
        </div>
      `:`
      <div class="publications-list">
        ${this.publications.map(a=>`
          <div class="publication-card">
            <div class="publication-header">
              <h3>${a.title||"منشور"}</h3>
              <span class="publication-type">${this.getPublicationTypeText(a.type)}</span>
            </div>
            <div class="publication-body">
              <div class="publication-details">
                <div class="detail-item">
                  <span class="detail-label">المؤلفون:</span>
                  <span class="detail-value">${a.authors||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المجلة/المؤتمر:</span>
                  <span class="detail-value">${a.journal||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ النشر:</span>
                  <span class="detail-value">${this.formatDate(a.publishDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">معامل التأثير:</span>
                  <span class="detail-value">${a.impactFactor||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderResearchers(){return this.researchers.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-graduate"></i>
          <p>لا يوجد باحثون</p>
          <button class="btn btn-primary" onclick="this.addResearcher()">
            إضافة باحث جديد
          </button>
        </div>
      `:`
      <div class="researchers-grid">
        ${this.researchers.map(a=>`
          <div class="researcher-card">
            <div class="researcher-header">
              <div class="researcher-avatar">
                <i class="fas fa-user-graduate"></i>
              </div>
              <div class="researcher-info">
                <h3>${a.name||"باحث"}</h3>
                <p class="researcher-title">${a.title||"غير محدد"}</p>
              </div>
            </div>
            <div class="researcher-body">
              <div class="researcher-details">
                <div class="detail-item">
                  <span class="detail-label">التخصص:</span>
                  <span class="detail-value">${a.specialization||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المشاريع:</span>
                  <span class="detail-value">${a.projectsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المنشورات:</span>
                  <span class="detail-value">${a.publicationsCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderFunding(){return this.funding.length===0?`
        <div class="empty-state">
          <i class="fas fa-dollar-sign"></i>
          <p>لا يوجد تمويل</p>
        </div>
      `:`
      <div class="funding-list">
        ${this.funding.map(a=>`
          <div class="funding-card status-${a.status}">
            <div class="funding-header">
              <h3>${a.source||"ممول"}</h3>
              <span class="funding-amount">${this.formatCurrency(a.amount)}</span>
            </div>
            <div class="funding-body">
              <div class="funding-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getFundingTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الاستلام:</span>
                  <span class="detail-value">${this.formatDate(a.receivedDate)}</span>
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
    `}renderCollaborations(){return this.collaborations.length===0?`
        <div class="empty-state">
          <i class="fas fa-handshake"></i>
          <p>لا توجد تعاونات</p>
        </div>
      `:`
      <div class="collaborations-list">
        ${this.collaborations.map(a=>`
          <div class="collaboration-card status-${a.status}">
            <div class="collaboration-header">
              <h3>${a.partnerName||"شريك"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="collaboration-body">
              <div class="collaboration-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getCollaborationTypeText(a.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المشروع:</span>
                  <span class="detail-value">${a.projectName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)}</span>
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
    `}getFilteredData(a){let t=[...a];if(this.filters.status!=="all"&&(t=t.filter(s=>s.status===this.filters.status)),this.filters.category!=="all"&&(t=t.filter(s=>s.category===this.filters.category)),this.filters.search){const s=this.filters.search.toLowerCase();t=t.filter(e=>e.title&&e.title.toLowerCase().includes(s)||e.name&&e.name.toLowerCase().includes(s))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,t,s,e,i,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.projects||"/api/advanced-research/projects"),this.apiClient.get(this.API_ENDPOINTS.studies||"/api/advanced-research/studies"),this.apiClient.get(this.API_ENDPOINTS.publications||"/api/advanced-research/publications"),this.apiClient.get(this.API_ENDPOINTS.researchers||"/api/advanced-research/researchers"),this.apiClient.get(this.API_ENDPOINTS.funding||"/api/advanced-research/funding"),this.apiClient.get(this.API_ENDPOINTS.collaborations||"/api/advanced-research/collaborations"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-research/analytics")]);this.researchProjects=a.data||[],this.studies=t.data||[],this.publications=s.data||[],this.researchers=e.data||[],this.funding=i.data||[],this.collaborations=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading research data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-research","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,t){this.filters[a]=t.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("researchContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",completed:"مكتمل",pending:"قيد الانتظار",suspended:"معلق"}[a]||a}getCategoryText(a){return{clinical:"سريري",theoretical:"نظري",applied:"تطبيقي",longitudinal:"طولاني"}[a]||a}getStudyTypeText(a){return{observational:"ملاحظة",experimental:"تجريبي",survey:"استطلاع",case_study:"دراسة حالة"}[a]||a}getPublicationTypeText(a){return{journal:"مجلة",conference:"مؤتمر",book:"كتاب",report:"تقرير"}[a]||a}getFundingTypeText(a){return{grant:"منحة",donation:"تبرع",contract:"عقد",internal:"داخلي"}[a]||a}getCollaborationTypeText(a){return{academic:"أكاديمي",clinical:"سريري",industry:"صناعي",international:"دولي"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}formatCurrency(a){return a?`${a.toLocaleString("ar-SA")} ر.س`:"0 ر.س"}saveToLocalStorage(){try{localStorage.setItem("advancedResearchProjects",JSON.stringify(this.researchProjects)),localStorage.setItem("advancedStudies",JSON.stringify(this.studies)),localStorage.setItem("advancedPublications",JSON.stringify(this.publications)),localStorage.setItem("advancedResearchers",JSON.stringify(this.researchers)),localStorage.setItem("advancedFunding",JSON.stringify(this.funding)),localStorage.setItem("advancedCollaborations",JSON.stringify(this.collaborations)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.researchProjects=JSON.parse(localStorage.getItem("advancedResearchProjects")||"[]"),this.studies=JSON.parse(localStorage.getItem("advancedStudies")||"[]"),this.publications=JSON.parse(localStorage.getItem("advancedPublications")||"[]"),this.researchers=JSON.parse(localStorage.getItem("advancedResearchers")||"[]"),this.funding=JSON.parse(localStorage.getItem("advancedFunding")||"[]"),this.collaborations=JSON.parse(localStorage.getItem("advancedCollaborations")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createProject=this.createProject.bind(this),this.createStudy=this.createStudy.bind(this),this.addResearcher=this.addResearcher.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewProject=this.viewProject.bind(this),this.editProject=this.editProject.bind(this)}async createProject(){console.log("Create project")}async createStudy(){console.log("Create study")}async addResearcher(){console.log("Add researcher")}async viewProject(a){console.log("View project",a)}async editProject(a){console.log("Edit project",a)}}export{g as default};
//# sourceMappingURL=rehabilitation-center-advanced-research-BX5nsLEm.js.map
