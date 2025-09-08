"""
تكامل محسن مع كاميرات Hikvision
Enhanced Hikvision Camera Integration
"""

import requests
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np
import logging
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class HikvisionAPI:
    """فئة للتكامل مع Hikvision Camera API"""
    
    def __init__(self, camera_ip: str, username: str, password: str, port: int = 80):
        self.camera_ip = camera_ip
        self.username = username
        self.password = password
        self.port = port
        self.base_url = f"http://{camera_ip}:{port}"
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth
        
    def get_device_info(self) -> Dict:
        """الحصول على معلومات الجهاز"""
        try:
            url = f"{self.base_url}/ISAPI/System/deviceInfo"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                # تحليل XML response
                root = ET.fromstring(response.content)
                device_info = {
                    'device_name': root.find('.//deviceName').text if root.find('.//deviceName') is not None else '',
                    'device_id': root.find('.//deviceID').text if root.find('.//deviceID') is not None else '',
                    'model': root.find('.//model').text if root.find('.//model') is not None else '',
                    'serial_number': root.find('.//serialNumber').text if root.find('.//serialNumber') is not None else '',
                    'firmware_version': root.find('.//firmwareVersion').text if root.find('.//firmwareVersion') is not None else '',
                    'firmware_release_date': root.find('.//firmwareReleasedDate').text if root.find('.//firmwareReleasedDate') is not None else '',
                    'hardware_version': root.find('.//hardwareVersion').text if root.find('.//hardwareVersion') is not None else '',
                    'encoder_version': root.find('.//encoderVersion').text if root.find('.//encoderVersion') is not None else '',
                    'decoder_version': root.find('.//decoderVersion').text if root.find('.//decoderVersion') is not None else ''
                }
                return device_info
            else:
                logger.error(f"فشل في الحصول على معلومات الجهاز: {response.status_code}")
                return {}
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على معلومات الجهاز: {str(e)}")
            return {}
    
    def get_system_status(self) -> Dict:
        """الحصول على حالة النظام"""
        try:
            url = f"{self.base_url}/ISAPI/System/status"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                status = {
                    'current_device_time': root.find('.//currentDeviceTime').text if root.find('.//currentDeviceTime') is not None else '',
                    'device_up_time': root.find('.//deviceUpTime').text if root.find('.//deviceUpTime') is not None else '',
                    'cpu_usage': root.find('.//cpuUsage').text if root.find('.//cpuUsage') is not None else '0',
                    'memory_usage': root.find('.//memoryUsage').text if root.find('.//memoryUsage') is not None else '0',
                    'temperature': root.find('.//temperature').text if root.find('.//temperature') is not None else '0'
                }
                return status
            else:
                return {}
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على حالة النظام: {str(e)}")
            return {}
    
    def get_streaming_channels(self) -> List[Dict]:
        """الحصول على قنوات البث المتاحة"""
        try:
            url = f"{self.base_url}/ISAPI/Streaming/channels"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                channels = []
                
                for channel in root.findall('.//StreamingChannel'):
                    channel_info = {
                        'id': channel.find('id').text if channel.find('id') is not None else '',
                        'channel_name': channel.find('channelName').text if channel.find('channelName') is not None else '',
                        'enabled': channel.find('enabled').text if channel.find('enabled') is not None else 'false',
                        'transport': []
                    }
                    
                    # الحصول على معلومات النقل
                    transport_elem = channel.find('Transport')
                    if transport_elem is not None:
                        protocol_list = transport_elem.find('ProtocolList')
                        if protocol_list is not None:
                            for protocol in protocol_list.findall('Protocol'):
                                protocol_info = {
                                    'type': protocol.find('type').text if protocol.find('type') is not None else '',
                                    'enabled': protocol.find('enabled').text if protocol.find('enabled') is not None else 'false'
                                }
                                channel_info['transport'].append(protocol_info)
                    
                    channels.append(channel_info)
                
                return channels
            else:
                return []
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على قنوات البث: {str(e)}")
            return []
    
    def get_rtsp_url(self, channel_id: int = 1, stream_type: str = 'main') -> str:
        """إنشاء رابط RTSP للكاميرا"""
        if stream_type == 'main':
            stream_id = f"{channel_id}01"
        else:  # sub stream
            stream_id = f"{channel_id}02"
        
        rtsp_url = f"rtsp://{self.username}:{self.password}@{self.camera_ip}:554/Streaming/Channels/{stream_id}"
        return rtsp_url
    
    def start_recording(self, channel_id: int = 1) -> bool:
        """بدء التسجيل"""
        try:
            url = f"{self.base_url}/ISAPI/ContentMgmt/record/control/manual/start/tracks/{channel_id}01"
            response = self.session.put(url, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"خطأ في بدء التسجيل: {str(e)}")
            return False
    
    def stop_recording(self, channel_id: int = 1) -> bool:
        """إيقاف التسجيل"""
        try:
            url = f"{self.base_url}/ISAPI/ContentMgmt/record/control/manual/stop/tracks/{channel_id}01"
            response = self.session.put(url, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"خطأ في إيقاف التسجيل: {str(e)}")
            return False
    
    def get_recordings_list(self, start_time: datetime, end_time: datetime, channel_id: int = 1) -> List[Dict]:
        """الحصول على قائمة التسجيلات"""
        try:
            # تحويل التواريخ إلى تنسيق ISO
            start_str = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            end_str = end_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            # إنشاء XML للطلب
            xml_data = f"""<?xml version="1.0" encoding="UTF-8"?>
            <CMSearchDescription>
                <searchID>{datetime.now().strftime('%Y%m%d%H%M%S')}</searchID>
                <trackList>
                    <trackID>{channel_id}01</trackID>
                </trackList>
                <timeSpanList>
                    <timeSpan>
                        <startTime>{start_str}</startTime>
                        <endTime>{end_str}</endTime>
                    </timeSpan>
                </timeSpanList>
                <maxResults>100</maxResults>
                <searchResultPosition>0</searchResultPosition>
                <metadataList>
                    <metadataDescriptor>//recordType.meta.std-cgi.com</metadataDescriptor>
                </metadataList>
            </CMSearchDescription>"""
            
            url = f"{self.base_url}/ISAPI/ContentMgmt/search"
            headers = {'Content-Type': 'application/xml'}
            
            response = self.session.post(url, data=xml_data, headers=headers, timeout=30)
            
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                recordings = []
                
                for match in root.findall('.//searchMatchItem'):
                    recording = {
                        'source_id': match.find('.//sourceID').text if match.find('.//sourceID') is not None else '',
                        'start_time': match.find('.//timeSpan/startTime').text if match.find('.//timeSpan/startTime') is not None else '',
                        'end_time': match.find('.//timeSpan/endTime').text if match.find('.//timeSpan/endTime') is not None else '',
                        'playback_uri': match.find('.//playbackURI').text if match.find('.//playbackURI') is not None else '',
                        'media_type': match.find('.//mediaType').text if match.find('.//mediaType') is not None else '',
                        'file_size': match.find('.//filePath').text if match.find('.//filePath') is not None else ''
                    }
                    recordings.append(recording)
                
                return recordings
            else:
                logger.error(f"فشل في الحصول على قائمة التسجيلات: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على قائمة التسجيلات: {str(e)}")
            return []
    
    def download_recording(self, playback_uri: str, output_path: str) -> bool:
        """تحميل تسجيل معين"""
        try:
            url = urljoin(self.base_url, playback_uri)
            
            with self.session.get(url, stream=True, timeout=30) as response:
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    return True
                else:
                    logger.error(f"فشل في تحميل التسجيل: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"خطأ في تحميل التسجيل: {str(e)}")
            return False
    
    def get_motion_detection_config(self, channel_id: int = 1) -> Dict:
        """الحصول على إعدادات كشف الحركة"""
        try:
            url = f"{self.base_url}/ISAPI/System/Video/inputs/channels/{channel_id}/motionDetection"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                config = {
                    'enabled': root.find('.//enabled').text if root.find('.//enabled') is not None else 'false',
                    'sensitivity_level': root.find('.//sensitivityLevel').text if root.find('.//sensitivityLevel') is not None else '0',
                    'sampling_interval': root.find('.//samplingInterval').text if root.find('.//samplingInterval') is not None else '2'
                }
                return config
            else:
                return {}
                
        except Exception as e:
            logger.error(f"خطأ في الحصول على إعدادات كشف الحركة: {str(e)}")
            return {}
    
    def set_motion_detection(self, channel_id: int = 1, enabled: bool = True, sensitivity: int = 50) -> bool:
        """تعيين إعدادات كشف الحركة"""
        try:
            xml_data = f"""<?xml version="1.0" encoding="UTF-8"?>
            <MotionDetection>
                <enabled>{'true' if enabled else 'false'}</enabled>
                <sensitivityLevel>{sensitivity}</sensitivityLevel>
                <samplingInterval>2</samplingInterval>
            </MotionDetection>"""
            
            url = f"{self.base_url}/ISAPI/System/Video/inputs/channels/{channel_id}/motionDetection"
            headers = {'Content-Type': 'application/xml'}
            
            response = self.session.put(url, data=xml_data, headers=headers, timeout=10)
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"خطأ في تعيين إعدادات كشف الحركة: {str(e)}")
            return False
    
    def get_snapshot(self, channel_id: int = 1) -> Optional[bytes]:
        """أخذ لقطة من الكاميرا"""
        try:
            url = f"{self.base_url}/ISAPI/Streaming/channels/{channel_id}01/picture"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"فشل في أخذ اللقطة: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"خطأ في أخذ اللقطة: {str(e)}")
            return None
    
    def ptz_control(self, channel_id: int = 1, command: str = 'UP', speed: int = 50) -> bool:
        """التحكم في PTZ (إذا كانت الكاميرا تدعم ذلك)"""
        try:
            xml_data = f"""<?xml version="1.0" encoding="UTF-8"?>
            <PTZData>
                <pan>{speed if command in ['LEFT', 'RIGHT'] else 0}</pan>
                <tilt>{speed if command in ['UP', 'DOWN'] else 0}</tilt>
                <zoom>{speed if command in ['ZOOM_IN', 'ZOOM_OUT'] else 0}</zoom>
            </PTZData>"""
            
            url = f"{self.base_url}/ISAPI/PTZCtrl/channels/{channel_id}/continuous"
            headers = {'Content-Type': 'application/xml'}
            
            response = self.session.put(url, data=xml_data, headers=headers, timeout=10)
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"خطأ في التحكم بـ PTZ: {str(e)}")
            return False
    
    def test_connection(self) -> bool:
        """اختبار الاتصال مع الكاميرا"""
        try:
            device_info = self.get_device_info()
            return bool(device_info)
        except Exception as e:
            logger.error(f"فشل اختبار الاتصال: {str(e)}")
            return False

