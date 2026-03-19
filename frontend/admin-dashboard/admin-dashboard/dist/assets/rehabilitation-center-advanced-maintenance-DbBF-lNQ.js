import{a as r,A as d,c as o,r as p,s as h,b as u,d as v}from"./main-DFR0ngT_.js";class b{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=r,this.API_ENDPOINTS=d.advancedMaintenance||{},this.connectionManager=o,this.realtimeSync=p,this.systemEnhancer=h,this.aiAssistant=u,this.advancedCache=v,this.requests=[],this.workOrders=[],this.equipment=[],this.technicians=[],this.schedules=[],this.parts=[],this.history=[],this.analytics=[],this.currentView="requests",this.filters={status:"all",priority:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-maintenance-management">
        <div class="maintenance-header">
          <h2>🔧 نظام إدارة الصيانة المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createRequest()">
              <i class="fas fa-plus"></i> طلب صيانة جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createWorkOrder()">
              <i class="fas fa-wrench"></i> أمر عمل جديد
            </button>
          </div>
        </div>

        <div class="maintenance-tabs">
          <button class="tab-btn ${this.currentView==="requests"?"active":""}" 
                  onclick="this.switchView('requests')">
            <i class="fas fa-clipboard-list"></i> طلبات الصيانة
          </button>
          <button class="tab-btn ${this.currentView==="workOrders"?"active":""}" 
                  onclick="this.switchView('workOrders')">
            <i class="fas fa-tools"></i> أوامر العمل
          </button>
          <button class="tab-btn ${this.currentView==="equipment"?"active":""}" 
                  onclick="this.switchView('equipment')">
            <i class="fas fa-cog"></i> المعدات
          </button>
          <button class="tab-btn ${this.currentView==="technicians"?"active":""}" 
                  onclick="this.switchView('technicians')">
            <i class="fas fa-user-cog"></i> الفنيين
          </button>
          <button class="tab-btn ${this.currentView==="schedules"?"active":""}" 
                  onclick="this.switchView('schedules')">
            <i class="fas fa-calendar-check"></i> الجداول
          </button>
          <button class="tab-btn ${this.currentView==="parts"?"active":""}" 
                  onclick="this.switchView('parts')">
            <i class="fas fa-puzzle-piece"></i> قطع الغيار
          </button>
          <button class="tab-btn ${this.currentView==="history"?"active":""}" 
                  onclick="this.switchView('history')">
            <i class="fas fa-history"></i> السجل
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="maintenance-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="in-progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغى</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('priority', event)">
            <option value="all">جميع الأولويات</option>
            <option value="low">منخفض</option>
            <option value="medium">متوسط</option>
            <option value="high">عالي</option>
            <option value="urgent">عاجل</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="maintenance-content" id="maintenanceContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"requests":return this.renderRequests();case"workOrders":return this.renderWorkOrders();case"equipment":return this.renderEquipment();case"technicians":return this.renderTechnicians();case"schedules":return this.renderSchedules();case"parts":return this.renderParts();case"history":return this.renderHistory();case"analytics":return this.renderAnalytics();default:return this.renderRequests()}}renderRequests(){const t=this.getFilteredData(this.requests);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>لا توجد طلبات صيانة</p>
          <button class="btn btn-primary" onclick="this.createRequest()">
            إضافة طلب صيانة جديد
          </button>
        </div>
      `:`
      <div class="requests-list">
        ${t.map(s=>`
          <div class="request-card status-${s.status} priority-${s.priority||"medium"}">
            <div class="request-header">
              <div class="request-info">
                <h3>${s.title||"طلب صيانة"}</h3>
                <p class="request-equipment">${s.equipmentName||"غير محدد"}</p>
              </div>
              <div class="request-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                <span class="priority-badge priority-${s.priority||"medium"}">
                  ${this.getPriorityText(s.priority||"medium")}
                </span>
              </div>
            </div>
            <div class="request-body">
              <div class="request-details">
                <div class="detail-item">
                  <span class="detail-label">الطلب من:</span>
                  <span class="detail-value">${s.requestedBy||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.requestDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${s.location||"غير محدد"}</span>
                </div>
              </div>
              ${s.description?`
                <div class="request-description">
                  <p>${s.description.substring(0,150)}${s.description.length>150?"...":""}</p>
                </div>
              `:""}
            </div>
            <div class="request-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewRequest(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${s.status==="pending"?`
                <button class="btn btn-sm btn-success" onclick="this.approveRequest(${s.id})">
                  <i class="fas fa-check"></i> موافقة
                </button>
              `:""}
              <button class="btn btn-sm btn-secondary" onclick="this.editRequest(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderWorkOrders(){return this.workOrders.length===0?`
        <div class="empty-state">
          <i class="fas fa-tools"></i>
          <p>لا توجد أوامر عمل</p>
          <button class="btn btn-primary" onclick="this.createWorkOrder()">
            إضافة أمر عمل جديد
          </button>
        </div>
      `:`
      <div class="work-orders-list">
        ${this.workOrders.map(t=>`
          <div class="work-order-card status-${t.status} priority-${t.priority||"medium"}">
            <div class="work-order-header">
              <div class="work-order-info">
                <h3>أمر عمل #${t.number||"غير محدد"}</h3>
                <p class="work-order-equipment">${t.equipmentName||"غير محدد"}</p>
              </div>
              <div class="work-order-badges">
                <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
                <span class="priority-badge priority-${t.priority||"medium"}">
                  ${this.getPriorityText(t.priority||"medium")}
                </span>
              </div>
            </div>
            <div class="work-order-body">
              <div class="work-order-details">
                <div class="detail-item">
                  <span class="detail-label">الفني:</span>
                  <span class="detail-value">${t.technicianName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(t.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(t.endDate)||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التكلفة:</span>
                  <span class="detail-value">${this.formatCurrency(t.cost||0)}</span>
                </div>
              </div>
            </div>
            ${t.status==="in-progress"?`
              <div class="work-order-actions">
                <button class="btn btn-sm btn-success" onclick="this.completeWorkOrder(${t.id})">
                  <i class="fas fa-check"></i> إكمال
                </button>
              </div>
            `:""}
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
        ${this.equipment.map(t=>`
          <div class="equipment-card status-${t.status}">
            <div class="equipment-header">
              <h3>${t.name||"معدة"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="equipment-body">
              <div class="equipment-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${t.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${t.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الشراء:</span>
                  <span class="detail-value">${this.formatDate(t.purchaseDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">آخر صيانة:</span>
                  <span class="detail-value">${this.formatDate(t.lastMaintenanceDate)||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الصيانة القادمة:</span>
                  <span class="detail-value">${this.formatDate(t.nextMaintenanceDate)||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="equipment-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewEquipment(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editEquipment(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTechnicians(){return this.technicians.length===0?`
        <div class="empty-state">
          <i class="fas fa-user-cog"></i>
          <p>لا يوجد فنيين</p>
        </div>
      `:`
      <div class="technicians-grid">
        ${this.technicians.map(t=>`
          <div class="technician-card">
            <div class="technician-header">
              <div class="technician-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="technician-info">
                <h3>${t.name||"فني"}</h3>
                <p class="technician-specialty">${t.specialty||"غير محدد"}</p>
              </div>
            </div>
            <div class="technician-body">
              <div class="technician-details">
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${t.email||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${t.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد المهام:</span>
                  <span class="detail-value">${t.tasksCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">معدل الإنجاز:</span>
                  <span class="detail-value">${t.completionRate||0}%</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSchedules(){return this.schedules.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>لا توجد جداول</p>
        </div>
      `:`
      <div class="schedules-list">
        ${this.schedules.map(t=>`
          <div class="schedule-card status-${t.status}">
            <div class="schedule-header">
              <h3>${t.equipmentName||"جدول"}</h3>
              <span class="schedule-date">${this.formatDate(t.scheduledDate)}</span>
            </div>
            <div class="schedule-body">
              <div class="schedule-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getScheduleTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفني:</span>
                  <span class="detail-value">${t.technicianName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(t.status)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderParts(){return this.parts.length===0?`
        <div class="empty-state">
          <i class="fas fa-puzzle-piece"></i>
          <p>لا توجد قطع غيار</p>
        </div>
      `:`
      <div class="parts-grid">
        ${this.parts.map(t=>`
          <div class="part-card">
            <div class="part-header">
              <h3>${t.name||"قطعة غيار"}</h3>
              <span class="part-stock ${t.quantity<=t.minQuantity?"low":"ok"}">
                ${t.quantity||0} متوفر
              </span>
            </div>
            <div class="part-body">
              <div class="part-details">
                <div class="detail-item">
                  <span class="detail-label">الرقم:</span>
                  <span class="detail-value">${t.partNumber||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعر:</span>
                  <span class="detail-value">${this.formatCurrency(t.price||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحد الأدنى:</span>
                  <span class="detail-value">${t.minQuantity||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderHistory(){return this.history.length===0?`
        <div class="empty-state">
          <i class="fas fa-history"></i>
          <p>لا يوجد سجل</p>
        </div>
      `:`
      <div class="history-list">
        ${this.history.map(t=>`
          <div class="history-card type-${t.type}">
            <div class="history-header">
              <h3>${t.title||"سجل"}</h3>
              <span class="history-date">${this.formatDateTime(t.date)}</span>
            </div>
            <div class="history-body">
              <div class="history-details">
                <div class="detail-item">
                  <span class="detail-label">المعدة:</span>
                  <span class="detail-value">${t.equipmentName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفني:</span>
                  <span class="detail-value">${t.technicianName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التكلفة:</span>
                  <span class="detail-value">${this.formatCurrency(t.cost||0)}</span>
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
    `}getFilteredData(t){let s=[...t];if(this.filters.status!=="all"&&(s=s.filter(a=>a.status===this.filters.status)),this.filters.priority!=="all"&&(s=s.filter(a=>a.priority===this.filters.priority)),this.filters.type!=="all"&&(s=s.filter(a=>a.type===this.filters.type)),this.filters.search){const a=this.filters.search.toLowerCase();s=s.filter(e=>e.title&&e.title.toLowerCase().includes(a)||e.name&&e.name.toLowerCase().includes(a))}return s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,s,a,e,i,n,l,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.requests||"/api/advanced-maintenance/requests"),this.apiClient.get(this.API_ENDPOINTS.workOrders||"/api/advanced-maintenance/work-orders"),this.apiClient.get(this.API_ENDPOINTS.equipment||"/api/advanced-maintenance/equipment"),this.apiClient.get(this.API_ENDPOINTS.technicians||"/api/advanced-maintenance/technicians"),this.apiClient.get(this.API_ENDPOINTS.schedules||"/api/advanced-maintenance/schedules"),this.apiClient.get(this.API_ENDPOINTS.parts||"/api/advanced-maintenance/parts"),this.apiClient.get(this.API_ENDPOINTS.history||"/api/advanced-maintenance/history"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-maintenance/analytics")]);this.requests=t.data||[],this.workOrders=s.data||[],this.equipment=a.data||[],this.technicians=e.data||[],this.schedules=i.data||[],this.parts=n.data||[],this.history=l.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading maintenance data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-maintenance","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,s){this.filters[t]=s.target.value,this.updateContent()}handleSearch(t){this.filters.search=t.target.value,this.updateContent()}updateContent(){const t=document.getElementById("maintenanceContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{pending:"قيد الانتظار","in-progress":"قيد التنفيذ",completed:"مكتمل",cancelled:"ملغى",operational:"تشغيلي",maintenance:"صيانة",broken:"معطل"}[t]||t}getPriorityText(t){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[t]||t}getTypeText(t){return{preventive:"وقائية",corrective:"تصحيحية",emergency:"طارئة",inspection:"فحص"}[t]||t}getScheduleTypeText(t){return{preventive:"وقائية",corrective:"تصحيحية",inspection:"فحص"}[t]||t}formatCurrency(t){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(t)}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(t){return t?new Date(t).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedRequests",JSON.stringify(this.requests)),localStorage.setItem("advancedWorkOrders",JSON.stringify(this.workOrders)),localStorage.setItem("advancedEquipment",JSON.stringify(this.equipment)),localStorage.setItem("advancedTechnicians",JSON.stringify(this.technicians)),localStorage.setItem("advancedSchedules",JSON.stringify(this.schedules)),localStorage.setItem("advancedParts",JSON.stringify(this.parts)),localStorage.setItem("advancedHistory",JSON.stringify(this.history)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.requests=JSON.parse(localStorage.getItem("advancedRequests")||"[]"),this.workOrders=JSON.parse(localStorage.getItem("advancedWorkOrders")||"[]"),this.equipment=JSON.parse(localStorage.getItem("advancedEquipment")||"[]"),this.technicians=JSON.parse(localStorage.getItem("advancedTechnicians")||"[]"),this.schedules=JSON.parse(localStorage.getItem("advancedSchedules")||"[]"),this.parts=JSON.parse(localStorage.getItem("advancedParts")||"[]"),this.history=JSON.parse(localStorage.getItem("advancedHistory")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createRequest=this.createRequest.bind(this),this.createWorkOrder=this.createWorkOrder.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewRequest=this.viewRequest.bind(this),this.approveRequest=this.approveRequest.bind(this),this.editRequest=this.editRequest.bind(this),this.completeWorkOrder=this.completeWorkOrder.bind(this),this.viewEquipment=this.viewEquipment.bind(this),this.editEquipment=this.editEquipment.bind(this)}async createRequest(){console.log("Create request")}async createWorkOrder(){console.log("Create work order")}async viewRequest(t){console.log("View request",t)}async approveRequest(t){console.log("Approve request",t)}async editRequest(t){console.log("Edit request",t)}async completeWorkOrder(t){console.log("Complete work order",t)}async viewEquipment(t){console.log("View equipment",t)}async editEquipment(t){console.log("Edit equipment",t)}}export{b as default};
//# sourceMappingURL=rehabilitation-center-advanced-maintenance-DbBF-lNQ.js.map
