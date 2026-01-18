/**
 * Hikvision Integration Service
 * التكامل مع كاميرات Hikvision
 */

const axios = require('axios');
const crypto = require('crypto');

class HikvisionService {
  constructor(config = {}) {
    this.timeout = config.timeout || 10000;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * إنشء عميل axios مخصص لكاميرا معينة
   */
  createClient(ipAddress, port, username, password) {
    const baseURL = `http://${ipAddress}:${port}`;

    // إنشاء رابط التحقق الأساسي
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    return axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * اختبار الاتصال بالكاميرا
   */
  async testConnection(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/System/deviceInfo');

      return {
        success: true,
        data: response.data,
        message: 'تم الاتصال بنجاح',
      };
    } catch (error) {
      console.error('❌ خطأ الاتصال بـ Hikvision:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'فشل الاتصال بالكاميرا',
      };
    }
  }

  /**
   * الحصول على معلومات الجهاز
   */
  async getDeviceInfo(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);

      const [deviceInfo, systemInfo, channelInfo] = await Promise.all([
        client.get('/ISAPI/System/deviceInfo'),
        client.get('/ISAPI/System/systemInfo'),
        client.get('/ISAPI/ContentMgmt/StreamingChannels'),
      ]);

      return {
        success: true,
        device: {
          deviceId: deviceInfo.data?.deviceID || 'unknown',
          serialNumber: deviceInfo.data?.serialNumber || 'unknown',
          model: deviceInfo.data?.model || 'unknown',
          firmwareVersion: deviceInfo.data?.firmwareVersion || 'unknown',
          channels: channelInfo.data?.StreamingChannelList?.length || 1,
          systemInfo: systemInfo.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على رابط البث المباشر RTSP
   */
  async getLiveStreamUrl(ipAddress, port, username, password, channelId = 1) {
    try {
      // صيغة RTSP القياسية لكاميرات Hikvision
      const rtspUrl = `rtsp://${username}:${password}@${ipAddress}:${port}/Streaming/Channels/${channelId}/`;

      return {
        success: true,
        url: rtspUrl,
        protocol: 'rtsp',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على قائمة القنوات
   */
  async getChannels(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/ContentMgmt/StreamingChannels');

      const channels =
        response.data?.StreamingChannelList?.map((channel, index) => ({
          id: channel.id || index + 1,
          name: channel.channelName || `Channel ${index + 1}`,
          enabled: channel.enabled !== false,
        })) || [];

      return {
        success: true,
        channels,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        channels: [],
      };
    }
  }

  /**
   * تفعيل/تعطيل الكشف عن الحركة
   */
  async setMotionDetection(ipAddress, port, username, password, enabled, sensitivity = 50) {
    try {
      const client = this.createClient(ipAddress, port, username, password);

      const payload = {
        MotionDetection: {
          enabled: enabled ? 'true' : 'false',
          sensitivityLevel: Math.min(100, Math.max(1, sensitivity)),
        },
      };

      await client.put('/ISAPI/System/Video/inputs/channels/1/motionDetection', payload);

      return {
        success: true,
        message: `تم ${enabled ? 'تفعيل' : 'تعطيل'} كشف الحركة`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على حالة الكشف عن الحركة
   */
  async getMotionDetectionStatus(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/System/Video/inputs/channels/1/motionDetection');

      return {
        success: true,
        data: {
          enabled: response.data?.MotionDetection?.enabled === 'true',
          sensitivity: parseInt(response.data?.MotionDetection?.sensitivityLevel) || 50,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * التحكم بتسجيل الفيديو
   */
  async setRecording(ipAddress, port, username, password, enabled) {
    try {
      const client = this.createClient(ipAddress, port, username, password);

      // الحصول على معرف حساب التسجيل
      const recordingPlans = await client.get('/ISAPI/ContentMgmt/recordingConfigs');
      const recordingId = recordingPlans.data?.RecordingConfigList?.[0]?.id || 1;

      const payload = {
        RecordingConfig: {
          id: recordingId,
          enabled: enabled ? 'true' : 'false',
        },
      };

      await client.put(`/ISAPI/ContentMgmt/recordingConfigs/${recordingId}`, payload);

      return {
        success: true,
        message: `تم ${enabled ? 'بدء' : 'إيقاف'} التسجيل`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على حالة التسجيل
   */
  async getRecordingStatus(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/ContentMgmt/recordingConfigs');

      const isRecording = response.data?.RecordingConfigList?.[0]?.enabled === 'true';

      return {
        success: true,
        isRecording,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * إعادة تشغيل الكاميرا
   */
  async rebootCamera(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);

      await client.put('/ISAPI/System/reboot', {});

      return {
        success: true,
        message: 'تم إرسال أمر إعادة التشغيل',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على سجل الأحداث
   */
  async getEventLog(ipAddress, port, username, password, limit = 100) {
    try {
      const client = this.createClient(ipAddress, port, username, password);

      // البحث عن الأحداث
      const searchPayload = {
        SearchCond: {
          searchID: '1',
          trackList: ['All'],
          logType: 'All',
          maxResults: limit,
          searchResultPosition: 0,
          utcStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // آخر 24 ساعة
          utcEndTime: new Date().toISOString(),
        },
      };

      const response = await client.post('/ISAPI/System/logs/search', searchPayload);

      const logs =
        response.data?.SearchMatchList?.map(log => ({
          timestamp: log.timeStamp,
          type: log.logType,
          description: log.logDescription,
          source: log.source,
        })) || [];

      return {
        success: true,
        logs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [],
      };
    }
  }

  /**
   * حفظ صورة من الفيديو المباشر
   */
  async captureSnapshot(ipAddress, port, username, password, channelId = 1) {
    try {
      const client = this.createClient(ipAddress, port, username, password);

      const response = await client.get(`/ISAPI/Streaming/channels/${channelId}/picture`, { responseType: 'arraybuffer' });

      return {
        success: true,
        imageBuffer: response.data,
        contentType: response.headers['content-type'],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على معلومات الشبكة
   */
  async getNetworkInfo(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/System/network/interfaces');

      const interfaces =
        response.data?.NetworkInterfaceList?.map(iface => ({
          name: iface.interfaceType,
          ipAddress: iface.IPv4Address,
          subnetMask: iface.IPv4SubnetMask,
          gateway: iface.IPv4Gateway,
          mac: iface.macAddress,
        })) || [];

      return {
        success: true,
        interfaces,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على حالة التخزين
   */
  async getStorageStatus(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/System/storage/storageDevices');

      const devices =
        response.data?.StorageDeviceList?.map(device => ({
          name: device.name,
          type: device.storageType,
          totalCapacity: device.totalCapacity,
          freeSpace: device.freeSpace,
          usedSpace: device.totalCapacity - device.freeSpace,
          usagePercentage: (((device.totalCapacity - device.freeSpace) / device.totalCapacity) * 100).toFixed(2),
        })) || [];

      return {
        success: true,
        devices,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على إحصائيات الاتصال
   */
  async getConnectionStats(ipAddress, port, username, password) {
    try {
      const client = this.createClient(ipAddress, port, username, password);
      const response = await client.get('/ISAPI/System/stats');

      return {
        success: true,
        stats: {
          systemUptime: response.data?.systemUptime,
          currentConnections: response.data?.currentConnections,
          cpuUsage: response.data?.cpuUsage,
          memoryUsage: response.data?.memoryUsage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new HikvisionService();
