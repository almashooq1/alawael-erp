const API_BASE = '/api/documents-smart';

async function verify() {
  const ref = document.getElementById('refInput').value.trim();
  if (!ref) return alert('الرجاء إدخال الرقم المرجعي');

  const resultDiv = document.getElementById('result');
  resultDiv.style.display = 'none';
  resultDiv.className = '';
  resultDiv.innerHTML = 'جاري التحقق...';
  resultDiv.style.display = 'block';

  try {
    const res = await fetch(`${API_BASE}/verify/${encodeURIComponent(ref)}`);
    const data = await res.json();

    if (data.success && data.valid) {
      resultDiv.className = 'valid';
      const info = data.data;
      resultDiv.innerHTML = `
                <h3>✅ وثيقة رسمية معتمدة</h3>
                <p><strong>الرقم المرجعي:</strong> ${info.referenceNumber}</p>
                <p><strong>النوع:</strong> ${info.type}</p>
                <p><strong>الحالة:</strong> ${info.status}</p>
                <p><strong>تاريخ الإصدار:</strong> ${new Date(info.issuedDate).toLocaleDateString('ar-SA')}</p>
            `;
    } else {
      resultDiv.className = 'invalid';
      resultDiv.innerHTML = `
                <h3>❌ وثيقة غير صالحة أو غير موجودة</h3>
                <p>${data.message || 'لم يتم العثور على سجل مطابق في النظام.'}</p>
            `;
    }
  } catch (err) {
    console.error(err);
    resultDiv.className = 'invalid';
    resultDiv.innerHTML = 'حدث خطأ في الاتصال بالنظام.';
  }
}
