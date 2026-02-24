import{a as r,A as o,c as h,r as p,s as v,b as u,d as m}from"./main-DFR0ngT_.js";class f{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=r,this.API_ENDPOINTS=o.advancedSessions||{},this.connectionManager=h,this.realtimeSync=p,this.systemEnhancer=v,this.aiAssistant=u,this.advancedCache=m,this.sessions=[],this.schedules=[],this.attendance=[],this.notes=[],this.progress=[],this.goals=[],this.activities=[],this.materials=[],this.analytics=[],this.currentView="sessions",this.filters={status:"all",type:"all",therapist:"all",patient:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-sessions-management">
        <div class="sessions-header">
          <h2>🎯 نظام إدارة الجلسات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createSession()">
              <i class="fas fa-plus"></i> جلسة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.scheduleSession()">
              <i class="fas fa-calendar-plus"></i> جدولة جلسة
            </button>
          </div>
        </div>

        <div class="sessions-tabs">
          <button class="tab-btn ${this.currentView==="sessions"?"active":""}" 
                  onclick="this.switchView('sessions')">
            <i class="fas fa-calendar-check"></i> الجلسات
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}" 
                  onclick="this.switchView('schedules')">
            <i class="fas fa-calendar-alt"></i> الجدول
          </button>
          <button class="tab-btn ${this.currentView==="attendance"?"active":""}" 
                  onclick="this.switchView('attendance')">
            <i class="fas fa-user-check"></i> الحضور
          </button>
          <button class="tab-btn ${this.currentView==="notes"?"active":""}" 
                  onclick="this.switchView('notes')">
            <i class="fas fa-sticky-note"></i> الملاحظات
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
          <button class="tab-btn ${this.currentView==="materials"?"active":""}" 
                  onclick="this.switchView('materials')">
            <i class="fas fa-box"></i> المواد
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="sessions-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="scheduled">مجدولة</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغاة</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="individual">فردية</option>
            <option value="group">جماعية</option>
            <option value="family">عائلية</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="sessions-content" id="sessionsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"sessions":return this.renderSessions();case"schedules":return this.renderSchedules();case"attendance":return this.renderAttendance();case"notes":return this.renderNotes();case"progress":return this.renderProgress();case"goals":return this.renderGoals();case"activities":return this.renderActivities();case"materials":return this.renderMaterials();case"analytics":return this.renderAnalytics();default:return this.renderSessions()}}renderSessions(){const s=this.getFilteredData(this.sessions);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>لا توجد جلسات</p>
          <button class="btn btn-primary" onclick="this.createSession()">
            إضافة جلسة جديدة
          </button>
        </div>
      `:`
      <div class="sessions-list">
        ${s.map(t=>`
          <div class="session-card status-${t.status}">
            <div class="session-header">
              <div class="session-info">
                <h3>${t.patientName||"غير محدد"}</h3>
                <p class="session-therapist">المعالج: ${t.therapistName||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="session-body">
              <div class="session-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ والوقت:</span>
                  <span class="detail-value">${this.formatDateTime(t.dateTime)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${t.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${t.location||"غير محدد"}</span>
                </div>
                ${t.notes?`
                  <div class="session-notes-preview">
                    <span class="notes-label">ملاحظات:</span>
                    <span class="notes-text">${t.notes.substring(0,100)}${t.notes.length>100?"...":""}</span>
                  </div>
                `:""}
              </div>
            </div>
            <div class="session-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewSession(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${t.status==="scheduled"?`
                <button class="btn btn-sm btn-success" onclick="this.startSession(${t.id})">
                  <i class="fas fa-play"></i> بدء
                </button>
              `:""}
              ${t.status==="in-progress"?`
                <button class="btn btn-sm btn-warning" onclick="this.endSession(${t.id})">
                  <i class="fas fa-stop"></i> إنهاء
                </button>
              `:""}
              <button class="btn btn-sm btn-secondary" onclick="this.editSession(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSchedules(){return this.schedules.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-alt"></i>
          <p>لا توجد جدولات</p>
          <button class="btn btn-primary" onclick="this.scheduleSession()">
            جدولة جلسة جديدة
          </button>
        </div>
      `:`
      <div class="schedules-calendar">
        ${this.schedules.map(s=>`
          <div class="schedule-item">
            <div class="schedule-time">${this.formatDateTime(s.dateTime)}</div>
            <div class="schedule-details">
              <h4>${s.patientName||"غير محدد"}</h4>
              <p>${s.therapistName||"غير محدد"}</p>
              <span class="schedule-type">${this.getTypeText(s.type)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAttendance(){return this.attendance.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-check"></i>
          <p>لا توجد سجلات حضور</p>
        </div>
      `:`
      <div class="attendance-list">
        ${this.attendance.map(s=>`
          <div class="attendance-card">
            <div class="attendance-header">
              <h3>${s.patientName||"غير محدد"}</h3>
              <span class="attendance-status status-${s.status}">
                ${this.getAttendanceStatusText(s.status)}
              </span>
            </div>
            <div class="attendance-body">
              <div class="attendance-details">
                <div class="detail-item">
                  <span class="detail-label">الجلسة:</span>
                  <span class="detail-value">${s.sessionName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">وقت الحضور:</span>
                  <span class="detail-value">${s.checkInTime||"غير محدد"}</span>
                </div>
                ${s.checkOutTime?`
                  <div class="detail-item">
                    <span class="detail-label">وقت الانصراف:</span>
                    <span class="detail-value">${s.checkOutTime}</span>
                  </div>
                `:""}
              </div>
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
        ${this.notes.map(s=>`
          <div class="note-card">
            <div class="note-header">
              <h3>${s.sessionName||"غير محدد"}</h3>
              <span class="note-date">${this.formatDateTime(s.date)}</span>
            </div>
            <div class="note-body">
              <p>${s.content||""}</p>
              <div class="note-meta">
                <span><i class="fas fa-user"></i> ${s.therapistName||"غير محدد"}</span>
                <span><i class="fas fa-user-injured"></i> ${s.patientName||"غير محدد"}</span>
              </div>
            </div>
            <div class="note-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewNote(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editNote(${s.id})">
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
        ${this.progress.map(s=>`
          <div class="progress-card">
            <div class="progress-header">
              <h3>${s.patientName||"غير محدد"}</h3>
              <span class="progress-period">${s.period||"غير محدد"}</span>
            </div>
            <div class="progress-body">
              <div class="progress-metrics">
                <div class="metric-item">
                  <span class="metric-label">الجلسات المكتملة:</span>
                  <span class="metric-value">${s.completedSessions||0}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">معدل الحضور:</span>
                  <span class="metric-value">${s.attendanceRate||0}%</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">التحسن:</span>
                  <span class="metric-value ${s.improvement>0?"positive":"negative"}">
                    ${s.improvement>0?"+":""}${s.improvement||0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderGoals(){return this.goals.length===0?`
        <div class="empty-state">
          <i class="fas fa-bullseye"></i>
          <p>لا توجد أهداف</p>
        </div>
      `:`
      <div class="goals-list">
        ${this.goals.map(s=>`
          <div class="goal-card ${s.completed?"completed":""}">
            <div class="goal-header">
              <h3>${s.title||"هدف"}</h3>
              <div class="goal-badges">
                <span class="priority-badge priority-${s.priority||"medium"}">
                  ${this.getPriorityText(s.priority||"medium")}
                </span>
                ${s.completed?`
                  <span class="completed-badge">
                    <i class="fas fa-check-circle"></i> مكتمل
                  </span>
                `:""}
              </div>
            </div>
            <div class="goal-body">
              <p>${s.description||""}</p>
              <div class="goal-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${s.progress||0}%"></div>
                </div>
                <span>${s.progress||0}%</span>
              </div>
              <div class="goal-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${s.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموعد النهائي:</span>
                  <span class="detail-value">${this.formatDate(s.deadline)}</span>
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
        ${this.activities.map(s=>`
          <div class="activity-card">
            <div class="activity-header">
              <h3>${s.name||"نشاط"}</h3>
              <span class="activity-category">${s.category||"عام"}</span>
            </div>
            <div class="activity-body">
              <p>${s.description||""}</p>
              <div class="activity-details">
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المستوى:</span>
                  <span class="detail-value">${s.level||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderMaterials(){return this.materials.length===0?`
        <div class="empty-state">
          <i class="fas fa-box"></i>
          <p>لا توجد مواد</p>
        </div>
      `:`
      <div class="materials-grid">
        ${this.materials.map(s=>`
          <div class="material-card">
            <div class="material-header">
              <h3>${s.name||"مادة"}</h3>
              <span class="material-type">${s.type||"عام"}</span>
            </div>
            <div class="material-body">
              <div class="material-details">
                <div class="detail-item">
                  <span class="detail-label">الكمية:</span>
                  <span class="detail-value">${s.quantity||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${s.status||"غير محدد"}</span>
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
    `}getFilteredData(s){let t=[...s];return this.filters.status!=="all"&&(t=t.filter(e=>e.status===this.filters.status)),this.filters.type!=="all"&&(t=t.filter(e=>e.type===this.filters.type)),this.filters.therapist!=="all"&&(t=t.filter(e=>e.therapistId===parseInt(this.filters.therapist))),this.filters.patient!=="all"&&(t=t.filter(e=>e.patientId===parseInt(this.filters.patient))),t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,t,e,a,i,n,l,c,d]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.sessions||"/api/advanced-sessions/sessions"),this.apiClient.get(this.API_ENDPOINTS.schedules||"/api/advanced-sessions/schedules"),this.apiClient.get(this.API_ENDPOINTS.attendance||"/api/advanced-sessions/attendance"),this.apiClient.get(this.API_ENDPOINTS.notes||"/api/advanced-sessions/notes"),this.apiClient.get(this.API_ENDPOINTS.progress||"/api/advanced-sessions/progress"),this.apiClient.get(this.API_ENDPOINTS.goals||"/api/advanced-sessions/goals"),this.apiClient.get(this.API_ENDPOINTS.activities||"/api/advanced-sessions/activities"),this.apiClient.get(this.API_ENDPOINTS.materials||"/api/advanced-sessions/materials"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-sessions/analytics")]);this.sessions=s.data||[],this.schedules=t.data||[],this.attendance=e.data||[],this.notes=a.data||[],this.progress=i.data||[],this.goals=n.data||[],this.activities=l.data||[],this.materials=c.data||[],this.analytics=d.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading sessions data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-sessions","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,t){this.filters[s]=t.target.value,this.updateContent()}handleSearch(s){this.updateContent()}updateContent(){const s=document.getElementById("sessionsContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{scheduled:"مجدولة","in-progress":"قيد التنفيذ",completed:"مكتملة",cancelled:"ملغاة"}[s]||s}getTypeText(s){return{individual:"فردية",group:"جماعية",family:"عائلية"}[s]||s}getAttendanceStatusText(s){return{present:"حاضر",absent:"غائب",late:"متأخر",excused:"معذور"}[s]||s}getPriorityText(s){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedSessions",JSON.stringify(this.sessions)),localStorage.setItem("advancedSchedules",JSON.stringify(this.schedules)),localStorage.setItem("advancedAttendance",JSON.stringify(this.attendance)),localStorage.setItem("advancedNotes",JSON.stringify(this.notes)),localStorage.setItem("advancedProgress",JSON.stringify(this.progress)),localStorage.setItem("advancedGoals",JSON.stringify(this.goals)),localStorage.setItem("advancedActivities",JSON.stringify(this.activities)),localStorage.setItem("advancedMaterials",JSON.stringify(this.materials)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.sessions=JSON.parse(localStorage.getItem("advancedSessions")||"[]"),this.schedules=JSON.parse(localStorage.getItem("advancedSchedules")||"[]"),this.attendance=JSON.parse(localStorage.getItem("advancedAttendance")||"[]"),this.notes=JSON.parse(localStorage.getItem("advancedNotes")||"[]"),this.progress=JSON.parse(localStorage.getItem("advancedProgress")||"[]"),this.goals=JSON.parse(localStorage.getItem("advancedGoals")||"[]"),this.activities=JSON.parse(localStorage.getItem("advancedActivities")||"[]"),this.materials=JSON.parse(localStorage.getItem("advancedMaterials")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createSession=this.createSession.bind(this),this.scheduleSession=this.scheduleSession.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewSession=this.viewSession.bind(this),this.startSession=this.startSession.bind(this),this.endSession=this.endSession.bind(this),this.editSession=this.editSession.bind(this),this.viewNote=this.viewNote.bind(this),this.editNote=this.editNote.bind(this)}async createSession(){console.log("Create session")}async scheduleSession(){console.log("Schedule session")}async viewSession(s){console.log("View session",s)}async startSession(s){console.log("Start session",s)}async endSession(s){console.log("End session",s)}async editSession(s){console.log("Edit session",s)}async viewNote(s){console.log("View note",s)}async editNote(s){console.log("Edit note",s)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-sessions-BHk8gzr3.js.map
