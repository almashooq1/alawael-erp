# -*- coding: utf-8 -*-
"""
خدمات التكامل والاتصالات
Integration and Communication Services
"""

import requests
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional, Any
from app import app, db
from integration_models import *

class CommunicationService:
    """خدمة الاتصالات المتكاملة"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.retry_attempts = 3
        self.retry_delay = 5  # seconds
    
    def send_sms(self, phone: str, message: str, template_id: Optional[int] = None) -> Dict[str, Any]:
        """إرسال رسالة SMS"""
        try:
            # Get SMS settings
            settings = self._get_sms_settings()
            
            # Create message record
            comm_message = CommunicationMessage(
                template_id=template_id,
                recipient_type='phone',
                recipient_phone=phone,
                channel=CommunicationChannel.SMS,
                content=message,
                status='pending'
            )
            db.session.add(comm_message)
            db.session.commit()
            
            # Send SMS via provider
            response = self._send_sms_via_provider(phone, message, settings)
            
            # Update message status
            comm_message.status = 'sent' if response['success'] else 'failed'
            comm_message.sent_at = datetime.utcnow()
            comm_message.external_message_id = response.get('message_id')
            comm_message.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"SMS sending failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def send_email(self, email: str, subject: str, content: str, template_id: Optional[int] = None) -> Dict[str, Any]:
        """إرسال بريد إلكتروني"""
        try:
            # Get email settings
            settings = self._get_email_settings()
            
            # Create message record
            comm_message = CommunicationMessage(
                template_id=template_id,
                recipient_type='email',
                recipient_email=email,
                channel=CommunicationChannel.EMAIL,
                subject=subject,
                content=content,
                status='pending'
            )
            db.session.add(comm_message)
            db.session.commit()
            
            # Send email
            response = self._send_email_via_smtp(email, subject, content, settings)
            
            # Update message status
            comm_message.status = 'sent' if response['success'] else 'failed'
            comm_message.sent_at = datetime.utcnow()
            comm_message.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Email sending failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_sms_settings(self) -> Dict[str, Any]:
        """الحصول على إعدادات SMS"""
        settings = CommunicationSettings.query.filter_by(setting_key='sms_config').first()
        if settings:
            return json.loads(settings.setting_value)
        return {}
    
    def _get_email_settings(self) -> Dict[str, Any]:
        """الحصول على إعدادات البريد الإلكتروني"""
        settings = CommunicationSettings.query.filter_by(setting_key='email_config').first()
        if settings:
            return json.loads(settings.setting_value)
        return {}
    
    def _send_sms_via_provider(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال SMS عبر المزود"""
        try:
            provider = settings.get('provider', 'twilio')
            
            if provider == 'twilio':
                return self._send_sms_twilio(phone, message, settings)
            elif provider == 'taqnyat':
                return self._send_sms_taqnyat(phone, message, settings)
            elif provider == 'msegat':
                return self._send_sms_msegat(phone, message, settings)
            else:
                return {'success': False, 'error': 'Unsupported SMS provider'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_sms_twilio(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال SMS عبر Twilio"""
        try:
            from twilio.rest import Client
            
            client = Client(settings['account_sid'], settings['auth_token'])
            
            message_obj = client.messages.create(
                body=message,
                from_=settings['from_number'],
                to=phone
            )
            
            return {'success': True, 'message_id': message_obj.sid}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_sms_taqnyat(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال SMS عبر تقنيات"""
        try:
            url = 'https://api.taqnyat.sa/v1/messages'
            headers = {
                'Authorization': f"Bearer {settings['api_key']}",
                'Content-Type': 'application/json'
            }
            
            data = {
                'recipients': [phone],
                'body': message,
                'sender': settings.get('sender_name', 'AWAIL')
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=30)
            
            if response.status_code == 201:
                result = response.json()
                return {'success': True, 'message_id': result.get('messageId')}
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_sms_msegat(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال SMS عبر مسجات"""
        try:
            url = 'https://www.msegat.com/gw/sendsms.php'
            
            data = {
                'userName': settings['username'],
                'apiKey': settings['api_key'],
                'numbers': phone,
                'userSender': settings.get('sender_name', 'AWAIL'),
                'msg': message,
                'msgEncoding': 'UTF8'
            }
            
            response = requests.post(url, data=data, timeout=30)
            
            if response.status_code == 200:
                result = response.text
                if 'M0000' in result:  # Success code
                    return {'success': True, 'message_id': result}
                else:
                    return {'success': False, 'error': result}
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_email_via_smtp(self, email: str, subject: str, content: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال البريد الإلكتروني عبر SMTP"""
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.get('from_address', 'noreply@awail.com')
            msg['To'] = email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(content, 'html', 'utf-8'))
            
            server = smtplib.SMTP(settings.get('smtp_host'), settings.get('smtp_port', 587))
            server.starttls()
            server.login(settings.get('username'), settings.get('password'))
            server.send_message(msg)
            server.quit()
            
            return {'success': True}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_whatsapp(self, phone: str, message: str, template_id: Optional[int] = None) -> Dict[str, Any]:
        """إرسال رسالة WhatsApp"""
        try:
            # Get WhatsApp settings
            settings = self._get_whatsapp_settings()
            
            # Create message record
            comm_message = CommunicationMessage(
                template_id=template_id,
                recipient_type='phone',
                recipient_phone=phone,
                channel=CommunicationChannel.WHATSAPP,
                content=message,
                status='pending'
            )
            db.session.add(comm_message)
            db.session.commit()
            
            # Send WhatsApp message
            response = self._send_whatsapp_via_provider(phone, message, settings)
            
            # Update message status
            comm_message.status = 'sent' if response['success'] else 'failed'
            comm_message.sent_at = datetime.utcnow()
            comm_message.external_message_id = response.get('message_id')
            comm_message.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"WhatsApp sending failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def send_push_notification(self, user_id: int, title: str, message: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """إرسال إشعار فوري"""
        try:
            # Get push notification settings
            settings = self._get_push_settings()
            
            # Create message record
            comm_message = CommunicationMessage(
                recipient_type='user',
                recipient_id=user_id,
                channel=CommunicationChannel.PUSH_NOTIFICATION,
                subject=title,
                content=message,
                status='pending'
            )
            db.session.add(comm_message)
            db.session.commit()
            
            # Send push notification
            response = self._send_push_via_provider(user_id, title, message, data, settings)
            
            # Update message status
            comm_message.status = 'sent' if response['success'] else 'failed'
            comm_message.sent_at = datetime.utcnow()
            comm_message.external_message_id = response.get('message_id')
            comm_message.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Push notification sending failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def send_voice_call(self, phone: str, message: str, language: str = 'ar') -> Dict[str, Any]:
        """إجراء مكالمة صوتية"""
        try:
            # Get voice call settings
            settings = self._get_voice_settings()
            
            # Create message record
            comm_message = CommunicationMessage(
                recipient_type='phone',
                recipient_phone=phone,
                channel=CommunicationChannel.VOICE_CALL,
                content=message,
                status='pending'
            )
            db.session.add(comm_message)
            db.session.commit()
            
            # Make voice call
            response = self._make_voice_call_via_provider(phone, message, language, settings)
            
            # Update message status
            comm_message.status = 'sent' if response['success'] else 'failed'
            comm_message.sent_at = datetime.utcnow()
            comm_message.external_message_id = response.get('call_id')
            comm_message.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Voice call failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _get_whatsapp_settings(self) -> Dict[str, Any]:
        """الحصول على إعدادات WhatsApp"""
        settings = CommunicationSettings.query.filter_by(setting_key='whatsapp_config').first()
        if settings:
            return json.loads(settings.setting_value)
        return {}
    
    def _get_push_settings(self) -> Dict[str, Any]:
        """الحصول على إعدادات الإشعارات الفورية"""
        settings = CommunicationSettings.query.filter_by(setting_key='push_config').first()
        if settings:
            return json.loads(settings.setting_value)
        return {}
    
    def _get_voice_settings(self) -> Dict[str, Any]:
        """الحصول على إعدادات المكالمات الصوتية"""
        settings = CommunicationSettings.query.filter_by(setting_key='voice_config').first()
        if settings:
            return json.loads(settings.setting_value)
        return {}
    
    def _send_whatsapp_via_provider(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال WhatsApp عبر المزود"""
        try:
            provider = settings.get('provider', 'twilio')
            
            if provider == 'twilio':
                return self._send_whatsapp_twilio(phone, message, settings)
            elif provider == 'whatsapp_business':
                return self._send_whatsapp_business_api(phone, message, settings)
            else:
                return {'success': False, 'error': 'Unsupported WhatsApp provider'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_whatsapp_twilio(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال WhatsApp عبر Twilio"""
        try:
            from twilio.rest import Client
            
            client = Client(settings['account_sid'], settings['auth_token'])
            
            message_obj = client.messages.create(
                body=message,
                from_=f"whatsapp:{settings['from_number']}",
                to=f"whatsapp:{phone}"
            )
            
            return {'success': True, 'message_id': message_obj.sid}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_whatsapp_business_api(self, phone: str, message: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال WhatsApp عبر Business API"""
        try:
            url = f"https://graph.facebook.com/v17.0/{settings['phone_number_id']}/messages"
            headers = {
                'Authorization': f"Bearer {settings['access_token']}",
                'Content-Type': 'application/json'
            }
            
            data = {
                'messaging_product': 'whatsapp',
                'to': phone,
                'type': 'text',
                'text': {'body': message}
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {'success': True, 'message_id': result.get('messages', [{}])[0].get('id')}
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_push_via_provider(self, user_id: int, title: str, message: str, data: Optional[Dict], settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال إشعار فوري عبر المزود"""
        try:
            provider = settings.get('provider', 'firebase')
            
            if provider == 'firebase':
                return self._send_push_firebase(user_id, title, message, data, settings)
            elif provider == 'onesignal':
                return self._send_push_onesignal(user_id, title, message, data, settings)
            else:
                return {'success': False, 'error': 'Unsupported push notification provider'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_push_firebase(self, user_id: int, title: str, message: str, data: Optional[Dict], settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال إشعار فوري عبر Firebase"""
        try:
            import firebase_admin
            from firebase_admin import messaging
            
            # Get user device token (implementation needed)
            device_token = self._get_user_device_token(user_id)
            
            if not device_token:
                return {'success': False, 'error': 'Device token not found'}
            
            message_obj = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=message
                ),
                data=data or {},
                token=device_token
            )
            
            response = messaging.send(message_obj)
            return {'success': True, 'message_id': response}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _send_push_onesignal(self, user_id: int, title: str, message: str, data: Optional[Dict], settings: Dict[str, Any]) -> Dict[str, Any]:
        """إرسال إشعار فوري عبر OneSignal"""
        try:
            url = 'https://onesignal.com/api/v1/notifications'
            headers = {
                'Authorization': f"Basic {settings['api_key']}",
                'Content-Type': 'application/json'
            }
            
            payload = {
                'app_id': settings['app_id'],
                'include_external_user_ids': [str(user_id)],
                'headings': {'en': title, 'ar': title},
                'contents': {'en': message, 'ar': message},
                'data': data or {}
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {'success': True, 'message_id': result.get('id')}
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _make_voice_call_via_provider(self, phone: str, message: str, language: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إجراء مكالمة صوتية عبر المزود"""
        try:
            provider = settings.get('provider', 'twilio')
            
            if provider == 'twilio':
                return self._make_voice_call_twilio(phone, message, language, settings)
            else:
                return {'success': False, 'error': 'Unsupported voice call provider'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _make_voice_call_twilio(self, phone: str, message: str, language: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """إجراء مكالمة صوتية عبر Twilio"""
        try:
            from twilio.rest import Client
            from twilio.twiml import VoiceResponse
            
            client = Client(settings['account_sid'], settings['auth_token'])
            
            # Create TwiML for voice message
            response = VoiceResponse()
            response.say(message, voice='alice', language=language)
            
            call = client.calls.create(
                twiml=str(response),
                to=phone,
                from_=settings['from_number']
            )
            
            return {'success': True, 'call_id': call.sid}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_user_device_token(self, user_id: int) -> Optional[str]:
        """الحصول على رمز الجهاز للمستخدم"""
        # Implementation needed - get device token from user preferences or device registration table
        return None
    
    def retry_failed_message(self, message_id: int) -> Dict[str, Any]:
        """إعادة محاولة إرسال رسالة فاشلة"""
        try:
            message = CommunicationMessage.query.get(message_id)
            if not message or message.status != 'failed':
                return {'success': False, 'error': 'Message not found or not failed'}
            
            if message.delivery_attempts >= message.max_attempts:
                return {'success': False, 'error': 'Maximum retry attempts reached'}
            
            # Increment delivery attempts
            message.delivery_attempts += 1
            message.status = 'pending'
            db.session.commit()
            
            # Retry based on channel
            if message.channel == CommunicationChannel.SMS:
                return self.send_sms(message.recipient_phone, message.content, message.template_id)
            elif message.channel == CommunicationChannel.EMAIL:
                return self.send_email(message.recipient_email, message.subject, message.content, message.template_id)
            elif message.channel == CommunicationChannel.WHATSAPP:
                return self.send_whatsapp(message.recipient_phone, message.content, message.template_id)
            elif message.channel == CommunicationChannel.PUSH_NOTIFICATION:
                return self.send_push_notification(message.recipient_id, message.subject, message.content)
            elif message.channel == CommunicationChannel.VOICE_CALL:
                return self.send_voice_call(message.recipient_phone, message.content)
            else:
                return {'success': False, 'error': 'Unsupported channel for retry'}
                
        except Exception as e:
            self.logger.error(f"Message retry failed: {str(e)}")
            return {'success': False, 'error': str(e)}

class ExternalSystemIntegration:
    """خدمة التكامل مع الأنظمة الخارجية"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def sync_with_hospital_system(self, hospital_id: int, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """مزامنة مع نظام المستشفى"""
        try:
            hospital_system = ExternalSystem.query.filter_by(
                id=hospital_id, 
                system_type=ExternalSystemType.HOSPITAL
            ).first()
            
            if not hospital_system:
                return {'success': False, 'error': 'Hospital system not found'}
            
            # Create sync log
            sync_log = DataSyncLog(
                external_system_id=hospital_id,
                sync_type='export',
                operation='create',
                entity_type='patient',
                status='running',
                request_data=patient_data
            )
            db.session.add(sync_log)
            db.session.commit()
            
            # Make API call
            response = self._make_api_call(
                hospital_system.api_endpoint + '/patients',
                'POST',
                patient_data,
                hospital_system.api_key
            )
            
            # Update sync log
            sync_log.status = 'completed' if response['success'] else 'failed'
            sync_log.end_time = datetime.utcnow()
            sync_log.response_data = response
            sync_log.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Hospital sync failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def process_insurance_claim(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """معالجة مطالبة التأمين"""
        try:
            provider_id = claim_data.get('provider_id')
            insurance_provider = InsuranceProvider.query.get(provider_id)
            
            if not insurance_provider:
                return {'success': False, 'error': 'Insurance provider not found'}
            
            # Create claim record
            claim = InsuranceClaim(
                claim_number=self._generate_claim_number(),
                provider_id=provider_id,
                patient_id=claim_data['patient_id'],
                service_date=datetime.fromisoformat(claim_data['service_date']),
                service_type=claim_data['service_type'],
                claimed_amount=claim_data['amount'],
                status='submitted'
            )
            db.session.add(claim)
            db.session.commit()
            
            # Submit to insurance provider
            response = self._submit_insurance_claim(insurance_provider, claim_data)
            
            # Update claim with response
            claim.external_claim_id = response.get('claim_id')
            claim.status = 'under_review' if response['success'] else 'rejected'
            
            db.session.commit()
            
            return {'success': True, 'claim_id': claim.id}
            
        except Exception as e:
            self.logger.error(f"Insurance claim processing failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _make_api_call(self, url: str, method: str, data: Dict[str, Any], api_key: str, retry_count: int = 0) -> Dict[str, Any]:
        """استدعاء API خارجي مع إعادة المحاولة"""
        try:
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'AWAIL-ERP/1.0'
            }
            
            # Add timeout and retry logic
            timeout = 30
            max_retries = 3
            
            if method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'GET':
                response = requests.get(url, params=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                return {'success': False, 'error': 'Unsupported HTTP method'}
            
            # Handle different status codes
            if response.status_code in [200, 201, 202]:
                try:
                    return {'success': True, 'data': response.json()}
                except:
                    return {'success': True, 'data': response.text}
            elif response.status_code in [429, 502, 503, 504] and retry_count < max_retries:
                # Retry for rate limiting or server errors
                import time
                time.sleep(2 ** retry_count)  # Exponential backoff
                return self._make_api_call(url, method, data, api_key, retry_count + 1)
            else:
                error_msg = f'HTTP {response.status_code}'
                try:
                    error_data = response.json()
                    error_msg += f': {error_data.get("message", response.text)}'
                except:
                    error_msg += f': {response.text}'
                return {'success': False, 'error': error_msg}
                
        except requests.exceptions.Timeout:
            if retry_count < max_retries:
                return self._make_api_call(url, method, data, api_key, retry_count + 1)
            return {'success': False, 'error': 'Request timeout'}
        except requests.exceptions.ConnectionError:
            if retry_count < max_retries:
                import time
                time.sleep(1)
                return self._make_api_call(url, method, data, api_key, retry_count + 1)
            return {'success': False, 'error': 'Connection error'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _generate_claim_number(self) -> str:
        """توليد رقم مطالبة"""
        return f"CLM-{datetime.now().strftime('%Y%m%d')}-{datetime.now().microsecond}"
    
    def _submit_insurance_claim(self, provider: InsuranceProvider, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """تقديم مطالبة التأمين"""
        # Implementation for insurance provider API
        try:
            if not provider.api_endpoint:
                return {'success': False, 'error': 'Provider API endpoint not configured'}
            
            headers = {
                'Authorization': f"Bearer {provider.api_key}",
                'Content-Type': 'application/json'
            }
            
            payload = {
                'claim_number': claim_data.get('claim_number'),
                'patient_id': claim_data.get('patient_id'),
                'service_date': claim_data.get('service_date'),
                'service_type': claim_data.get('service_type'),
                'amount': claim_data.get('amount'),
                'diagnosis_code': claim_data.get('diagnosis_code'),
                'treatment_code': claim_data.get('treatment_code')
            }
            
            response = requests.post(
                f"{provider.api_endpoint}/claims",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                return {'success': True, 'claim_id': result.get('claim_id')}
            else:
                return {'success': False, 'error': f'HTTP {response.status_code}: {response.text}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def sync_with_government_system(self, system_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """مزامنة مع النظام الحكومي"""
        try:
            gov_system = ExternalSystem.query.filter_by(
                id=system_id,
                system_type=ExternalSystemType.GOVERNMENT
            ).first()
            
            if not gov_system:
                return {'success': False, 'error': 'Government system not found'}
            
            # Create sync log
            sync_log = DataSyncLog(
                external_system_id=system_id,
                sync_type='export',
                operation='sync',
                entity_type='patient_data',
                status='running',
                request_data=data
            )
            db.session.add(sync_log)
            db.session.commit()
            
            # Make API call
            response = self._make_api_call(
                gov_system.api_endpoint + '/sync',
                'POST',
                data,
                gov_system.api_key
            )
            
            # Update sync log
            sync_log.status = 'completed' if response['success'] else 'failed'
            sync_log.end_time = datetime.utcnow()
            sync_log.response_data = response
            sync_log.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Government system sync failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def sync_with_laboratory_system(self, lab_id: int, test_data: Dict[str, Any]) -> Dict[str, Any]:
        """مزامنة مع نظام المختبر"""
        try:
            lab_system = ExternalSystem.query.filter_by(
                id=lab_id,
                system_type=ExternalSystemType.LABORATORY
            ).first()
            
            if not lab_system:
                return {'success': False, 'error': 'Laboratory system not found'}
            
            # Create sync log
            sync_log = DataSyncLog(
                external_system_id=lab_id,
                sync_type='export',
                operation='create',
                entity_type='lab_test',
                status='running',
                request_data=test_data
            )
            db.session.add(sync_log)
            db.session.commit()
            
            # Make API call
            response = self._make_api_call(
                lab_system.api_endpoint + '/tests',
                'POST',
                test_data,
                lab_system.api_key
            )
            
            # Update sync log
            sync_log.status = 'completed' if response['success'] else 'failed'
            sync_log.end_time = datetime.utcnow()
            sync_log.response_data = response
            sync_log.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Laboratory sync failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def sync_with_pharmacy_system(self, pharmacy_id: int, prescription_data: Dict[str, Any]) -> Dict[str, Any]:
        """مزامنة مع نظام الصيدلية"""
        try:
            pharmacy_system = ExternalSystem.query.filter_by(
                id=pharmacy_id,
                system_type=ExternalSystemType.PHARMACY
            ).first()
            
            if not pharmacy_system:
                return {'success': False, 'error': 'Pharmacy system not found'}
            
            # Create sync log
            sync_log = DataSyncLog(
                external_system_id=pharmacy_id,
                sync_type='export',
                operation='create',
                entity_type='prescription',
                status='running',
                request_data=prescription_data
            )
            db.session.add(sync_log)
            db.session.commit()
            
            # Make API call
            response = self._make_api_call(
                pharmacy_system.api_endpoint + '/prescriptions',
                'POST',
                prescription_data,
                pharmacy_system.api_key
            )
            
            # Update sync log
            sync_log.status = 'completed' if response['success'] else 'failed'
            sync_log.end_time = datetime.utcnow()
            sync_log.response_data = response
            sync_log.error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Pharmacy sync failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def test_system_connection(self, system_id: int) -> Dict[str, Any]:
        """اختبار الاتصال مع النظام الخارجي"""
        try:
            system = ExternalSystem.query.get(system_id)
            if not system:
                return {'success': False, 'error': 'System not found'}
            
            # Test connection based on system type
            if system.system_type == ExternalSystemType.HOSPITAL:
                response = self._test_hospital_connection(system)
            elif system.system_type == ExternalSystemType.INSURANCE:
                response = self._test_insurance_connection(system)
            elif system.system_type == ExternalSystemType.PAYMENT:
                response = self._test_payment_connection(system)
            elif system.system_type == ExternalSystemType.GOVERNMENT:
                response = self._test_government_connection(system)
            elif system.system_type == ExternalSystemType.LABORATORY:
                response = self._test_laboratory_connection(system)
            elif system.system_type == ExternalSystemType.PHARMACY:
                response = self._test_pharmacy_connection(system)
            else:
                response = self._test_generic_connection(system)
            
            # Update system status
            system.last_connection_test = datetime.utcnow()
            system.connection_status = 'active' if response['success'] else 'inactive'
            system.last_error_message = response.get('error')
            
            db.session.commit()
            
            return response
            
        except Exception as e:
            self.logger.error(f"Connection test failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _test_hospital_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال مع نظام المستشفى"""
        return self._make_api_call(system.api_endpoint + '/health', 'GET', {}, system.api_key)
    
    def _test_insurance_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال مع نظام التأمين"""
        return self._make_api_call(system.api_endpoint + '/ping', 'GET', {}, system.api_key)
    
    def _test_payment_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال مع نظام الدفع"""
        return self._make_api_call(system.api_endpoint + '/status', 'GET', {}, system.api_key)
    
    def _test_government_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال مع النظام الحكومي"""
        return self._make_api_call(system.api_endpoint + '/health', 'GET', {}, system.api_key)
    
    def _test_laboratory_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال مع نظام المختبر"""
        return self._make_api_call(system.api_endpoint + '/ping', 'GET', {}, system.api_key)
    
    def _test_pharmacy_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال مع نظام الصيدلية"""
        return self._make_api_call(system.api_endpoint + '/status', 'GET', {}, system.api_key)
    
    def _test_generic_connection(self, system: ExternalSystem) -> Dict[str, Any]:
        """اختبار الاتصال العام"""
        return self._make_api_call(system.api_endpoint, 'GET', {}, system.api_key)

# Initialize services
communication_service = CommunicationService()
integration_service = ExternalSystemIntegration()