class HikvisionCameraManager:
    """مدير كاميرات Hikvision"""
    
    def __init__(self):
        self.cameras = {}  # {camera_id: HikvisionAPI}
    
    def add_camera(self, camera_id: str, ip: str, username: str, password: str, port: int = 80) -> bool:
        """إضافة كاميرا جديدة"""
        try:
            hikvision_api = HikvisionAPI(ip, username, password, port)
            if hikvision_api.test_connection():
                self.cameras[camera_id] = hikvision_api
                logger.info(f"تم إضافة كاميرا Hikvision: {camera_id}")
                return True
            else:
                logger.error(f"فشل في الاتصال بكاميرا Hikvision: {camera_id}")
                return False
        except Exception as e:
            logger.error(f"خطأ في إضافة كاميرا Hikvision: {str(e)}")
            return False
    
    def get_camera(self, camera_id: str) -> Optional[HikvisionAPI]:
        """الحصول على كاميرا معينة"""
        return self.cameras.get(camera_id)
    
    def get_all_cameras_status(self) -> Dict:
        """الحصول على حالة جميع الكاميرات"""
        status = {}
        for camera_id, camera_api in self.cameras.items():
            try:
                device_info = camera_api.get_device_info()
                system_status = camera_api.get_system_status()
                
                status[camera_id] = {
                    'connected': bool(device_info),
                    'device_info': device_info,
                    'system_status': system_status,
                    'rtsp_url': camera_api.get_rtsp_url()
                }
            except Exception as e:
                status[camera_id] = {
                    'connected': False,
                    'error': str(e)
                }
        
        return status
    
    def bulk_start_recording(self, camera_ids: List[str] = None) -> Dict:
        """بدء التسجيل لعدة كاميرات"""
        if camera_ids is None:
            camera_ids = list(self.cameras.keys())
        
        results = {}
        for camera_id in camera_ids:
            camera_api = self.cameras.get(camera_id)
            if camera_api:
                try:
                    success = camera_api.start_recording()
                    results[camera_id] = {'success': success}
                except Exception as e:
                    results[camera_id] = {'success': False, 'error': str(e)}
            else:
                results[camera_id] = {'success': False, 'error': 'Camera not found'}
        
        return results
    
    def bulk_stop_recording(self, camera_ids: List[str] = None) -> Dict:
        """إيقاف التسجيل لعدة كاميرات"""
        if camera_ids is None:
            camera_ids = list(self.cameras.keys())
        
        results = {}
        for camera_id in camera_ids:
            camera_api = self.cameras.get(camera_id)
            if camera_api:
                try:
                    success = camera_api.stop_recording()
                    results[camera_id] = {'success': success}
                except Exception as e:
                    results[camera_id] = {'success': False, 'error': str(e)}
            else:
                results[camera_id] = {'success': False, 'error': 'Camera not found'}
        
        return results

# إنشاء مثيل عام لمدير كاميرات Hikvision
hikvision_manager = HikvisionCameraManager()
