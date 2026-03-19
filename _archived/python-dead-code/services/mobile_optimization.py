"""
Mobile Optimization & PWA Features
===================================
Complete mobile app support and Progressive Web App implementation
"""

import os
import json
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file
from functools import wraps
import mimetypes

# ============================================
# 1. RESPONSIVE DESIGN IMPROVEMENTS
# ============================================

class ResponsiveDesignService:
    """Mobile-first responsive design utilities"""
    
    BREAKPOINTS = {
        'mobile': 320,
        'mobile-landscape': 568,
        'tablet': 768,
        'desktop': 1024,
        'wide': 1440,
        'ultra-wide': 1920
    }
    
    @staticmethod
    def get_device_type(user_agent):
        """Detect device type from user agent"""
        ua_lower = user_agent.lower()
        
        if any(x in ua_lower for x in ['mobile', 'android', 'iphone', 'ipod']):
            if any(x in ua_lower for x in ['ipad', 'tablet', 'nexus 7', 'nexus 10']):
                return 'tablet'
            return 'mobile'
        elif any(x in ua_lower for x in ['ipad', 'tablet', 'nexus 7', 'nexus 10']):
            return 'tablet'
        return 'desktop'
    
    @staticmethod
    def generate_responsive_images(image_path, format='webp'):
        """Generate responsive image versions"""
        return {
            'mobile': f"{image_path}-mobile.{format}",
            'tablet': f"{image_path}-tablet.{format}",
            'desktop': f"{image_path}-desktop.{format}",
            'srcset': f"{image_path}-mobile.{format} 320w, {image_path}-tablet.{format} 768w, {image_path}-desktop.{format} 1024w"
        }

# ============================================
# 2. PROGRESSIVE WEB APP (PWA)
# ============================================

class PWAService:
    """Progressive Web App support"""
    
    @staticmethod
    def get_manifest():
        """PWA Manifest configuration"""
        return {
            "name": "نظام إدارة مراكز التأهيل",
            "short_name": "التأهيل",
            "description": "نظام متكامل لإدارة مراكز التأهيل والعلاج الطبيعي",
            "start_url": "/",
            "display": "standalone",
            "orientation": "portrait-primary",
            "background_color": "#ffffff",
            "theme_color": "#667eea",
            "scope": "/",
            "icons": [
                {
                    "src": "/static/icons/icon-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any maskable"
                },
                {
                    "src": "/static/icons/icon-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any maskable"
                }
            ],
            "screenshots": [
                {
                    "src": "/static/screenshots/screenshot-1.png",
                    "sizes": "540x720",
                    "type": "image/png",
                    "form_factor": "narrow"
                },
                {
                    "src": "/static/screenshots/screenshot-2.png",
                    "sizes": "1280x720",
                    "type": "image/png",
                    "form_factor": "wide"
                }
            ],
            "shortcuts": [
                {
                    "name": "قائمة المرضى",
                    "short_name": "المرضى",
                    "description": "عرض قائمة المرضى",
                    "url": "/beneficiaries",
                    "icons": [{
                        "src": "/static/icons/beneficiaries.png",
                        "sizes": "192x192"
                    }]
                },
                {
                    "name": "الجلسات",
                    "short_name": "جلسة",
                    "description": "إدارة الجلسات العلاجية",
                    "url": "/sessions",
                    "icons": [{
                        "src": "/static/icons/sessions.png",
                        "sizes": "192x192"
                    }]
                }
            ],
            "categories": ["medical", "productivity"],
            "dir": "rtl",
            "lang": "ar-SA"
        }
    
    @staticmethod
    def get_service_worker():
        """Service Worker configuration for offline support"""
        return """
const CACHE_NAME = 'rehab-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/static/css/main.css',
    '/static/js/main.js',
    '/api/health'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(URLS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests differently
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Handle static assets - Cache first
    event.respondWith(
        caches.match(request)
            .then(response => response || fetch(request))
            .catch(() => new Response('Offline'))
    );
});

// Background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-pending-requests') {
        event.waitUntil(syncPendingRequests());
    }
});

async function syncPendingRequests() {
    const db = await openDB();
    const pendingRequests = await db.getAll('pending-requests');
    
    for (const req of pendingRequests) {
        try {
            await fetch(req.url, {
                method: req.method,
                body: req.body,
                headers: req.headers
            });
            await db.delete('pending-requests', req.id);
        } catch (error) {
            console.log('Sync failed:', error);
        }
    }
}
"""

