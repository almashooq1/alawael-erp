import{a as o,A as d,c as r,r as p,s as h,b as u,d as v}from"./main-DFR0ngT_.js";class b{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=o,this.API_ENDPOINTS=d.advancedFollowUp||{},this.connectionManager=r,this.realtimeSync=p,this.systemEnhancer=h,this.aiAssistant=u,this.advancedCache=v,this.followUps=[],this.schedules=[],this.contacts=[],this.reminders=[],this.outcomes=[],this.satisfaction=[],this.feedback=[],this.analytics=[],this.currentView="follow-ups",this.filters={status:"all",type:"all",priority:"all",patient:"all"},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-follow-up-management">
        <div class="follow-up-header">
          <h2>📞 نظام إدارة المتابعة المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createFollowUp()">
              <i class="fas fa-plus"></i> متابعة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.scheduleFollowUp()">
              <i class="fas fa-calendar-plus"></i> جدولة متابعة
            </button>
          </div>
        </div>

        <div class="follow-up-tabs">
          <button class="tab-btn ${this.currentView==="follow-ups"?"active":""}" 
                  onclick="this.switchView('follow-ups')">
            <i class="fas fa-phone"></i> المتابعات
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}" 
                  onclick="this.switchView('schedules')">
            <i class="fas fa-calendar-alt"></i> الجداول
          </button>
          <button class="tab-btn ${this.currentView==="contacts"?"active":""}" 
                  onclick="this.switchView('contacts')">
            <i class="fas fa-address-book"></i> جهات الاتصال
          </button>
          <button class="tab-btn ${this.currentView==="reminders"?"active":""}" 
                  onclick="this.switchView('reminders')">
            <i class="fas fa-bell"></i> التذكيرات
          </button>
          <button class="tab-btn ${this.currentView==="outcomes"?"active":""}" 
                  onclick="this.switchView('outcomes')">
            <i class="fas fa-check-circle"></i> النتائج
          </button>
          <button class="tab-btn ${this.currentView==="satisfaction"?"active":""}" 
                  onclick="this.switchView('satisfaction')">
            <i class="fas fa-smile"></i> الرضا
          </button>
          <button class="tab-btn ${this.currentView==="feedback"?"active":""}" 
                  onclick="this.switchView('feedback')">
            <i class="fas fa-comment"></i> التعليقات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="follow-up-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="scheduled">مجدولة</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="missed">فائتة</option>
            <option value="cancelled">ملغاة</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="phone">هاتف</option>
            <option value="visit">زيارة</option>
            <option value="email">بريد إلكتروني</option>
            <option value="sms">رسالة نصية</option>
            <option value="video">فيديو</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="follow-up-content" id="followUpContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"follow-ups":return this.renderFollowUps();case"schedules":return this.renderSchedules();case"contacts":return this.renderContacts();case"reminders":return this.renderReminders();case"outcomes":return this.renderOutcomes();case"satisfaction":return this.renderSatisfaction();case"feedback":return this.renderFeedback();case"analytics":return this.renderAnalytics();default:return this.renderFollowUps()}}renderFollowUps(){const t=this.getFilteredData(this.followUps);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-phone"></i>
          <p>لا توجد متابعات</p>
          <button class="btn btn-primary" onclick="this.createFollowUp()">
            إضافة متابعة جديدة
          </button>
        </div>
      `:`
      <div class="follow-ups-list">
        ${t.map(s=>`
          <div class="follow-up-card status-${s.status} type-${s.type} priority-${s.priority||"medium"}">
            <div class="follow-up-header">
              <div class="follow-up-info">
                <h3>${s.patientName||"غير محدد"}</h3>
                <p class="follow-up-type">${this.getTypeText(s.type)}</p>
              </div>
              <div class="follow-up-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                <span class="priority-badge priority-${s.priority||"medium"}">
                  ${this.getPriorityText(s.priority||"medium")}
                </span>
              </div>
            </div>
            <div class="follow-up-body">
              <div class="follow-up-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ والوقت:</span>
                  <span class="detail-value">${this.formatDateTime(s.scheduledAt)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المسؤول:</span>
                  <span class="detail-value">${s.assignedToName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السبب:</span>
                  <span class="detail-value">${s.reason||"غير محدد"}</span>
                </div>
                ${s.notes?`
                  <div class="follow-up-notes">
                    <span class="notes-label">ملاحظات:</span>
                    <span class="notes-text">${s.notes.substring(0,100)}${s.notes.length>100?"...":""}</span>
                  </div>
                `:""}
              </div>
            </div>
            <div class="follow-up-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewFollowUp(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${s.status==="scheduled"?`
                <button class="btn btn-sm btn-success" onclick="this.startFollowUp(${s.id})">
                  <i class="fas fa-play"></i> بدء
                </button>
              `:""}
              ${s.status==="in-progress"?`
                <button class="btn btn-sm btn-warning" onclick="this.completeFollowUp(${s.id})">
                  <i class="fas fa-check"></i> إكمال
                </button>
              `:""}
              <button class="btn btn-sm btn-secondary" onclick="this.editFollowUp(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
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
            <div class="schedule-time">${this.formatDateTime(t.dateTime)}</div>
            <div class="schedule-details">
              <h4>${t.patientName||"غير محدد"}</h4>
              <p>${t.type||"غير محدد"}</p>
              <span class="schedule-priority priority-${t.priority||"medium"}">
                ${this.getPriorityText(t.priority||"medium")}
              </span>
            </div>
            <div class="schedule-status">
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderContacts(){return this.contacts.length===0?`
        <div class="empty-state">
          <i class="fas fa-address-book"></i>
          <p>لا توجد جهات اتصال</p>
        </div>
      `:`
      <div class="contacts-grid">
        ${this.contacts.map(t=>`
          <div class="contact-card">
            <div class="contact-header">
              <h3>${t.name||"جهة اتصال"}</h3>
              <span class="contact-relation">${t.relation||"غير محدد"}</span>
            </div>
            <div class="contact-body">
              <div class="contact-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${t.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${t.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${t.email||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الأولوية:</span>
                  <span class="detail-value">${this.getPriorityText(t.priority||"medium")}</span>
                </div>
              </div>
            </div>
            <div class="contact-actions">
              <button class="btn btn-sm btn-primary" onclick="this.contactPatient(${t.id})">
                <i class="fas fa-phone"></i> اتصال
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editContact(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
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
              <h3>${t.followUpName||"تذكير"}</h3>
              <span class="reminder-time">${this.formatDateTime(t.sendTime)}</span>
            </div>
            <div class="reminder-body">
              <div class="reminder-details">
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
    `}renderOutcomes(){return this.outcomes.length===0?`
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>لا توجد نتائج</p>
        </div>
      `:`
      <div class="outcomes-list">
        ${this.outcomes.map(t=>`
          <div class="outcome-card ${t.positive?"positive":"negative"}">
            <div class="outcome-header">
              <h3>${t.followUpName||"نتيجة"}</h3>
              <span class="outcome-type ${t.positive?"positive":"negative"}">
                ${t.positive?"إيجابي":"سلبي"}
              </span>
            </div>
            <div class="outcome-body">
              <div class="outcome-details">
                <div class="detail-item">
                  <span class="detail-label">المريض:</span>
                  <span class="detail-value">${t.patientName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النتيجة:</span>
                  <span class="detail-value">${t.result||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الإجراءات:</span>
                  <span class="detail-value">${t.actions||"لا توجد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSatisfaction(){return this.satisfaction.length===0?`
        <div class="empty-state">
          <i class="fas fa-smile"></i>
          <p>لا توجد بيانات رضا</p>
        </div>
      `:`
      <div class="satisfaction-dashboard">
        ${this.satisfaction.map(t=>`
          <div class="satisfaction-card">
            <div class="satisfaction-header">
              <h3>${t.patientName||"غير محدد"}</h3>
              <div class="satisfaction-rating">
                ${this.renderStars(t.rating||0)}
              </div>
            </div>
            <div class="satisfaction-body">
              <div class="satisfaction-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المتابعة:</span>
                  <span class="detail-value">${t.followUpName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقييم:</span>
                  <span class="detail-value">${t.rating||0}/5</span>
                </div>
              </div>
              ${t.comments?`
                <div class="satisfaction-comments">
                  <p>${t.comments}</p>
                </div>
              `:""}
            </div>
          </div>
        `).join("")}
      </div>
    `}renderFeedback(){return this.feedback.length===0?`
        <div class="empty-state">
          <i class="fas fa-comment"></i>
          <p>لا توجد تعليقات</p>
        </div>
      `:`
      <div class="feedback-list">
        ${this.feedback.map(t=>`
          <div class="feedback-card type-${t.type||"general"}">
            <div class="feedback-header">
              <h3>${t.patientName||"تعليق"}</h3>
              <span class="feedback-date">${this.formatDate(t.date)}</span>
            </div>
            <div class="feedback-body">
              <p>${t.content||""}</p>
              <div class="feedback-meta">
                <span><i class="fas fa-tag"></i> ${this.getTypeText(t.type||"general")}</span>
                <span><i class="fas fa-user"></i> ${t.authorName||"غير محدد"}</span>
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
    `}renderStars(t){const s=[];for(let a=1;a<=5;a++)a<=t?s.push('<i class="fas fa-star"></i>'):s.push('<i class="far fa-star"></i>');return s.join("")}getFilteredData(t){let s=[...t];return this.filters.status!=="all"&&(s=s.filter(a=>a.status===this.filters.status)),this.filters.type!=="all"&&(s=s.filter(a=>a.type===this.filters.type)),this.filters.priority!=="all"&&(s=s.filter(a=>a.priority===this.filters.priority)),this.filters.patient!=="all"&&(s=s.filter(a=>a.patientId===parseInt(this.filters.patient))),s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,s,a,e,i,l,n,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.followUps||"/api/advanced-follow-up/follow-ups"),this.apiClient.get(this.API_ENDPOINTS.schedules||"/api/advanced-follow-up/schedules"),this.apiClient.get(this.API_ENDPOINTS.contacts||"/api/advanced-follow-up/contacts"),this.apiClient.get(this.API_ENDPOINTS.reminders||"/api/advanced-follow-up/reminders"),this.apiClient.get(this.API_ENDPOINTS.outcomes||"/api/advanced-follow-up/outcomes"),this.apiClient.get(this.API_ENDPOINTS.satisfaction||"/api/advanced-follow-up/satisfaction"),this.apiClient.get(this.API_ENDPOINTS.feedback||"/api/advanced-follow-up/feedback"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-follow-up/analytics")]);this.followUps=t.data||[],this.schedules=s.data||[],this.contacts=a.data||[],this.reminders=e.data||[],this.outcomes=i.data||[],this.satisfaction=l.data||[],this.feedback=n.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading follow-up data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-follow-up","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,s){this.filters[t]=s.target.value,this.updateContent()}handleSearch(t){this.updateContent()}updateContent(){const t=document.getElementById("followUpContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{scheduled:"مجدولة","in-progress":"قيد التنفيذ",completed:"مكتملة",missed:"فائتة",cancelled:"ملغاة"}[t]||t}getTypeText(t){return{phone:"هاتف",visit:"زيارة",email:"بريد إلكتروني",sms:"رسالة نصية",video:"فيديو"}[t]||t}getPriorityText(t){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[t]||t}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(t){return t?new Date(t).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedFollowUps",JSON.stringify(this.followUps)),localStorage.setItem("advancedSchedules",JSON.stringify(this.schedules)),localStorage.setItem("advancedContacts",JSON.stringify(this.contacts)),localStorage.setItem("advancedReminders",JSON.stringify(this.reminders)),localStorage.setItem("advancedOutcomes",JSON.stringify(this.outcomes)),localStorage.setItem("advancedSatisfaction",JSON.stringify(this.satisfaction)),localStorage.setItem("advancedFeedback",JSON.stringify(this.feedback)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.followUps=JSON.parse(localStorage.getItem("advancedFollowUps")||"[]"),this.schedules=JSON.parse(localStorage.getItem("advancedSchedules")||"[]"),this.contacts=JSON.parse(localStorage.getItem("advancedContacts")||"[]"),this.reminders=JSON.parse(localStorage.getItem("advancedReminders")||"[]"),this.outcomes=JSON.parse(localStorage.getItem("advancedOutcomes")||"[]"),this.satisfaction=JSON.parse(localStorage.getItem("advancedSatisfaction")||"[]"),this.feedback=JSON.parse(localStorage.getItem("advancedFeedback")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createFollowUp=this.createFollowUp.bind(this),this.scheduleFollowUp=this.scheduleFollowUp.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewFollowUp=this.viewFollowUp.bind(this),this.startFollowUp=this.startFollowUp.bind(this),this.completeFollowUp=this.completeFollowUp.bind(this),this.editFollowUp=this.editFollowUp.bind(this),this.contactPatient=this.contactPatient.bind(this),this.editContact=this.editContact.bind(this)}async createFollowUp(){console.log("Create follow-up")}async scheduleFollowUp(){console.log("Schedule follow-up")}async viewFollowUp(t){console.log("View follow-up",t)}async startFollowUp(t){console.log("Start follow-up",t)}async completeFollowUp(t){console.log("Complete follow-up",t)}async editFollowUp(t){console.log("Edit follow-up",t)}async contactPatient(t){console.log("Contact patient",t)}async editContact(t){console.log("Edit contact",t)}}export{b as default};
//# sourceMappingURL=rehabilitation-center-advanced-follow-up-0oXrBCwz.js.map
