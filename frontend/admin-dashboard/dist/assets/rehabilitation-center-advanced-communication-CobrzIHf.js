const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var f=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);import{_ as c}from"./main-DFR0ngT_.js";var b=f(($,d)=>{let i=null,n=null,l=null,u=null,g=null,o=null;async function y(){if(i===null)try{i=(await c(()=>import("./main-DFR0ngT_.js").then(s=>s.f),__vite__mapDeps([0,1]))).default,n=(await c(()=>import("./main-DFR0ngT_.js").then(s=>s.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{u=(await c(()=>import("./main-DFR0ngT_.js").then(a=>a.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{l=(await c(()=>import("./main-DFR0ngT_.js").then(a=>a.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{g=(await c(()=>import("./main-DFR0ngT_.js").then(a=>a.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{o=(await c(()=>import("./main-DFR0ngT_.js").then(a=>a.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),i=null,n=null}}class p{constructor(){this.messages=[],this.conversations=[],this.templates=[],this.announcements=[],this.selectedConversation=null,this.currentView="conversations",this.filterType="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await y(),this.useAPI=i!==null,this.useAPI?(await this.loadConversations(),await this.loadMessages(),await this.loadTemplates(),await this.loadAnnouncements()):this.initializeDefaultData(),l&&this.setupRealtimeSync(),u&&this.setupConnectionMonitoring(),this.renderAdvancedCommunication()}setupRealtimeSync(){l.subscribe("communication:message:updated",e=>{this.loadMessages()}),l.subscribe("communication:conversation:updated",e=>{this.loadConversations()})}setupConnectionMonitoring(){u.onStatusChange(e=>{e&&this.useAPI&&this.syncPendingChanges()})}async loadConversations(){var e,s,a;this.loading=!0;try{if(this.useAPI&&i){const t="advanced_communication_conversations",m=o?o.get(t):null;if(m)this.conversations=m;else{const v=await i.get(((s=(e=n==null?void 0:n.advancedCommunication)==null?void 0:e.conversations)==null?void 0:s.list)||"/api/advanced-communication/conversations");(a=v.data)!=null&&a.success&&(this.conversations=v.data.data||[],o&&o.set(t,this.conversations,{ttl:2*60*1e3,tags:["communication"]}))}}}catch(t){console.error("Error loading conversations:",t),this.loadConversationsFromStorage()}finally{this.loading=!1,this.renderAdvancedCommunication()}}async loadMessages(){var e,s,a;try{if(this.useAPI&&i){const t=await i.get(((s=(e=n==null?void 0:n.advancedCommunication)==null?void 0:e.messages)==null?void 0:s.list)||"/api/advanced-communication/messages");(a=t.data)!=null&&a.success&&(this.messages=t.data.data||[])}}catch(t){console.error("Error loading messages:",t),this.loadMessagesFromStorage()}}async loadTemplates(){var e,s,a;try{if(this.useAPI&&i){const t=await i.get(((s=(e=n==null?void 0:n.advancedCommunication)==null?void 0:e.templates)==null?void 0:s.list)||"/api/advanced-communication/templates");(a=t.data)!=null&&a.success&&(this.templates=t.data.data||[])}}catch(t){console.error("Error loading templates:",t),this.loadTemplatesFromStorage()}}async loadAnnouncements(){var e,s,a;try{if(this.useAPI&&i){const t=await i.get(((s=(e=n==null?void 0:n.advancedCommunication)==null?void 0:e.announcements)==null?void 0:s.list)||"/api/advanced-communication/announcements");(a=t.data)!=null&&a.success&&(this.announcements=t.data.data||[])}}catch(t){console.error("Error loading announcements:",t),this.loadAnnouncementsFromStorage()}}loadConversationsFromStorage(){const e=localStorage.getItem("advanced_communication_conversations");if(e)try{this.conversations=JSON.parse(e)}catch(s){console.error("Error loading conversations from storage:",s)}}loadMessagesFromStorage(){const e=localStorage.getItem("advanced_communication_messages");if(e)try{this.messages=JSON.parse(e)}catch(s){console.error("Error loading messages from storage:",s)}}loadTemplatesFromStorage(){const e=localStorage.getItem("advanced_communication_templates");if(e)try{this.templates=JSON.parse(e)}catch(s){console.error("Error loading templates from storage:",s)}}loadAnnouncementsFromStorage(){const e=localStorage.getItem("advanced_communication_announcements");if(e)try{this.announcements=JSON.parse(e)}catch(s){console.error("Error loading announcements from storage:",s)}}saveConversationsToStorage(){localStorage.setItem("advanced_communication_conversations",JSON.stringify(this.conversations))}initializeDefaultData(){this.conversations.length===0&&(this.conversations=[{id:1,title:"محادثة عامة",type:"group",participantsCount:5,lastMessage:"مرحباً بالجميع",lastMessageTime:new Date().toISOString(),unreadCount:0}],this.saveConversationsToStorage())}async syncPendingChanges(){this.useAPI}filterByType(e){this.filterType=e===this.filterType?"all":e,this.renderAdvancedCommunication()}searchItems(e){this.searchQuery=e,this.renderAdvancedCommunication()}getFilteredConversations(){let e=this.conversations;if(this.filterType!=="all"&&(e=e.filter(s=>s.type===this.filterType)),this.searchQuery){const s=this.searchQuery.toLowerCase();e=e.filter(a=>a.title.toLowerCase().includes(s)||a.lastMessage&&a.lastMessage.toLowerCase().includes(s))}return e}renderAdvancedCommunication(){const e=document.getElementById("advanced-communication-container")||document.body;e.innerHTML=`
      <div class="advanced-communication">
        <div class="header-section">
          <h2><i class="fas fa-comments"></i> نظام إدارة التواصل المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedCommunication.showCreateModal()">
              <i class="fas fa-plus"></i> محادثة جديدة
            </button>
            <button class="btn btn-info" onclick="advancedCommunication.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="filters-section">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" class="search-input" placeholder="بحث في المحادثات..." 
                   value="${this.searchQuery}"
                   oninput="advancedCommunication.searchItems(this.value)">
          </div>
          <div class="type-filters">
            <button class="filter-btn ${this.filterType==="all"?"active":""}" 
                    onclick="advancedCommunication.filterByType('all')">
              الكل
            </button>
            <button class="filter-btn ${this.filterType==="direct"?"active":""}" 
                    onclick="advancedCommunication.filterByType('direct')">
              <i class="fas fa-user"></i> مباشر
            </button>
            <button class="filter-btn ${this.filterType==="group"?"active":""}" 
                    onclick="advancedCommunication.filterByType('group')">
              <i class="fas fa-users"></i> جماعي
            </button>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="conversations"?"active":""}" onclick="advancedCommunication.switchView('conversations')">
            <i class="fas fa-comments"></i> المحادثات
          </button>
          <button class="tab-btn ${this.currentView==="messages"?"active":""}" onclick="advancedCommunication.switchView('messages')">
            <i class="fas fa-envelope"></i> الرسائل
          </button>
          <button class="tab-btn ${this.currentView==="templates"?"active":""}" onclick="advancedCommunication.switchView('templates')">
            <i class="fas fa-file-alt"></i> القوالب
          </button>
          <button class="tab-btn ${this.currentView==="announcements"?"active":""}" onclick="advancedCommunication.switchView('announcements')">
            <i class="fas fa-bullhorn"></i> الإعلانات
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"conversations":return this.renderConversations();case"messages":return this.renderMessages();case"templates":return this.renderTemplates();case"announcements":return this.renderAnnouncements();default:return this.renderConversations()}}renderConversations(){const e=this.getFilteredConversations(),s={total:this.conversations.length,unread:this.conversations.filter(a=>a.unreadCount>0).length,direct:this.conversations.filter(a=>a.type==="direct").length,group:this.conversations.filter(a=>a.type==="group").length};return`
      <div class="conversations-view">
        <div class="conversations-stats">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <i class="fas fa-comments"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي المحادثات</h3>
              <p class="count">${s.total}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
              <i class="fas fa-envelope"></i>
            </div>
            <div class="stat-content">
              <h3>غير مقروء</h3>
              <p class="count">${s.unread}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
              <i class="fas fa-user"></i>
            </div>
            <div class="stat-content">
              <h3>مباشر</h3>
              <p class="count">${s.direct}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-content">
              <h3>جماعي</h3>
              <p class="count">${s.group}</p>
            </div>
          </div>
        </div>

        <div class="conversations-list">
          ${e.map(a=>`
            <div class="conversation-card ${a.unreadCount>0?"unread":""}" onclick="advancedCommunication.openConversation(${a.id})">
              <div class="conversation-avatar">
                ${a.type==="group"?'<i class="fas fa-users"></i>':'<i class="fas fa-user"></i>'}
              </div>
              <div class="conversation-content">
                <div class="conversation-header">
                  <h4>${a.title}</h4>
                  <span class="conversation-time">${new Date(a.lastMessageTime).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <div class="conversation-body">
                  <p>${a.lastMessage||""}</p>
                  ${a.unreadCount>0?`
                    <span class="unread-badge">${a.unreadCount}</span>
                  `:""}
                </div>
                <div class="conversation-footer">
                  <span class="participants-count">
                    <i class="fas fa-users"></i> ${a.participantsCount||0}
                  </span>
                  <span class="conversation-type type-${a.type}">
                    ${a.type==="group"?"جماعي":"مباشر"}
                  </span>
                </div>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد محادثات</p>'}
        </div>
      </div>
    `}renderMessages(){return`
      <div class="messages-view">
        <div class="messages-list">
          ${this.messages.map(e=>`
            <div class="message-card message-${e.direction}">
              <div class="message-header">
                <h4>${e.senderName||"غير محدد"}</h4>
                <span class="message-time">${new Date(e.timestamp).toLocaleString("ar-SA")}</span>
              </div>
              <div class="message-body">
                <p>${e.content||""}</p>
              </div>
              <div class="message-status">
                ${e.read?'<i class="fas fa-check-double"></i>':'<i class="fas fa-check"></i>'}
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد رسائل</p>'}
        </div>
      </div>
    `}renderTemplates(){return`
      <div class="templates-view">
        <div class="templates-grid">
          ${this.templates.map(e=>`
            <div class="template-card">
              <div class="template-header">
                <h4>${e.name}</h4>
                <span class="template-category">${e.category||"عام"}</span>
              </div>
              <div class="template-body">
                <p>${e.content||""}</p>
              </div>
              <div class="template-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedCommunication.useTemplate(${e.id})">
                  <i class="fas fa-plus"></i> استخدام
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedCommunication.editTemplate(${e.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد قوالب</p>'}
        </div>
      </div>
    `}renderAnnouncements(){return`
      <div class="announcements-view">
        <div class="announcements-list">
          ${this.announcements.map(e=>`
            <div class="announcement-card announcement-${e.priority}">
              <div class="announcement-header">
                <h4>${e.title}</h4>
                <span class="announcement-priority priority-${e.priority}">
                  ${this.getPriorityName(e.priority)}
                </span>
              </div>
              <div class="announcement-body">
                <p>${e.content||""}</p>
                <div class="announcement-info">
                  <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${new Date(e.publishDate).toLocaleDateString("ar-SA")}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-eye"></i>
                    <span>${e.viewsCount||0} مشاهدة</span>
                  </div>
                </div>
              </div>
              <div class="announcement-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedCommunication.viewAnnouncement(${e.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedCommunication.editAnnouncement(${e.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد إعلانات</p>'}
        </div>
      </div>
    `}getPriorityName(e){return{low:"منخفض",medium:"متوسط",high:"عالي",urgent:"عاجل"}[e]||e}switchView(e){this.currentView=e,this.renderAdvancedCommunication()}openConversation(e){alert(`فتح المحادثة #${e} - سيتم التطوير قريباً`)}useTemplate(e){alert(`استخدام القالب #${e} - سيتم التطوير قريباً`)}editTemplate(e){alert(`تعديل القالب #${e} - سيتم التطوير قريباً`)}viewAnnouncement(e){alert(`عرض الإعلان #${e} - سيتم التطوير قريباً`)}editAnnouncement(e){alert(`تعديل الإعلان #${e} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء محادثة - سيتم التطوير قريباً")}async refresh(){o&&o.clear(["communication"]),await this.loadConversations(),await this.loadMessages(),await this.loadTemplates(),await this.loadAnnouncements(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const h=new p;typeof window<"u"&&(window.advancedCommunication=h,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(h,"advancedCommunication"));typeof d<"u"&&d.exports&&(d.exports=p)});export default b();
//# sourceMappingURL=rehabilitation-center-advanced-communication-CobrzIHf.js.map
