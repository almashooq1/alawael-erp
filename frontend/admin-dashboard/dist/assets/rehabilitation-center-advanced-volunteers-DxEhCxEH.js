import{a as r,A as c,c as o,r as d,s as v,b as h,d as u}from"./main-DFR0ngT_.js";class m{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=r,this.API_ENDPOINTS=c.advancedVolunteers||{},this.connectionManager=o,this.realtimeSync=d,this.systemEnhancer=v,this.aiAssistant=h,this.advancedCache=u,this.volunteers=[],this.programs=[],this.activities=[],this.hours=[],this.certificates=[],this.evaluations=[],this.analytics=[],this.currentView="volunteers",this.filters={status:"all",category:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-volunteers-management">
        <div class="volunteers-header">
          <h2>🤝 نظام إدارة التطوع والمتطوعين المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createVolunteer()">
              <i class="fas fa-plus"></i> متطوع جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createProgram()">
              <i class="fas fa-hand-holding-heart"></i> برنامج جديد
            </button>
          </div>
        </div>

        <div class="volunteers-tabs">
          <button class="tab-btn ${this.currentView==="volunteers"?"active":""}"
                  onclick="this.switchView('volunteers')">
            <i class="fas fa-users"></i> المتطوعين
          </button>
          <button class="tab-btn ${this.currentView==="programs"?"active":""}"
                  onclick="this.switchView('programs')">
            <i class="fas fa-hand-holding-heart"></i> البرامج
          </button>
          <button class="tab-btn ${this.currentView==="activities"?"active":""}"
                  onclick="this.switchView('activities')">
            <i class="fas fa-tasks"></i> الأنشطة
          </button>
          <button class="tab-btn ${this.currentView==="hours"?"active":""}"
                  onclick="this.switchView('hours')">
            <i class="fas fa-clock"></i> الساعات
          </button>
          <button class="tab-btn ${this.currentView==="certificates"?"active":""}"
                  onclick="this.switchView('certificates')">
            <i class="fas fa-certificate"></i> الشهادات
          </button>
          <button class="tab-btn ${this.currentView==="evaluations"?"active":""}"
                  onclick="this.switchView('evaluations')">
            <i class="fas fa-star"></i> التقييمات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}"
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="volunteers-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="pending">قيد الانتظار</option>
            <option value="suspended">معلق</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="education">تعليم</option>
            <option value="healthcare">رعاية صحية</option>
            <option value="social">اجتماعي</option>
            <option value="environmental">بيئي</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..."
                 oninput="this.handleSearch(event)">
        </div>

        <div class="volunteers-content" id="volunteersContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"volunteers":return this.renderVolunteers();case"programs":return this.renderPrograms();case"activities":return this.renderActivities();case"hours":return this.renderHours();case"certificates":return this.renderCertificates();case"evaluations":return this.renderEvaluations();case"analytics":return this.renderAnalytics();default:return this.renderVolunteers()}}renderVolunteers(){const t=this.getFilteredData(this.volunteers);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>لا يوجد متطوعين</p>
          <button class="btn btn-primary" onclick="this.createVolunteer()">
            إضافة متطوع جديد
          </button>
        </div>
      `:`
      <div class="volunteers-grid">
        ${t.map(a=>`
          <div class="volunteer-card status-${a.status}">
            <div class="volunteer-header">
              <div class="volunteer-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="volunteer-info">
                <h3>${a.name||"متطوع"}</h3>
                <p class="volunteer-email">${a.email||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="volunteer-body">
              <div class="volunteer-details">
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${a.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${this.getCategoryText(a.category)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إجمالي الساعات:</span>
                  <span class="detail-value">${a.totalHours||0} ساعة</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأنشطة:</span>
                  <span class="detail-value">${a.activitiesCount||0}</span>
                </div>
              </div>
            </div>
            <div class="volunteer-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewVolunteer(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editVolunteer(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPrograms(){return this.programs.length===0?`
        <div class="empty-state">
          <i class="fas fa-hand-holding-heart"></i>
          <p>لا توجد برامج</p>
          <button class="btn btn-primary" onclick="this.createProgram()">
            إضافة برنامج جديد
          </button>
        </div>
      `:`
      <div class="programs-list">
        ${this.programs.map(t=>`
          <div class="program-card status-${t.status}">
            <div class="program-header">
              <h3>${t.name||"برنامج"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="program-body">
              <div class="program-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${this.getCategoryText(t.category)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المتطوعين:</span>
                  <span class="detail-value">${t.volunteersCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(t.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(t.endDate)||"مستمر"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderActivities(){return this.activities.length===0?`
        <div class="empty-state">
          <i class="fas fa-tasks"></i>
          <p>لا توجد أنشطة</p>
        </div>
      `:`
      <div class="activities-list">
        ${this.activities.map(t=>`
          <div class="activity-card status-${t.status}">
            <div class="activity-header">
              <h3>${t.title||"نشاط"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="activity-body">
              <div class="activity-details">
                <div class="detail-item">
                  <span class="detail-label">البرنامج:</span>
                  <span class="detail-value">${t.programName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المتطوعين:</span>
                  <span class="detail-value">${t.volunteersCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${t.duration||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderHours(){return this.hours.length===0?`
        <div class="empty-state">
          <i class="fas fa-clock"></i>
          <p>لا توجد سجلات ساعات</p>
        </div>
      `:`
      <div class="hours-list">
        ${this.hours.map(t=>`
          <div class="hour-card">
            <div class="hour-header">
              <h3>${t.volunteerName||"متطوع"}</h3>
              <span class="hours-badge">${t.hours||0} ساعة</span>
            </div>
            <div class="hour-body">
              <div class="hour-details">
                <div class="detail-item">
                  <span class="detail-label">النشاط:</span>
                  <span class="detail-value">${t.activityTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${t.startTime||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${t.endTime||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderCertificates(){return this.certificates.length===0?`
        <div class="empty-state">
          <i class="fas fa-certificate"></i>
          <p>لا توجد شهادات</p>
        </div>
      `:`
      <div class="certificates-grid">
        ${this.certificates.map(t=>`
          <div class="certificate-card status-${t.status}">
            <div class="certificate-header">
              <h3>${t.volunteerName||"متطوع"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="certificate-body">
              <div class="certificate-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${t.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإصدار:</span>
                  <span class="detail-value">${this.formatDate(t.issueDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إجمالي الساعات:</span>
                  <span class="detail-value">${t.totalHours||0} ساعة</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderEvaluations(){return this.evaluations.length===0?`
        <div class="empty-state">
          <i class="fas fa-star"></i>
          <p>لا توجد تقييمات</p>
        </div>
      `:`
      <div class="evaluations-list">
        ${this.evaluations.map(t=>`
          <div class="evaluation-card">
            <div class="evaluation-header">
              <h3>${t.volunteerName||"متطوع"}</h3>
              <div class="evaluation-rating">
                ${this.renderStars(t.rating||0)}
              </div>
            </div>
            <div class="evaluation-body">
              <div class="evaluation-details">
                <div class="detail-item">
                  <span class="detail-label">النشاط:</span>
                  <span class="detail-value">${t.activityTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
              </div>
              ${t.comment?`
                <div class="evaluation-comment">
                  <p>${t.comment}</p>
                </div>
              `:""}
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
    `}renderStars(t){const a=[];for(let s=1;s<=5;s++)s<=t?a.push('<i class="fas fa-star"></i>'):a.push('<i class="far fa-star"></i>');return a.join("")}getFilteredData(t){let a=[...t];if(this.filters.status!=="all"&&(a=a.filter(s=>s.status===this.filters.status)),this.filters.category!=="all"&&(a=a.filter(s=>s.category===this.filters.category)),this.filters.search){const s=this.filters.search.toLowerCase();a=a.filter(e=>e.name&&e.name.toLowerCase().includes(s)||e.email&&e.email.toLowerCase().includes(s)||e.title&&e.title.toLowerCase().includes(s))}return a}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,a,s,e,i,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.volunteers||"/api/advanced-volunteers/volunteers"),this.apiClient.get(this.API_ENDPOINTS.programs||"/api/advanced-volunteers/programs"),this.apiClient.get(this.API_ENDPOINTS.activities||"/api/advanced-volunteers/activities"),this.apiClient.get(this.API_ENDPOINTS.hours||"/api/advanced-volunteers/hours"),this.apiClient.get(this.API_ENDPOINTS.certificates||"/api/advanced-volunteers/certificates"),this.apiClient.get(this.API_ENDPOINTS.evaluations||"/api/advanced-volunteers/evaluations"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-volunteers/analytics")]);this.volunteers=t.data||[],this.programs=a.data||[],this.activities=s.data||[],this.hours=e.data||[],this.certificates=i.data||[],this.evaluations=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading volunteers data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-volunteers","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,a){this.filters[t]=a.target.value,this.updateContent()}handleSearch(t){this.filters.search=t.target.value,this.updateContent()}updateContent(){const t=document.getElementById("volunteersContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{active:"نشط",inactive:"غير نشط",pending:"قيد الانتظار",suspended:"معلق",completed:"مكتمل",ongoing:"جاري",issued:"صادر",expired:"منتهي"}[t]||t}getCategoryText(t){return{education:"تعليم",healthcare:"رعاية صحية",social:"اجتماعي",environmental:"بيئي"}[t]||t}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedVolunteers",JSON.stringify(this.volunteers)),localStorage.setItem("advancedPrograms",JSON.stringify(this.programs)),localStorage.setItem("advancedActivities",JSON.stringify(this.activities)),localStorage.setItem("advancedHours",JSON.stringify(this.hours)),localStorage.setItem("advancedCertificates",JSON.stringify(this.certificates)),localStorage.setItem("advancedEvaluations",JSON.stringify(this.evaluations)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.volunteers=JSON.parse(localStorage.getItem("advancedVolunteers")||"[]"),this.programs=JSON.parse(localStorage.getItem("advancedPrograms")||"[]"),this.activities=JSON.parse(localStorage.getItem("advancedActivities")||"[]"),this.hours=JSON.parse(localStorage.getItem("advancedHours")||"[]"),this.certificates=JSON.parse(localStorage.getItem("advancedCertificates")||"[]"),this.evaluations=JSON.parse(localStorage.getItem("advancedEvaluations")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createVolunteer=this.createVolunteer.bind(this),this.createProgram=this.createProgram.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewVolunteer=this.viewVolunteer.bind(this),this.editVolunteer=this.editVolunteer.bind(this)}async createVolunteer(){console.log("Create volunteer")}async createProgram(){console.log("Create program")}async viewVolunteer(t){console.log("View volunteer",t)}async editVolunteer(t){console.log("Edit volunteer",t)}}export{m as default};
//# sourceMappingURL=rehabilitation-center-advanced-volunteers-DxEhCxEH.js.map
