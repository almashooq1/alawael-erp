import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

// تطبيق RTL والعربية
document.documentElement.dir = 'rtl';
document.documentElement.lang = 'ar';
document.documentElement.classList.add('ar');

const app = createApp(App);

app.use(createPinia());
app.use(router);

// إضافة خاصية عامة للتواريخ والأرقام
app.config.globalProperties.$formatNumber = num => {
  return new Intl.NumberFormat('ar-SA').format(num);
};

app.config.globalProperties.$formatDate = date => {
  return new Intl.DateTimeFormat('ar-SA').format(new Date(date));
};

app.mount('#app');
