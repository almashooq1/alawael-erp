import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Public "forgot password" page. Self-service reset is not enabled; password
 * resets are performed by the center administrator (User Management → Reset).
 * This page gives clear, honest guidance instead of a dead link / 404.
 */
export default function ForgotPassword() {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-[Tajawal,sans-serif] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
          <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
            <span className="text-2xl" aria-hidden>🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-primary-700">استعادة كلمة المرور</h1>
          <p className="mt-3 text-gray-600 leading-relaxed">
            لأسباب أمنية، تتم إعادة تعيين كلمة المرور بواسطة مشرف المركز. يُرجى التواصل مع
            الإدارة لإعادة تعيين كلمة المرور الخاصة بحسابك.
          </p>

          <div className="mt-6 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-600 text-right space-y-2">
            <p className="font-semibold text-gray-700">خطوات الاستعادة:</p>
            <ol className="list-decimal pr-5 space-y-1">
              <li>تواصل مع مشرف النظام أو إدارة المركز.</li>
              <li>سيتحقّق المشرف من هويتك ويُعيد تعيين كلمة المرور.</li>
              <li>ستستلم كلمة مرور مؤقتة لتغييرها عند أول دخول.</li>
            </ol>
          </div>

          <Link
            to="/login"
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-primary-700 px-5 py-3 text-white font-semibold hover:bg-primary-800 transition-colors"
          >
            العودة لتسجيل الدخول
          </Link>
          <Link to="/" className="mt-3 inline-block text-sm text-gray-500 hover:text-primary-700 transition-colors">
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
