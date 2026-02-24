import{a as c,A as r,c as d,r as o,s as h,b as v,d as p}from"./main-DFR0ngT_.js";class b{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=c,this.API_ENDPOINTS=r.advancedTransportation||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=h,this.aiAssistant=v,this.advancedCache=p,this.vehicles=[],this.routes=[],this.trips=[],this.drivers=[],this.schedules=[],this.maintenance=[],this.analytics=[],this.currentView="vehicles",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-transportation-management">
        <div class="transportation-header">
          <h2>🚌 نظام إدارة النقل والمواصلات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createVehicle()">
              <i class="fas fa-plus"></i> مركبة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createTrip()">
              <i class="fas fa-route"></i> رحلة جديدة
            </button>
          </div>
        </div>

        <div class="transportation-tabs">
          <button class="tab-btn ${this.currentView==="vehicles"?"active":""}" 
                  onclick="this.switchView('vehicles')">
            <i class="fas fa-car"></i> المركبات
          </button>
          <button class="tab-btn ${this.currentView==="routes"?"active":""}" 
                  onclick="this.switchView('routes')">
            <i class="fas fa-route"></i> المسارات
          </button>
          <button class="tab-btn ${this.currentView==="trips"?"active":""}" 
                  onclick="this.switchView('trips')">
            <i class="fas fa-map-marked-alt"></i> الرحلات
          </button>
          <button class="tab-btn ${this.currentView==="drivers"?"active":""}" 
                  onclick="this.switchView('drivers')">
            <i class="fas fa-user-tie"></i> السائقين
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}" 
                  onclick="this.switchView('schedules')">
            <i class="fas fa-calendar-alt"></i> الجداول
          </button>
          <button class="tab-btn ${this.currentView==="maintenance"?"active":""}" 
                  onclick="this.switchView('maintenance')">
            <i class="fas fa-tools"></i> الصيانة
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="transportation-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="maintenance">صيانة</option>
            <option value="reserved">محجوز</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="bus">حافلة</option>
            <option value="van">فان</option>
            <option value="car">سيارة</option>
            <option value="ambulance">إسعاف</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="transportation-content" id="transportationContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"vehicles":return this.renderVehicles();case"routes":return this.renderRoutes();case"trips":return this.renderTrips();case"drivers":return this.renderDrivers();case"schedules":return this.renderSchedules();case"maintenance":return this.renderMaintenance();case"analytics":return this.renderAnalytics();default:return this.renderVehicles()}}renderVehicles(){const a=this.getFilteredData(this.vehicles);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-car"></i>
          <p>لا توجد مركبات</p>
          <button class="btn btn-primary" onclick="this.createVehicle()">
            إضافة مركبة جديدة
          </button>
        </div>
      `:`
      <div class="vehicles-grid">
        ${a.map(t=>`
          <div class="vehicle-card status-${t.status} type-${t.type}">
            <div class="vehicle-header">
              <div class="vehicle-info">
                <h3>${t.plateNumber||"مركبة"}</h3>
                <p class="vehicle-model">${t.model||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="vehicle-body">
              <div class="vehicle-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getVehicleTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعة:</span>
                  <span class="detail-value">${t.capacity||0} راكب</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السائق:</span>
                  <span class="detail-value">${t.driverName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(t.status)}</span>
                </div>
              </div>
            </div>
            <div class="vehicle-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewVehicle(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editVehicle(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRoutes(){return this.routes.length===0?`
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <p>لا توجد مسارات</p>
        </div>
      `:`
      <div class="routes-list">
        ${this.routes.map(a=>`
          <div class="route-card status-${a.status}">
            <div class="route-header">
              <h3>${a.name||"مسار"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="route-body">
              <div class="route-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${a.from||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${a.to||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المسافة:</span>
                  <span class="detail-value">${a.distance||0} كم</span>
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
    `}renderTrips(){return this.trips.length===0?`
        <div class="empty-state">
          <i class="fas fa-map-marked-alt"></i>
          <p>لا توجد رحلات</p>
          <button class="btn btn-primary" onclick="this.createTrip()">
            إضافة رحلة جديدة
          </button>
        </div>
      `:`
      <div class="trips-list">
        ${this.trips.map(a=>`
          <div class="trip-card status-${a.status}">
            <div class="trip-header">
              <h3>${a.routeName||"رحلة"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="trip-body">
              <div class="trip-details">
                <div class="detail-item">
                  <span class="detail-label">المركبة:</span>
                  <span class="detail-value">${a.vehiclePlate||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السائق:</span>
                  <span class="detail-value">${a.driverName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ والوقت:</span>
                  <span class="detail-value">${this.formatDateTime(a.scheduledTime)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الركاب:</span>
                  <span class="detail-value">${a.passengersCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderDrivers(){return this.drivers.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-tie"></i>
          <p>لا يوجد سائقين</p>
        </div>
      `:`
      <div class="drivers-grid">
        ${this.drivers.map(a=>`
          <div class="driver-card status-${a.status}">
            <div class="driver-header">
              <div class="driver-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="driver-info">
                <h3>${a.name||"سائق"}</h3>
                <p class="driver-license">${a.licenseNumber||"غير محدد"}</p>
              </div>
            </div>
            <div class="driver-body">
              <div class="driver-details">
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${a.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(a.status)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الرحلات:</span>
                  <span class="detail-value">${a.tripsCount||0}</span>
                </div>
              </div>
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
      <div class="schedules-list">
        ${this.schedules.map(a=>`
          <div class="schedule-card status-${a.status}">
            <div class="schedule-header">
              <h3>${a.routeName||"جدول"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="schedule-body">
              <div class="schedule-details">
                <div class="detail-item">
                  <span class="detail-label">اليوم:</span>
                  <span class="detail-value">${this.getDayText(a.day)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوقت:</span>
                  <span class="detail-value">${a.time||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المركبة:</span>
                  <span class="detail-value">${a.vehiclePlate||"غير محدد"}</span>
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
              <h3>${a.vehiclePlate||"صيانة"}</h3>
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
    `}getFilteredData(a){let t=[...a];if(this.filters.status!=="all"&&(t=t.filter(s=>s.status===this.filters.status)),this.filters.type!=="all"&&(t=t.filter(s=>s.type===this.filters.type)),this.filters.search){const s=this.filters.search.toLowerCase();t=t.filter(e=>e.plateNumber&&e.plateNumber.toLowerCase().includes(s)||e.name&&e.name.toLowerCase().includes(s)||e.model&&e.model.toLowerCase().includes(s))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,t,s,e,i,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.vehicles||"/api/advanced-transportation/vehicles"),this.apiClient.get(this.API_ENDPOINTS.routes||"/api/advanced-transportation/routes"),this.apiClient.get(this.API_ENDPOINTS.trips||"/api/advanced-transportation/trips"),this.apiClient.get(this.API_ENDPOINTS.drivers||"/api/advanced-transportation/drivers"),this.apiClient.get(this.API_ENDPOINTS.schedules||"/api/advanced-transportation/schedules"),this.apiClient.get(this.API_ENDPOINTS.maintenance||"/api/advanced-transportation/maintenance"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-transportation/analytics")]);this.vehicles=a.data||[],this.routes=t.data||[],this.trips=s.data||[],this.drivers=e.data||[],this.schedules=i.data||[],this.maintenance=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading transportation data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-transportation","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,t){this.filters[a]=t.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("transportationContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",inactive:"غير نشط",maintenance:"صيانة",reserved:"محجوز",scheduled:"مجدول",inprogress:"قيد التنفيذ",completed:"مكتمل",cancelled:"ملغى",pending:"قيد الانتظار",done:"منجز"}[a]||a}getVehicleTypeText(a){return{bus:"حافلة",van:"فان",car:"سيارة",ambulance:"إسعاف"}[a]||a}getDayText(a){return{sunday:"الأحد",monday:"الإثنين",tuesday:"الثلاثاء",wednesday:"الأربعاء",thursday:"الخميس",friday:"الجمعة",saturday:"السبت"}[a]||a}formatCurrency(a){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(a)}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(a){return a?new Date(a).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedVehicles",JSON.stringify(this.vehicles)),localStorage.setItem("advancedRoutes",JSON.stringify(this.routes)),localStorage.setItem("advancedTrips",JSON.stringify(this.trips)),localStorage.setItem("advancedDrivers",JSON.stringify(this.drivers)),localStorage.setItem("advancedSchedules",JSON.stringify(this.schedules)),localStorage.setItem("advancedMaintenance",JSON.stringify(this.maintenance)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.vehicles=JSON.parse(localStorage.getItem("advancedVehicles")||"[]"),this.routes=JSON.parse(localStorage.getItem("advancedRoutes")||"[]"),this.trips=JSON.parse(localStorage.getItem("advancedTrips")||"[]"),this.drivers=JSON.parse(localStorage.getItem("advancedDrivers")||"[]"),this.schedules=JSON.parse(localStorage.getItem("advancedSchedules")||"[]"),this.maintenance=JSON.parse(localStorage.getItem("advancedMaintenance")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createVehicle=this.createVehicle.bind(this),this.createTrip=this.createTrip.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewVehicle=this.viewVehicle.bind(this),this.editVehicle=this.editVehicle.bind(this)}async createVehicle(){console.log("Create vehicle")}async createTrip(){console.log("Create trip")}async viewVehicle(a){console.log("View vehicle",a)}async editVehicle(a){console.log("Edit vehicle",a)}}export{b as default};
//# sourceMappingURL=rehabilitation-center-advanced-transportation-B0VcWwo3.js.map
