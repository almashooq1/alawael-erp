import{a as c,A as r,c as d,r as o,s as v,b as h,d as p}from"./main-DFR0ngT_.js";class f{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=c,this.API_ENDPOINTS=r.advancedFacilities||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=v,this.aiAssistant=h,this.advancedCache=p,this.facilities=[],this.services=[],this.bookings=[],this.equipment=[],this.maintenance=[],this.reservations=[],this.analytics=[],this.currentView="facilities",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-facilities-management">
        <div class="facilities-header">
          <h2>🏢 نظام إدارة المرافق والخدمات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createFacility()">
              <i class="fas fa-plus"></i> مرفق جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createService()">
              <i class="fas fa-concierge-bell"></i> خدمة جديدة
            </button>
          </div>
        </div>

        <div class="facilities-tabs">
          <button class="tab-btn ${this.currentView==="facilities"?"active":""}" 
                  onclick="this.switchView('facilities')">
            <i class="fas fa-building"></i> المرافق
          </button>
          <button class="tab-btn ${this.currentView==="services"?"active":""}" 
                  onclick="this.switchView('services')">
            <i class="fas fa-concierge-bell"></i> الخدمات
          </button>
          <button class="tab-btn ${this.currentView==="bookings"?"active":""}" 
                  onclick="this.switchView('bookings')">
            <i class="fas fa-calendar-check"></i> الحجوزات
          </button>
          <button class="tab-btn ${this.currentView==="equipment"?"active":""}" 
                  onclick="this.switchView('equipment')">
            <i class="fas fa-cog"></i> المعدات
          </button>
          <button class="tab-btn ${this.currentView==="maintenance"?"active":""}" 
                  onclick="this.switchView('maintenance')">
            <i class="fas fa-tools"></i> الصيانة
          </button>
          <button class="tab-btn ${this.currentView==="reservations"?"active":""}" 
                  onclick="this.switchView('reservations')">
            <i class="fas fa-bookmark"></i> الحجوزات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="facilities-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="available">متاح</option>
            <option value="occupied">مشغول</option>
            <option value="maintenance">صيانة</option>
            <option value="reserved">محجوز</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="room">غرفة</option>
            <option value="hall">قاعة</option>
            <option value="gym">صالة رياضية</option>
            <option value="pool">مسبح</option>
            <option value="library">مكتبة</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="facilities-content" id="facilitiesContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"facilities":return this.renderFacilities();case"services":return this.renderServices();case"bookings":return this.renderBookings();case"equipment":return this.renderEquipment();case"maintenance":return this.renderMaintenance();case"reservations":return this.renderReservations();case"analytics":return this.renderAnalytics();default:return this.renderFacilities()}}renderFacilities(){const a=this.getFilteredData(this.facilities);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-building"></i>
          <p>لا توجد مرافق</p>
          <button class="btn btn-primary" onclick="this.createFacility()">
            إضافة مرفق جديد
          </button>
        </div>
      `:`
      <div class="facilities-grid">
        ${a.map(t=>`
          <div class="facility-card status-${t.status} type-${t.type}">
            <div class="facility-header">
              <h3>${t.name||"مرفق"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="facility-body">
              <div class="facility-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getFacilityTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعة:</span>
                  <span class="detail-value">${t.capacity||0} شخص</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${t.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(t.status)}</span>
                </div>
              </div>
            </div>
            <div class="facility-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewFacility(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editFacility(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderServices(){return this.services.length===0?`
        <div class="empty-state">
          <i class="fas fa-concierge-bell"></i>
          <p>لا توجد خدمات</p>
          <button class="btn btn-primary" onclick="this.createService()">
            إضافة خدمة جديدة
          </button>
        </div>
      `:`
      <div class="services-grid">
        ${this.services.map(a=>`
          <div class="service-card status-${a.status}">
            <div class="service-header">
              <h3>${a.name||"خدمة"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="service-body">
              <div class="service-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${a.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعر:</span>
                  <span class="detail-value">${this.formatCurrency(a.price||0)}</span>
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
    `}renderBookings(){return this.bookings.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>لا توجد حجوزات</p>
        </div>
      `:`
      <div class="bookings-list">
        ${this.bookings.map(a=>`
          <div class="booking-card status-${a.status}">
            <div class="booking-header">
              <h3>حجز #${a.id||"غير محدد"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="booking-body">
              <div class="booking-details">
                <div class="detail-item">
                  <span class="detail-label">المرفق:</span>
                  <span class="detail-value">${a.facilityName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">العميل:</span>
                  <span class="detail-value">${a.customerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوقت:</span>
                  <span class="detail-value">${a.time||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderEquipment(){return this.equipment.length===0?`
        <div class="empty-state">
          <i class="fas fa-cog"></i>
          <p>لا توجد معدات</p>
        </div>
      `:`
      <div class="equipment-grid">
        ${this.equipment.map(a=>`
          <div class="equipment-card status-${a.status}">
            <div class="equipment-header">
              <h3>${a.name||"معدة"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="equipment-body">
              <div class="equipment-details">
                <div class="detail-item">
                  <span class="detail-label">المرفق:</span>
                  <span class="detail-value">${a.facilityName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${a.type||"غير محدد"}</span>
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
    `}renderMaintenance(){return this.maintenance.length===0?`
        <div class="empty-state">
          <i class="fas fa-tools"></i>
          <p>لا توجد سجلات صيانة</p>
        </div>
      `:`
      <div class="maintenance-list">
        ${this.maintenance.map(a=>`
          <div class="maintenance-card status-${a.status}">
            <div class="maintenance-header">
              <h3>${a.facilityName||"صيانة"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="maintenance-body">
              <div class="maintenance-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${a.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التكلفة:</span>
                  <span class="detail-value">${this.formatCurrency(a.cost||0)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderReservations(){return this.reservations.length===0?`
        <div class="empty-state">
          <i class="fas fa-bookmark"></i>
          <p>لا توجد حجوزات</p>
        </div>
      `:`
      <div class="reservations-list">
        ${this.reservations.map(a=>`
          <div class="reservation-card status-${a.status}">
            <div class="reservation-header">
              <h3>حجز #${a.id||"غير محدد"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="reservation-body">
              <div class="reservation-details">
                <div class="detail-item">
                  <span class="detail-label">المرفق:</span>
                  <span class="detail-value">${a.facilityName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">العميل:</span>
                  <span class="detail-value">${a.customerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${this.formatDateTime(a.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${this.formatDateTime(a.endDate)}</span>
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
    `}getFilteredData(a){let t=[...a];if(this.filters.status!=="all"&&(t=t.filter(s=>s.status===this.filters.status)),this.filters.type!=="all"&&(t=t.filter(s=>s.type===this.filters.type)),this.filters.search){const s=this.filters.search.toLowerCase();t=t.filter(i=>i.name&&i.name.toLowerCase().includes(s)||i.location&&i.location.toLowerCase().includes(s))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,t,s,i,e,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.facilities||"/api/advanced-facilities/facilities"),this.apiClient.get(this.API_ENDPOINTS.services||"/api/advanced-facilities/services"),this.apiClient.get(this.API_ENDPOINTS.bookings||"/api/advanced-facilities/bookings"),this.apiClient.get(this.API_ENDPOINTS.equipment||"/api/advanced-facilities/equipment"),this.apiClient.get(this.API_ENDPOINTS.maintenance||"/api/advanced-facilities/maintenance"),this.apiClient.get(this.API_ENDPOINTS.reservations||"/api/advanced-facilities/reservations"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-facilities/analytics")]);this.facilities=a.data||[],this.services=t.data||[],this.bookings=s.data||[],this.equipment=i.data||[],this.maintenance=e.data||[],this.reservations=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading facilities data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-facilities","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,t){this.filters[a]=t.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("facilitiesContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{available:"متاح",occupied:"مشغول",maintenance:"صيانة",reserved:"محجوز",active:"نشط",inactive:"غير نشط",pending:"قيد الانتظار",confirmed:"مؤكد",cancelled:"ملغى",completed:"مكتمل"}[a]||a}getFacilityTypeText(a){return{room:"غرفة",hall:"قاعة",gym:"صالة رياضية",pool:"مسبح",library:"مكتبة"}[a]||a}formatCurrency(a){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(a)}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(a){return a?new Date(a).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedFacilities",JSON.stringify(this.facilities)),localStorage.setItem("advancedServices",JSON.stringify(this.services)),localStorage.setItem("advancedBookings",JSON.stringify(this.bookings)),localStorage.setItem("advancedEquipment",JSON.stringify(this.equipment)),localStorage.setItem("advancedMaintenance",JSON.stringify(this.maintenance)),localStorage.setItem("advancedReservations",JSON.stringify(this.reservations)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.facilities=JSON.parse(localStorage.getItem("advancedFacilities")||"[]"),this.services=JSON.parse(localStorage.getItem("advancedServices")||"[]"),this.bookings=JSON.parse(localStorage.getItem("advancedBookings")||"[]"),this.equipment=JSON.parse(localStorage.getItem("advancedEquipment")||"[]"),this.maintenance=JSON.parse(localStorage.getItem("advancedMaintenance")||"[]"),this.reservations=JSON.parse(localStorage.getItem("advancedReservations")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createFacility=this.createFacility.bind(this),this.createService=this.createService.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewFacility=this.viewFacility.bind(this),this.editFacility=this.editFacility.bind(this)}async createFacility(){console.log("Create facility")}async createService(){console.log("Create service")}async viewFacility(a){console.log("View facility",a)}async editFacility(a){console.log("Edit facility",a)}}export{f as default};
//# sourceMappingURL=rehabilitation-center-advanced-facilities-sdTIJS0Q.js.map
