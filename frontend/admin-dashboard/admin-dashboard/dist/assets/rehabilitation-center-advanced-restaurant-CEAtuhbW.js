import{a as r,A as c,c as d,r as o,s as h,b as u,d as p}from"./main-DFR0ngT_.js";class m{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=r,this.API_ENDPOINTS=c.advancedRestaurant||{},this.connectionManager=d,this.realtimeSync=o,this.systemEnhancer=h,this.aiAssistant=u,this.advancedCache=p,this.menus=[],this.meals=[],this.orders=[],this.ingredients=[],this.suppliers=[],this.dietPlans=[],this.analytics=[],this.currentView="menus",this.filters={status:"all",category:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-restaurant-management">
        <div class="restaurant-header">
          <h2>🍽️ نظام إدارة المطاعم والوجبات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createMenu()">
              <i class="fas fa-plus"></i> قائمة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createMeal()">
              <i class="fas fa-utensils"></i> وجبة جديدة
            </button>
          </div>
        </div>

        <div class="restaurant-tabs">
          <button class="tab-btn ${this.currentView==="menus"?"active":""}" 
                  onclick="this.switchView('menus')">
            <i class="fas fa-list"></i> القوائم
          </button>
          <button class="tab-btn ${this.currentView==="meals"?"active":""}" 
                  onclick="this.switchView('meals')">
            <i class="fas fa-utensils"></i> الوجبات
          </button>
          <button class="tab-btn ${this.currentView==="orders"?"active":""}" 
                  onclick="this.switchView('orders')">
            <i class="fas fa-shopping-cart"></i> الطلبات
          </button>
          <button class="tab-btn ${this.currentView==="ingredients"?"active":""}" 
                  onclick="this.switchView('ingredients')">
            <i class="fas fa-carrot"></i> المكونات
          </button>
          <button class="tab-btn ${this.currentView==="suppliers"?"active":""}" 
                  onclick="this.switchView('suppliers')">
            <i class="fas fa-truck"></i> الموردين
          </button>
          <button class="tab-btn ${this.currentView==="dietPlans"?"active":""}" 
                  onclick="this.switchView('dietPlans')">
            <i class="fas fa-heart"></i> الخطط الغذائية
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="restaurant-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="pending">قيد الانتظار</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            <option value="breakfast">فطور</option>
            <option value="lunch">غداء</option>
            <option value="dinner">عشاء</option>
            <option value="snack">وجبة خفيفة</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="restaurant-content" id="restaurantContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"menus":return this.renderMenus();case"meals":return this.renderMeals();case"orders":return this.renderOrders();case"ingredients":return this.renderIngredients();case"suppliers":return this.renderSuppliers();case"dietPlans":return this.renderDietPlans();case"analytics":return this.renderAnalytics();default:return this.renderMenus()}}renderMenus(){const s=this.getFilteredData(this.menus);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-list"></i>
          <p>لا توجد قوائم</p>
          <button class="btn btn-primary" onclick="this.createMenu()">
            إضافة قائمة جديدة
          </button>
        </div>
      `:`
      <div class="menus-grid">
        ${s.map(t=>`
          <div class="menu-card status-${t.status}">
            <div class="menu-header">
              <h3>${t.name||"قائمة"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="menu-body">
              <div class="menu-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getMenuTypeText(t.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الوجبات:</span>
                  <span class="detail-value">${t.mealsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعر:</span>
                  <span class="detail-value">${this.formatCurrency(t.price||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
              </div>
            </div>
            <div class="menu-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewMenu(${t.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editMenu(${t.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderMeals(){return this.meals.length===0?`
        <div class="empty-state">
          <i class="fas fa-utensils"></i>
          <p>لا توجد وجبات</p>
          <button class="btn btn-primary" onclick="this.createMeal()">
            إضافة وجبة جديدة
          </button>
        </div>
      `:`
      <div class="meals-grid">
        ${this.meals.map(s=>`
          <div class="meal-card category-${s.category}">
            <div class="meal-header">
              <h3>${s.name||"وجبة"}</h3>
              <span class="category-badge category-${s.category}">
                ${this.getCategoryText(s.category)}
              </span>
            </div>
            <div class="meal-body">
              <div class="meal-details">
                <div class="detail-item">
                  <span class="detail-label">السعر:</span>
                  <span class="detail-value">${this.formatCurrency(s.price||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعرات:</span>
                  <span class="detail-value">${s.calories||0} سعرة</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوقت:</span>
                  <span class="detail-value">${s.preparationTime||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderOrders(){return this.orders.length===0?`
        <div class="empty-state">
          <i class="fas fa-shopping-cart"></i>
          <p>لا توجد طلبات</p>
        </div>
      `:`
      <div class="orders-list">
        ${this.orders.map(s=>`
          <div class="order-card status-${s.status}">
            <div class="order-header">
              <h3>طلب #${s.id||"غير محدد"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="order-body">
              <div class="order-details">
                <div class="detail-item">
                  <span class="detail-label">العميل:</span>
                  <span class="detail-value">${s.customerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDateTime(s.orderDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الوجبات:</span>
                  <span class="detail-value">${s.itemsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المجموع:</span>
                  <span class="detail-value">${this.formatCurrency(s.total||0)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderIngredients(){return this.ingredients.length===0?`
        <div class="empty-state">
          <i class="fas fa-carrot"></i>
          <p>لا توجد مكونات</p>
        </div>
      `:`
      <div class="ingredients-grid">
        ${this.ingredients.map(s=>`
          <div class="ingredient-card">
            <div class="ingredient-header">
              <h3>${s.name||"مكون"}</h3>
              <span class="stock-badge ${s.stock>0?"in-stock":"out-of-stock"}">
                ${s.stock>0?"متوفر":"غير متوفر"}
              </span>
            </div>
            <div class="ingredient-body">
              <div class="ingredient-details">
                <div class="detail-item">
                  <span class="detail-label">الكمية:</span>
                  <span class="detail-value">${s.stock||0} ${s.unit||"وحدة"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المورد:</span>
                  <span class="detail-value">${s.supplierName||"غير محدد"}</span>
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
          <div class="supplier-card status-${s.status}">
            <div class="supplier-header">
              <h3>${s.name||"مورد"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="supplier-body">
              <div class="supplier-details">
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${s.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">البريد:</span>
                  <span class="detail-value">${s.email||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderDietPlans(){return this.dietPlans.length===0?`
        <div class="empty-state">
          <i class="fas fa-heart"></i>
          <p>لا توجد خطط غذائية</p>
        </div>
      `:`
      <div class="diet-plans-list">
        ${this.dietPlans.map(s=>`
          <div class="diet-plan-card status-${s.status}">
            <div class="diet-plan-header">
              <h3>${s.name||"خطة غذائية"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="diet-plan-body">
              <div class="diet-plan-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${s.type||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الوجبات:</span>
                  <span class="detail-value">${s.mealsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">السعرات اليومية:</span>
                  <span class="detail-value">${s.dailyCalories||0} سعرة</span>
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
            </div>
          </div>
        `).join("")}
      </div>
    `}getFilteredData(s){let t=[...s];if(this.filters.status!=="all"&&(t=t.filter(a=>a.status===this.filters.status)),this.filters.category!=="all"&&(t=t.filter(a=>a.category===this.filters.category)),this.filters.search){const a=this.filters.search.toLowerCase();t=t.filter(e=>e.name&&e.name.toLowerCase().includes(a)||e.description&&e.description.toLowerCase().includes(a))}return t}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,t,a,e,i,n,l]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.menus||"/api/advanced-restaurant/menus"),this.apiClient.get(this.API_ENDPOINTS.meals||"/api/advanced-restaurant/meals"),this.apiClient.get(this.API_ENDPOINTS.orders||"/api/advanced-restaurant/orders"),this.apiClient.get(this.API_ENDPOINTS.ingredients||"/api/advanced-restaurant/ingredients"),this.apiClient.get(this.API_ENDPOINTS.suppliers||"/api/advanced-restaurant/suppliers"),this.apiClient.get(this.API_ENDPOINTS.dietPlans||"/api/advanced-restaurant/diet-plans"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-restaurant/analytics")]);this.menus=s.data||[],this.meals=t.data||[],this.orders=a.data||[],this.ingredients=e.data||[],this.suppliers=i.data||[],this.dietPlans=n.data||[],this.analytics=l.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading restaurant data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-restaurant","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,t){this.filters[s]=t.target.value,this.updateContent()}handleSearch(s){this.filters.search=s.target.value,this.updateContent()}updateContent(){const s=document.getElementById("restaurantContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{active:"نشط",inactive:"غير نشط",pending:"قيد الانتظار",completed:"مكتمل",cancelled:"ملغى",preparing:"قيد التحضير",ready:"جاهز",delivered:"تم التسليم"}[s]||s}getMenuTypeText(s){return{daily:"يومي",weekly:"أسبوعي",monthly:"شهري",special:"خاص"}[s]||s}getCategoryText(s){return{breakfast:"فطور",lunch:"غداء",dinner:"عشاء",snack:"وجبة خفيفة"}[s]||s}formatCurrency(s){return new Intl.NumberFormat("ar-SA",{style:"currency",currency:"SAR",minimumFractionDigits:2}).format(s)}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDateTime(s){return s?new Date(s).toLocaleString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedMenus",JSON.stringify(this.menus)),localStorage.setItem("advancedMeals",JSON.stringify(this.meals)),localStorage.setItem("advancedOrders",JSON.stringify(this.orders)),localStorage.setItem("advancedIngredients",JSON.stringify(this.ingredients)),localStorage.setItem("advancedSuppliers",JSON.stringify(this.suppliers)),localStorage.setItem("advancedDietPlans",JSON.stringify(this.dietPlans)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.menus=JSON.parse(localStorage.getItem("advancedMenus")||"[]"),this.meals=JSON.parse(localStorage.getItem("advancedMeals")||"[]"),this.orders=JSON.parse(localStorage.getItem("advancedOrders")||"[]"),this.ingredients=JSON.parse(localStorage.getItem("advancedIngredients")||"[]"),this.suppliers=JSON.parse(localStorage.getItem("advancedSuppliers")||"[]"),this.dietPlans=JSON.parse(localStorage.getItem("advancedDietPlans")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.createMenu=this.createMenu.bind(this),this.createMeal=this.createMeal.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewMenu=this.viewMenu.bind(this),this.editMenu=this.editMenu.bind(this)}async createMenu(){console.log("Create menu")}async createMeal(){console.log("Create meal")}async viewMenu(s){console.log("View menu",s)}async editMenu(s){console.log("Edit menu",s)}}export{m as default};
//# sourceMappingURL=rehabilitation-center-advanced-restaurant-CEAtuhbW.js.map
