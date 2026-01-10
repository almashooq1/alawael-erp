import{a as o,A as d,c as p,r as v,s as h,b as g,d as u}from"./main-DFR0ngT_.js";class f{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=o,this.API_ENDPOINTS=d.advancedRehabilitationPrograms||{},this.connectionManager=p,this.realtimeSync=v,this.systemEnhancer=h,this.aiAssistant=g,this.advancedCache=u,this.programs=[],this.phases=[],this.sessions=[],this.participants=[],this.progress=[],this.goals=[],this.activities=[],this.materials=[],this.evaluations=[],this.reports=[],this.analytics=[],this.currentView="programs",this.filters={status:"all",category:"all",disability:"all",ageGroup:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-rehabilitation-programs">
        <div class="programs-header">
          <h2>🎯 نظام إدارة البرامج التأهيلية المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createProgram()">
              <i class="fas fa-plus"></i> برنامج جديد
            </button>
            <button class="btn btn-secondary" onclick="this.importProgram()">
              <i class="fas fa-file-import"></i> استيراد برنامج
            </button>
          </div>
        </div>

        <div class="programs-tabs">
          <button class="tab-btn ${this.currentView==="programs"?"active":""}" 
                  onclick="this.switchView('programs')">
            <i class="fas fa-clipboard-list"></i> البرامج
          </button>
          <button class="tab-btn ${this.currentView==="phases"?"active":""}" 
                  onclick="this.switchView('phases')">
            <i class="fas fa-layer-group"></i> المراحل
          </button>
          <button class="tab-btn ${this.currentView==="participants"?"active":""}" 
                  onclick="this.switchView('participants')">
            <i class="fas fa-users"></i> المشاركون
          </button>
          <button class="tab-btn ${this.currentView==="progress"?"active":""}" 
                  onclick="this.switchView('progress')">
            <i class="fas fa-chart-line"></i> التقدم
          </button>
          <button class="tab-btn ${this.currentView==="goals"?"active":""}" 
                  onclick="this.switchView('goals')">
            <i class="fas fa-bullseye"></i> الأهداف
          </button>
          <button class="tab-btn ${this.currentView==="activities"?"active":""}" 
                  onclick="this.switchView('activities')">
            <i class="fas fa-tasks"></i> الأنشطة
          </button>
          <button class="tab-btn ${this.currentView==="evaluations"?"active":""}" 
                  onclick="this.switchView('evaluations')">
            <i class="fas fa-clipboard-check"></i> التقييمات
          </button>
          <button class="tab-btn ${this.currentView==="reports"?"active":""}" 
                  onclick="this.switchView('reports')">
            <i class="fas fa-file-pdf"></i> التقارير
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="programs-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="active">نشط</option>
            <option value="paused">متوقف</option>
            <option value="completed">مكتمل</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="physical">جسدي</option>
            <option value="cognitive">إدراكي</option>
            <option value="speech">نطق</option>
            <option value="occupational">وظيفي</option>
            <option value="behavioral">سلوكي</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="programs-content" id="programsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"programs":return this.renderPrograms();case"phases":return this.renderPhases();case"participants":return this.renderParticipants();case"progress":return this.renderProgress();case"goals":return this.renderGoals();case"activities":return this.renderActivities();case"evaluations":return this.renderEvaluations();case"reports":return this.renderReports();case"analytics":return this.renderAnalytics();default:return this.renderPrograms()}}renderPrograms(){const a=this.getFilteredData(this.programs);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>لا توجد برامج تأهيلية</p>
          <button class="btn btn-primary" onclick="this.createProgram()">
            إضافة برنامج جديد
          </button>
        </div>
      `:`
      <div class="programs-grid">
        ${a.map(s=>`
          <div class="program-card status-${s.status}">
            <div class="program-header">
              <div class="program-info">
                <h3>${s.name||"غير محدد"}</h3>
                <p class="program-category">${this.getCategoryText(s.category)}</p>
              </div>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="program-body">
              <div class="program-details">
                <div class="detail-item">
                  <span class="detail-label">الإعاقة المستهدفة:</span>
                  <span class="detail-value">${s.targetDisability||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفئة العمرية:</span>
                  <span class="detail-value">${s.ageGroup||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المراحل:</span>
                  <span class="detail-value">${s.phasesCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المشاركين:</span>
                  <span class="detail-value">${s.participantsCount||0}</span>
                </div>
                ${s.description?`
                  <div class="program-description">
                    <span class="description-label">الوصف:</span>
                    <span class="description-text">${s.description.substring(0,150)}${s.description.length>150?"...":""}</span>
                  </div>
                `:""}
              </div>
              <div class="program-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${s.progress||0}%"></div>
                </div>
                <span>${s.progress||0}%</span>
              </div>
            </div>
            <div class="program-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewProgram(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-success" onclick="this.startProgram(${s.id})">
                <i class="fas fa-play"></i> بدء
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editProgram(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPhases(){return this.phases.length===0?`
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <p>لا توجد مراحل</p>
        </div>
      `:`
      <div class="phases-list">
        ${this.phases.map(a=>`
          <div class="phase-card ${a.completed?"completed":""}">
            <div class="phase-header">
              <div class="phase-info">
                <h3>${a.name||"مرحلة"}</h3>
                <p class="phase-program">البرنامج: ${a.programName||"غير محدد"}</p>
              </div>
              <div class="phase-badges">
                <span class="phase-number">المرحلة ${a.order||0}</span>
                ${a.completed?`
                  <span class="completed-badge">
                    <i class="fas fa-check-circle"></i> مكتملة
                  </span>
                `:""}
              </div>
            </div>
            <div class="phase-body">
              <div class="phase-details">
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${a.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الجلسات:</span>
                  <span class="detail-value">${a.sessionsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأنشطة:</span>
                  <span class="detail-value">${a.activitiesCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${a.progress||0}%</span>
                </div>
              </div>
              <div class="phase-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${a.progress||0}%"></div>
                </div>
              </div>
            </div>
            <div class="phase-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewPhase(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editPhase(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderParticipants(){return this.participants.length===0?`
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>لا يوجد مشاركون</p>
        </div>
      `:`
      <div class="participants-list">
        ${this.participants.map(a=>`
          <div class="participant-card">
            <div class="participant-header">
              <div class="participant-info">
                <h3>${a.patientName||"غير محدد"}</h3>
                <p class="participant-program">البرنامج: ${a.programName||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="participant-body">
              <div class="participant-details">
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(a.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${a.progress||0}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الجلسات المكتملة:</span>
                  <span class="detail-value">${a.completedSessions||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الأهداف المحققة:</span>
                  <span class="detail-value">${a.achievedGoals||0}</span>
                </div>
              </div>
              <div class="participant-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${a.progress||0}%"></div>
                </div>
              </div>
            </div>
            <div class="participant-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewParticipant(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editParticipant(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderProgress(){return this.progress.length===0?`
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <p>لا توجد بيانات تقدم</p>
        </div>
      `:`
      <div class="progress-dashboard">
        ${this.progress.map(a=>{var s;return`
          <div class="progress-card">
            <div class="progress-header">
              <h3>${a.programName||"غير محدد"}</h3>
              <span class="progress-participant">${a.patientName||"غير محدد"}</span>
            </div>
            <div class="progress-body">
              <div class="progress-metrics">
                <div class="metric-item">
                  <span class="metric-label">التقدم الإجمالي:</span>
                  <span class="metric-value">${a.overallProgress||0}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">الجلسات المكتملة:</span>
                  <span class="metric-value">${a.completedSessions||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">الأهداف المحققة:</span>
                  <span class="metric-value">${a.achievedGoals||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">التحسن:</span>
                  <span class="metric-value ${a.improvement>0?"positive":"negative"}">
                    ${a.improvement>0?"+":""}${a.improvement||0}%
                  </span>
                </div>
              </div>
              <div class="progress-timeline">
                ${((s=a.history)==null?void 0:s.map((i,t)=>`
                  <div class="timeline-point">
                    <div class="timeline-date">${this.formatDate(i.date)}</div>
                    <div class="timeline-progress">${i.progress||0}%</div>
                  </div>
                `).join(""))||""}
              </div>
            </div>
          </div>
        `}).join("")}
      </div>
    `}renderGoals(){return this.goals.length===0?`
        <div class="empty-state">
          <i class="fas fa-bullseye"></i>
          <p>لا توجد أهداف</p>
        </div>
      `:`
      <div class="goals-list">
        ${this.goals.map(a=>`
          <div class="goal-card ${a.achieved?"achieved":""}">
            <div class="goal-header">
              <h3>${a.title||"هدف"}</h3>
              <div class="goal-badges">
                <span class="priority-badge priority-${a.priority||"medium"}">
                  ${this.getPriorityText(a.priority||"medium")}
                </span>
                ${a.achieved?`
                  <span class="achieved-badge">
                    <i class="fas fa-check-circle"></i> محقق
                  </span>
                `:""}
              </div>
            </div>
            <div class="goal-body">
              <p>${a.description||""}</p>
              <div class="goal-details">
                <div class="detail-item">
                  <span class="detail-label">البرنامج:</span>
                  <span class="detail-value">${a.programName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموعد النهائي:</span>
                  <span class="detail-value">${this.formatDate(a.deadline)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقدم:</span>
                  <span class="detail-value">${a.progress||0}%</span>
                </div>
              </div>
              <div class="goal-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${a.progress||0}%"></div>
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
      <div class="activities-grid">
        ${this.activities.map(a=>`
          <div class="activity-card">
            <div class="activity-header">
              <h3>${a.name||"نشاط"}</h3>
              <span class="activity-type">${a.type||"عام"}</span>
            </div>
            <div class="activity-body">
              <p>${a.description||""}</p>
              <div class="activity-details">
                <div class="detail-item">
                  <span class="detail-label">البرنامج:</span>
                  <span class="detail-value">${a.programName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المرحلة:</span>
                  <span class="detail-value">${a.phaseName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${a.duration||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderEvaluations(){return this.evaluations.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-check"></i>
          <p>لا توجد تقييمات</p>
        </div>
      `:`
      <div class="evaluations-list">
        ${this.evaluations.map(a=>`
          <div class="evaluation-card">
            <div class="evaluation-header">
              <h3>${a.title||"تقييم"}</h3>
              <span class="evaluation-date">${this.formatDate(a.date)}</span>
            </div>
            <div class="evaluation-body">
              <div class="evaluation-details">
                <div class="detail-item">
                  <span class="detail-label">البرنامج:</span>
                  <span class="detail-value">${a.programName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المشارك:</span>
                  <span class="detail-value">${a.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${a.score||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقييم:</span>
                  <span class="detail-value">${a.rating||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="evaluation-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewEvaluation(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderReports(){return this.reports.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-pdf"></i>
          <p>لا توجد تقارير</p>
        </div>
      `:`
      <div class="reports-list">
        ${this.reports.map(a=>`
          <div class="report-card">
            <div class="report-header">
              <h3>${a.title||"تقرير"}</h3>
              <span class="report-date">${this.formatDate(a.date)}</span>
            </div>
            <div class="report-body">
              <div class="report-details">
                <div class="detail-item">
                  <span class="detail-label">البرنامج:</span>
                  <span class="detail-value">${a.programName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${a.type||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="report-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewReport(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.downloadReport(${a.id})">
                <i class="fas fa-download"></i> تحميل
              </button>
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
    `}getFilteredData(a){let s=[...a];return this.filters.status!=="all"&&(s=s.filter(i=>i.status===this.filters.status)),this.filters.category!=="all"&&(s=s.filter(i=>i.category===this.filters.category)),this.filters.disability!=="all"&&(s=s.filter(i=>i.targetDisability===this.filters.disability)),this.filters.ageGroup!=="all"&&(s=s.filter(i=>i.ageGroup===this.filters.ageGroup)),s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,s,i,t,e,l,r,n,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.programs||"/api/advanced-rehabilitation-programs/programs"),this.apiClient.get(this.API_ENDPOINTS.phases||"/api/advanced-rehabilitation-programs/phases"),this.apiClient.get(this.API_ENDPOINTS.participants||"/api/advanced-rehabilitation-programs/participants"),this.apiClient.get(this.API_ENDPOINTS.progress||"/api/advanced-rehabilitation-programs/progress"),this.apiClient.get(this.API_ENDPOINTS.goals||"/api/advanced-rehabilitation-programs/goals"),this.apiClient.get(this.API_ENDPOINTS.activities||"/api/advanced-rehabilitation-programs/activities"),this.apiClient.get(this.API_ENDPOINTS.evaluations||"/api/advanced-rehabilitation-programs/evaluations"),this.apiClient.get(this.API_ENDPOINTS.reports||"/api/advanced-rehabilitation-programs/reports"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-rehabilitation-programs/analytics")]);this.programs=a.data||[],this.phases=s.data||[],this.participants=i.data||[],this.progress=t.data||[],this.goals=e.data||[],this.activities=l.data||[],this.evaluations=r.data||[],this.reports=n.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading rehabilitation programs data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-rehabilitation-programs","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,s){this.filters[a]=s.target.value,this.updateContent()}handleSearch(a){this.updateContent()}updateContent(){const a=document.getElementById("programsContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{draft:"مسودة",active:"نشط",paused:"متوقف",completed:"مكتمل"}[a]||a}getCategoryText(a){return{physical:"جسدي",cognitive:"إدراكي",speech:"نطق",occupational:"وظيفي",behavioral:"سلوكي"}[a]||a}getPriorityText(a){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedRehabilitationPrograms",JSON.stringify(this.programs)),localStorage.setItem("advancedRehabilitationPhases",JSON.stringify(this.phases)),localStorage.setItem("advancedRehabilitationParticipants",JSON.stringify(this.participants)),localStorage.setItem("advancedRehabilitationProgress",JSON.stringify(this.progress)),localStorage.setItem("advancedRehabilitationGoals",JSON.stringify(this.goals)),localStorage.setItem("advancedRehabilitationActivities",JSON.stringify(this.activities)),localStorage.setItem("advancedRehabilitationEvaluations",JSON.stringify(this.evaluations)),localStorage.setItem("advancedRehabilitationReports",JSON.stringify(this.reports)),localStorage.setItem("advancedRehabilitationAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.programs=JSON.parse(localStorage.getItem("advancedRehabilitationPrograms")||"[]"),this.phases=JSON.parse(localStorage.getItem("advancedRehabilitationPhases")||"[]"),this.participants=JSON.parse(localStorage.getItem("advancedRehabilitationParticipants")||"[]"),this.progress=JSON.parse(localStorage.getItem("advancedRehabilitationProgress")||"[]"),this.goals=JSON.parse(localStorage.getItem("advancedRehabilitationGoals")||"[]"),this.activities=JSON.parse(localStorage.getItem("advancedRehabilitationActivities")||"[]"),this.evaluations=JSON.parse(localStorage.getItem("advancedRehabilitationEvaluations")||"[]"),this.reports=JSON.parse(localStorage.getItem("advancedRehabilitationReports")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedRehabilitationAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createProgram=this.createProgram.bind(this),this.importProgram=this.importProgram.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewProgram=this.viewProgram.bind(this),this.startProgram=this.startProgram.bind(this),this.editProgram=this.editProgram.bind(this),this.viewPhase=this.viewPhase.bind(this),this.editPhase=this.editPhase.bind(this),this.viewParticipant=this.viewParticipant.bind(this),this.editParticipant=this.editParticipant.bind(this),this.viewEvaluation=this.viewEvaluation.bind(this),this.viewReport=this.viewReport.bind(this),this.downloadReport=this.downloadReport.bind(this)}async createProgram(){console.log("Create program")}async importProgram(){console.log("Import program")}async viewProgram(a){console.log("View program",a)}async startProgram(a){console.log("Start program",a)}async editProgram(a){console.log("Edit program",a)}async viewPhase(a){console.log("View phase",a)}async editPhase(a){console.log("Edit phase",a)}async viewParticipant(a){console.log("View participant",a)}async editParticipant(a){console.log("Edit participant",a)}async viewEvaluation(a){console.log("View evaluation",a)}async viewReport(a){console.log("View report",a)}async downloadReport(a){console.log("Download report",a)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-rehabilitation-programs-BhJxe1B4.js.map