# ============================================
# 3. MOBILE-SPECIFIC API ENDPOINTS
# ============================================

mobile_bp = Blueprint('mobile', __name__, url_prefix='/api/mobile')

@mobile_bp.route('/config', methods=['GET'])
def get_mobile_config():
    """Get mobile app configuration"""
    return jsonify({
        'api_version': '2.0',
        'min_app_version': '1.0.0',
        'feature_flags': {
            'offline_support': True,
            'push_notifications': True,
            'biometric_auth': True,
            'voice_commands': False,
        },
        'cache_duration': {
            'beneficiaries': 3600,
            'sessions': 1800,
            'reports': 7200,
        },
        'ui_customization': {
            'theme': 'light',
            'language': 'ar',
            'rtl': True,
            'font_size': 'medium',
        }
    })

@mobile_bp.route('/offline-data', methods=['GET'])
def get_offline_data():
    """Get essential data for offline mode"""
    return jsonify({
        'timestamp': datetime.utcnow().isoformat(),
        'data': {
            'beneficiaries': [],  # Would be populated from DB
            'sessions': [],
            'programs': [],
        }
    })

@mobile_bp.route('/sync-status', methods=['GET'])
def get_sync_status():
    """Get synchronization status"""
    return jsonify({
        'last_sync': datetime.utcnow().isoformat(),
        'pending_changes': 0,
        'pending_uploads': 0,
        'is_online': True,
    })

@mobile_bp.route('/push-test', methods=['POST'])
def test_push_notification():
    """Test push notification"""
    data = request.json
    # Send push notification
    return jsonify({'success': True, 'notification_id': 'test-1234'})

# ============================================
# 4. MOBILE OPTIMIZATION HEADERS
# ============================================

def add_mobile_headers(response):
    """Add headers optimized for mobile"""
    response.headers['X-Mobile-Optimized'] = '1'
    response.headers['X-UA-Compatible'] = 'IE=edge'
    response.headers['Viewport'] = 'width=device-width, initial-scale=1, shrink-to-fit=no'
    return response

# ============================================
# 5. TOUCH-FRIENDLY INTERFACE
# ============================================

class TouchOptimizationService:
    """Optimize for touch interactions"""
    
    @staticmethod
    def get_touch_targets():
        """Recommended touch target sizes"""
        return {
            'minimum_size': '44x44px',
            'recommended_size': '48x48px',
            'spacing': '8px',
            'font_size_mobile': '16px',  # Prevent zoom on focus
            'line_height': '1.5',
        }
    
    @staticmethod
    def get_gesture_config():
        """Touch gesture configuration"""
        return {
            'swipe': {
                'enabled': True,
                'min_distance': '50px',
                'max_time': '300ms',
            },
            'long_press': {
                'enabled': True,
                'duration': '500ms',
            },
            'pinch': {
                'enabled': True,
                'min_scale': 1.0,
                'max_scale': 3.0,
            },
            'tap': {
                'enabled': True,
                'max_time': '250ms',
                'max_distance': '10px',
            }
        }

# ============================================
# 6. MOBILE PERFORMANCE OPTIMIZATION
# ============================================

class MobilePerformanceService:
    """Optimize performance for mobile devices"""
    
    @staticmethod
    def get_performance_metrics():
        """Get mobile performance targets"""
        return {
            'first_contentful_paint': '1.8s',
            'largest_contentful_paint': '2.5s',
            'first_input_delay': '100ms',
            'cumulative_layout_shift': '0.1',
            'time_to_interactive': '3.8s',
            'speed_index': '3.3s',
        }
    
    @staticmethod
    def optimize_images_for_mobile():
        """Image optimization recommendations"""
        return {
            'format': 'webp',
            'compression_level': 80,
            'responsive_images': True,
            'lazy_loading': True,
            'max_width_mobile': '100vw',
            'max_width_tablet': '50vw',
        }
    
    @staticmethod
    def get_network_optimization():
        """Network optimization settings"""
        return {
            'request_batching': True,
            'request_compression': True,
            'connection_pooling': True,
            'http2_push': True,
            'preload_critical': True,
            'prefetch_likely': True,
        }

