class ChatManager {
    constructor() {
        this.currentRoom = null;
        this.currentUser = null;
        this.socket = null;
        this.rooms = [];
        this.messages = {};
        this.typingUsers = new Set();
        this.isTyping = false;
        this.typingTimeout = null;
        
        this.init();
    }

    async init() {
        try {
            await this.getCurrentUser();
            this.initializeSocket();
            this.setupEventListeners();
            await this.loadRooms();
            this.setupAutoRefresh();
        } catch (error) {
            console.error('خطأ في تهيئة نظام الدردشة:', error);
            this.showAlert('حدث خطأ في تحميل نظام الدردشة', 'error');
        }
    }

    async getCurrentUser() {
        try {
            const response = await fetch('/api/current-user', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
            } else {
                throw new Error('فشل في الحصول على بيانات المستخدم');
            }
        } catch (error) {
            console.error('خطأ في الحصول على بيانات المستخدم:', error);
            throw error;
        }
    }

    initializeSocket() {
        // Initialize Socket.IO for real-time communication
        this.socket = io({
            auth: {
                token: localStorage.getItem('token')
            }
        });

        this.socket.on('connect', () => {
            console.log('متصل بالخادم');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('انقطع الاتصال بالخادم');
            this.updateConnectionStatus(false);
        });

        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });

        this.socket.on('user_stopped_typing', (data) => {
            this.handleUserStoppedTyping(data);
        });

        this.socket.on('room_updated', (data) => {
            this.handleRoomUpdated(data);
        });

        this.socket.on('user_joined', (data) => {
            this.handleUserJoined(data);
        });

        this.socket.on('user_left', (data) => {
            this.handleUserLeft(data);
        });
    }

    setupEventListeners() {
        // Message form submission
        document.getElementById('messageForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Auto-resize textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
            this.handleTyping();
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelection(e);
        });

        // Room search
        document.getElementById('roomSearch').addEventListener('input', (e) => {
            this.filterRooms(e.target.value);
        });

        // Create room form
        document.getElementById('createRoomForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoom();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearCurrentRoom();
            }
        });
    }

    async loadRooms() {
        try {
            this.showLoadingInRoomsList();
            
            const response = await fetch('/api/chat/rooms', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.rooms = await response.json();
                this.renderRooms();
            } else {
                throw new Error('فشل في تحميل الغرف');
            }
        } catch (error) {
            console.error('خطأ في تحميل الغرف:', error);
            this.showErrorInRoomsList('فشل في تحميل الغرف');
        }
    }

    renderRooms() {
        const roomsList = document.getElementById('roomsList');
        
        if (this.rooms.length === 0) {
            roomsList.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                    <h6>لا توجد غرف دردشة</h6>
                    <p class="text-muted">ابدأ بإنشاء غرفة جديدة</p>
                    <button class="btn btn-primary btn-sm" onclick="showCreateRoomModal()">
                        <i class="fas fa-plus"></i> إنشاء غرفة
                    </button>
                </div>
            `;
            return;
        }

        roomsList.innerHTML = this.rooms.map(room => this.renderRoomItem(room)).join('');
    }

    renderRoomItem(room) {
        const isActive = this.currentRoom && this.currentRoom.id === room.id;
        const unreadCount = room.unread_count || 0;
        const lastMessage = room.last_message || {};
        const onlineCount = room.online_participants || 0;
        
        return `
            <div class="room-item ${isActive ? 'active' : ''}" onclick="chatManager.selectRoom(${room.id})">
                <div class="room-name">
                    <i class="fas fa-${this.getRoomIcon(room.type)}"></i>
                    ${room.name}
                    ${room.is_encrypted ? '<i class="fas fa-lock text-success ms-1"></i>' : ''}
                </div>
                <div class="room-last-message">
                    ${lastMessage.content ? this.truncateText(lastMessage.content, 50) : 'لا توجد رسائل'}
                </div>
                <div class="room-meta">
                    <span class="room-time">
                        ${lastMessage.created_at ? this.formatTime(lastMessage.created_at) : ''}
                    </span>
                    <div class="d-flex align-items-center gap-1">
                        ${onlineCount > 0 ? `<span class="online-indicator"></span><small>${onlineCount}</small>` : ''}
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getRoomIcon(type) {
        const icons = {
            'private': 'user',
            'group': 'users',
            'support': 'headset',
            'announcement': 'bullhorn'
        };
        return icons[type] || 'comments';
    }

    async selectRoom(roomId) {
        try {
            if (this.currentRoom && this.currentRoom.id === roomId) {
                return;
            }

            // Leave current room
            if (this.currentRoom) {
                this.socket.emit('leave_room', { room_id: this.currentRoom.id });
            }

            // Load room details
            const response = await fetch(`/api/chat/rooms/${roomId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.currentRoom = await response.json();
                
                // Join new room
                this.socket.emit('join_room', { room_id: roomId });
                
                // Update UI
                this.updateRoomHeader();
                this.showChatInput();
                await this.loadMessages();
                this.renderRooms(); // Refresh to update active state
                
                // Mark messages as read
                await this.markMessagesAsRead(roomId);
            } else {
                throw new Error('فشل في تحميل بيانات الغرفة');
            }
        } catch (error) {
            console.error('خطأ في اختيار الغرفة:', error);
            this.showAlert('فشل في الدخول للغرفة', 'error');
        }
    }

    updateRoomHeader() {
        const currentRoomInfo = document.getElementById('currentRoomInfo');
        const roomActions = document.getElementById('roomActions');
        
        if (this.currentRoom) {
            currentRoomInfo.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-${this.getRoomIcon(this.currentRoom.type)} fa-2x text-primary"></i>
                    </div>
                    <div>
                        <h6 class="mb-1">
                            ${this.currentRoom.name}
                            ${this.currentRoom.is_encrypted ? '<i class="fas fa-lock text-success ms-1"></i>' : ''}
                        </h6>
                        <small class="text-muted">
                            ${this.currentRoom.participants_count} مشارك
                            ${this.currentRoom.online_participants > 0 ? `• ${this.currentRoom.online_participants} متصل` : ''}
                        </small>
                    </div>
                </div>
            `;
            roomActions.style.display = 'flex';
        } else {
            currentRoomInfo.innerHTML = `
                <div class="no-room-selected">
                    <i class="fas fa-comments"></i>
                    <h5>اختر غرفة للبدء في المحادثة</h5>
                    <p>يمكنك إنشاء غرفة جديدة أو الانضمام لغرفة موجودة</p>
                </div>
            `;
            roomActions.style.display = 'none';
        }
    }

    async loadMessages() {
        try {
            if (!this.currentRoom) return;

            const response = await fetch(`/api/chat/rooms/${this.currentRoom.id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.messages[this.currentRoom.id] = messages;
                this.renderMessages();
            } else {
                throw new Error('فشل في تحميل الرسائل');
            }
        } catch (error) {
            console.error('خطأ في تحميل الرسائل:', error);
            this.showAlert('فشل في تحميل الرسائل', 'error');
        }
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        
        if (!this.currentRoom || !this.messages[this.currentRoom.id]) {
            messagesContainer.innerHTML = `
                <div class="no-room-selected">
                    <i class="fas fa-comments"></i>
                    <h5>اختر غرفة للبدء في المحادثة</h5>
                </div>
            `;
            return;
        }

        const messages = this.messages[this.currentRoom.id];
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="system-message">
                    <i class="fas fa-info-circle"></i>
                    لا توجد رسائل في هذه الغرفة بعد. كن أول من يبدأ المحادثة!
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = messages.map(message => this.renderMessage(message)).join('');
        this.scrollToBottom();
    }

    renderMessage(message) {
        const isOwn = message.sender_id === this.currentUser.id;
        const senderInitial = message.sender_name ? message.sender_name.charAt(0).toUpperCase() : 'U';
        
        let messageContent = `
            <div class="message ${isOwn ? 'own' : ''}">
                <div class="message-avatar">${senderInitial}</div>
                <div class="message-content">
                    ${!isOwn ? `<div class="message-sender">${message.sender_name}</div>` : ''}
                    <div class="message-text">${this.formatMessageText(message.content)}</div>
                    ${message.file_path ? this.renderMessageFile(message) : ''}
                    <div class="message-time">${this.formatTime(message.created_at)}</div>
                </div>
            </div>
        `;

        return messageContent;
    }

    renderMessageFile(message) {
        if (!message.file_path) return '';
        
        const fileName = message.file_name || 'ملف';
        const fileSize = message.file_size ? this.formatFileSize(message.file_size) : '';
        const fileIcon = this.getFileIcon(message.file_type);
        
        return `
            <div class="message-file">
                <div class="file-icon">
                    <i class="fas fa-${fileIcon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${fileName}</div>
                    ${fileSize ? `<div class="file-size">${fileSize}</div>` : ''}
                </div>
                <a href="${message.file_path}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-download"></i>
                </a>
            </div>
        `;
    }

    getFileIcon(fileType) {
        if (!fileType) return 'file';
        
        if (fileType.startsWith('image/')) return 'image';
        if (fileType.startsWith('video/')) return 'video';
        if (fileType.startsWith('audio/')) return 'music';
        if (fileType.includes('pdf')) return 'file-pdf';
        if (fileType.includes('word')) return 'file-word';
        if (fileType.includes('excel')) return 'file-excel';
        
        return 'file';
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentRoom) return;

        try {
            const messageData = {
                room_id: this.currentRoom.id,
                content: content,
                message_type: 'text'
            };

            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(messageData)
            });

            if (response.ok) {
                messageInput.value = '';
                this.autoResizeTextarea(messageInput);
                this.stopTyping();
            } else {
                throw new Error('فشل في إرسال الرسالة');
            }
        } catch (error) {
            console.error('خطأ في إرسال الرسالة:', error);
            this.showAlert('فشل في إرسال الرسالة', 'error');
        }
    }

    async handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file || !this.currentRoom) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('room_id', this.currentRoom.id);

            const response = await fetch('/api/chat/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                // File uploaded successfully, message will be received via socket
                event.target.value = ''; // Clear file input
            } else {
                throw new Error('فشل في رفع الملف');
            }
        } catch (error) {
            console.error('خطأ في رفع الملف:', error);
            this.showAlert('فشل في رفع الملف', 'error');
        }
    }

    handleTyping() {
        if (!this.currentRoom) return;

        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', { room_id: this.currentRoom.id });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    }

    stopTyping() {
        if (this.isTyping && this.currentRoom) {
            this.isTyping = false;
            this.socket.emit('stop_typing', { room_id: this.currentRoom.id });
        }
        clearTimeout(this.typingTimeout);
    }

    handleNewMessage(data) {
        if (!this.messages[data.room_id]) {
            this.messages[data.room_id] = [];
        }
        
        this.messages[data.room_id].push(data.message);
        
        if (this.currentRoom && this.currentRoom.id === data.room_id) {
            this.renderMessages();
            this.markMessagesAsRead(data.room_id);
        }
        
        // Update room list to show new message
        this.updateRoomLastMessage(data.room_id, data.message);
    }

    handleUserTyping(data) {
        if (this.currentRoom && this.currentRoom.id === data.room_id && data.user_id !== this.currentUser.id) {
            this.typingUsers.add(data.user_name);
            this.updateTypingIndicator();
        }
    }

    handleUserStoppedTyping(data) {
        if (this.currentRoom && this.currentRoom.id === data.room_id) {
            this.typingUsers.delete(data.user_name);
            this.updateTypingIndicator();
        }
    }

    updateTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        const typingText = document.getElementById('typingText');
        
        if (this.typingUsers.size > 0) {
            const users = Array.from(this.typingUsers);
            let text = '';
            
            if (users.length === 1) {
                text = `${users[0]} يكتب...`;
            } else if (users.length === 2) {
                text = `${users[0]} و ${users[1]} يكتبان...`;
            } else {
                text = `${users.length} أشخاص يكتبون...`;
            }
            
            typingText.textContent = text;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    async createRoom() {
        try {
            const formData = {
                name: document.getElementById('roomName').value,
                type: document.getElementById('roomType').value,
                description: document.getElementById('roomDescription').value,
                max_participants: parseInt(document.getElementById('maxParticipants').value),
                allow_file_sharing: document.getElementById('allowFileSharing').checked,
                is_encrypted: document.getElementById('isEncrypted').checked
            };

            const response = await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newRoom = await response.json();
                this.rooms.unshift(newRoom);
                this.renderRooms();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('createRoomModal'));
                modal.hide();
                
                // Clear form
                document.getElementById('createRoomForm').reset();
                
                this.showAlert('تم إنشاء الغرفة بنجاح', 'success');
                
                // Auto-select the new room
                await this.selectRoom(newRoom.id);
            } else {
                throw new Error('فشل في إنشاء الغرفة');
            }
        } catch (error) {
            console.error('خطأ في إنشاء الغرفة:', error);
            this.showAlert('فشل في إنشاء الغرفة', 'error');
        }
    }

    async markMessagesAsRead(roomId) {
        try {
            await fetch(`/api/chat/rooms/${roomId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('خطأ في تحديد الرسائل كمقروءة:', error);
        }
    }

    // Utility functions
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'الآن';
        } else if (diff < 3600000) { // Less than 1 hour
            return `${Math.floor(diff / 60000)} د`;
        } else if (diff < 86400000) { // Less than 1 day
            return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('ar-SA');
        }
    }

    formatMessageText(text) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
        
        // Convert line breaks to <br>
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 بايت';
        
        const k = 1024;
        const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showChatInput() {
        document.getElementById('chatInputContainer').style.display = 'block';
    }

    hideChatInput() {
        document.getElementById('chatInputContainer').style.display = 'none';
    }

    clearCurrentRoom() {
        if (this.currentRoom) {
            this.socket.emit('leave_room', { room_id: this.currentRoom.id });
        }
        
        this.currentRoom = null;
        this.updateRoomHeader();
        this.hideChatInput();
        this.renderMessages();
        this.renderRooms();
    }

    filterRooms(searchTerm) {
        const roomItems = document.querySelectorAll('.room-item');
        
        roomItems.forEach(item => {
            const roomName = item.querySelector('.room-name').textContent.toLowerCase();
            const isVisible = roomName.includes(searchTerm.toLowerCase());
            item.style.display = isVisible ? 'block' : 'none';
        });
    }

    showLoadingInRoomsList() {
        document.getElementById('roomsList').innerHTML = `
            <div class="text-center p-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">جاري التحميل...</span>
                </div>
                <p class="mt-2">جاري تحميل الغرف...</p>
            </div>
        `;
    }

    showErrorInRoomsList(message) {
        document.getElementById('roomsList').innerHTML = `
            <div class="text-center p-3">
                <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary btn-sm" onclick="chatManager.loadRooms()">
                    <i class="fas fa-refresh"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }

    updateConnectionStatus(isConnected) {
        // Update UI to show connection status
        const statusIndicator = document.querySelector('.connection-status');
        if (statusIndicator) {
            statusIndicator.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
            statusIndicator.textContent = isConnected ? 'متصل' : 'غير متصل';
        }
    }

    updateRoomLastMessage(roomId, message) {
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            room.last_message = message;
            this.renderRooms();
        }
    }

    setupAutoRefresh() {
        // Refresh rooms list every 30 seconds
        setInterval(() => {
            if (!this.currentRoom) {
                this.loadRooms();
            }
        }, 30000);
    }

    showAlert(message, type = 'info') {
        // Create and show alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Global functions
function showCreateRoomModal() {
    const modal = new bootstrap.Modal(document.getElementById('createRoomModal'));
    modal.show();
}

function showRoomInfo() {
    if (!chatManager.currentRoom) return;
    
    const modal = new bootstrap.Modal(document.getElementById('roomInfoModal'));
    const content = document.getElementById('roomInfoContent');
    
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>معلومات الغرفة</h6>
                <p><strong>الاسم:</strong> ${chatManager.currentRoom.name}</p>
                <p><strong>النوع:</strong> ${chatManager.getRoomTypeText(chatManager.currentRoom.type)}</p>
                <p><strong>الوصف:</strong> ${chatManager.currentRoom.description || 'لا يوجد وصف'}</p>
                <p><strong>تاريخ الإنشاء:</strong> ${new Date(chatManager.currentRoom.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
            <div class="col-md-6">
                <h6>الإحصائيات</h6>
                <p><strong>عدد المشاركين:</strong> ${chatManager.currentRoom.participants_count}</p>
                <p><strong>المتصلون الآن:</strong> ${chatManager.currentRoom.online_participants}</p>
                <p><strong>مشاركة الملفات:</strong> ${chatManager.currentRoom.allow_file_sharing ? 'مفعلة' : 'معطلة'}</p>
                <p><strong>التشفير:</strong> ${chatManager.currentRoom.is_encrypted ? 'مفعل' : 'معطل'}</p>
            </div>
        </div>
    `;
    
    modal.show();
}

function showRoomSettings() {
    // Implementation for room settings
    chatManager.showAlert('إعدادات الغرفة قيد التطوير', 'info');
}

function selectFile() {
    document.getElementById('fileInput').click();
}

function toggleSidebar() {
    const sidebar = document.getElementById('chatSidebar');
    sidebar.classList.toggle('show');
}

// Initialize chat manager when page loads
let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
});
