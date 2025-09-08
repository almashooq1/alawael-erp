/**
 * PWA Installer - إدارة تثبيت التطبيق كـ PWA
 */

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    init() {
        // التحقق من دعم Service Worker
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }

        // الاستماع لحدث beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        // التحقق من حالة التثبيت
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstalledMessage();
        });

        // إنشاء زر التثبيت
        this.createInstallButton();
        
        // التحقق من التثبيت المسبق
        this.checkIfInstalled();
    }

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/static/js/sw.js');
            console.log('Service Worker مسجل بنجاح:', registration);
            
            // التحقق من التحديثات
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateAvailable();
                    }
                });
            });
        } catch (error) {
            console.error('فشل في تسجيل Service Worker:', error);
        }
    }

    createInstallButton() {
        // إنشاء زر التثبيت
        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.className = 'btn btn-primary pwa-install-btn';
        installBtn.innerHTML = `
            <i class="fas fa-download"></i>
            تثبيت التطبيق
        `;
        installBtn.style.display = 'none';
        installBtn.addEventListener('click', () => this.installApp());

        // إضافة الزر للصفحة
        document.body.appendChild(installBtn);

        // إنشاء بانر التثبيت
        this.createInstallBanner();
    }

    createInstallBanner() {
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-icon">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <div class="banner-text">
                    <h4>تثبيت تطبيق الأوائل</h4>
                    <p>احصل على تجربة أفضل مع التطبيق المحمول</p>
                </div>
                <div class="banner-actions">
                    <button class="btn btn-primary btn-sm" onclick="pwaInstaller.installApp()">
                        تثبيت
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="pwaInstaller.dismissBanner()">
                        لاحقاً
                    </button>
                </div>
            </div>
        `;
        banner.style.display = 'none';
        document.body.appendChild(banner);
    }

    showInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        const banner = document.getElementById('pwa-install-banner');
        
        if (installBtn) installBtn.style.display = 'block';
        
        // إظهار البانر بعد 3 ثوان
        setTimeout(() => {
            if (banner && !this.isInstalled) {
                banner.style.display = 'block';
                banner.classList.add('show');
            }
        }, 3000);
    }

    hideInstallButton() {
        const installBtn = document.getElementById('pwa-install-btn');
        const banner = document.getElementById('pwa-install-banner');
        
        if (installBtn) installBtn.style.display = 'none';
        if (banner) banner.style.display = 'none';
    }

    async installApp() {
        if (!this.deferredPrompt) {
            this.showManualInstallInstructions();
            return;
        }

        try {
            // إظهار مربع حوار التثبيت
            this.deferredPrompt.prompt();
            
            // انتظار اختيار المستخدم
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('المستخدم وافق على التثبيت');
                this.trackInstallEvent('accepted');
            } else {
                console.log('المستخدم رفض التثبيت');
                this.trackInstallEvent('dismissed');
            }
            
            this.deferredPrompt = null;
            this.hideInstallButton();
        } catch (error) {
            console.error('خطأ في التثبيت:', error);
            this.showInstallError();
        }
    }

    dismissBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
        
        // حفظ حالة الرفض
        localStorage.setItem('pwa-banner-dismissed', Date.now());
    }

    checkIfInstalled() {
        // التحقق من وضع standalone
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
            this.hideInstallButton();
            return;
        }

        // التحقق من iOS Safari
        if (window.navigator.standalone === true) {
            this.isInstalled = true;
            this.hideInstallButton();
            return;
        }

        // التحقق من الرفض السابق
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const daysPassed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
            
            // إظهار البانر مرة أخرى بعد 7 أيام
            if (daysPassed < 7) {
                return;
            }
        }
    }

    showManualInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        let instructions = '';
        
        if (isIOS) {
            instructions = `
                <h4>تثبيت التطبيق على iOS:</h4>
                <ol>
                    <li>اضغط على زر المشاركة <i class="fas fa-share"></i></li>
                    <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                    <li>اضغط "إضافة"</li>
                </ol>
            `;
        } else if (isAndroid) {
            instructions = `
                <h4>تثبيت التطبيق على Android:</h4>
                <ol>
                    <li>اضغط على القائمة ⋮</li>
                    <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                    <li>اضغط "إضافة"</li>
                </ol>
            `;
        } else {
            instructions = `
                <h4>تثبيت التطبيق:</h4>
                <p>يمكنك تثبيت التطبيق من قائمة المتصفح أو الإعدادات</p>
            `;
        }
        
        this.showModal('تثبيت التطبيق', instructions);
    }

    showInstalledMessage() {
        this.showNotification('تم تثبيت التطبيق بنجاح! 🎉', 'success');
    }

    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <i class="fas fa-sync-alt"></i>
                <span>تحديث جديد متوفر</span>
                <button onclick="location.reload()" class="btn btn-sm btn-light">
                    تحديث الآن
                </button>
            </div>
        `;
        document.body.appendChild(updateBanner);
        
        setTimeout(() => updateBanner.classList.add('show'), 100);
    }

    showInstallError() {
        this.showNotification('حدث خطأ أثناء التثبيت. حاول مرة أخرى.', 'error');
    }

    trackInstallEvent(outcome) {
        // تتبع أحداث التثبيت للإحصائيات
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install', {
                'outcome': outcome,
                'timestamp': new Date().toISOString()
            });
        }
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'pwa-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5>${title}</h5>
                    <button class="close-btn" onclick="this.closest('.pwa-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `pwa-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // إدارة الاتصال
    handleConnectionChange() {
        if (navigator.onLine) {
            this.showNotification('تم استعادة الاتصال بالإنترنت', 'success');
        } else {
            this.showNotification('لا يوجد اتصال بالإنترنت - العمل في وضع عدم الاتصال', 'warning');
        }
    }
}

// تهيئة PWA Installer
const pwaInstaller = new PWAInstaller();

// الاستماع لتغييرات الاتصال
window.addEventListener('online', () => pwaInstaller.handleConnectionChange());
window.addEventListener('offline', () => pwaInstaller.handleConnectionChange());