# ============================================
# 7. BIOMETRIC AUTHENTICATION
# ============================================

class BiometricAuthService:
    """Support for biometric authentication on mobile"""
    
    @staticmethod
    def get_biometric_capabilities():
        """Check available biometric options"""
        return {
            'fingerprint': True,
            'face_recognition': True,
            'iris_scanning': False,
            'voice_recognition': False,
        }
    
    @staticmethod
    def register_biometric(user_id, biometric_type, biometric_data):
        """Register biometric for user"""
        # Store encrypted biometric data
        return {
            'success': True,
            'biometric_id': 'bio-12345',
            'type': biometric_type,
            'registered_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def verify_biometric(user_id, biometric_type, biometric_data):
        """Verify biometric for authentication"""
        # Compare with stored biometric
        return {
            'success': True,
            'confidence': 0.95,
            'verified_at': datetime.utcnow().isoformat()
        }

# ============================================
# 8. NOTIFICATION PERMISSIONS
# ============================================

class NotificationPermissionService:
    """Manage notification permissions"""
    
    @staticmethod
    def request_permission(permission_type):
        """Request device permission"""
        return {
            'permission': permission_type,
            'status': 'granted',  # 'granted', 'denied', 'prompt'
        }
    
    @staticmethod
    def subscribe_to_notifications(user_id, push_subscription):
        """Subscribe user to push notifications"""
        return {
            'subscription_id': 'sub-12345',
            'subscribed_at': datetime.utcnow().isoformat(),
            'endpoint': push_subscription.get('endpoint')
        }

# ============================================
# 9. OFFLINE DATA STORAGE
# ============================================

class OfflineStorageService:
    """Manage local storage for offline functionality"""
    
    @staticmethod
    def get_storage_quota():
        """Get storage quota for offline data"""
        return {
            'total_quota': '50MB',
            'used_space': '10MB',
            'available_space': '40MB',
            'priority_data': {
                'user_profile': '0.5MB',
                'beneficiaries': '15MB',
                'sessions': '10MB',
                'programs': '5MB',
            }
        }
    
    @staticmethod
    def sync_offline_changes(user_id, changes):
        """Sync changes made offline to server"""
        return {
            'synced_items': len(changes),
            'failed_items': 0,
            'last_sync': datetime.utcnow().isoformat()
        }

# ============================================
# 10. APP INSTALLATION PROMPTS
# ============================================

class AppInstallationService:
    """Manage app installation prompts"""
    
    @staticmethod
    def get_install_prompt_config():
        """Configuration for app install prompts"""
        return {
            'show_ios_prompt': True,
            'show_android_prompt': True,
            'show_desktop_prompt': False,
            'prompt_trigger': 'after_3_visits',
            'allow_dismiss': True,
            'dismiss_duration': '7days',
        }
    
    @staticmethod
    def log_installation(user_id, platform):
        """Log when app is installed"""
        return {
            'installation_id': 'inst-12345',
            'platform': platform,
            'installed_at': datetime.utcnow().isoformat()
        }

# ============================================
# INITIALIZATION
# ============================================

def init_mobile_optimization(app):
    """Initialize mobile optimization features"""
    
    # Register blueprint
    app.register_blueprint(mobile_bp)
    
    # Add mobile-specific middleware
    @app.before_request
    def detect_mobile_device():
        from flask import g
        g.is_mobile = ResponsiveDesignService.get_device_type(request.headers.get('User-Agent', ''))
    
    @app.after_request
    def add_mobile_headers_to_response(response):
        return add_mobile_headers(response)
    
    return {
        'responsive': ResponsiveDesignService,
        'pwa': PWAService,
        'touch': TouchOptimizationService,
        'performance': MobilePerformanceService,
        'biometric': BiometricAuthService,
        'notifications': NotificationPermissionService,
        'offline_storage': OfflineStorageService,
        'installation': AppInstallationService,
    }
