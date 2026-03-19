import{a as d,A as r,c as o,r as p,s as h,b as v,d as m}from"./main-DFR0ngT_.js";class g{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=d,this.API_ENDPOINTS=r.advancedAppointments||{},this.connectionManager=o,this.realtimeSync=p,this.systemEnhancer=h,this.aiAssistant=v,this.advancedCache=m,this.appointments=[],this.schedules=[],this.availability=[],this.reminders=[],this.cancellations=[],this.reschedules=[],this.waitlist=[],this.analytics=[],this.currentView="appointments",this.selectedDate=new Date,this.filters={status:"all",type:"all",provider:"all",patient:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}smartSearchAppointments(t){if(!t){this.filteredAppointments=null,this.render();return}const e=this.aiAssistant.processQuery?this.aiAssistant.processQuery(t):{intent:"",entities:[]};let i=this.appointments;e.intent==="search"&&e.entities&&e.entities.length>0?i=i.filter(a=>e.entities.some(s=>a.status&&a.status.includes(s)||a.patientName&&a.patientName.includes(s)||a.providerName&&a.providerName.includes(s)||a.type&&a.type.includes(s)||a.date&&String(a.date).includes(s))):i=i.filter(a=>a.patientName&&a.patientName.includes(t)||a.providerName&&a.providerName.includes(t)),this.filteredAppointments=i,this.render()}handleAISuggestion(t,e){e==="action"&&t.includes("موعد")&&this.createAppointment()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-appointments-management">
        <div class="appointments-header">
          <h2>📅 نظام إدارة المواعيد المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createAppointment()">
              <i class="fas fa-plus"></i> موعد جديد
            </button>
            <button class="btn btn-secondary" onclick="this.viewCalendar()">
              <i class="fas fa-calendar"></i> عرض التقويم
            </button>
          </div>
        </div>

        <div class="appointments-tabs">
          <button class="tab-btn ${this.currentView==="appointments"?"active":""}"
                  onclick="this.switchView('appointments')">
            <i class="fas fa-calendar-check"></i> المواعيد
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}"
                  onclick="this.switchView('schedules')">
            <i class="fas fa-calendar-alt"></i> الجداول
          </button>
          <button class="tab-btn ${this.currentView==="availability"?"active":""}"
                  onclick="this.switchView('availability')">
            <i class="fas fa-clock"></i> التوفر
          </button>
          <button class="tab-btn ${this.currentView==="reminders"?"active":""}"
                  onclick="this.switchView('reminders')">
            <i class="fas fa-bell"></i> التذكيرات
          </button>
          <button class="tab-btn ${this.currentView==="cancellations"?"active":""}"
                  onclick="this.switchView('cancellations')">
            <i class="fas fa-times-circle"></i> الإلغاءات
          </button>
          <button class="tab-btn ${this.currentView==="reschedules"?"active":""}"
                  onclick="this.switchView('reschedules')">
            <i class="fas fa-exchange-alt"></i> إعادة الجدولة
          </button>
          <button class="tab-btn ${this.currentView==="waitlist"?"active":""}"
                  onclick="this.switchView('waitlist')">
            <i class="fas fa-list"></i> قائمة الانتظار
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}"
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="appointments-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="scheduled">مجدول</option>
            <option value="confirmed">مؤكد</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
            <option value="no-show">لم يحضر</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="consultation">استشارة</option>
            <option value="therapy">علاج</option>
            <option value="assessment">تقييم</option>
            <option value="follow-up">متابعة</option>
            <option value="emergency">طوارئ</option>
          </select>
          <input type="date" class="filter-date" value="${this.formatDateInput(this.selectedDate)}"
                 onchange="this.handleDateChange(event)">
          <input type="text" class="search-input" placeholder="بحث..."
                 oninput="this.handleSearch(event)">
        </div>

        <div class="appointments-content" id="appointmentsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"appointments":return this.renderAppointments();case"schedules":return this.renderSchedules();case"availability":return this.renderAvailability();case"reminders":return this.renderReminders();case"cancellations":return this.renderCancellations();case"reschedules":return this.renderReschedules();case"waitlist":return this.renderWaitlist();case"analytics":return this.renderAnalytics();default:return this.renderAppointments()}}renderAppointments(){let t=this.getFilteredData(this.appointments);this.filteredAppointments&&(t=this.filteredAppointments);const e=this.aiAssistant.getSuggestions({currentModule:"appointments"})||[],i=e.length>0?`
      <div class="ai-suggestions-panel">
        <h5><i class="fas fa-magic"></i> اقتراحات ذكية</h5>
        <ul>
          ${e.map(s=>`<li><button class="btn btn-link" onclick="window.appointmentsSystem && window.appointmentsSystem.handleAISuggestion && window.appointmentsSystem.handleAISuggestion('${s.title.replace(/'/g,"'")}', '${s.type}')">${s.title}</button> <span class="desc">${s.description||""}</span></li>`).join("")}
        </ul>
      </div>
    `:"",a='<input type="text" id="appointmentSmartSearch" placeholder="بحث ذكي..." onkeyup="window.appointmentsSystem && window.appointmentsSystem.smartSearchAppointments && window.appointmentsSystem.smartSearchAppointments(this.value)">';return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>لا توجد مواعيد</p>
          <button class="btn btn-primary" onclick="this.createAppointment()">
            إضافة موعد جديد
          </button>
        </div>
        ${i}
        <div class="appointments-filters">${a}</div>
      `:`
      ${i}
      <div class="appointments-filters">${a}</div>
      <div class="appointments-list">
        ${t.map(s=>`
          <div class="appointment-card status-${s.status} type-${s.type}">
            <div class="appointment-header">
              <div class="appointment-time">
                <div class="time-display">${this.formatTime(s.startTime)}</div>
                <div class="date-display">${this.formatDate(s.date)}</div>
              </div>
              <div class="appointment-info">
                <h3>${s.patientName||"غير محدد"}</h3>
                <p class="appointment-provider">${s.providerName||"غير محدد"}</p>
                <span class="appointment-type">${this.getTypeText(s.type)}</span>
              </div>
              <div class="appointment-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                ${s.urgent?'<span class="urgent-badge">عاجل</span>':""}
              </div>
            </div>
            <div class="appointment-body">
              <div class="appointment-details">
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${s.duration||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${s.location||"غير محدد"}</span>
                </div>
                ${s.notes?`
                  <div class="appointment-notes">
                    <span class="notes-label">ملاحظات:</span>
                    <span class="notes-text">${s.notes.substring(0,100)}${s.notes.length>100?"...":""}</span>
                  </div>
                `:""}
              </div>
            </div>
            <div class="appointment-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewAppointment(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${s.status==="scheduled"||s.status==="confirmed"?`
                <button class="btn btn-sm btn-success" onclick="this.confirmAppointment(${s.id})">
                  <i class="fas fa-check"></i> تأكيد
                </button>
                <button class="btn btn-sm btn-warning" onclick="this.rescheduleAppointment(${s.id})">
                  <i class="fas fa-exchange-alt"></i> إعادة جدولة
                </button>
                <button class="btn btn-sm btn-danger" onclick="this.cancelAppointment(${s.id})">
                  <i class="fas fa-times"></i> إلغاء
                </button>
              `:""}
              ${s.status==="scheduled"?`
                <button class="btn btn-sm btn-info" onclick="this.startAppointment(${s.id})">
                  <i class="fas fa-play"></i> بدء
                </button>
              `:""}
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
        ${this.schedules.map(t=>`
          <div class="schedule-item">
            <div class="schedule-time">${this.formatDateTime(t.startTime)}</div>
            <div class="schedule-details">
              <h4>${t.providerName||"غير محدد"}</h4>
              <p>${t.patientName||"غير محدد"}</p>
              <span class="schedule-type">${this.getTypeText(t.type)}</span>
            </div>
            <div class="schedule-status">
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAvailability(){return this.availability.length===0?`
        <div class="empty-state">
          <i class="fas fa-clock"></i>
          <p>لا توجد بيانات توفر</p>
        </div>
      `:`
      <div class="availability-grid">
        ${this.availability.map(t=>{var e;return`
          <div class="availability-card">
            <div class="availability-header">
              <h3>${t.providerName||"غير محدد"}</h3>
              <span class="availability-date">${this.formatDate(t.date)}</span>
            </div>
            <div class="availability-body">
              <div class="availability-slots">
                ${((e=t.slots)==null?void 0:e.map(i=>`
                  <div class="slot-item ${i.available?"available":"unavailable"}">
                    <span class="slot-time">${this.formatTime(i.time)}</span>
                    <span class="slot-status">${i.available?"متاح":"غير متاح"}</span>
                  </div>
                `).join(""))||""}
              </div>
            </div>
          </div>
        `}).join("")}
      </div>
    `}renderReminders(){return this.reminders.length===0?`
        <div class="empty-state">
          <i class="fas fa-bell"></i>
          <p>لا توجد تذكيرات</p>
        </div>
      `:`
      <div class="reminders-list">
        ${this.reminders.map(t=>`
          <div class="reminder-card ${t.sent?"sent":"pending"}">
            <div class="reminder-header">
              <h3>${t.appointmentName||"تذكير"}</h3>
              <span class="reminder-time">${this.formatDateTime(t.sendTime)}</span>
            </div>
            <div class="reminder-body">
              <div class="reminder-details">
                <div class="detail-item">
                  <span class="detail-label">الموعد:</span>
                  <span class="detail-value">${this.formatDateTime(t.appointmentTime)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${t.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${t.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${t.sent?"تم الإرسال":"قيد الانتظار"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderCancellations(){return this.cancellations.length===0?`
        <div class="empty-state">
          <i class="fas fa-times-circle"></i>
          <p>لا توجد إلغاءات</p>
        </div>
      `:`
      <div class="cancellations-list">
        ${this.cancellations.map(t=>`
          <div class="cancellation-card">
            <div class="cancellation-header">
              <h3>${t.appointmentName||"إلغاء"}</h3>
              <span class="cancellation-date">${this.formatDate(t.date)}</span>
            </div>
            <div class="cancellation-body">
              <div class="cancellation-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${t.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السبب:</span>
                  <span class="detail-value">${t.reason||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المبطل:</span>
                  <span class="detail-value">${t.cancelledBy||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderReschedules(){return this.reschedules.length===0?`
        <div class="empty-state">
          <i class="fas fa-exchange-alt"></i>
          <p>لا توجد إعادة جدولة</p>
        </div>
      `:`
      <div class="reschedules-list">
        ${this.reschedules.map(t=>`
          <div class="reschedule-card">
            <div class="reschedule-header">
              <h3>${t.appointmentName||"إعادة جدولة"}</h3>
              <span class="reschedule-date">${this.formatDate(t.date)}</span>
            </div>
            <div class="reschedule-body">
              <div class="reschedule-details">
                <div class="detail-item">
                  <span class="detail-label">الموعد الأصلي:</span>
                  <span class="detail-value">${this.formatDateTime(t.oldDateTime)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموعد الجديد:</span>
                  <span class="detail-value">${this.formatDateTime(t.newDateTime)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السبب:</span>
                  <span class="detail-value">${t.reason||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderWaitlist(){return this.waitlist.length===0?`
        <div class="empty-state">
          <i class="fas fa-list"></i>
          <p>لا توجد قائمة انتظار</p>
        </div>
      `:`
      <div class="waitlist-list">
        ${this.waitlist.map(t=>`
          <div class="waitlist-card priority-${t.priority||"medium"}">
            <div class="waitlist-header">
              <h3>${t.patientName||"غير محدد"}</h3>
              <div class="waitlist-badges">
                <span class="priority-badge priority-${t.priority||"medium"}">
                  ${this.getPriorityText(t.priority||"medium")}
                </span>
                <span class="position-badge">المركز ${t.position||0}</span>
              </div>
            </div>
            <div class="waitlist-body">
              <div class="waitlist-details">
                <div class="detail-item">
                  <span class="detail-label">النوع المطلوب:</span>
                  <span class="detail-value">${this.getTypeText(t.requestedType)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الطلب:</span>
                  <span class="detail-value">${this.formatDate(t.requestDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الملاحظات:</span>
                  <span class="detail-value">${t.notes||"لا توجد ملاحظات"}</span>
                </div>
              </div>
            </div>
            <div class="waitlist-actions">
              <button class="btn btn-sm btn-primary" onclick="this.scheduleFromWaitlist(${t.id})">
                <i class="fas fa-calendar-plus"></i> جدولة
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.removeFromWaitlist(${t.id})">
                <i class="fas fa-times"></i> إزالة
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
        ${this.analytics.map(t=>`
          <div class="analytic-card">
            <div class="analytic-header">
              <h3>${t.metric}</h3>
              <span class="analytic-value">${t.value}</span>
            </div>
            <div class="analytic-body">
              <p>${t.description||""}</p>
              ${t.trend?`
                <div class="analytic-trend ${t.trend>0?"up":"down"}">
                  <i class="fas fa-arrow-${t.trend>0?"up":"down"}"></i>
                  ${Math.abs(t.trend)}%
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(t){let e=[...t];this.filters.status!=="all"&&(e=e.filter(a=>a.status===this.filters.status)),this.filters.type!=="all"&&(e=e.filter(a=>a.type===this.filters.type)),this.filters.provider!=="all"&&(e=e.filter(a=>a.providerId===parseInt(this.filters.provider))),this.filters.patient!=="all"&&(e=e.filter(a=>a.patientId===parseInt(this.filters.patient)));const i=this.formatDateInput(this.selectedDate);return e=e.filter(a=>this.formatDateInput(new Date(a.date))===i),e}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,e,i,a,s,n,l,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.appointments||"/api/advanced-appointments/appointments"),this.apiClient.get(this.API_ENDPOINTS.schedules||"/api/advanced-appointments/schedules"),this.apiClient.get(this.API_ENDPOINTS.availability||"/api/advanced-appointments/availability"),this.apiClient.get(this.API_ENDPOINTS.reminders||"/api/advanced-appointments/reminders"),this.apiClient.get(this.API_ENDPOINTS.cancellations||"/api/advanced-appointments/cancellations"),this.apiClient.get(this.API_ENDPOINTS.reschedules||"/api/advanced-appointments/reschedules"),this.apiClient.get(this.API_ENDPOINTS.waitlist||"/api/advanced-appointments/waitlist"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-appointments/analytics")]);this.appointments=t.data||[],this.schedules=e.data||[],this.availability=i.data||[],this.reminders=a.data||[],this.cancellations=s.data||[],this.reschedules=n.data||[],this.waitlist=l.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading appointments data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-appointments","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,e){this.filters[t]=e.target.value,this.updateContent()}handleDateChange(t){this.selectedDate=new Date(t.target.value),this.updateContent()}handleSearch(t){this.updateContent()}updateContent(){const t=document.getElementById("appointmentsContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{scheduled:"مجدول",confirmed:"مؤكد","in-progress":"قيد التنفيذ",completed:"مكتمل",cancelled:"ملغي","no-show":"لم يحضر"}[t]||t}getTypeText(t){return{consultation:"استشارة",therapy:"علاج",assessment:"تقييم","follow-up":"متابعة",emergency:"طوارئ"}[t]||t}getPriorityText(t){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[t]||t}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}formatTime(t){return t?new Date(t).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"}):"غير محدد"}formatDateTime(t){return t?new Date(t).toLocaleString("ar-SA"):"غير محدد"}formatDateInput(t){if(!t)return"";const e=new Date(t),i=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),s=String(e.getDate()).padStart(2,"0");return`${i}-${a}-${s}`}saveToLocalStorage(){try{localStorage.setItem("advancedAppointments",JSON.stringify(this.appointments)),localStorage.setItem("advancedSchedules",JSON.stringify(this.schedules)),localStorage.setItem("advancedAvailability",JSON.stringify(this.availability)),localStorage.setItem("advancedReminders",JSON.stringify(this.reminders)),localStorage.setItem("advancedCancellations",JSON.stringify(this.cancellations)),localStorage.setItem("advancedReschedules",JSON.stringify(this.reschedules)),localStorage.setItem("advancedWaitlist",JSON.stringify(this.waitlist)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.appointments=JSON.parse(localStorage.getItem("advancedAppointments")||"[]"),this.schedules=JSON.parse(localStorage.getItem("advancedSchedules")||"[]"),this.availability=JSON.parse(localStorage.getItem("advancedAvailability")||"[]"),this.reminders=JSON.parse(localStorage.getItem("advancedReminders")||"[]"),this.cancellations=JSON.parse(localStorage.getItem("advancedCancellations")||"[]"),this.reschedules=JSON.parse(localStorage.getItem("advancedReschedules")||"[]"),this.waitlist=JSON.parse(localStorage.getItem("advancedWaitlist")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createAppointment=this.createAppointment.bind(this),this.viewCalendar=this.viewCalendar.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleDateChange=this.handleDateChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewAppointment=this.viewAppointment.bind(this),this.confirmAppointment=this.confirmAppointment.bind(this),this.rescheduleAppointment=this.rescheduleAppointment.bind(this),this.cancelAppointment=this.cancelAppointment.bind(this),this.startAppointment=this.startAppointment.bind(this),this.scheduleFromWaitlist=this.scheduleFromWaitlist.bind(this),this.removeFromWaitlist=this.removeFromWaitlist.bind(this)}async createAppointment(){console.log("Create appointment")}async viewCalendar(){console.log("View calendar")}async viewAppointment(t){console.log("View appointment",t)}async confirmAppointment(t){console.log("Confirm appointment",t)}async rescheduleAppointment(t){console.log("Reschedule appointment",t)}async cancelAppointment(t){console.log("Cancel appointment",t)}async startAppointment(t){console.log("Start appointment",t)}async scheduleFromWaitlist(t){console.log("Schedule from waitlist",t)}async removeFromWaitlist(t){console.log("Remove from waitlist",t)}}export{g as default};
//# sourceMappingURL=rehabilitation-center-advanced-appointments-DvC6n2PD.js.map
