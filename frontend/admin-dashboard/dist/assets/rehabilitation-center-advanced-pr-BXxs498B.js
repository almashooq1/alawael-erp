import{a as l,A as c,c as r,r as d,s as o,b as h,d as p}from"./main-DFR0ngT_.js";class m{constructor(a){this.container=a,this.useAPI=!0,this.apiClient=l,this.API_ENDPOINTS=c.advancedPR||{},this.connectionManager=r,this.realtimeSync=d,this.systemEnhancer=o,this.aiAssistant=h,this.advancedCache=p,this.campaigns=[],this.media=[],this.pressReleases=[],this.events=[],this.socialMedia=[],this.analytics=[],this.currentView="campaigns",this.filters={status:"all",type:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-pr-management">
        <div class="pr-header">
          <h2>📢 نظام إدارة العلاقات العامة والإعلام المتقدم الذكي المتكامل</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.createCampaign()">
              <i class="fas fa-plus"></i> حملة جديدة
            </button>
            <button class="btn btn-secondary" onclick="this.createPressRelease()">
              <i class="fas fa-newspaper"></i> بيان صحفي جديد
            </button>
            <button class="btn btn-info" onclick="this.addMedia()">
              <i class="fas fa-image"></i> إضافة وسائط
            </button>
          </div>
        </div>

        <div class="pr-tabs">
          <button class="tab-btn ${this.currentView==="campaigns"?"active":""}" 
                  onclick="this.switchView('campaigns')">
            <i class="fas fa-bullhorn"></i> الحملات
          </button>
          <button class="tab-btn ${this.currentView==="media"?"active":""}" 
                  onclick="this.switchView('media')">
            <i class="fas fa-image"></i> الوسائط
          </button>
          <button class="tab-btn ${this.currentView==="press-releases"?"active":""}" 
                  onclick="this.switchView('press-releases')">
            <i class="fas fa-newspaper"></i> البيانات الصحفية
          </button>
          <button class="tab-btn ${this.currentView==="events"?"active":""}" 
                  onclick="this.switchView('events')">
            <i class="fas fa-calendar-alt"></i> الفعاليات
          </button>
          <button class="tab-btn ${this.currentView==="social-media"?"active":""}" 
                  onclick="this.switchView('social-media')">
            <i class="fas fa-share-alt"></i> وسائل التواصل
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
        </div>

        <div class="pr-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="completed">مكتمل</option>
            <option value="scheduled">مجدول</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('type', event)">
            <option value="all">جميع الأنواع</option>
            <option value="awareness">توعية</option>
            <option value="promotion">ترويج</option>
            <option value="fundraising">جمع تبرعات</option>
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="pr-content" id="prContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"campaigns":return this.renderCampaigns();case"media":return this.renderMedia();case"press-releases":return this.renderPressReleases();case"events":return this.renderEvents();case"social-media":return this.renderSocialMedia();case"analytics":return this.renderAnalytics();default:return this.renderCampaigns()}}renderCampaigns(){const a=this.getFilteredData(this.campaigns);return a.length===0?`
        <div class="empty-state">
          <i class="fas fa-bullhorn"></i>
          <p>لا توجد حملات</p>
          <button class="btn btn-primary" onclick="this.createCampaign()">
            إضافة حملة جديدة
          </button>
        </div>
      `:`
      <div class="campaigns-grid">
        ${a.map(s=>`
          <div class="campaign-card status-${s.status}">
            <div class="campaign-header">
              <h3>${s.title||"حملة"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="campaign-body">
              <div class="campaign-details">
                <div class="detail-item">
                  <span class="detail-label">النوع:</span>
                  <span class="detail-value">${this.getTypeText(s.type)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ البدء:</span>
                  <span class="detail-value">${this.formatDate(s.startDate)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">تاريخ الانتهاء:</span>
                  <span class="detail-value">${this.formatDate(s.endDate)||"مستمر"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوصول:</span>
                  <span class="detail-value">${s.reach||0}</span>
                </div>
              </div>
            </div>
            <div class="campaign-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewCampaign(${s.id})">
                <i class="fas fa-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-secondary" onclick="this.editCampaign(${s.id})">
                <i class="fas fa-edit"></i> تعديل
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderMedia(){return this.media.length===0?`
        <div class="empty-state">
          <i class="fas fa-image"></i>
          <p>لا توجد وسائط</p>
          <button class="btn btn-primary" onclick="this.addMedia()">
            إضافة وسائط جديدة
          </button>
        </div>
      `:`
      <div class="media-grid">
        ${this.media.map(a=>`
          <div class="media-card">
            <div class="media-preview">
              <i class="fas fa-${this.getMediaIcon(a.type)}"></i>
            </div>
            <div class="media-info">
              <h4>${a.title||"وسائط"}</h4>
              <p class="media-type">${this.getMediaTypeText(a.type)}</p>
            </div>
            <div class="media-actions">
              <button class="btn btn-sm btn-primary" onclick="this.viewMedia(${a.id})">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderPressReleases(){return this.pressReleases.length===0?`
        <div class="empty-state">
          <i class="fas fa-newspaper"></i>
          <p>لا توجد بيانات صحفية</p>
          <button class="btn btn-primary" onclick="this.createPressRelease()">
            إضافة بيان صحفي جديد
          </button>
        </div>
      `:`
      <div class="press-releases-list">
        ${this.pressReleases.map(a=>`
          <div class="press-release-card">
            <div class="press-release-header">
              <h3>${a.title||"بيان صحفي"}</h3>
              <span class="release-date">${this.formatDate(a.date)}</span>
            </div>
            <div class="press-release-body">
              <p>${a.summary||"لا يوجد ملخص"}</p>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderEvents(){return this.events.length===0?`
        <div class="empty-state">
          <i class="fas fa-calendar-alt"></i>
          <p>لا توجد فعاليات</p>
        </div>
      `:`
      <div class="events-list">
        ${this.events.map(a=>`
          <div class="event-card status-${a.status}">
            <div class="event-header">
              <h3>${a.title||"فعالية"}</h3>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="event-body">
              <div class="event-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكان:</span>
                  <span class="detail-value">${a.location||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الحضور:</span>
                  <span class="detail-value">${a.attendeesCount||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderSocialMedia(){return this.socialMedia.length===0?`
        <div class="empty-state">
          <i class="fas fa-share-alt"></i>
          <p>لا توجد منشورات</p>
        </div>
      `:`
      <div class="social-media-list">
        ${this.socialMedia.map(a=>`
          <div class="social-media-card">
            <div class="social-media-header">
              <div class="platform-icon">
                <i class="fab fa-${a.platform}"></i>
              </div>
              <div class="post-info">
                <h4>${a.platformName||"منصة"}</h4>
                <span class="post-date">${this.formatDate(a.date)}</span>
              </div>
            </div>
            <div class="social-media-body">
              <p>${a.content||"لا يوجد محتوى"}</p>
              <div class="post-stats">
                <span><i class="fas fa-heart"></i> ${a.likes||0}</span>
                <span><i class="fas fa-share"></i> ${a.shares||0}</span>
                <span><i class="fas fa-comment"></i> ${a.comments||0}</span>
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
    `}getFilteredData(a){let s=[...a];if(this.filters.status!=="all"&&(s=s.filter(e=>e.status===this.filters.status)),this.filters.type!=="all"&&(s=s.filter(e=>e.type===this.filters.type)),this.filters.search){const e=this.filters.search.toLowerCase();s=s.filter(t=>t.title&&t.title.toLowerCase().includes(e))}return s}getMediaIcon(a){return{image:"image",video:"video",audio:"music",document:"file"}[a]||"file"}getMediaTypeText(a){return{image:"صورة",video:"فيديو",audio:"صوتي",document:"مستند"}[a]||a}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[a,s,e,t,i,n]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.campaigns||"/api/advanced-pr/campaigns"),this.apiClient.get(this.API_ENDPOINTS.media||"/api/advanced-pr/media"),this.apiClient.get(this.API_ENDPOINTS.pressReleases||"/api/advanced-pr/press-releases"),this.apiClient.get(this.API_ENDPOINTS.events||"/api/advanced-pr/events"),this.apiClient.get(this.API_ENDPOINTS.socialMedia||"/api/advanced-pr/social-media"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-pr/analytics")]);this.campaigns=a.data||[],this.media=s.data||[],this.pressReleases=e.data||[],this.events=t.data||[],this.socialMedia=i.data||[],this.analytics=n.data||[],this.saveToLocalStorage(),this.updateContent()}catch(a){console.error("Error loading PR data:",a),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-pr","*",a=>{(a.action==="create"||a.action==="update"||a.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}switchView(a){this.currentView=a,this.updateContent()}handleFilterChange(a,s){this.filters[a]=s.target.value,this.updateContent()}handleSearch(a){this.filters.search=a.target.value,this.updateContent()}updateContent(){const a=document.getElementById("prContent");a&&(a.innerHTML=this.renderCurrentView())}getStatusText(a){return{active:"نشط",completed:"مكتمل",scheduled:"مجدول"}[a]||a}getTypeText(a){return{awareness:"توعية",promotion:"ترويج",fundraising:"جمع تبرعات"}[a]||a}formatDate(a){return a?new Date(a).toLocaleDateString("ar-SA"):"غير محدد"}saveToLocalStorage(){try{localStorage.setItem("advancedCampaigns",JSON.stringify(this.campaigns)),localStorage.setItem("advancedMedia",JSON.stringify(this.media)),localStorage.setItem("advancedPressReleases",JSON.stringify(this.pressReleases)),localStorage.setItem("advancedEvents",JSON.stringify(this.events)),localStorage.setItem("advancedSocialMedia",JSON.stringify(this.socialMedia)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics))}catch(a){console.error("Error saving to localStorage:",a)}}loadFromLocalStorage(){try{this.campaigns=JSON.parse(localStorage.getItem("advancedCampaigns")||"[]"),this.media=JSON.parse(localStorage.getItem("advancedMedia")||"[]"),this.pressReleases=JSON.parse(localStorage.getItem("advancedPressReleases")||"[]"),this.events=JSON.parse(localStorage.getItem("advancedEvents")||"[]"),this.socialMedia=JSON.parse(localStorage.getItem("advancedSocialMedia")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]")}catch(a){console.error("Error loading from localStorage:",a)}}setupEventListeners(){this.createCampaign=this.createCampaign.bind(this),this.createPressRelease=this.createPressRelease.bind(this),this.addMedia=this.addMedia.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.viewCampaign=this.viewCampaign.bind(this),this.editCampaign=this.editCampaign.bind(this),this.viewMedia=this.viewMedia.bind(this)}async createCampaign(){console.log("Create campaign")}async createPressRelease(){console.log("Create press release")}async addMedia(){console.log("Add media")}async viewCampaign(a){console.log("View campaign",a)}async editCampaign(a){console.log("Edit campaign",a)}async viewMedia(a){console.log("View media",a)}}export{m as default};
//# sourceMappingURL=rehabilitation-center-advanced-pr-BXxs498B.js.map
