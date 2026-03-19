import{a as d,A as o,c as h,r as p,s as v,b as u,d as m}from"./main-DFR0ngT_.js";class y{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=d,this.API_ENDPOINTS=o.advancedInventory||{},this.connectionManager=h,this.realtimeSync=p,this.systemEnhancer=v,this.aiAssistant=u,this.advancedCache=m,this.items=[],this.categories=[],this.suppliers=[],this.purchases=[],this.sales=[],this.transfers=[],this.adjustments=[],this.alerts=[],this.analytics=[],this.currentView="items",this.filters={category:"all",status:"all",supplier:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-inventory-management">
        <div class="inventory-header">
          <h2>📦 نظام إدارة المخزون المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createItem()">
              <i class="fas fa-plus"></i> عنصر جديد
            </button>
            <button class="btn btn-secondary" onclick="this.createPurchase()">
              <i class="fas fa-shopping-cart"></i> شراء جديد
            </button>
          </div>
        </div>

        <div class="inventory-tabs">
          <button class="tab-btn ${this.currentView==="items"?"active":""}" 
                  onclick="this.switchView('items')">
            <i class="fas fa-box"></i> العناصر
          </button>
          <button class="tab-btn ${this.currentView==="categories"?"active":""}" 
                  onclick="this.switchView('categories')">
            <i class="fas fa-tags"></i> الفئات
          </button>
          <button class="tab-btn ${this.currentView==="suppliers"?"active":""}" 
                  onclick="this.switchView('suppliers')">
            <i class="fas fa-truck"></i> الموردين
          </button>
          <button class="tab-btn ${this.currentView==="purchases"?"active":""}" 
                  onclick="this.switchView('purchases')">
            <i class="fas fa-shopping-cart"></i> المشتريات
          </button>
          <button class="tab-btn ${this.currentView==="sales"?"active":""}" 
                  onclick="this.switchView('sales')">
            <i class="fas fa-cash-register"></i> المبيعات
          </button>
          <button class="tab-btn ${this.currentView==="transfers"?"active":""}" 
                  onclick="this.switchView('transfers')">
            <i class="fas fa-exchange-alt"></i> التحويلات
          </button>
          <button class="tab-btn ${this.currentView==="adjustments"?"active":""}" 
                  onclick="this.switchView('adjustments')">
            <i class="fas fa-adjust"></i> التسويات
          </button>
          <button class="tab-btn ${this.currentView==="alerts"?"active":""}" 
                  onclick="this.switchView('alerts')">
            <i class="fas fa-bell"></i> التنبيهات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="inventory-filters">
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            ${this.categories.map(s=>`
              <option value="${s.id}">${s.name}</option>
            `).join("")}
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="in-stock">متوفر</option>
            <option value="low-stock">مخزون منخفض</option>
            <option value="out-of-stock">نفد المخزون</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="inventory-content" id="inventoryContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"items":return this.renderItems();case"categories":return this.renderCategories();case"suppliers":return this.renderSuppliers();case"purchases":return this.renderPurchases();case"sales":return this.renderSales();case"transfers":return this.renderTransfers();case"adjustments":return this.renderAdjustments();case"alerts":return this.renderAlerts();case"analytics":return this.renderAnalytics();default:return this.renderItems()}}renderItems(){const s=this.getFilteredData(this.items);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-box"></i>
          <p>لا توجد عناصر</p>
          <button class="btn btn-primary" onclick="this.createItem()">
            إضافة عنصر جديد
          </button>
        </div>
      `:`
      <div class="items-grid">
        ${s.map(t=>`
          <div class="item-card status-${this.getItemStatus(t)}">
            <div class="item-header">
              <div class="item-info">
                <h3>${t.name||"عنصر"}</h3>
                <p class="item-code">${t.code||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${this.getItemStatus(t)}">
                ${this.getStatusText(this.getItemStatus(t))}
              </span>
            </div>
            <div class="item-body">
              <div class="item-stock">
                <div class="stock-info">
                  <span class="stock-label">المخزون:</span>
                  <span class="stock-value ${this.getItemStatus(t)==="out-of-stock"?"negative":this.getItemStatus(t)==="low-stock"?"warning":"positive"}">
                    ${t.quantity||0} ${t.unit||"وحدة"}
                  </span>
                </div>
                ${t.minQuantity?`
                  <div class="stock-min">
                    <span>الحد الأدنى: ${t.minQuantity}</span>
                  </div>
                `:""}
              </div>
              <div class="item-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${t.categoryName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعر:</span>
                  <span class="detail-value">${this.formatCurrency(t.price||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الموقع:</span>
                  <span class="detail-value">${t.location||"غير محدد"}</span>
                </div>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewItem(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editItem(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderCategories(){return this.categories.length===0?`
        <div class="empty-state">
          <i class="fas fa-tags"></i>
          <p>لا توجد فئات</p>
        </div>
      `:`
      <div class="categories-grid">
        ${this.categories.map(s=>`
          <div class="category-card">
            <div class="category-header">
              <h3>${s.name||"فئة"}</h3>
              <span class="category-items">${s.itemsCount||0} عنصر</span>
            </div>
            <div class="category-body">
              <div class="category-details">
                <div class="detail-item">
                  <span class="detail-label">الوصف:</span>
                  <span class="detail-value">${s.description||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSuppliers(){return this.suppliers.length===0?`
        <div class="empty-state">
          <i class="fas fa-truck"></i>
          <p>لا يوجد موردين</p>
        </div>
      `:`
      <div class="suppliers-grid">
        ${this.suppliers.map(s=>`
          <div class="supplier-card">
            <div class="supplier-header">
              <h3>${s.name||"مورد"}</h3>
              <span class="supplier-rating">${this.renderStars(s.rating||0)}</span>
            </div>
            <div class="supplier-body">
              <div class="supplier-details">
                <div class="detail-item">
                  <span class="detail-label">البريد الإلكتروني:</span>
                  <span class="detail-value">${s.email||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${s.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الطلبات:</span>
                  <span class="detail-value">${s.ordersCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPurchases(){return this.purchases.length===0?`
        <div class="empty-state">
          <i class="fas fa-shopping-cart"></i>
          <p>لا توجد مشتريات</p>
          <button class="btn btn-primary" onclick="this.createPurchase()">
            إضافة شراء جديد
          </button>
        </div>
      `:`
      <div class="purchases-list">
        ${this.purchases.map(s=>`
          <div class="purchase-card status-${s.status}">
            <div class="purchase-header">
              <div class="purchase-info">
                <h3>طلب شراء #${s.number||"غير محدد"}</h3>
                <p class="purchase-supplier">${s.supplierName||"غير محدد"}</p>
              </div>
              <div class="purchase-amount">
                ${this.formatCurrency(s.total||0)}
              </div>
            </div>
            <div class="purchase-body">
              <div class="purchase-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحالة:</span>
                  <span class="detail-value">${this.getStatusText(s.status)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد العناصر:</span>
                  <span class="detail-value">${s.itemsCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSales(){return this.sales.length===0?`
        <div class="empty-state">
          <i class="fas fa-cash-register"></i>
          <p>لا توجد مبيعات</p>
        </div>
      `:`
      <div class="sales-list">
        ${this.sales.map(s=>`
          <div class="sale-card status-${s.status}">
            <div class="sale-header">
              <h3>مبيعة #${s.number||"غير محدد"}</h3>
              <span class="sale-amount">${this.formatCurrency(s.total||0)}</span>
            </div>
            <div class="sale-body">
              <div class="sale-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">العميل:</span>
                  <span class="detail-value">${s.customerName||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderTransfers(){return this.transfers.length===0?`
        <div class="empty-state">
          <i class="fas fa-exchange-alt"></i>
          <p>لا توجد تحويلات</p>
        </div>
      `:`
      <div class="transfers-list">
        ${this.transfers.map(s=>`
          <div class="transfer-card status-${s.status}">
            <div class="transfer-header">
              <h3>تحويل #${s.number||"غير محدد"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="transfer-body">
              <div class="transfer-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${s.fromLocation||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إلى:</span>
                  <span class="detail-value">${s.toLocation||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAdjustments(){return this.adjustments.length===0?`
        <div class="empty-state">
          <i class="fas fa-adjust"></i>
          <p>لا توجد تسويات</p>
        </div>
      `:`
      <div class="adjustments-list">
        ${this.adjustments.map(s=>`
          <div class="adjustment-card type-${s.type}">
            <div class="adjustment-header">
              <h3>${s.itemName||"تسوية"}</h3>
              <span class="adjustment-type">${this.getAdjustmentTypeText(s.type)}</span>
            </div>
            <div class="adjustment-body">
              <div class="adjustment-details">
                <div class="detail-item">
                  <span class="detail-label">الكمية:</span>
                  <span class="detail-value">${s.quantity||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السبب:</span>
                  <span class="detail-value">${s.reason||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAlerts(){return this.alerts.length===0?`
        <div class="empty-state">
          <i class="fas fa-bell"></i>
          <p>لا توجد تنبيهات</p>
        </div>
      `:`
      <div class="alerts-list">
        ${this.alerts.map(s=>`
          <div class="alert-card level-${s.level}">
            <div class="alert-header">
              <h3>${s.itemName||"تنبيه"}</h3>
              <span class="alert-level level-${s.level}">${this.getAlertLevelText(s.level)}</span>
            </div>
            <div class="alert-body">
              <p>${s.message||""}</p>
              <div class="alert-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDateTime(s.date)}</span>
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
    `}renderStars(s){const t=[];for(let a=1;a<=5;a++)a<=s?t.push('<i class="fas fa-star"></i>'):t.push('<i class="far fa-star"></i>');return t.join("")}getItemStatus(s){return!s.quantity||s.quantity===0?"out-of-stock":s.minQuantity&&s.quantity<=s.minQuantity?"low-stock":"in-stock"}getFilteredData(s){let t=[...s];if(this.filters.category!=="all"&&(t=t.filter(a=>a.categoryId===parseInt(this.filters.category))),this.filters.status!=="all"&&(t=t.filter(a=>this.getItemStatus(a)===this.filters.status)),this.filters.supplier!=="all"&&(t=t.filter(a=>a.supplierId===parseInt(this.filters.supplier))),this.filters.search){const a=this.filters.search.toLowerCase();t=t.filter(e=>e.name&&e.name.toLowerCase().includes(a)||e.code&&e.code.toLowerCase().includes(a))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,t,a,e,i,n,l,r,c]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.items||"/api/advanced-inventory/items"),this.apiClient.get(this.API_ENDPOINTS.categories||"/api/advanced-inventory/categories"),this.apiClient.get(this.API_ENDPOINTS.suppliers||"/api/advanced-inventory/suppliers"),this.apiClient.get(this.API_ENDPOINTS.purchases||"/api/advanced-inventory/purchases"),this.apiClient.get(this.API_ENDPOINTS.sales||"/api/advanced-inventory/sales"),this.apiClient.get(this.API_ENDPOINTS.transfers||"/api/advanced-inventory/transfers"),this.apiClient.get(this.API_ENDPOINTS.adjustments||"/api/advanced-inventory/adjustments"),this.apiClient.get(this.API_ENDPOINTS.alerts||"/api/advanced-inventory/alerts"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-inventory/analytics")]);this.items=s.data||[],this.categories=t.data||[],this.suppliers=a.data||[],this.purchases=e.data||[],this.sales=i.data||[],this.transfers=n.data||[],this.adjustments=l.data||[],this.alerts=r.data||[],this.analytics=c.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading inventory data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-inventory","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,t){this.filters[s]=t.target.value,this.updateContent()}handleSearch(s){this.filters.search=s.target.value,this.updateContent()}updateContent(){const s=document.getElementById("inventoryContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{"in-stock":"متوفر","low-stock":"مخزون منخفض","out-of-stock":"نفد المخزون",pending:"قيد الانتظار",completed:"مكتمل",cancelled:"ملغى",increase:"زيادة",decrease:"نقصان",info:"معلومات",warning:"تحذير",critical:"حرج"}[s]||s}getAdjustmentTypeText(s){return{increase:"زيادة",decrease:"نقصان",correction:"تصحيح"}[s]||s}getAlertLevelText(s){return{info:"معلومات",warning:"تحذير",critical:"حرج"}[s]||s}formatCurrency(s){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(s)}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedItems",JSON.stringify(this.items)),localStorage.setItem("advancedCategories",JSON.stringify(this.categories)),localStorage.setItem("advancedSuppliers",JSON.stringify(this.suppliers)),localStorage.setItem("advancedPurchases",JSON.stringify(this.purchases)),localStorage.setItem("advancedSales",JSON.stringify(this.sales)),localStorage.setItem("advancedTransfers",JSON.stringify(this.transfers)),localStorage.setItem("advancedAdjustments",JSON.stringify(this.adjustments)),localStorage.setItem("advancedAlerts",JSON.stringify(this.alerts)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.items=JSON.parse(localStorage.getItem("advancedItems")||"[]"),this.categories=JSON.parse(localStorage.getItem("advancedCategories")||"[]"),this.suppliers=JSON.parse(localStorage.getItem("advancedSuppliers")||"[]"),this.purchases=JSON.parse(localStorage.getItem("advancedPurchases")||"[]"),this.sales=JSON.parse(localStorage.getItem("advancedSales")||"[]"),this.transfers=JSON.parse(localStorage.getItem("advancedTransfers")||"[]"),this.adjustments=JSON.parse(localStorage.getItem("advancedAdjustments")||"[]"),this.alerts=JSON.parse(localStorage.getItem("advancedAlerts")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createItem=this.createItem.bind(this),this.createPurchase=this.createPurchase.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewItem=this.viewItem.bind(this),this.editItem=this.editItem.bind(this)}async createItem(){console.log("Create item")}async createPurchase(){console.log("Create purchase")}async viewItem(s){console.log("View item",s)}async editItem(s){console.log("Edit item",s)}}export{y as default};
//# sourceMappingURL=rehabilitation-center-advanced-inventory-BNNQdu74.js.map
