/**
 * منشئ سير العمل المرئي - JavaScript
 * Visual Workflow Builder - JavaScript
 */

class WorkflowBuilder {
    constructor() {
        this.canvas = document.getElementById('workflowCanvas');
        this.nodes = [];
        this.connections = [];
        this.currentExecution = null;
        this.draggedNode = null;
        this.nodeCounter = 0;
        this.selectedNode = null;
        
        this.initializeDragAndDrop();
        this.initializeEventListeners();
        this.startExecutionMonitoring();
    }
    
    initializeDragAndDrop() {
        // تفعيل السحب والإفلات للأدوات
        const toolItems = document.querySelectorAll('.tool-item');
        toolItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.type);
            });
            item.draggable = true;
        });
        
        // تفعيل الإفلات على اللوحة
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('text/plain');
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.createNode(nodeType, x, y);
        });
    }
    
    createNode(type, x, y) {
        const nodeId = `node_${++this.nodeCounter}`;
        const node = {
            id: nodeId,
            type: type,
            x: x,
            y: y,
            properties: this.getDefaultProperties(type)
        };
        
        this.nodes.push(node);
        this.renderNode(node);
        this.clearCanvasMessage();
    }
    
    getDefaultProperties(type) {
        const defaults = {
            start: { name: 'بداية سير العمل' },
            send_message: { 
                name: 'إرسال رسالة',
                message_type: 'sms',
                recipient: '',
                message: ''
            },
            make_call: {
                name: 'مكالمة صوتية',
                phone: '',
                message: ''
            },
            condition: {
                name: 'شرط',
                condition: '',
                true_action: 'continue',
                false_action: 'skip'
            },
            wait: {
                name: 'انتظار',
                duration: 60
            },
            update_record: {
                name: 'تحديث بيانات',
                table: '',
                record_id: '',
                data: {}
            },
            api_call: {
                name: 'استدعاء API',
                url: '',
                method: 'GET',
                headers: {},
                data: {}
            },
            end: { name: 'نهاية سير العمل' }
        };
        
        return defaults[type] || { name: type };
    }
    
    renderNode(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `workflow-node ${node.type}`;
        nodeElement.id = node.id;
        nodeElement.style.left = `${node.x}px`;
        nodeElement.style.top = `${node.y}px`;
        
        const icon = this.getNodeIcon(node.type);
        
        nodeElement.innerHTML = `
            <div class="node-header">
                <span><i class="${icon}"></i> ${node.properties.name}</span>
                <div class="node-controls">
                    <button class="btn btn-sm btn-outline-primary" onclick="workflowBuilder.editNode('${node.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="workflowBuilder.deleteNode('${node.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="node-content">
                ${this.getNodeContent(node)}
            </div>
        `;
        
        // إضافة إمكانية السحب
        this.makeDraggable(nodeElement);
        
        // إضافة إمكانية الربط
        nodeElement.addEventListener('click', (e) => {
            if (e.ctrlKey) {
                this.handleNodeConnection(node.id);
            } else {
                this.selectNode(node.id);
            }
        });
        
        this.canvas.appendChild(nodeElement);
    }
    
    getNodeIcon(type) {
        const icons = {
            start: 'fas fa-play-circle text-success',
            send_message: 'fas fa-envelope text-primary',
            make_call: 'fas fa-phone text-info',
            condition: 'fas fa-code-branch text-warning',
            wait: 'fas fa-clock text-secondary',
            update_record: 'fas fa-edit text-primary',
            api_call: 'fas fa-link text-info',
            end: 'fas fa-stop-circle text-danger'
        };
        return icons[type] || 'fas fa-circle';
    }
    
    getNodeContent(node) {
        switch(node.type) {
            case 'send_message':
                return `<small>نوع: ${node.properties.message_type}<br>المستقبل: ${node.properties.recipient}</small>`;
            case 'make_call':
                return `<small>الهاتف: ${node.properties.phone}</small>`;
            case 'condition':
                return `<small>الشرط: ${node.properties.condition}</small>`;
            case 'wait':
                return `<small>المدة: ${node.properties.duration} ثانية</small>`;
            case 'api_call':
                return `<small>${node.properties.method} ${node.properties.url}</small>`;
            default:
                return '';
        }
    }
    
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-controls')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left);
            initialY = parseInt(element.style.top);
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            element.style.left = `${initialX + deltaX}px`;
            element.style.top = `${initialY + deltaY}px`;
            
            // تحديث موقع العقدة في البيانات
            const node = this.nodes.find(n => n.id === element.id);
            if (node) {
                node.x = initialX + deltaX;
                node.y = initialY + deltaY;
            }
            
            this.updateConnections();
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }
    
    editNode(nodeId) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        this.selectedNode = node;
        this.showNodePropertiesModal(node);
    }
    
    showNodePropertiesModal(node) {
        const modal = new bootstrap.Modal(document.getElementById('nodePropertiesModal'));
        const body = document.getElementById('nodePropertiesBody');
        
        body.innerHTML = this.generatePropertiesForm(node);
        modal.show();
    }
    
    generatePropertiesForm(node) {
        let form = `<div class="mb-3">
            <label class="form-label">اسم العقدة</label>
            <input type="text" class="form-control" id="nodeName" value="${node.properties.name}">
        </div>`;
        
        switch(node.type) {
            case 'send_message':
                form += `
                    <div class="mb-3">
                        <label class="form-label">نوع الرسالة</label>
                        <select class="form-select" id="messageType">
                            <option value="sms" ${node.properties.message_type === 'sms' ? 'selected' : ''}>SMS</option>
                            <option value="email" ${node.properties.message_type === 'email' ? 'selected' : ''}>بريد إلكتروني</option>
                            <option value="whatsapp" ${node.properties.message_type === 'whatsapp' ? 'selected' : ''}>واتساب</option>
                            <option value="push" ${node.properties.message_type === 'push' ? 'selected' : ''}>إشعار فوري</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">المستقبل</label>
                        <input type="text" class="form-control" id="recipient" value="${node.properties.recipient}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">نص الرسالة</label>
                        <textarea class="form-control" id="message" rows="3">${node.properties.message}</textarea>
                    </div>
                `;
                break;
            case 'make_call':
                form += `
                    <div class="mb-3">
                        <label class="form-label">رقم الهاتف</label>
                        <input type="text" class="form-control" id="phone" value="${node.properties.phone}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">نص المكالمة</label>
                        <textarea class="form-control" id="callMessage" rows="3">${node.properties.message}</textarea>
                    </div>
                `;
                break;
            case 'condition':
                form += `
                    <div class="mb-3">
                        <label class="form-label">الشرط</label>
                        <input type="text" class="form-control" id="condition" value="${node.properties.condition}">
                        <div class="form-text">مثال: variable == 'value' أو age > 18</div>
                    </div>
                `;
                break;
            case 'wait':
                form += `
                    <div class="mb-3">
                        <label class="form-label">مدة الانتظار (بالثواني)</label>
                        <input type="number" class="form-control" id="duration" value="${node.properties.duration}">
                    </div>
                `;
                break;
            case 'api_call':
                form += `
                    <div class="mb-3">
                        <label class="form-label">رابط API</label>
                        <input type="url" class="form-control" id="apiUrl" value="${node.properties.url}">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">طريقة الطلب</label>
                        <select class="form-select" id="apiMethod">
                            <option value="GET" ${node.properties.method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${node.properties.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="PUT" ${node.properties.method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="DELETE" ${node.properties.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                        </select>
                    </div>
                `;
                break;
        }
        
        return form;
    }
    
    saveNodeProperties() {
        if (!this.selectedNode) return;
        
        const node = this.selectedNode;
        node.properties.name = document.getElementById('nodeName').value;
        
        switch(node.type) {
            case 'send_message':
                node.properties.message_type = document.getElementById('messageType').value;
                node.properties.recipient = document.getElementById('recipient').value;
                node.properties.message = document.getElementById('message').value;
                break;
            case 'make_call':
                node.properties.phone = document.getElementById('phone').value;
                node.properties.message = document.getElementById('callMessage').value;
                break;
            case 'condition':
                node.properties.condition = document.getElementById('condition').value;
                break;
            case 'wait':
                node.properties.duration = parseInt(document.getElementById('duration').value);
                break;
            case 'api_call':
                node.properties.url = document.getElementById('apiUrl').value;
                node.properties.method = document.getElementById('apiMethod').value;
                break;
        }
        
        // إعادة رسم العقدة
        const nodeElement = document.getElementById(node.id);
        const contentDiv = nodeElement.querySelector('.node-content');
        contentDiv.innerHTML = this.getNodeContent(node);
        
        // تحديث اسم العقدة
        const nameSpan = nodeElement.querySelector('.node-header span');
        const icon = this.getNodeIcon(node.type);
        nameSpan.innerHTML = `<i class="${icon}"></i> ${node.properties.name}`;
        
        bootstrap.Modal.getInstance(document.getElementById('nodePropertiesModal')).hide();
    }
    
    deleteNode(nodeId) {
        if (confirm('هل أنت متأكد من حذف هذه العقدة؟')) {
            // حذف العقدة من البيانات
            this.nodes = this.nodes.filter(n => n.id !== nodeId);
            
            // حذف الاتصالات المرتبطة
            this.connections = this.connections.filter(c => 
                c.from !== nodeId && c.to !== nodeId
            );
            
            // حذف العنصر من DOM
            const nodeElement = document.getElementById(nodeId);
            if (nodeElement) {
                nodeElement.remove();
            }
            
            this.updateConnections();
        }
    }
    
    clearCanvasMessage() {
        const message = this.canvas.querySelector('.text-center');
        if (message) {
            message.remove();
        }
    }
    
    updateConnections() {
        // إزالة الخطوط الحالية
        document.querySelectorAll('.connection-line, .connection-arrow').forEach(el => el.remove());
        
        // رسم الخطوط الجديدة
        this.connections.forEach(connection => {
            this.drawConnection(connection);
        });
    }
    
    drawConnection(connection) {
        const fromNode = document.getElementById(connection.from);
        const toNode = document.getElementById(connection.to);
        
        if (!fromNode || !toNode) return;
        
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2 - canvasRect.left;
        const fromY = fromRect.bottom - canvasRect.top;
        const toX = toRect.left + toRect.width / 2 - canvasRect.left;
        const toY = toRect.top - canvasRect.top;
        
        const line = document.createElement('div');
        line.className = 'connection-line';
        
        const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
        const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
        
        line.style.width = `${length}px`;
        line.style.left = `${fromX}px`;
        line.style.top = `${fromY}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 0';
        
        this.canvas.appendChild(line);
        
        // رسم السهم
        const arrow = document.createElement('div');
        arrow.className = 'connection-arrow';
        arrow.style.left = `${toX - 6}px`;
        arrow.style.top = `${toY - 4}px`;
        arrow.style.transform = `rotate(${angle}deg)`;
        
        this.canvas.appendChild(arrow);
    }
    
    startExecutionMonitoring() {
        setInterval(() => {
            if (this.currentExecution) {
                this.updateExecutionStatus();
            }
        }, 2000);
    }
    
    updateExecutionStatus() {
        fetch(`/api/automation/executions/${this.currentExecution}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.displayExecutionSteps(data.execution);
                    this.updateWorkflowStatus(data.execution.status);
                }
            })
            .catch(error => console.error('خطأ في جلب حالة التنفيذ:', error));
    }
    
    displayExecutionSteps(execution) {
        const container = document.getElementById('executionSteps');
        container.innerHTML = '';
        
        if (execution.action_executions) {
            execution.action_executions.forEach(actionExec => {
                const stepDiv = document.createElement('div');
                stepDiv.className = `execution-step ${actionExec.status}`;
                stepDiv.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <span>${actionExec.action_name}</span>
                        <span class="status-badge status-${actionExec.status}">${actionExec.status}</span>
                    </div>
                    <small class="text-muted">${actionExec.started_at}</small>
                `;
                container.appendChild(stepDiv);
            });
        }
    }
    
    updateWorkflowStatus(status) {
        const statusBadge = document.getElementById('workflowStatus');
        const executionInfo = document.getElementById('executionInfo');
        
        statusBadge.className = `status-badge status-${status}`;
        statusBadge.textContent = this.getStatusText(status);
        
        // تحديث أزرار التحكم
        this.updateControlButtons(status);
    }
    
    getStatusText(status) {
        const statusTexts = {
            running: 'قيد التنفيذ',
            completed: 'مكتمل',
            failed: 'فاشل',
            paused: 'متوقف مؤقتاً',
            cancelled: 'ملغي'
        };
        return statusTexts[status] || 'غير معروف';
    }
    
    updateControlButtons(status) {
        const pauseBtn = document.getElementById('pauseBtn');
        const resumeBtn = document.getElementById('resumeBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        pauseBtn.disabled = status !== 'running';
        resumeBtn.disabled = status !== 'paused';
        cancelBtn.disabled = !['running', 'paused'].includes(status);
    }
}

// الوظائف العامة
let workflowBuilder;

document.addEventListener('DOMContentLoaded', () => {
    workflowBuilder = new WorkflowBuilder();
});

function newWorkflow() {
    if (confirm('هل تريد إنشاء سير عمل جديد؟ سيتم فقدان التغييرات غير المحفوظة.')) {
        workflowBuilder.nodes = [];
        workflowBuilder.connections = [];
        workflowBuilder.canvas.innerHTML = `
            <div class="text-center text-muted mt-5 pt-5">
                <i class="fas fa-mouse-pointer fa-3x mb-3"></i>
                <h5>اسحب العناصر من صندوق الأدوات لبناء سير العمل</h5>
                <p>يمكنك ترتيب العناصر وربطها لإنشاء سير عمل متكامل</p>
            </div>
        `;
    }
}

function saveWorkflow() {
    const workflowData = {
        name: prompt('اسم سير العمل:') || 'سير عمل جديد',
        nodes: workflowBuilder.nodes,
        connections: workflowBuilder.connections
    };
    
    fetch('/api/automation/workflows', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workflowData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم حفظ سير العمل بنجاح');
        } else {
            alert('خطأ في حفظ سير العمل: ' + data.error);
        }
    });
}

function executeWorkflow() {
    if (workflowBuilder.nodes.length === 0) {
        alert('يجب إنشاء سير عمل أولاً');
        return;
    }
    
    const workflowData = {
        nodes: workflowBuilder.nodes,
        connections: workflowBuilder.connections
    };
    
    fetch('/api/automation/workflows/execute-visual', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workflowData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            workflowBuilder.currentExecution = data.execution_id;
            workflowBuilder.updateWorkflowStatus('running');
            alert('تم بدء تنفيذ سير العمل');
        } else {
            alert('خطأ في تنفيذ سير العمل: ' + data.error);
        }
    });
}

function pauseWorkflow() {
    if (!workflowBuilder.currentExecution) return;
    
    fetch(`/api/automation/executions/${workflowBuilder.currentExecution}/pause`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            workflowBuilder.updateWorkflowStatus('paused');
        }
    });
}

function resumeWorkflow() {
    if (!workflowBuilder.currentExecution) return;
    
    fetch(`/api/automation/executions/${workflowBuilder.currentExecution}/resume`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            workflowBuilder.updateWorkflowStatus('running');
        }
    });
}

function cancelWorkflow() {
    if (!workflowBuilder.currentExecution) return;
    
    if (confirm('هل أنت متأكد من إلغاء تنفيذ سير العمل؟')) {
        fetch(`/api/automation/executions/${workflowBuilder.currentExecution}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                workflowBuilder.updateWorkflowStatus('cancelled');
                workflowBuilder.currentExecution = null;
            }
        });
    }
}

function saveNodeProperties() {
    workflowBuilder.saveNodeProperties();
}
