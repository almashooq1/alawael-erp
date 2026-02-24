import{a as c,A as d,c as o,r as v,s as p,b as h,d as u}from"./main-DFR0ngT_.js";class f{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=c,this.API_ENDPOINTS=d.advancedEvents||{},this.connectionManager=o,this.realtimeSync=v,this.systemEnhancer=p,this.aiAssistant=h,this.advancedCache=u,this.events=[],this.activities=[],this.registrations=[],this.attendees=[],this.speakers=[],this.sponsors=[],this.venues=[],this.analytics=[],this.currentView="events",this.filters={status:"all",category:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-events-management">
        <div class="events-header">
          <h2>🎉 نظام إدارة الأحداث والفعاليات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createEvent()">
              <i class="fas fa-plus"></i> حدث جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createActivity()">
              <i class="fas fa-running"></i> فعالية جديدة
            </button>
          </div>
        </div>

        <div class="events-tabs">
          <button class="tab-btn ${this.currentView==="events"?"active":""}" 
                  onclick="this.switchView('events')">
            <i class="fas fa-calendar-alt"></i> الأحداث
          </button>
          <button class="tab-btn ${this.currentView==="activities"?"active":""}" 
                  onclick="this.switchView('activities')">
            <i class="fas fa-running"></i> الفعاليات
          </button>
          <button class="tab-btn ${this.currentView==="registrations"?"active":""}" 
                  onclick="this.switchView('registrations')">
            <i class="fas fa-user-check"></i> التسجيلات
          </button>
          <button class="tab-btn ${this.currentView==="attendees"?"active":""}" 
                  onclick="this.switchView('attendees')">
            <i class="fas fa-users"></i> الحضور
          </button>
          <button class="tab-btn ${this.currentView==="speakers"?"active":""}" 
                  onclick="this.switchView('speakers')">
            <i class="fas fa-microphone"></i> المتحدثين
          </button>
          <button class="tab-btn ${this.currentView==="sponsors"?"active":""}" 
                  onclick="this.switchView('sponsors')">
            <i class="fas fa-handshake"></i> الرعاة
          </button>
          <button class="tab-btn ${this.currentView==="venues"?"active":""}" 
                  onclick="this.switchView('venues')">
            <i class="fas fa-map-marker-alt"></i> الأماكن
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="events-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="ongoing">جاري</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغى</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="conference">مؤتمر</option>
            <option value="workshop">ورشة عمل</option>
            <option value="seminar">ندوة</option>
            <option value="training">تدريب</option>
            <option value="recreational">ترفيهي</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="events-content" id="eventsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"events":return this.renderEvents();case"activities":return this.renderActivities();case"registrations":return this.renderRegistrations();case"attendees":return this.renderAttendees();case"speakers":return this.renderSpeakers();case"sponsors":return this.renderSponsors();case"venues":return this.renderVenues();case"analytics":return this.renderAnalytics();default:return this.renderEvents()}}renderEvents(){const t=this.getFilteredData(this.events);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-alt"></i>
          <p>لا توجد أحداث</p>
          <button class="btn btn-primary" onclick="this.createEvent()">
            إضافة حدث جديد
          </button>
        </div>
      `:`
      <div class="events-grid">
        ${t.map(s=>`
          <div class="event-card status-${s.status} category-${s.category}">
            <div class="event-header">
              <div class="event-date">
                <div class="date-day">${this.getDay(s.startDate)}</div>
                <div class="date-month">${this.getMonth(s.startDate)}</div>
              </div>
              <div class="event-info">
                <h3>${s.title||"حدث"}</h3>
                <p class="event-category">${this.getCategoryText(s.category)}</p>
              </div>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="event-body">
              <div class="event-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ والوقت:</span>
                  <span class="detail-value">${this.formatDateTime(s.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكان:</span>
                  <span class="detail-value">${s.venueName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المسجلين:</span>
                  <span class="detail-value">${s.registrationsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الحضور:</span>
                  <span class="detail-value">${s.attendeesCount||0}</span>
                </div>
                ${s.capacity?`
                  <div class="detail-item">
                    <span class="detail-label">السعة:</span>
                    <span class="detail-value">${s.capacity} شخص</span>
                  </div>
                `:""}
              </div>
              ${s.description?`
                <div class="event-description">
                  <p>${s.description.substring(0,150)}${s.description.length>150?"...":""}</p>
                </div>
              `:""}
            </div>
            <div class="event-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewEvent(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editEvent(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderActivities(){return this.activities.length===0?`
        <div class="empty-state">
          <i class="fas fa-running"></i>
          <p>لا توجد فعاليات</p>
          <button class="btn btn-primary" onclick="this.createActivity()">
            إضافة فعالية جديدة
          </button>
        </div>
      `:`
      <div class="activities-list">
        ${this.activities.map(t=>`
          <div class="activity-card type-${t.type} status-${t.status}">
            <div class="activity-header">
              <h3>${t.title||"فعالية"}</h3>
              <span class="activity-type">${this.getActivityTypeText(t.type)}</span>
            </div>
            <div class="activity-body">
              <div class="activity-details">
                <div class="detail-item">
                  <span class="detail-label">الحدث:</span>
                  <span class="detail-value">${t.eventTitle||"غير محدد"}</span>
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
                  <span class="detail-label">عدد المشاركين:</span>
                  <span class="detail-value">${t.participantsCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRegistrations(){return this.registrations.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-check"></i>
          <p>لا توجد تسجيلات</p>
        </div>
      `:`
      <div class="registrations-list">
        ${this.registrations.map(t=>`
          <div class="registration-card status-${t.status}">
            <div class="registration-header">
              <h3>${t.participantName||"تسجيل"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="registration-body">
              <div class="registration-details">
                <div class="detail-item">
                  <span class="detail-label">الحدث:</span>
                  <span class="detail-value">${t.eventTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ التسجيل:</span>
                  <span class="detail-value">${this.formatDate(t.registrationDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(t.status)}</span>
                </div>
                ${t.paymentStatus?`
                  <div class="detail-item">
                    <span class="detail-label">حالة الدفع:</span>
                    <span class="detail-value">${this.getPaymentStatusText(t.paymentStatus)}</span>
                  </div>
                `:""}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAttendees(){return this.attendees.length===0?`
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>لا يوجد حضور</p>
        </div>
      `:`
      <div class="attendees-grid">
        ${this.attendees.map(t=>`
          <div class="attendee-card">
            <div class="attendee-header">
              <div class="attendee-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="attendee-info">
                <h3>${t.name||"حاضر"}</h3>
                <p class="attendee-email">${t.email||"غير محدد"}</p>
              </div>
            </div>
            <div class="attendee-body">
              <div class="attendee-details">
                <div class="detail-item">
                  <span class="detail-label">الحدث:</span>
                  <span class="detail-value">${t.eventTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">وقت الحضور:</span>
                  <span class="detail-value">${this.formatDateTime(t.checkInTime)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">وقت المغادرة:</span>
                  <span class="detail-value">${this.formatDateTime(t.checkOutTime)||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSpeakers(){return this.speakers.length===0?`
        <div class="empty-state">
          <i class="fas fa-microphone"></i>
          <p>لا يوجد متحدثين</p>
        </div>
      `:`
      <div class="speakers-grid">
        ${this.speakers.map(t=>`
          <div class="speaker-card">
            <div class="speaker-header">
              <div class="speaker-avatar">
                <i class="fas fa-user-tie"></i>
              </div>
              <div class="speaker-info">
                <h3>${t.name||"متحدث"}</h3>
                <p class="speaker-title">${t.title||"غير محدد"}</p>
              </div>
            </div>
            <div class="speaker-body">
              <div class="speaker-details">
                <div class="detail-item">
                  <span class="detail-label">الحدث:</span>
                  <span class="detail-value">${t.eventTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموضوع:</span>
                  <span class="detail-value">${t.topic||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوقت:</span>
                  <span class="detail-value">${t.scheduledTime||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSponsors(){return this.sponsors.length===0?`
        <div class="empty-state">
          <i class="fas fa-handshake"></i>
          <p>لا يوجد رعاة</p>
        </div>
      `:`
      <div class="sponsors-grid">
        ${this.sponsors.map(t=>`
          <div class="sponsor-card level-${t.level}">
            <div class="sponsor-header">
              <h3>${t.name||"راعي"}</h3>
              <span class="sponsor-level">${this.getSponsorLevelText(t.level)}</span>
            </div>
            <div class="sponsor-body">
              <div class="sponsor-details">
                <div class="detail-item">
                  <span class="detail-label">الحدث:</span>
                  <span class="detail-value">${t.eventTitle||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المبلغ:</span>
                  <span class="detail-value">${this.formatCurrency(t.amount||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${t.email||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderVenues(){return this.venues.length===0?`
        <div class="empty-state">
          <i class="fas fa-map-marker-alt"></i>
          <p>لا توجد أماكن</p>
        </div>
      `:`
      <div class="venues-grid">
        ${this.venues.map(t=>`
          <div class="venue-card">
            <div class="venue-header">
              <h3>${t.name||"مكان"}</h3>
              <span class="venue-capacity">${t.capacity||0} شخص</span>
            </div>
            <div class="venue-body">
              <div class="venue-details">
                <div class="detail-item">
                  <span class="detail-label">العنوان:</span>
                  <span class="detail-value">${t.address||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعة:</span>
                  <span class="detail-value">${t.capacity||0} شخص</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الأحداث:</span>
                  <span class="detail-value">${t.eventsCount||0}</span>
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
    `}getFilteredData(t){let s=[...t];if(this.filters.status!=="all"&&(s=s.filter(e=>e.status===this.filters.status)),this.filters.category!=="all"&&(s=s.filter(e=>e.category===this.filters.category)),this.filters.type!=="all"&&(s=s.filter(e=>e.type===this.filters.type)),this.filters.search){const e=this.filters.search.toLowerCase();s=s.filter(a=>a.title&&a.title.toLowerCase().includes(e)||a.name&&a.name.toLowerCase().includes(e))}return s}getDay(t){return t?new Date(t).getDate():"--"}getMonth(t){return t?["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][new Date(t).getMonth()]:"--"}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,s,e,a,i,n,l,r]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.events||"/api/advanced-events/events"),this.apiClient.get(this.API_ENDPOINTS.activities||"/api/advanced-events/activities"),this.apiClient.get(this.API_ENDPOINTS.registrations||"/api/advanced-events/registrations"),this.apiClient.get(this.API_ENDPOINTS.attendees||"/api/advanced-events/attendees"),this.apiClient.get(this.API_ENDPOINTS.speakers||"/api/advanced-events/speakers"),this.apiClient.get(this.API_ENDPOINTS.sponsors||"/api/advanced-events/sponsors"),this.apiClient.get(this.API_ENDPOINTS.venues||"/api/advanced-events/venues"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-events/analytics")]);this.events=t.data||[],this.activities=s.data||[],this.registrations=e.data||[],this.attendees=a.data||[],this.speakers=i.data||[],this.sponsors=n.data||[],this.venues=l.data||[],this.analytics=r.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading events data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-events","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,s){this.filters[t]=s.target.value,this.updateContent()}handleSearch(t){this.filters.search=t.target.value,this.updateContent()}updateContent(){const t=document.getElementById("eventsContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{draft:"مسودة",published:"منشور",ongoing:"جاري",completed:"مكتمل",cancelled:"ملغى",registered:"مسجل",confirmed:"مؤكد",attended:"حاضر",absent:"غائب",paid:"مدفوع",unpaid:"غير مدفوع"}[t]||t}getCategoryText(t){return{conference:"مؤتمر",workshop:"ورشة عمل",seminar:"ندوة",training:"تدريب",recreational:"ترفيهي"}[t]||t}getActivityTypeText(t){return{presentation:"عرض",discussion:"نقاش",workshop:"ورشة عمل",networking:"تواصل",entertainment:"ترفيه"}[t]||t}getSponsorLevelText(t){return{platinum:"بلاتيني",gold:"ذهبي",silver:"فضي",bronze:"برونزي"}[t]||t}getPaymentStatusText(t){return{paid:"مدفوع",unpaid:"غير مدفوع",pending:"قيد الانتظار",refunded:"مسترد"}[t]||t}formatCurrency(t){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(t)}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(t){return t?new Date(t).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedEvents",JSON.stringify(this.events)),localStorage.setItem("advancedActivities",JSON.stringify(this.activities)),localStorage.setItem("advancedRegistrations",JSON.stringify(this.registrations)),localStorage.setItem("advancedAttendees",JSON.stringify(this.attendees)),localStorage.setItem("advancedSpeakers",JSON.stringify(this.speakers)),localStorage.setItem("advancedSponsors",JSON.stringify(this.sponsors)),localStorage.setItem("advancedVenues",JSON.stringify(this.venues)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.events=JSON.parse(localStorage.getItem("advancedEvents")||"[]"),this.activities=JSON.parse(localStorage.getItem("advancedActivities")||"[]"),this.registrations=JSON.parse(localStorage.getItem("advancedRegistrations")||"[]"),this.attendees=JSON.parse(localStorage.getItem("advancedAttendees")||"[]"),this.speakers=JSON.parse(localStorage.getItem("advancedSpeakers")||"[]"),this.sponsors=JSON.parse(localStorage.getItem("advancedSponsors")||"[]"),this.venues=JSON.parse(localStorage.getItem("advancedVenues")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createEvent=this.createEvent.bind(this),this.createActivity=this.createActivity.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewEvent=this.viewEvent.bind(this),this.editEvent=this.editEvent.bind(this)}async createEvent(){console.log("Create event")}async createActivity(){console.log("Create activity")}async viewEvent(t){console.log("View event",t)}async editEvent(t){console.log("Edit event",t)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-events-D002DR_c.js.map
