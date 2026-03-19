import{a as l,A as c,c as o,r,s as d,b as h,d as p}from"./main-DFR0ngT_.js";class g{constructor(t){this.container=t,this.useAPI=!0,this.apiClient=l,this.API_ENDPOINTS=c.advancedComplaints||{},this.connectionManager=o,this.realtimeSync=r,this.systemEnhancer=d,this.aiAssistant=h,this.advancedCache=p,this.complaints=[],this.suggestions=[],this.categories=[],this.resolutions=[],this.feedback=[],this.analytics=[],this.currentView="complaints",this.filters={status:"all",category:"all",priority:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-complaints-management">
        <div class="complaints-header">
          <h2>📝 نظام إدارة الشكاوى والمقترحات المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createComplaint()">
              <i class="fas fa-plus"></i> شكوى جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createSuggestion()">
              <i class="fas fa-lightbulb"></i> اقتراح جديد
            </button>
          </div>
        </div>

        <div class="complaints-tabs">
          <button class="tab-btn ${this.currentView==="complaints"?"active":""}" 
                  onclick="this.switchView('complaints')">
            <i class="fas fa-exclamation-triangle"></i> الشكاوى
          </button>
          <button class="tab-btn ${this.currentView==="suggestions"?"active":""}" 
                  onclick="this.switchView('suggestions')">
            <i class="fas fa-lightbulb"></i> المقترحات
          </button>
          <button class="tab-btn ${this.currentView==="categories"?"active":""}" 
                  onclick="this.switchView('categories')">
            <i class="fas fa-tags"></i> الفئات
          </button>
          <button class="tab-btn ${this.currentView==="resolutions"?"active":""}" 
                  onclick="this.switchView('resolutions')">
            <i class="fas fa-check-circle"></i> الحلول
          </button>
          <button class="tab-btn ${this.currentView==="feedback"?"active":""}" 
                  onclick="this.switchView('feedback')">
            <i class="fas fa-comment-dots"></i> التقييمات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="complaints-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="new">جديد</option>
            <option value="in-progress">قيد المعالجة</option>
            <option value="resolved">محلول</option>
            <option value="closed">مغلق</option>
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

        <div class="complaints-content" id="complaintsContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"complaints":return this.renderComplaints();case"suggestions":return this.renderSuggestions();case"categories":return this.renderCategories();case"resolutions":return this.renderResolutions();case"feedback":return this.renderFeedback();case"analytics":return this.renderAnalytics();default:return this.renderComplaints()}}renderComplaints(){const t=this.getFilteredData(this.complaints);return t.length===0?`
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>لا توجد شكاوى</p>
          <button class="btn btn-primary" onclick="this.createComplaint()">
            إضافة شكوى جديدة
          </button>
        </div>
      `:`
      <div class="complaints-list">
        ${t.map(s=>`
          <div class="complaint-card status-${s.status} priority-${s.priority||"medium"}">
            <div class="complaint-header">
              <div class="complaint-info">
                <h3>${s.title||"شكوى"}</h3>
                <p class="complaint-submitter">من: ${s.submittedBy||"غير محدد"}</p>
              </div>
              <div class="complaint-badges">
                <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                <span class="priority-badge priority-${s.priority||"medium"}">
                  ${this.getPriorityText(s.priority||"medium")}
                </span>
              </div>
            </div>
            <div class="complaint-body">
              <div class="complaint-details">
                <div class="detail-item">
                  <span class="detail-label">الفئة:</span>
                  <span class="detail-value">${s.categoryName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.submittedDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المسؤول:</span>
                  <span class="detail-value">${s.assignedToName||"غير محدد"}</span>
                </div>
              </div>
              ${s.description?`
                <div class="complaint-description">
                  <p>${s.description.substring(0,150)}${s.description.length>150?"...":""}</p>
                </div>
              `:""}
            </div>
            <div class="complaint-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewComplaint(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              ${s.status==="new"?`
                <button class="btn btn-sm btn-success" onclick="this.assignComplaint(${s.id})">
                  <i class="fas fa-user-check"></i> تعيين
                </button>
              `:""}
              ${s.status==="in-progress"?`
                <button class="btn btn-sm btn-warning" onclick="this.resolveComplaint(${s.id})">
                  <i class="fas fa-check"></i> حل
                </button>
              `:""}
              <button class="btn btn-sm btn-secondary" onclick="this.editComplaint(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSuggestions(){return this.suggestions.length===0?`
        <div class="empty-state">
          <i class="fas fa-lightbulb"></i>
          <p>لا توجد مقترحات</p>
          <button class="btn btn-primary" onclick="this.createSuggestion()">
            إضافة اقتراح جديد
          </button>
        </div>
      `:`
      <div class="suggestions-list">
        ${this.suggestions.map(t=>`
          <div class="suggestion-card status-${t.status}">
            <div class="suggestion-header">
              <h3>${t.title||"اقتراح"}</h3>
              <span class="status-badge status-${t.status}">${this.getStatusText(t.status)}</span>
            </div>
            <div class="suggestion-body">
              <div class="suggestion-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${t.submittedBy||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.submittedDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التقييم:</span>
                  <span class="detail-value">${this.renderStars(t.rating||0)}</span>
                </div>
              </div>
              ${t.description?`
                <div class="suggestion-description">
                  <p>${t.description.substring(0,150)}${t.description.length>150?"...":""}</p>
                </div>
              `:""}
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
        ${this.categories.map(t=>`
          <div class="category-card">
            <div class="category-header">
              <h3>${t.name||"فئة"}</h3>
              <span class="category-count">${t.itemsCount||0} عنصر</span>
            </div>
            <div class="category-body">
              <div class="category-details">
                <div class="detail-item">
                  <span class="detail-label">الوصف:</span>
                  <span class="detail-value">${t.description||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderResolutions(){return this.resolutions.length===0?`
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>لا توجد حلول</p>
        </div>
      `:`
      <div class="resolutions-list">
        ${this.resolutions.map(t=>`
          <div class="resolution-card">
            <div class="resolution-header">
              <h3>${t.complaintTitle||"حل"}</h3>
              <span class="resolution-date">${this.formatDate(t.resolvedDate)}</span>
            </div>
            <div class="resolution-body">
              <div class="resolution-details">
                <div class="detail-item">
                  <span class="detail-label">المسؤول:</span>
                  <span class="detail-value">${t.resolvedBy||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحل:</span>
                  <span class="detail-value">${t.solution||"غير محدد"}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderFeedback(){return this.feedback.length===0?`
        <div class="empty-state">
          <i class="fas fa-comment-dots"></i>
          <p>لا توجد تقييمات</p>
        </div>
      `:`
      <div class="feedback-list">
        ${this.feedback.map(t=>`
          <div class="feedback-card">
            <div class="feedback-header">
              <h3>${t.complaintTitle||"تقييم"}</h3>
              <div class="feedback-rating">
                ${this.renderStars(t.rating||0)}
              </div>
            </div>
            <div class="feedback-body">
              <div class="feedback-details">
                <div class="detail-item">
                  <span class="detail-label">من:</span>
                  <span class="detail-value">${t.submittedBy||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(t.date)}</span>
                </div>
              </div>
              ${t.comment?`
                <div class="feedback-comment">
                  <p>${t.comment}</p>
                </div>
              `:""}
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
    `}renderStars(t){const s=[];for(let i=1;i<=5;i++)i<=t?s.push('<i class="fas fa-star"></i>'):s.push('<i class="far fa-star"></i>');return s.join("")}getFilteredData(t){let s=[...t];if(this.filters.status!=="all"&&(s=s.filter(i=>i.status===this.filters.status)),this.filters.category!=="all"&&(s=s.filter(i=>i.categoryId===parseInt(this.filters.category))),this.filters.priority!=="all"&&(s=s.filter(i=>i.priority===this.filters.priority)),this.filters.search){const i=this.filters.search.toLowerCase();s=s.filter(a=>a.title&&a.title.toLowerCase().includes(i)||a.description&&a.description.toLowerCase().includes(i))}return s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[t,s,i,a,e,n]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.complaints||"/api/advanced-complaints/complaints"),this.apiClient.get(this.API_ENDPOINTS.suggestions||"/api/advanced-complaints/suggestions"),this.apiClient.get(this.API_ENDPOINTS.categories||"/api/advanced-complaints/categories"),this.apiClient.get(this.API_ENDPOINTS.resolutions||"/api/advanced-complaints/resolutions"),this.apiClient.get(this.API_ENDPOINTS.feedback||"/api/advanced-complaints/feedback"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-complaints/analytics")]);this.complaints=t.data||[],this.suggestions=s.data||[],this.categories=i.data||[],this.resolutions=a.data||[],this.feedback=e.data||[],this.analytics=n.data||[],this.saveToLocalStorage(),this.updateContent()}catch(t){console.error("Error loading complaints data:",t),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-complaints","*",t=>{(t.action==="create"||t.action==="update"||t.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(t){this.currentView=t,this.updateContent()}handleFilterChange(t,s){this.filters[t]=s.target.value,this.updateContent()}handleSearch(t){this.filters.search=t.target.value,this.updateContent()}updateContent(){const t=document.getElementById("complaintsContent");t&&(t.innerHTML=this.renderCurrentView())}getStatusText(t){return{new:"جديد","in-progress":"قيد المعالجة",resolved:"محلول",closed:"مغلق",underreview:"قيد المراجعة",implemented:"مطبق"}[t]||t}getPriorityText(t){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[t]||t}formatDate(t){return t?new Date(t).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedComplaints",JSON.stringify(this.complaints)),localStorage.setItem("advancedSuggestions",JSON.stringify(this.suggestions)),localStorage.setItem("advancedCategories",JSON.stringify(this.categories)),localStorage.setItem("advancedResolutions",JSON.stringify(this.resolutions)),localStorage.setItem("advancedFeedback",JSON.stringify(this.feedback)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(t){console.error("Error saving to localStorage:",t)}}loadFromLocalStorage(){try{this.complaints=JSON.parse(localStorage.getItem("advancedComplaints")||"[]"),this.suggestions=JSON.parse(localStorage.getItem("advancedSuggestions")||"[]"),this.categories=JSON.parse(localStorage.getItem("advancedCategories")||"[]"),this.resolutions=JSON.parse(localStorage.getItem("advancedResolutions")||"[]"),this.feedback=JSON.parse(localStorage.getItem("advancedFeedback")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(t){console.error("Error loading from localStorage:",t)}}setupEventListeners(){this.createComplaint=this.createComplaint.bind(this),this.createSuggestion=this.createSuggestion.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewComplaint=this.viewComplaint.bind(this),this.assignComplaint=this.assignComplaint.bind(this),this.resolveComplaint=this.resolveComplaint.bind(this),this.editComplaint=this.editComplaint.bind(this)}async createComplaint(){console.log("Create complaint")}async createSuggestion(){console.log("Create suggestion")}async viewComplaint(t){console.log("View complaint",t)}async assignComplaint(t){console.log("Assign complaint",t)}async resolveComplaint(t){console.log("Resolve complaint",t)}async editComplaint(t){console.log("Edit complaint",t)}}export{g as default};
//# sourceMappingURL=rehabilitation-center-advanced-complaints-DgT3HMXk.js.map
