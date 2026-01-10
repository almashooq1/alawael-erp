import{a as u,A as h,c as v,r as p,s as b,b as g,d as f}from"./main-DFR0ngT_.js";class S{constructor(s){this.container=s,this.useAPI=!0,this.apiClient=u,this.API_ENDPOINTS=h.advancedCallCenter||{},this.connectionManager=v,this.realtimeSync=p,this.systemEnhancer=b,this.aiAssistant=g,this.advancedCache=f,this.unifiedNumber=null,this.branches=[],this.agents=[],this.calls=[],this.queues=[],this.routes=[],this.recordings=[],this.analytics=[],this.ivrMenus=[],this.ivrFlows=[],this.stcIntegration=null,this.currentView="dashboard",this.filters={status:"all",branch:"all",search:""},this.init()}async init(){this.render(),this.setupEventListeners(),await this.loadData(),this.setupRealtimeSync(),this.setupConnectionMonitoring(),this.setupCallMonitoring()}render(){this.container&&(this.container.innerHTML=`
      <div class="advanced-call-center-management">
        <div class="call-center-header">
          <h2>📞 نظام اتصالات الهاتف الموحد وكول سنتر متكامل وذكي</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="this.addAgent()">
              <i class="fas fa-user-plus"></i> إضافة وكيل
            </button>
            <button class="btn btn-secondary" onclick="this.createQueue()">
              <i class="fas fa-list"></i> طابور جديد
            </button>
            <button class="btn btn-info" onclick="this.configureRoutes()">
              <i class="fas fa-route"></i> توجيه المكالمات
            </button>
            <button class="btn btn-success" onclick="this.configureIVR()">
              <i class="fas fa-robot"></i> الرد الآلي
            </button>
            <button class="btn btn-warning" onclick="this.configureSTC()">
              <i class="fas fa-satellite-dish"></i> ربط STC
            </button>
          </div>
        </div>

        <div class="call-center-tabs">
          <button class="tab-btn ${this.currentView==="dashboard"?"active":""}" 
                  onclick="this.switchView('dashboard')">
            <i class="fas fa-tachometer-alt"></i> لوحة التحكم
          </button>
          <button class="tab-btn ${this.currentView==="unified-number"?"active":""}" 
                  onclick="this.switchView('unified-number')">
            <i class="fas fa-phone"></i> الرقم الموحد
          </button>
          <button class="tab-btn ${this.currentView==="branches"?"active":""}" 
                  onclick="this.switchView('branches')">
            <i class="fas fa-building"></i> الفروع
          </button>
          <button class="tab-btn ${this.currentView==="agents"?"active":""}" 
                  onclick="this.switchView('agents')">
            <i class="fas fa-headset"></i> الوكلاء
          </button>
          <button class="tab-btn ${this.currentView==="calls"?"active":""}" 
                  onclick="this.switchView('calls')">
            <i class="fas fa-phone-alt"></i> المكالمات
          </button>
          <button class="tab-btn ${this.currentView==="queues"?"active":""}" 
                  onclick="this.switchView('queues')">
            <i class="fas fa-list"></i> الطوابير
          </button>
          <button class="tab-btn ${this.currentView==="routes"?"active":""}" 
                  onclick="this.switchView('routes')">
            <i class="fas fa-route"></i> التوجيه
          </button>
          <button class="tab-btn ${this.currentView==="recordings"?"active":""}" 
                  onclick="this.switchView('recordings')">
            <i class="fas fa-microphone"></i> التسجيلات
          </button>
          <button class="tab-btn ${this.currentView==="analytics"?"active":""}" 
                  onclick="this.switchView('analytics')">
            <i class="fas fa-chart-bar"></i> التحليلات
          </button>
          <button class="tab-btn ${this.currentView==="ivr"?"active":""}" 
                  onclick="this.switchView('ivr')">
            <i class="fas fa-robot"></i> الرد الآلي
          </button>
          <button class="tab-btn ${this.currentView==="stc-integration"?"active":""}" 
                  onclick="this.switchView('stc-integration')">
            <i class="fas fa-satellite-dish"></i> ربط STC
          </button>
        </div>

        <div class="call-center-filters">
          <select class="filter-select" onchange="this.handleFilterChange('status', event)">
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="busy">مشغول</option>
            <option value="available">متاح</option>
          </select>
          <select class="filter-select" onchange="this.handleFilterChange('branch', event)">
            <option value="all">جميع الفروع</option>
            ${this.branches.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}
          </select>
          <input type="text" class="search-input" placeholder="بحث..." 
                 oninput="this.handleSearch(event)">
        </div>

        <div class="call-center-content" id="callCenterContent">
          ${this.renderCurrentView()}
        </div>
      </div>
    `)}renderCurrentView(){switch(this.currentView){case"dashboard":return this.renderDashboard();case"unified-number":return this.renderUnifiedNumber();case"branches":return this.renderBranches();case"agents":return this.renderAgents();case"calls":return this.renderCalls();case"queues":return this.renderQueues();case"routes":return this.renderRoutes();case"recordings":return this.renderRecordings();case"analytics":return this.renderAnalytics();case"ivr":return this.renderIVR();case"stc-integration":return this.renderSTCIntegration();default:return this.renderDashboard()}}renderDashboard(){const s=this.calls.filter(i=>i.status==="active").length,a=this.calls.filter(i=>i.status==="waiting").length,t=this.agents.filter(i=>i.status==="available").length,e=this.agents.filter(i=>i.status==="busy").length;return`
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="card-header">
            <h3>المكالمات النشطة</h3>
            <i class="fas fa-phone-alt"></i>
          </div>
          <div class="card-value">${s}</div>
        </div>
        <div class="dashboard-card">
          <div class="card-header">
            <h3>المكالمات في الانتظار</h3>
            <i class="fas fa-clock"></i>
          </div>
          <div class="card-value">${a}</div>
        </div>
        <div class="dashboard-card">
          <div class="card-header">
            <h3>الوكلاء المتاحون</h3>
            <i class="fas fa-user-check"></i>
          </div>
          <div class="card-value">${t}</div>
        </div>
        <div class="dashboard-card">
          <div class="card-header">
            <h3>الوكلاء المشغولون</h3>
            <i class="fas fa-user-clock"></i>
          </div>
          <div class="card-value">${e}</div>
        </div>
        <div class="dashboard-card large">
          <div class="card-header">
            <h3>المكالمات الحالية</h3>
          </div>
          <div class="active-calls-list">
            ${this.calls.filter(i=>i.status==="active").slice(0,5).map(i=>`
              <div class="active-call-item">
                <div class="call-info">
                  <span class="call-number">${i.fromNumber||"غير معروف"}</span>
                  <span class="call-duration">${this.formatDuration(i.duration)}</span>
                </div>
                <div class="call-agent">${i.agentName||"غير محدد"}</div>
              </div>
            `).join("")||'<p class="no-calls">لا توجد مكالمات نشطة</p>'}
          </div>
        </div>
        <div class="dashboard-card large">
          <div class="card-header">
            <h3>إحصائيات سريعة</h3>
          </div>
          <div class="quick-stats">
            <div class="stat-item">
              <span class="stat-label">إجمالي المكالمات اليوم:</span>
              <span class="stat-value">${this.calls.filter(i=>this.isToday(i.date)).length}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">متوسط وقت الانتظار:</span>
              <span class="stat-value">${this.calculateAverageWaitTime()} دقيقة</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">معدل الإجابة:</span>
              <span class="stat-value">${this.calculateAnswerRate()}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">معدل الرضا:</span>
              <span class="stat-value">${this.calculateSatisfactionRate()}%</span>
            </div>
          </div>
        </div>
      </div>
    `}renderUnifiedNumber(){return this.unifiedNumber?`
      <div class="unified-number-dashboard">
        <div class="unified-number-card">
          <div class="unified-number-header">
            <div class="number-icon">
              <i class="fas fa-phone"></i>
            </div>
            <div class="number-info">
              <h2>${this.unifiedNumber.number||"غير محدد"}</h2>
              <p class="number-status ${this.unifiedNumber.status}">${this.getStatusText(this.unifiedNumber.status)}</p>
            </div>
            <span class="status-badge status-${this.unifiedNumber.status}">${this.getStatusText(this.unifiedNumber.status)}</span>
          </div>
          <div class="unified-number-body">
            <div class="number-details">
              <div class="detail-item">
                <span class="detail-label">النوع:</span>
                <span class="detail-value">${this.unifiedNumber.type||"غير محدد"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">المزود:</span>
                <span class="detail-value">${this.unifiedNumber.provider||"غير محدد"}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">عدد الفروع المتصلة:</span>
                <span class="detail-value">${this.branches.filter(s=>s.connected).length}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">إجمالي المكالمات:</span>
                <span class="detail-value">${this.unifiedNumber.totalCalls||0}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="branches-connection">
          <h3>الفروع المتصلة</h3>
          <div class="branches-list">
            ${this.branches.map(s=>`
              <div class="branch-connection-item ${s.connected?"connected":"disconnected"}">
                <div class="branch-info">
                  <h4>${s.name}</h4>
                  <p>${s.phone||"غير محدد"}</p>
                </div>
                <div class="connection-status">
                  <span class="status-indicator ${s.connected?"active":"inactive"}"></span>
                  <span>${s.connected?"متصل":"غير متصل"}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `:`
        <div class="empty-state">
          <i class="fas fa-phone"></i>
          <p>لا يوجد رقم موحد محدد</p>
          <button class="btn btn-primary" onclick="this.setupUnifiedNumber()">
            إعداد الرقم الموحد
          </button>
        </div>
      `}renderBranches(){return this.branches.length===0?`
        <div class="empty-state">
          <i class="fas fa-building"></i>
          <p>لا توجد فروع</p>
        </div>
      `:`
      <div class="branches-grid">
        ${this.branches.map(s=>`
          <div class="branch-card status-${s.status}">
            <div class="branch-header">
              <h3>${s.name||"فرع"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="branch-body">
              <div class="branch-details">
                <div class="detail-item">
                  <span class="detail-label">الهاتف:</span>
                  <span class="detail-value">${s.phone||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">حالة الاتصال:</span>
                  <span class="detail-value ${s.connected?"connected":"disconnected"}">
                    ${s.connected?"متصل":"غير متصل"}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الوكلاء:</span>
                  <span class="detail-value">${s.agentsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكالمات اليوم:</span>
                  <span class="detail-value">${s.todayCalls||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderAgents(){return this.agents.length===0?`
        <div class="empty-state">
          <i class="fas fa-headset"></i>
          <p>لا يوجد وكلاء</p>
          <button class="btn btn-primary" onclick="this.addAgent()">
            إضافة وكيل جديد
          </button>
        </div>
      `:`
      <div class="agents-grid">
        ${this.agents.map(s=>`
          <div class="agent-card status-${s.status}">
            <div class="agent-header">
              <div class="agent-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="agent-info">
                <h3>${s.name||"وكيل"}</h3>
                <p class="agent-extension">${s.extension||"غير محدد"}</p>
              </div>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="agent-body">
              <div class="agent-details">
                <div class="detail-item">
                  <span class="detail-label">الفرع:</span>
                  <span class="detail-value">${s.branchName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكالمات النشطة:</span>
                  <span class="detail-value">${s.activeCalls||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكالمات اليوم:</span>
                  <span class="detail-value">${s.todayCalls||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">متوسط وقت المكالمة:</span>
                  <span class="detail-value">${this.formatDuration(s.avgCallDuration||0)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderCalls(){const s=this.getFilteredCalls();return s.length===0?`
        <div class="empty-state">
          <i class="fas fa-phone-alt"></i>
          <p>لا توجد مكالمات</p>
        </div>
      `:`
      <div class="calls-list">
        ${s.map(a=>`
          <div class="call-card status-${a.status}">
            <div class="call-header">
              <div class="call-number-info">
                <span class="call-from">${a.fromNumber||"غير معروف"}</span>
                <span class="call-to">→ ${a.toNumber||"غير معروف"}</span>
              </div>
              <span class="status-badge status-${a.status}">${this.getStatusText(a.status)}</span>
            </div>
            <div class="call-body">
              <div class="call-details">
                <div class="detail-item">
                  <span class="detail-label">الوكيل:</span>
                  <span class="detail-value">${a.agentName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الفرع:</span>
                  <span class="detail-value">${a.branchName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(a.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المدة:</span>
                  <span class="detail-value">${this.formatDuration(a.duration)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderQueues(){return this.queues.length===0?`
        <div class="empty-state">
          <i class="fas fa-list"></i>
          <p>لا توجد طوابير</p>
          <button class="btn btn-primary" onclick="this.createQueue()">
            إنشاء طابور جديد
          </button>
        </div>
      `:`
      <div class="queues-list">
        ${this.queues.map(s=>`
          <div class="queue-card status-${s.status}">
            <div class="queue-header">
              <h3>${s.name||"طابور"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="queue-body">
              <div class="queue-details">
                <div class="detail-item">
                  <span class="detail-label">المكالمات في الانتظار:</span>
                  <span class="detail-value">${s.waitingCalls||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">متوسط وقت الانتظار:</span>
                  <span class="detail-value">${this.formatDuration(s.avgWaitTime||0)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">عدد الوكلاء:</span>
                  <span class="detail-value">${s.agentsCount||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">أطول وقت انتظار:</span>
                  <span class="detail-value">${this.formatDuration(s.maxWaitTime||0)}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRoutes(){return this.routes.length===0?`
        <div class="empty-state">
          <i class="fas fa-route"></i>
          <p>لا توجد قواعد توجيه</p>
          <button class="btn btn-primary" onclick="this.configureRoutes()">
            إعداد قواعد التوجيه
          </button>
        </div>
      `:`
      <div class="routes-list">
        ${this.routes.map(s=>`
          <div class="route-card status-${s.status}">
            <div class="route-header">
              <h3>${s.name||"قاعدة توجيه"}</h3>
              <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
            </div>
            <div class="route-body">
              <div class="route-details">
                <div class="detail-item">
                  <span class="detail-label">الشرط:</span>
                  <span class="detail-value">${s.condition||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">التوجيه إلى:</span>
                  <span class="detail-value">${s.target||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الأولوية:</span>
                  <span class="detail-value">${s.priority||0}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">المكالمات المطبقة:</span>
                  <span class="detail-value">${s.appliedCalls||0}</span>
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `}renderRecordings(){return this.recordings.length===0?`
        <div class="empty-state">
          <i class="fas fa-microphone"></i>
          <p>لا توجد تسجيلات</p>
        </div>
      `:`
      <div class="recordings-list">
        ${this.recordings.map(s=>`
          <div class="recording-card">
            <div class="recording-header">
              <h3>${s.callNumber||"غير معروف"}</h3>
              <span class="recording-duration">${this.formatDuration(s.duration)}</span>
            </div>
            <div class="recording-body">
              <div class="recording-details">
                <div class="detail-item">
                  <span class="detail-label">التاريخ:</span>
                  <span class="detail-value">${this.formatDate(s.date)}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الوكيل:</span>
                  <span class="detail-value">${s.agentName||"غير محدد"}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">الحجم:</span>
                  <span class="detail-value">${this.formatFileSize(s.size)}</span>
                </div>
              </div>
              <div class="recording-actions">
                <button class="btn btn-sm btn-primary" onclick="this.playRecording(${s.id})">
                  <i class="fas fa-play"></i> تشغيل
                </button>
                <button class="btn btn-sm btn-secondary" onclick="this.downloadRecording(${s.id})">
                  <i class="fas fa-download"></i> تحميل
                </button>
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
    `}renderIVR(){return`
      <div class="ivr-dashboard">
        <div class="ivr-header-section">
          <div class="ivr-status-card">
            <h3>حالة نظام الرد الآلي</h3>
            <div class="ivr-status ${this.ivrMenus.length>0?"active":"inactive"}">
              <span class="status-indicator ${this.ivrMenus.length>0?"active":"inactive"}"></span>
              <span>${this.ivrMenus.length>0?"نشط":"غير نشط"}</span>
            </div>
            <button class="btn btn-primary" onclick="this.createIVRMenu()">
              <i class="fas fa-plus"></i> إنشاء قائمة رد آلي جديدة
            </button>
          </div>
        </div>

        <div class="ivr-menus-section">
          <h3>قوائم الرد الآلي</h3>
          ${this.ivrMenus.length===0?`
            <div class="empty-state">
              <i class="fas fa-robot"></i>
              <p>لا توجد قوائم رد آلي</p>
              <button class="btn btn-primary" onclick="this.createIVRMenu()">
                إنشاء قائمة جديدة
              </button>
            </div>
          `:`
            <div class="ivr-menus-grid">
              ${this.ivrMenus.map(s=>{var a,t;return`
                <div class="ivr-menu-card status-${s.status}">
                  <div class="ivr-menu-header">
                    <h4>${s.name||"قائمة رد آلي"}</h4>
                    <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                  </div>
                  <div class="ivr-menu-body">
                    <div class="ivr-menu-details">
                      <div class="detail-item">
                        <span class="detail-label">الرسالة الترحيبية:</span>
                        <span class="detail-value">${s.welcomeMessage?"محددة":"غير محددة"}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">عدد الخيارات:</span>
                        <span class="detail-value">${((a=s.options)==null?void 0:a.length)||0}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">المكالمات المعالجة:</span>
                        <span class="detail-value">${s.processedCalls||0}</span>
                      </div>
                    </div>
                    <div class="ivr-menu-options">
                      <h5>الخيارات:</h5>
                      ${((t=s.options)==null?void 0:t.map((e,i)=>`
                        <div class="ivr-option-item">
                          <span class="option-key">${e.key}</span>
                          <span class="option-action">${this.getIVRActionText(e.action)}</span>
                        </div>
                      `).join(""))||"<p>لا توجد خيارات</p>"}
                    </div>
                  </div>
                  <div class="ivr-menu-actions">
                    <button class="btn btn-sm btn-primary" onclick="this.editIVRMenu(${s.id})">
                      <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="this.testIVRMenu(${s.id})">
                      <i class="fas fa-play"></i> اختبار
                    </button>
                  </div>
                </div>
              `}).join("")}
            </div>
          `}
        </div>

        <div class="ivr-flows-section">
          <h3>تدفقات الرد الآلي</h3>
          ${this.ivrFlows.length===0?`
            <div class="empty-state">
              <i class="fas fa-project-diagram"></i>
              <p>لا توجد تدفقات</p>
            </div>
          `:`
            <div class="ivr-flows-list">
              ${this.ivrFlows.map(s=>{var a;return`
                <div class="ivr-flow-card">
                  <div class="ivr-flow-header">
                    <h4>${s.name||"تدفق"}</h4>
                    <span class="status-badge status-${s.status}">${this.getStatusText(s.status)}</span>
                  </div>
                  <div class="ivr-flow-body">
                    <div class="flow-steps">
                      ${((a=s.steps)==null?void 0:a.map((t,e)=>`
                        <div class="flow-step">
                          <span class="step-number">${e+1}</span>
                          <span class="step-description">${t.description||"خطوة"}</span>
                        </div>
                      `).join(""))||""}
                    </div>
                  </div>
                </div>
              `}).join("")}
            </div>
          `}
        </div>
      </div>
    `}renderSTCIntegration(){return this.stcIntegration?`
      <div class="stc-integration-dashboard">
        <div class="stc-status-card">
          <div class="stc-header">
            <div class="stc-icon">
              <i class="fas fa-satellite-dish"></i>
            </div>
            <div class="stc-info">
              <h2>الاتصالات السعودية (STC)</h2>
              <p class="stc-status ${this.stcIntegration.status}">${this.getStatusText(this.stcIntegration.status)}</p>
            </div>
            <span class="status-badge status-${this.stcIntegration.status}">${this.getStatusText(this.stcIntegration.status)}</span>
          </div>
          <div class="stc-details">
            <div class="detail-item">
              <span class="detail-label">الرقم الموحد:</span>
              <span class="detail-value">${this.stcIntegration.unifiedNumber||"غير محدد"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">نوع الخدمة:</span>
              <span class="detail-value">${this.stcIntegration.serviceType||"غير محدد"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">حالة الاتصال:</span>
              <span class="detail-value ${this.stcIntegration.connected?"connected":"disconnected"}">
                ${this.stcIntegration.connected?"متصل":"غير متصل"}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">آخر تحديث:</span>
              <span class="detail-value">${this.formatDate(this.stcIntegration.lastSync)}</span>
            </div>
          </div>
        </div>

        <div class="stc-branches-section">
          <h3>الفروع المتصلة</h3>
          <div class="stc-branches-list">
            ${this.branches.map(s=>`
              <div class="stc-branch-item ${s.stcConnected?"connected":"disconnected"}">
                <div class="branch-info">
                  <h4>${s.name}</h4>
                  <p>${s.phone||"غير محدد"}</p>
                </div>
                <div class="stc-connection-status">
                  <span class="status-indicator ${s.stcConnected?"active":"inactive"}"></span>
                  <span>${s.stcConnected?"متصل بـ STC":"غير متصل"}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="stc-features-section">
          <h3>الميزات المتاحة</h3>
          <div class="stc-features-grid">
            <div class="stc-feature-card">
              <i class="fas fa-phone-volume"></i>
              <h4>الرقم الموحد</h4>
              <p>ربط جميع الفروع برقم موحد</p>
            </div>
            <div class="stc-feature-card">
              <i class="fas fa-route"></i>
              <h4>التوجيه الذكي</h4>
              <p>توجيه المكالمات تلقائياً</p>
            </div>
            <div class="stc-feature-card">
              <i class="fas fa-robot"></i>
              <h4>الرد الآلي</h4>
              <p>نظام رد آلي ذكي</p>
            </div>
            <div class="stc-feature-card">
              <i class="fas fa-chart-line"></i>
              <h4>التقارير</h4>
              <p>تقارير شاملة ومفصلة</p>
            </div>
          </div>
        </div>
      </div>
    `:`
        <div class="stc-integration-setup">
          <div class="setup-card">
            <h3>ربط مع الاتصالات السعودية (STC)</h3>
            <p>قم بإعداد ربط نظام الكول سنتر مع خدمات الاتصالات السعودية</p>
            <button class="btn btn-primary" onclick="this.setupSTCIntegration()">
              <i class="fas fa-plug"></i> إعداد الربط
            </button>
          </div>
        </div>
      `}getIVRActionText(s){return{transfer:"تحويل",queue:"طابور",voicemail:"بريد صوتي",hangup:"إنهاء",menu:"قائمة",agent:"وكيل"}[s]||s}getFilteredCalls(){let s=[...this.calls];if(this.filters.status!=="all"&&(s=s.filter(a=>a.status===this.filters.status)),this.filters.branch!=="all"&&(s=s.filter(a=>a.branchId===parseInt(this.filters.branch))),this.filters.search){const a=this.filters.search.toLowerCase();s=s.filter(t=>t.fromNumber&&t.fromNumber.includes(a)||t.toNumber&&t.toNumber.includes(a)||t.agentName&&t.agentName.toLowerCase().includes(a))}return s}async loadData(){if(!this.useAPI){this.loadFromLocalStorage();return}try{if(!this.connectionManager.isFullyConnected()){this.loadFromLocalStorage();return}const[s,a,t,e,i,n,l,c,d,r,o]=await Promise.all([this.apiClient.get(this.API_ENDPOINTS.unifiedNumber||"/api/advanced-call-center/unified-number"),this.apiClient.get(this.API_ENDPOINTS.branches||"/api/advanced-call-center/branches"),this.apiClient.get(this.API_ENDPOINTS.agents||"/api/advanced-call-center/agents"),this.apiClient.get(this.API_ENDPOINTS.calls||"/api/advanced-call-center/calls"),this.apiClient.get(this.API_ENDPOINTS.queues||"/api/advanced-call-center/queues"),this.apiClient.get(this.API_ENDPOINTS.routes||"/api/advanced-call-center/routes"),this.apiClient.get(this.API_ENDPOINTS.recordings||"/api/advanced-call-center/recordings"),this.apiClient.get(this.API_ENDPOINTS.analytics||"/api/advanced-call-center/analytics"),this.apiClient.get(this.API_ENDPOINTS.ivrMenus||"/api/advanced-call-center/ivr-menus"),this.apiClient.get(this.API_ENDPOINTS.ivrFlows||"/api/advanced-call-center/ivr-flows"),this.apiClient.get(this.API_ENDPOINTS.stcIntegration||"/api/advanced-call-center/stc-integration")]);this.unifiedNumber=s.data||null,this.branches=a.data||[],this.agents=t.data||[],this.calls=e.data||[],this.queues=i.data||[],this.routes=n.data||[],this.recordings=l.data||[],this.analytics=c.data||[],this.ivrMenus=d.data||[],this.ivrFlows=r.data||[],this.stcIntegration=o.data||null,this.saveToLocalStorage(),this.updateContent()}catch(s){console.error("Error loading call center data:",s),this.loadFromLocalStorage()}}setupRealtimeSync(){this.realtimeSync&&this.realtimeSync.subscribe("advanced-call-center","*",s=>{(s.action==="create"||s.action==="update"||s.action==="delete")&&this.loadData()})}setupConnectionMonitoring(){this.connectionManager&&this.connectionManager.on("online",()=>{this.loadData()})}setupCallMonitoring(){setInterval(()=>{(this.currentView==="dashboard"||this.currentView==="calls")&&this.loadData()},5e3)}switchView(s){this.currentView=s,this.updateContent()}handleFilterChange(s,a){this.filters[s]=a.target.value,this.updateContent()}handleSearch(s){this.filters.search=s.target.value,this.updateContent()}updateContent(){const s=document.getElementById("callCenterContent");s&&(s.innerHTML=this.renderCurrentView())}getStatusText(s){return{active:"نشط",inactive:"غير نشط",busy:"مشغول",available:"متاح",waiting:"في الانتظار",completed:"مكتمل",missed:"فائت",connected:"متصل",disconnected:"غير متصل"}[s]||s}formatDate(s){return s?new Date(s).toLocaleDateString("ar-SA"):"غير محدد"}formatDuration(s){if(!s)return"00:00";const a=Math.floor(s/60),t=s%60;return`${a.toString().padStart(2,"0")}:${t.toString().padStart(2,"0")}`}formatFileSize(s){if(!s)return"0 B";const a=["B","KB","MB","GB"],t=Math.floor(Math.log(s)/Math.log(1024));return`${(s/Math.pow(1024,t)).toFixed(2)} ${a[t]}`}isToday(s){if(!s)return!1;const a=new Date,t=new Date(s);return a.toDateString()===t.toDateString()}calculateAverageWaitTime(){const s=this.calls.filter(t=>t.waitTime>0);if(s.length===0)return 0;const a=s.reduce((t,e)=>t+(e.waitTime||0),0);return Math.round(a/s.length/60)}calculateAnswerRate(){const s=this.calls.length;if(s===0)return 0;const a=this.calls.filter(t=>t.status==="completed").length;return Math.round(a/s*100)}calculateSatisfactionRate(){const s=this.calls.filter(t=>t.rating>0);if(s.length===0)return 0;const a=s.reduce((t,e)=>t+(e.rating||0),0);return Math.round(a/s.length/5*100)}saveToLocalStorage(){try{localStorage.setItem("advancedUnifiedNumber",JSON.stringify(this.unifiedNumber)),localStorage.setItem("advancedBranches",JSON.stringify(this.branches)),localStorage.setItem("advancedAgents",JSON.stringify(this.agents)),localStorage.setItem("advancedCalls",JSON.stringify(this.calls)),localStorage.setItem("advancedQueues",JSON.stringify(this.queues)),localStorage.setItem("advancedRoutes",JSON.stringify(this.routes)),localStorage.setItem("advancedRecordings",JSON.stringify(this.recordings)),localStorage.setItem("advancedAnalytics",JSON.stringify(this.analytics)),localStorage.setItem("advancedIVRMenus",JSON.stringify(this.ivrMenus)),localStorage.setItem("advancedIVRFlows",JSON.stringify(this.ivrFlows)),localStorage.setItem("advancedSTCIntegration",JSON.stringify(this.stcIntegration))}catch(s){console.error("Error saving to localStorage:",s)}}loadFromLocalStorage(){try{this.unifiedNumber=JSON.parse(localStorage.getItem("advancedUnifiedNumber")||"null"),this.branches=JSON.parse(localStorage.getItem("advancedBranches")||"[]"),this.agents=JSON.parse(localStorage.getItem("advancedAgents")||"[]"),this.calls=JSON.parse(localStorage.getItem("advancedCalls")||"[]"),this.queues=JSON.parse(localStorage.getItem("advancedQueues")||"[]"),this.routes=JSON.parse(localStorage.getItem("advancedRoutes")||"[]"),this.recordings=JSON.parse(localStorage.getItem("advancedRecordings")||"[]"),this.analytics=JSON.parse(localStorage.getItem("advancedAnalytics")||"[]"),this.ivrMenus=JSON.parse(localStorage.getItem("advancedIVRMenus")||"[]"),this.ivrFlows=JSON.parse(localStorage.getItem("advancedIVRFlows")||"[]"),this.stcIntegration=JSON.parse(localStorage.getItem("advancedSTCIntegration")||"null")}catch(s){console.error("Error loading from localStorage:",s)}}setupEventListeners(){this.addAgent=this.addAgent.bind(this),this.createQueue=this.createQueue.bind(this),this.configureRoutes=this.configureRoutes.bind(this),this.switchView=this.switchView.bind(this),this.handleFilterChange=this.handleFilterChange.bind(this),this.handleSearch=this.handleSearch.bind(this),this.setupUnifiedNumber=this.setupUnifiedNumber.bind(this),this.playRecording=this.playRecording.bind(this),this.downloadRecording=this.downloadRecording.bind(this),this.configureIVR=this.configureIVR.bind(this),this.configureSTC=this.configureSTC.bind(this),this.createIVRMenu=this.createIVRMenu.bind(this),this.editIVRMenu=this.editIVRMenu.bind(this),this.testIVRMenu=this.testIVRMenu.bind(this),this.setupSTCIntegration=this.setupSTCIntegration.bind(this)}async addAgent(){console.log("Add agent")}async createQueue(){console.log("Create queue")}async configureRoutes(){console.log("Configure routes")}async setupUnifiedNumber(){console.log("Setup unified number")}async playRecording(s){console.log("Play recording",s)}async downloadRecording(s){console.log("Download recording",s)}async configureIVR(){this.switchView("ivr")}async configureSTC(){this.switchView("stc-integration")}async createIVRMenu(){console.log("Create IVR menu")}async editIVRMenu(s){console.log("Edit IVR menu",s)}async testIVRMenu(s){console.log("Test IVR menu",s)}async setupSTCIntegration(){console.log("Setup STC integration")}}export{S as default};
//# sourceMappingURL=rehabilitation-center-advanced-call-center-D9man_R0.js.map
