# دليل الإدارة والصيانة

## النسخ الاحتياطي

- بيانات MongoDB محفوظة في volume باسم mongo_data
- لعمل نسخة احتياطية:
  ```bash
  docker run --rm -v mongo_data:/data/db -v $(pwd):/backup busybox tar czvf /backup/mongo_backup_$(date +%F).tar.gz /data/db
  ```

## استعادة النسخة الاحتياطية

- أوقف الخدمات:
  ```bash
  docker-compose down
  ```
- استرجع النسخة:
  ```bash
  tar xzvf mongo_backup_YYYY-MM-DD.tar.gz -C ./mongo_data
  ```
- أعد تشغيل الخدمات:
  ```bash
  docker-compose up -d
  ```

## مراقبة النظام

- راقب logs:
  ```bash
  docker-compose logs -f app
  ```
- يوصى بدمج أدوات مراقبة مثل Grafana أو Prometheus

## تحديث النظام

- اسحب آخر نسخة من المستودع
- أعد بناء الحاويات:
  ```bash
  docker-compose up --build -d
  ```

## الأمان

- حدث كلمة مرور MongoDB وJWT_SECRET بشكل دوري
- راجع صلاحيات المستخدمين

## الدعم

- احتفظ بنسخة من هذا الدليل مع بيانات الدخول والصيانة
