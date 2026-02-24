const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-DFR0ngT_.js","assets/main-BFa_GlVY.css"])))=>i.map(i=>d[i]);
var p=(c,t)=>()=>(t||c((t={exports:{}}).exports,t),t.exports);import{_ as r}from"./main-DFR0ngT_.js";var m=p(($,d)=>{let n=null,e=null,l=null,h=null,b=null,o=null;async function w(){if(n===null)try{n=(await r(()=>import("./main-DFR0ngT_.js").then(a=>a.f),__vite__mapDeps([0,1]))).default,e=(await r(()=>import("./main-DFR0ngT_.js").then(a=>a.e),__vite__mapDeps([0,1]))).API_ENDPOINTS;try{h=(await r(()=>import("./main-DFR0ngT_.js").then(s=>s.g),__vite__mapDeps([0,1]))).default}catch{console.warn("Connection manager not available")}try{l=(await r(()=>import("./main-DFR0ngT_.js").then(s=>s.h),__vite__mapDeps([0,1]))).default}catch{console.warn("Real-time sync not available")}try{b=(await r(()=>import("./main-DFR0ngT_.js").then(s=>s.i),__vite__mapDeps([0,1]))).default}catch{console.warn("AI Assistant not available")}try{o=(await r(()=>import("./main-DFR0ngT_.js").then(s=>s.j),__vite__mapDeps([0,1]))).default}catch{console.warn("Advanced cache not available")}}catch{console.warn("API modules not available"),n=null,e=null}}class f{constructor(){this.integrations=[],this.connections=[],this.webhooks=[],this.apis=[],this.currentView="integrations",this.filterStatus="all",this.searchQuery="",this.loading=!1,this.useAPI=!1,this.init()}async init(){await w(),this.useAPI=n!==null,this.useAPI?(await this.loadIntegrations(),await this.loadConnections(),await this.loadWebhooks(),await this.loadAPIs()):this.initializeDefaultData(),l&&this.setupRealtimeSync(),h&&this.setupConnectionMonitoring(),this.renderAdvancedIntegration()}setupRealtimeSync(){l.subscribe("integration:updated",t=>{this.loadIntegrations()})}setupConnectionMonitoring(){h.onStatusChange(t=>{t&&this.useAPI&&this.syncPendingChanges()})}async loadIntegrations(){var t,a,s;this.loading=!0;try{if(this.useAPI&&n){const i="advanced_integrations",v=o?o.get(i):null;if(v)this.integrations=v;else{const u=await n.get(((a=(t=e==null?void 0:e.advancedIntegration)==null?void 0:t.integrations)==null?void 0:a.list)||"/api/advanced-integration/integrations");(s=u.data)!=null&&s.success&&(this.integrations=u.data.data||[],o&&o.set(i,this.integrations,{ttl:5*60*1e3,tags:["integration"]}))}}}catch(i){console.error("Error loading integrations:",i),this.loadIntegrationsFromStorage()}finally{this.loading=!1,this.renderAdvancedIntegration()}}async loadConnections(){var t,a,s;try{if(this.useAPI&&n){const i=await n.get(((a=(t=e==null?void 0:e.advancedIntegration)==null?void 0:t.connections)==null?void 0:a.list)||"/api/advanced-integration/connections");(s=i.data)!=null&&s.success&&(this.connections=i.data.data||[])}}catch(i){console.error("Error loading connections:",i),this.loadConnectionsFromStorage()}}async loadWebhooks(){var t,a,s;try{if(this.useAPI&&n){const i=await n.get(((a=(t=e==null?void 0:e.advancedIntegration)==null?void 0:t.webhooks)==null?void 0:a.list)||"/api/advanced-integration/webhooks");(s=i.data)!=null&&s.success&&(this.webhooks=i.data.data||[])}}catch(i){console.error("Error loading webhooks:",i),this.loadWebhooksFromStorage()}}async loadAPIs(){var t,a,s;try{if(this.useAPI&&n){const i=await n.get(((a=(t=e==null?void 0:e.advancedIntegration)==null?void 0:t.apis)==null?void 0:a.list)||"/api/advanced-integration/apis");(s=i.data)!=null&&s.success&&(this.apis=i.data.data||[])}}catch(i){console.error("Error loading APIs:",i),this.loadAPIsFromStorage()}}loadIntegrationsFromStorage(){const t=localStorage.getItem("advanced_integrations");if(t)try{this.integrations=JSON.parse(t)}catch(a){console.error("Error loading integrations from storage:",a)}}loadConnectionsFromStorage(){const t=localStorage.getItem("advanced_integrations_connections");if(t)try{this.connections=JSON.parse(t)}catch(a){console.error("Error loading connections from storage:",a)}}loadWebhooksFromStorage(){const t=localStorage.getItem("advanced_integrations_webhooks");if(t)try{this.webhooks=JSON.parse(t)}catch(a){console.error("Error loading webhooks from storage:",a)}}loadAPIsFromStorage(){const t=localStorage.getItem("advanced_integrations_apis");if(t)try{this.apis=JSON.parse(t)}catch(a){console.error("Error loading APIs from storage:",a)}}saveIntegrationsToStorage(){localStorage.setItem("advanced_integrations",JSON.stringify(this.integrations))}initializeDefaultData(){this.integrations.length===0&&(this.integrations=[],this.saveIntegrationsToStorage())}async syncPendingChanges(){this.useAPI}filterByStatus(t){this.filterStatus=t===this.filterStatus?"all":t,this.renderAdvancedIntegration()}searchIntegrations(t){this.searchQuery=t,this.renderAdvancedIntegration()}getFilteredIntegrations(){let t=this.integrations;if(this.filterStatus!=="all"&&(t=t.filter(a=>a.status===this.filterStatus)),this.searchQuery){const a=this.searchQuery.toLowerCase();t=t.filter(s=>s.name.toLowerCase().includes(a)||s.type&&s.type.toLowerCase().includes(a))}return t}renderAdvancedIntegration(){const t=document.getElementById("advanced-integration-container")||document.body;t.innerHTML=`
      <div class="advanced-integration">
        <div class="header-section">
          <h2><i class="fas fa-plug"></i> نظام إدارة التكامل المتقدم</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="advancedIntegration.showCreateModal()">
              <i class="fas fa-plus"></i> تكامل جديد
            </button>
            <button class="btn btn-info" onclick="advancedIntegration.refresh()" ${this.loading?"disabled":""}>
              <i class="fas fa-sync-alt ${this.loading?"fa-spin":""}"></i> تحديث
            </button>
          </div>
        </div>

        <div class="tabs-section">
          <button class="tab-btn ${this.currentView==="integrations"?"active":""}" onclick="advancedIntegration.switchView('integrations')">
            <i class="fas fa-plug"></i> التكاملات
          </button>
          <button class="tab-btn ${this.currentView==="connections"?"active":""}" onclick="advancedIntegration.switchView('connections')">
            <i class="fas fa-network-wired"></i> الاتصالات
          </button>
          <button class="tab-btn ${this.currentView==="webhooks"?"active":""}" onclick="advancedIntegration.switchView('webhooks')">
            <i class="fas fa-code-branch"></i> Webhooks
          </button>
          <button class="tab-btn ${this.currentView==="apis"?"active":""}" onclick="advancedIntegration.switchView('apis')">
            <i class="fas fa-code"></i> APIs
          </button>
        </div>

        <div class="content-section">
          ${this.renderCurrentView()}
        </div>
      </div>
    `}renderCurrentView(){switch(this.currentView){case"integrations":return this.renderIntegrations();case"connections":return this.renderConnections();case"webhooks":return this.renderWebhooks();case"apis":return this.renderAPIs();default:return this.renderIntegrations()}}renderIntegrations(){const t=this.getFilteredIntegrations(),a={total:this.integrations.length,active:this.integrations.filter(s=>s.status==="active").length,inactive:this.integrations.filter(s=>s.status==="inactive").length,error:this.integrations.filter(s=>s.status==="error").length};return`
      <div class="integrations-view">
        <div class="integrations-stats">
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <i class="fas fa-plug"></i>
            </div>
            <div class="stat-content">
              <h3>إجمالي التكاملات</h3>
              <p class="count">${a.total}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3>نشط</h3>
              <p class="count">${a.active}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);">
              <i class="fas fa-pause-circle"></i>
            </div>
            <div class="stat-content">
              <h3>غير نشط</h3>
              <p class="count">${a.inactive}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
              <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="stat-content">
              <h3>خطأ</h3>
              <p class="count">${a.error}</p>
            </div>
          </div>
        </div>

        <div class="integrations-list">
          ${t.map(s=>`
            <div class="integration-card integration-${s.status}">
              <div class="integration-header">
                <h4>${s.name}</h4>
                <span class="integration-status status-${s.status}">
                  ${this.getStatusName(s.status)}
                </span>
              </div>
              <div class="integration-body">
                <p>${s.description||""}</p>
                <div class="integration-info">
                  <div class="info-item">
                    <i class="fas fa-tag"></i>
                    <span>${this.getTypeName(s.type)}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>آخر تحديث: ${new Date(s.updatedAt).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
              </div>
              <div class="integration-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedIntegration.viewIntegration(${s.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedIntegration.editIntegration(${s.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="btn btn-sm ${s.status==="active"?"btn-warning":"btn-success"}" 
                        onclick="advancedIntegration.toggleIntegration(${s.id})">
                  <i class="fas fa-toggle-${s.status==="active"?"off":"on"}"></i> ${s.status==="active"?"تعطيل":"تفعيل"}
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد تكاملات</p>'}
        </div>
      </div>
    `}renderConnections(){return`
      <div class="connections-view">
        <div class="connections-list">
          ${this.connections.map(t=>`
            <div class="connection-card connection-${t.status}">
              <div class="connection-header">
                <h4>${t.name}</h4>
                <span class="connection-status status-${t.status}">
                  ${this.getStatusName(t.status)}
                </span>
              </div>
              <div class="connection-body">
                <div class="connection-info">
                  <div class="info-item">
                    <i class="fas fa-server"></i>
                    <span>${t.host||"غير محدد"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-port"></i>
                    <span>Port: ${t.port||"غير محدد"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <span>آخر اتصال: ${t.lastConnected?new Date(t.lastConnected).toLocaleString("ar-SA"):"لم يتصل"}</span>
                  </div>
                </div>
              </div>
              <div class="connection-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedIntegration.viewConnection(${t.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedIntegration.testConnection(${t.id})">
                  <i class="fas fa-vial"></i> اختبار
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد اتصالات</p>'}
        </div>
      </div>
    `}renderWebhooks(){return`
      <div class="webhooks-view">
        <div class="webhooks-list">
          ${this.webhooks.map(t=>`
            <div class="webhook-card webhook-${t.status}">
              <div class="webhook-header">
                <h4>${t.name}</h4>
                <span class="webhook-status status-${t.status}">
                  ${this.getStatusName(t.status)}
                </span>
              </div>
              <div class="webhook-body">
                <div class="webhook-info">
                  <div class="info-item">
                    <i class="fas fa-link"></i>
                    <span>URL: ${t.url||"غير محدد"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-method"></i>
                    <span>Method: ${t.method||"POST"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>آخر استدعاء: ${t.lastCalled?new Date(t.lastCalled).toLocaleString("ar-SA"):"لم يُستدع"}</span>
                  </div>
                </div>
              </div>
              <div class="webhook-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedIntegration.viewWebhook(${t.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedIntegration.editWebhook(${t.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد webhooks</p>'}
        </div>
      </div>
    `}renderAPIs(){return`
      <div class="apis-view">
        <div class="apis-list">
          ${this.apis.map(t=>`
            <div class="api-card api-${t.status}">
              <div class="api-header">
                <h4>${t.name}</h4>
                <span class="api-status status-${t.status}">
                  ${this.getStatusName(t.status)}
                </span>
              </div>
              <div class="api-body">
                <div class="api-info">
                  <div class="info-item">
                    <i class="fas fa-link"></i>
                    <span>Endpoint: ${t.endpoint||"غير محدد"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-key"></i>
                    <span>Auth: ${t.authType||"غير محدد"}</span>
                  </div>
                  <div class="info-item">
                    <i class="fas fa-chart-line"></i>
                    <span>الطلبات: ${t.requestsCount||0}</span>
                  </div>
                </div>
              </div>
              <div class="api-actions">
                <button class="btn btn-sm btn-primary" onclick="advancedIntegration.viewAPI(${t.id})">
                  <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-sm btn-success" onclick="advancedIntegration.editAPI(${t.id})">
                  <i class="fas fa-edit"></i> تعديل
                </button>
              </div>
            </div>
          `).join("")||'<p class="empty-state">لا توجد APIs</p>'}
        </div>
      </div>
    `}getStatusName(t){return{active:"نشط",inactive:"غير نشط",error:"خطأ",pending:"قيد الانتظار"}[t]||t}getTypeName(t){return{api:"API",webhook:"Webhook",database:"قاعدة بيانات",file:"ملف",email:"بريد إلكتروني"}[t]||t}switchView(t){this.currentView=t,this.renderAdvancedIntegration()}viewIntegration(t){alert(`عرض التكامل #${t} - سيتم التطوير قريباً`)}editIntegration(t){alert(`تعديل التكامل #${t} - سيتم التطوير قريباً`)}toggleIntegration(t){alert(`تبديل حالة التكامل #${t} - سيتم التطوير قريباً`)}viewConnection(t){alert(`عرض الاتصال #${t} - سيتم التطوير قريباً`)}testConnection(t){alert(`اختبار الاتصال #${t} - سيتم التطوير قريباً`)}viewWebhook(t){alert(`عرض Webhook #${t} - سيتم التطوير قريباً`)}editWebhook(t){alert(`تعديل Webhook #${t} - سيتم التطوير قريباً`)}viewAPI(t){alert(`عرض API #${t} - سيتم التطوير قريباً`)}editAPI(t){alert(`تعديل API #${t} - سيتم التطوير قريباً`)}showCreateModal(){alert("نموذج إنشاء تكامل - سيتم التطوير قريباً")}async refresh(){o&&o.clear(["integration"]),await this.loadIntegrations(),await this.loadConnections(),await this.loadWebhooks(),await this.loadAPIs(),typeof showToast=="function"&&showToast("تم التحديث","success")}}const g=new f;typeof window<"u"&&(window.advancedIntegration=g,window.universalModuleEnhancer&&window.universalModuleEnhancer.enhanceModule(g,"advancedIntegration"));typeof d<"u"&&d.exports&&(d.exports=f)});export default m();
//# sourceMappingURL=rehabilitation-center-advanced-integration-BaWKf11s.js.map
