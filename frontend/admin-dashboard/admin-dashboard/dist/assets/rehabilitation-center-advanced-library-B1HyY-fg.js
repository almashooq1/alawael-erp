import{a as n,A as o,c as l,r as c,s as d,b as h,d as v}from"./main-DFR0ngT_.js";class b{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=n,this.API_ENDPOINTS=o.advancedLibrary||{},this.connectionManager=l,this.realtimeSync=c,this.systemEnhancer=d,this.aiAssistant=h,this.advancedCache=v,this.books=[],this.resources=[],this.borrowers=[],this.loans=[],this.categories=[],this.analytics=[],this.currentView="books",this.filters={status:"all",category:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-library-management">
        <div class="library-header">
          <h2>📚 نظام إدارة المكتبة والموارد التعليمية المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.addBook()">
              <i class="fas fa-plus"></i> كتاب جديد
            </button>
            <button class="btn btn-secondary" onclick="this.addResource()">
              <i class="fas fa-file-alt"></i> مورد جديد
            </button>
            <button class="btn btn-info" onclick="this.createLoan()">
              <i class="fas fa-hand-holding"></i> إعارة جديدة
            </button>
          </div>
        </div>

        <div class="library-tabs">
          <button class="tab-btn ${this.currentView==="books"?"active":""}" 
                  onclick="this.switchView('books')">
            <i class="fas fa-book"></i> الكتب
          </button>
          <button class="tab-btn ${this.currentView==="resources"?"active":""}" 
                  onclick="this.switchView('resources')">
            <i class="fas fa-file-alt"></i> الموارد
          </button>
          <button class="tab-btn ${this.currentView==="borrowers"?"active":""}" 
                  onclick="this.switchView('borrowers')">
            <i class="fas fa-users"></i> المستعيرون
          </button>
          <button class="tab-btn ${this.currentView==="loans"?"active":""}" 
                  onclick="this.switchView('loans')">
            <i class="fas fa-hand-holding"></i> الإعارات
          </button>
          <button class="tab-btn ${this.currentView==="categories"?"active":""}" 
                  onclick="this.switchView('categories')">
            <i class="fas fa-tags"></i> الفئات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="library-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="available">متاح</option>
            <option value="borrowed">معار</option>
            <option value="reserved">محجوز</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('category', event)">
            <option value="all">جميع الفئات</option>
            ${this.categories.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="library-content" id="libraryContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"books":return this.renderBooks();case"resources":return this.renderResources();case"borrowers":return this.renderBorrowers();case"loans":return this.renderLoans();case"categories":return this.renderCategories();case"analytics":return this.renderAnalytics();default:return this.renderBooks()}}renderBooks(){const s=this.getFilteredData(this.books);return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-book"></i>
          <p>لا توجد كتب</p>
          <button class="btn btn-primary" onclick="this.addBook()">
            إضافة كتاب جديد
          </button>
        </div>
      `:`
      <div class="books-grid">
        ${s.map(a=>`
          <div class="book-card status-${a.status}">
            <div class="book-header">
              <h3>${a.title||"كتاب"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="book-body">
              <div class="book-details">
                <div class="detail-item">
                  <span class="detail-label">المؤلف:</span>
                  <span class="detail-value">${a.author||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${a.categoryName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">النسخ المتاحة:</span>
                  <span class="detail-value">${a.availableCopies||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إجمالي النسخ:</span>
                  <span class="detail-value">${a.totalCopies||0}</span>
                </div>
              </div>
            </div>
            <div class="book-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewBook(${a.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editBook(${a.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderResources(){return this.resources.length===0?`
        <div class="empty-state">
          <i class="fas fa-file-alt"></i>
          <p>لا توجد موارد</p>
          <button class="btn btn-primary" onclick="this.addResource()">
            إضافة مورد جديد
          </button>
        </div>
      `:`
      <div class="resources-grid">
        ${this.resources.map(s=>`
          <div class="resource-card">
            <div class="resource-header">
              <h3>${s.title||"مورد"}</h3>
              <span class="resource-type">${this.getResourceTypeText(s.type)}</span>
            </div>
            <div class="resource-body">
              <div class="resource-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getResourceTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحجم:</span>
                  <span class="detail-value">${this.formatFileSize(s.size)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإضافة:</span>
                  <span class="detail-value">${this.formatDate(s.addedDate)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderBorrowers(){return this.borrowers.length===0?`
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>لا يوجد مستعيرون</p>
        </div>
      `:`
      <div class="borrowers-grid">
        ${this.borrowers.map(s=>`
          <div class="borrower-card">
            <div class="borrower-header">
              <div class="borrower-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="borrower-info">
                <h3>${s.name||"مستعير"}</h3>
                <p class="borrower-type">${this.getBorrowerTypeText(s.type)}</p>
              </div>
            </div>
            <div class="borrower-body">
              <div class="borrower-details">
                <div class="detail-item">
                  <span class="detail-label">عدد الإعارات النشطة:</span>
                  <span class="detail-value">${s.activeLoans||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">إجمالي الإعارات:</span>
                  <span class="detail-value">${s.totalLoans||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderLoans(){return this.loans.length===0?`
        <div class="empty-state">
          <i class="fas fa-hand-holding"></i>
          <p>لا توجد إعارات</p>
          <button class="btn btn-primary" onclick="this.createLoan()">
            إضافة إعارة جديدة
          </button>
        </div>
      `:`
      <div class="loans-list">
        ${this.loans.map(s=>`
          <div class="loan-card status-${s.status}">
            <div class="loan-header">
              <h3>${s.bookTitle||"كتاب"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="loan-body">
              <div class="loan-details">
                <div class="detail-item">
                  <span class="detail-label">المستعير:</span>
                  <span class="detail-value">${s.borrowerName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإعارة:</span>
                  <span class="detail-value">${this.formatDate(s.loanDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الاستحقاق:</span>
                  <span class="detail-value">${this.formatDate(s.dueDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الإرجاع:</span>
                  <span class="detail-value">${this.formatDate(s.returnDate)||"لم يتم الإرجاع"}</span>
                </div>
              </div>
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
              <span class="category-count">${s.booksCount||0} كتاب</span>
            </div>
            <div class="category-body">
              <p>${s.description||"لا يوجد وصف"}</p>
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
    `}getFilteredData(s){let a=[...s];if(this.filters.status!=="all"&&(a=a.filter(t=>t.status===this.filters.status)),this.filters.category!=="all"&&(a=a.filter(t=>t.categoryId===parseInt(this.filters.category))),this.filters.search){const t=this.filters.search.toLowerCase();a=a.filter(e=>e.title&&e.title.toLowerCase().includes(t)||e.author&&e.author.toLowerCase().includes(t))}return a}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,a,t,e,i,r]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.books||"/api/advanced-library/books"),this.apiClient.get(this.API_ENDPOINTS.resources||"/api/advanced-library/resources"),this.apiClient.get(this.API_ENDPOINTS.borrowers||"/api/advanced-library/borrowers"),this.apiClient.get(this.API_ENDPOINTS.loans||"/api/advanced-library/loans"),this.apiClient.get(this.API_ENDPOINTS.categories||"/api/advanced-library/categories"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-library/analytics")]);this.books=s.data||[],this.resources=a.data||[],this.borrowers=t.data||[],this.loans=e.data||[],this.categories=i.data||[],this.analytics=r.data||[],this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading library data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-library","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,a){this.filters[s]=a.target.value,this.updateContent()}handleSearch(s){this.filters.search=s.target.value,this.updateContent()}updateContent(){const s=document.getElementById("libraryContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{available:"متاح",borrowed:"معار",reserved:"محجوز"}[s]||s}getResourceTypeText(s){return{pdf:"PDF",video:"فيديو",audio:"صوتي",image:"صورة",document:"مستند"}[s]||s}getBorrowerTypeText(s){return{patient:"مريض",staff:"موظف",student:"طالب",visitor:"زائر"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatFileSize(s){if(!s)return"0 B";const a=["B","KB","MB","GB"],t=Math.floor(Math.log(s)/Math.log(1024));return`${(s/Math.pow(1024,t)).toFixed(2)} ${a[t]}`}saveToLocalStorage(){try{localStorage.setItem("advancedBooks",JSON.stringify(this.books)),localStorage.setItem("advancedResources",JSON.stringify(this.resources)),localStorage.setItem("advancedBorrowers",JSON.stringify(this.borrowers)),localStorage.setItem("advancedLoans",JSON.stringify(this.loans)),localStorage.setItem("advancedCategories",JSON.stringify(this.categories)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.books=JSON.parse(localStorage.getItem("advancedBooks")||"[]"),this.resources=JSON.parse(localStorage.getItem("advancedResources")||"[]"),this.borrowers=JSON.parse(localStorage.getItem("advancedBorrowers")||"[]"),this.loans=JSON.parse(localStorage.getItem("advancedLoans")||"[]"),this.categories=JSON.parse(localStorage.getItem("advancedCategories")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.addBook=this.addBook.bind(this),this.addResource=this.addResource.bind(this),this.createLoan=this.createLoan.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewBook=this.viewBook.bind(this),this.editBook=this.editBook.bind(this)}async addBook(){console.log("Add book")}async addResource(){console.log("Add resource")}async createLoan(){console.log("Create loan")}async viewBook(s){console.log("View book",s)}async editBook(s){console.log("Edit book",s)}}export{b as default};
//# sourceMappingURL=rehabilitation-center-advanced-library-B1HyY-fg.js.map
