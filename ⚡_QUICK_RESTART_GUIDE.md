# ⚡ تعليمات إعادة التشغيل السريعة

## الخطوات الفورية:

### 1. تشغيل Docker Desktop

افتح قائمة Start وابحث عن **Docker Desktop** وشغّله

- ستستغرق 30-60 ثانية للبدء بالكامل
- انتظر حتى تري رمز Docker في system tray ✓

### 2. التحقق من Docker

```powershell
docker ps
```

يجب أن ترى جدول بالحاويات

### 3. تشغيل الحاويات

```powershell
cd C:\Users\x-be\OneDrive\المستندات\04-10-2025\66666
docker-compose up -d
```

### 4. انتظر 10 ثوان ثم تحقق من الحالة

```powershell
docker ps
```

### 5. فحص الصحة

```powershell
npm run health:check
```

يجب أن تري:

- ✅ API Backend - healthy
- ✅ Frontend - healthy
- ✅ MongoDB - healthy
- ✅ Redis - healthy

### 6. بدء المراقبة

```powershell
npm run monitor:all
```

---

## الأوامر الإدارية:

### إيقاف كل شيء

```powershell
docker-compose down
```

### إعادة تشغيل خدمة محددة

```powershell
docker-compose restart alaweal-api
```

### عرض السجلات

```powershell
docker logs alaweal-api --tail 50
```

### تنظيف النظام

```powershell
docker system prune -f
```

---

## المشاكل الشائعة:

| المشكلة                    | الحل                                            |
| -------------------------- | ----------------------------------------------- |
| "port already allocated"   | `docker-compose down` ثم `docker-compose up -d` |
| "Connection refused" Redis | انتظر 10 ثوان، Redis يستغرق وقت للبدء           |
| RAM مرتفع جداً (>90%)      | `docker-compose down` ثم أعد التشغيل            |
| Docker لا يستجيب           | أعد تشغيل الكمبيوتر                             |

---

**الحالة**: ✅ كل شيء جاهز، فقط شغّل Docker Desktop!
