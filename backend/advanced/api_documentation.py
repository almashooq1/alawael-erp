"""
نظام API Documentation و Developer Portal
Advanced API Documentation & Developer Experience System
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import json
import logging
from dataclasses import dataclass, asdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات النظام ====================

class HTTPMethod(Enum):
    """طرق HTTP"""
    GET = "get"
    POST = "post"
    PUT = "put"
    PATCH = "patch"
    DELETE = "delete"


class ParameterType(Enum):
    """أنواع المعاملات"""
    STRING = "string"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    NUMBER = "number"


class APIStatus(Enum):
    """حالات الـ API"""
    STABLE = "stable"
    BETA = "beta"
    DEPRECATED = "deprecated"
    DEVELOPMENT = "development"


# ==================== نماذج التوثيق ====================

@dataclass
class Parameter:
    """معامل API"""
    name: str
    param_type: ParameterType
    required: bool = False
    description: str = ""
    example: Any = None
    enum_values: List[Any] = None
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['param_type'] = self.param_type.value
        if self.enum_values:
            data['enum'] = self.enum_values
        return data


@dataclass
class Response:
    """استجابة API"""
    status_code: int
    description: str
    schema: Dict = None
    example: Dict = None
    
    def to_dict(self) -> Dict:
        return {
            'status_code': self.status_code,
            'description': self.description,
            'schema': self.schema,
            'example': self.example
        }


@dataclass
class APIEndpoint:
    """نقطة نهاية API"""
    method: HTTPMethod
    path: str
    summary: str
    description: str
    tags: List[str]
    parameters: List[Parameter] = None
    request_body: Dict = None
    responses: List[Response] = None
    authentication: str = "required"
    rate_limit: str = "1000 req/hour"
    examples: List[Dict] = None
    deprecated: bool = False
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = []
        if self.responses is None:
            self.responses = []
        if self.examples is None:
            self.examples = []
    
    def to_dict(self) -> Dict:
        return {
            'method': self.method.value.upper(),
            'path': self.path,
            'summary': self.summary,
            'description': self.description,
            'tags': self.tags,
            'parameters': [p.to_dict() for p in self.parameters],
            'request_body': self.request_body,
            'responses': [r.to_dict() for r in self.responses],
            'authentication': self.authentication,
            'rate_limit': self.rate_limit,
            'examples': self.examples,
            'deprecated': self.deprecated
        }


# ==================== المحطات والفئات ====================

class APICollection:
    """مجموعة من نقاط النهاية"""
    
    def __init__(self, name: str, version: str, 
                 description: str, status: APIStatus = APIStatus.STABLE):
        self.name = name
        self.version = version
        self.description = description
        self.status = status
        self.endpoints: Dict[str, APIEndpoint] = {}
        self.created_at = datetime.now()
        self.base_url = f"/api/v{version.split('.')[0]}"
    
    def add_endpoint(self, endpoint_id: str, endpoint: APIEndpoint):
        """إضافة نقطة نهاية"""
        self.endpoints[endpoint_id] = endpoint
        logger.info(f"✅ نقطة نهاية مضافة: {endpoint.method.value.upper()} {endpoint.path}")
    
    def get_endpoint_count(self) -> int:
        """عدد النقاط النهائية"""
        return len(self.endpoints)
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'status': self.status.value,
            'base_url': self.base_url,
            'endpoint_count': self.get_endpoint_count(),
            'created_at': self.created_at.isoformat(),
            'endpoints': {k: v.to_dict() for k, v in self.endpoints.items()}
        }


# ==================== مندوب التوثيق ====================

class APIDocumentation:
    """مدير التوثيق الشامل"""
    
    def __init__(self):
        self.collections: Dict[str, APICollection] = {}
        self.models: Dict[str, Dict] = {}
        self.errors: Dict[str, Dict] = {}
        self.guides: Dict[str, str] = {}
        self.changelog: List[Dict] = []
    
    def create_collection(self, name: str, version: str = "1.0",
                         description: str = "",
                         status: APIStatus = APIStatus.STABLE) -> APICollection:
        """إنشاء مجموعة API"""
        
        collection = APICollection(name, version, description, status)
        self.collections[name] = collection
        
        logger.info(f"✅ مجموعة API تم إنشاؤها: {name} v{version}")
        
        return collection
    
    def register_model(self, model_name: str, schema: Dict):
        """تسجيل نموذج البيانات"""
        
        self.models[model_name] = {
            'name': model_name,
            'schema': schema,
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"✅ نموذج مسجل: {model_name}")
    
    def register_error(self, error_code: int, error_name: str, 
                      description: str, solutions: List[str]):
        """تسجيل خطأ شامل"""
        
        self.errors[error_code] = {
            'code': error_code,
            'name': error_name,
            'description': description,
            'solutions': solutions
        }
        
        logger.info(f"✅ خطأ مسجل: {error_code} - {error_name}")
    
    def add_guide(self, guide_name: str, content: str, section: str = "General"):
        """إضافة دليل"""
        
        self.guides[guide_name] = {
            'name': guide_name,
            'section': section,
            'content': content,
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"✅ دليل مضاف: {guide_name}")
    
    def add_changelog_entry(self, version: str, changes: List[str],
                           entry_type: str = "feature"):
        """إضافة إدخال سجل التغييرات"""
        
        self.changelog.append({
            'version': version,
            'type': entry_type,
            'changes': changes,
            'date': datetime.now().isoformat()
        })
        
        logger.info(f"✅ سجل تغيير مضاف: v{version}")
    
    def get_openapi_spec(self) -> Dict:
        """الحصول على مواصفات OpenAPI"""
        
        paths = {}
        
        for collection_name, collection in self.collections.items():
            for endpoint_id, endpoint in collection.endpoints.items():
                full_path = collection.base_url + endpoint.path
                
                if full_path not in paths:
                    paths[full_path] = {}
                
                paths[full_path][endpoint.method.value] = {
                    'summary': endpoint.summary,
                    'description': endpoint.description,
                    'tags': endpoint.tags,
                    'parameters': [p.to_dict() for p in endpoint.parameters],
                    'requestBody': endpoint.request_body,
                    'responses': {
                        str(r.status_code): {
                            'description': r.description,
                            'content': {'application/json': {'schema': r.schema}}
                        }
                        for r in endpoint.responses
                    },
                    'security': [{'bearerAuth': []}] if endpoint.authentication == "required" else []
                }
        
        return {
            'openapi': '3.0.0',
            'info': {
                'title': 'Student Management System API',
                'version': '1.0.0',
                'description': 'Advanced Student Management System API',
                'contact': {
                    'name': 'API Support',
                    'email': 'api@example.com'
                }
            },
            'servers': [
                {'url': 'http://localhost:5000', 'description': 'Development'},
                {'url': 'https://api.example.com', 'description': 'Production'}
            ],
            'paths': paths,
            'components': {
                'schemas': self.models,
                'securitySchemes': {
                    'bearerAuth': {
                        'type': 'http',
                        'scheme': 'bearer',
                        'bearerFormat': 'JWT'
                    }
                }
            }
        }


# ==================== Developer Portal ====================

class DeveloperPortal:
    """بوابة المطورين"""
    
    def __init__(self, documentation: APIDocumentation):
        self.documentation = documentation
        self.api_keys: Dict[str, Dict] = {}
        self.subscriptions: Dict[str, Dict] = {}
        self.usage_logs: List[Dict] = []
    
    def create_api_key(self, developer_id: str, key_name: str) -> Dict:
        """إنشاء مفتاح API"""
        
        import secrets
        
        api_key = secrets.token_urlsafe(32)
        key_id = f"key_{secrets.token_hex(8)}"
        
        self.api_keys[key_id] = {
            'id': key_id,
            'key': api_key,
            'developer_id': developer_id,
            'name': key_name,
            'created_at': datetime.now().isoformat(),
            'last_used': None,
            'is_active': True
        }
        
        logger.info(f"✅ مفتاح API تم إنشاؤه: {key_name}")
        
        return {
            'key_id': key_id,
            'api_key': api_key,
            'message': 'احفظ مفتاحك في مكان آمن'
        }
    
    def get_api_key_usage(self, key_id: str) -> Dict:
        """الحصول على استخدام المفتاح"""
        
        usage = [log for log in self.usage_logs if log['key_id'] == key_id]
        
        return {
            'key_id': key_id,
            'total_requests': len(usage),
            'today_requests': len([u for u in usage if u['is_today']]),
            'endpoints_used': len(set(u['endpoint'] for u in usage)),
            'last_used': usage[-1]['timestamp'] if usage else None,
            'month_usage': len([u for u in usage if u['is_month']])
        }
    
    def log_usage(self, key_id: str, endpoint: str, method: str,
                 response_code: int, response_time: float):
        """تسجيل الاستخدام"""
        
        self.usage_logs.append({
            'key_id': key_id,
            'endpoint': endpoint,
            'method': method,
            'response_code': response_code,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat(),
            'is_today': True,
            'is_month': True
        })
    
    def get_quick_start_guide(self) -> Dict:
        """دليل البداية السريعة"""
        
        return {
            'title': 'دليل البداية السريعة',
            'steps': [
                {
                    'step': 1,
                    'title': 'إنشاء حساب مطور',
                    'description': 'سجل حسابك على بوابة المطورين'
                },
                {
                    'step': 2,
                    'title': 'إنشاء مفتاح API',
                    'description': 'قم بإنشاء مفتاح API من لوحة التحكم'
                },
                {
                    'step': 3,
                    'title': 'قراءة التوثيق',
                    'description': 'استكشف جميع نقاط النهاية المتاحة'
                },
                {
                    'step': 4,
                    'title': 'جرب الـ API',
                    'description': 'جرب الطلبات في Observable Playground'
                },
                {
                    'step': 5,
                    'title': 'ابدأ البناء',
                    'description': 'استخدم الـ SDK أو مكتبات العملاء'
                }
            ],
            'resources': [
                'التوثيق الكامل',
                'أمثلة الكود',
                'مقاطع الفيديو',
                'المنتدى',
                'نماذج Postman'
            ]
        }
    
    def get_sdks_info(self) -> List[Dict]:
        """معلومات مكتبات العملاء"""
        
        return [
            {
                'language': 'Python',
                'package': 'student-management-sdk',
                'github': 'https://github.com/example/sdk-python',
                'docs': 'https://docs.example.com/python',
                'version': '2.0.0',
                'downloads': '10,000+'
            },
            {
                'language': 'JavaScript',
                'package': '@studentmgmt/sdk',
                'github': 'https://github.com/example/sdk-js',
                'docs': 'https://docs.example.com/js',
                'version': '2.0.0',
                'downloads': '15,000+'
            },
            {
                'language': 'Java',
                'package': 'com.studentmgmt:sdk',
                'github': 'https://github.com/example/sdk-java',
                'docs': 'https://docs.example.com/java',
                'version': '2.0.0',
                'downloads': '8,000+'
            }
        ]


# ==================== عرض توضيحي ====================

def demo_api_documentation_and_portal():
    """عرض توضيحي للنظام"""
    
    print("📚 عرض توضيحي لـ API Documentation و Developer Portal\n")
    
    # 1. إنشاء التوثيق
    print("1️⃣ إنشاء التوثيق:")
    docs = APIDocumentation()
    
    # 2. إنشاء مجموعة API
    print("\n2️⃣ مجموعة API للطلاب:")
    students_api = docs.create_collection("Students", "1.0")
    
    # إضافة نقاط نهاية
    endpoint_get = APIEndpoint(
        method=HTTPMethod.GET,
        path="/students",
        summary="احصل على قائمة الطلاب",
        description="احصل على جميع الطلاب مع الترشيح والترتيب",
        tags=["Students"],
        parameters=[
            Parameter("page", ParameterType.INTEGER, description="رقم الصفحة"),
            Parameter("limit", ParameterType.INTEGER, description="حد الصفحة"),
            Parameter("search", ParameterType.STRING, description="البحث في الاسم")
        ],
        responses=[
            Response(200, "نجح", example={"students": []})
        ]
    )
    
    students_api.add_endpoint("get_students", endpoint_get)
    
    # 3. تسجيل نموذج
    print("\n3️⃣ نماذج البيانات:")
    docs.register_model("Student", {
        'type': 'object',
        'properties': {
            'id': {'type': 'string'},
            'name': {'type': 'string'},
            'email': {'type': 'string'},
            'grade_level': {'type': 'integer'}
        }
    })
    
    # 4. تسجيل الأخطاء
    print("\n4️⃣ معالجة الأخطاء:")
    docs.register_error(
        404,
        "NotFound",
        "المورد غير موجود",
        ["تحقق من معرف المورد", "تأكد من وجود المورد"]
    )
    
    # 5. دليل
    print("\n5️⃣ الأدلة:")
    docs.add_guide(
        "Authentication",
        "استخدم JWT مع رمز Bearer",
        "Security"
    )
    
    # 6. سجل التغييرات
    print("\n6️⃣ سجل التغييرات:")
    docs.add_changelog_entry(
        "2.0.0",
        ["دعم GraphQL", "مصادقة OAuth2"],
        "major"
    )
    
    # 7. بوابة المطورين
    print("\n7️⃣ بوابة المطورين:")
    portal = DeveloperPortal(docs)
    
    key_info = portal.create_api_key("dev_001", "My Test Key")
    print(f"   مفتاح تم إنشاؤه: {key_info['key_id']}")
    
    # 8. دليل البداية السريعة
    print("\n8️⃣ دليل البداية:")
    quick_start = portal.get_quick_start_guide()
    print(f"   {quick_start['title']}: {len(quick_start['steps'])} خطوات")
    
    # 9. مكتبات العملاء
    print("\n9️⃣ مكتبات العملاء:")
    sdks = portal.get_sdks_info()
    print(f"   {len(sdks)} لغات برمجية مدعومة")


if __name__ == '__main__':
    demo_api_documentation_and_portal()
