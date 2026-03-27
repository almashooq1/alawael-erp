// Authentication JavaScript
$(document).ready(function() {
    // Toggle password visibility
    $('#togglePassword').click(function() {
        const passwordField = $('#password');
        const icon = $(this).find('i');
        
        if (passwordField.attr('type') === 'password') {
            passwordField.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            passwordField.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });
    
    // Show register modal
    $('#registerLink').click(function(e) {
        e.preventDefault();
        $('#registerModal').modal('show');
    });
    
    // Login form submission
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        
        const formData = {
            username: $('#username').val(),
            password: $('#password').val()
        };
        
        // Show loading state
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.html();
        submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>جاري تسجيل الدخول...');
        submitBtn.prop('disabled', true);
        
        $.ajax({
            url: '/api/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    // Store token
                    localStorage.setItem('token', response.access_token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    
                    showAlert('success', response.message);
                    
                    // Redirect to dashboard
                    setTimeout(function() {
                        window.location.href = '/dashboard';
                    }, 1000);
                } else {
                    showAlert('danger', response.error);
                }
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                showAlert('danger', response ? response.error : 'حدث خطأ في الاتصال');
            },
            complete: function() {
                // Reset button
                submitBtn.html(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    });
    
    // Register form submission
    $('#submitRegister').click(function() {
        const form = $('#registerForm');
        
        // Validate form
        if (!validateRegisterForm()) {
            return;
        }
        
        const formData = {
            name: $('#registerName').val(),
            national_id: $('#registerNationalId').val(),
            email: $('#registerEmail').val(),
            phone: $('#registerPhone').val(),
            role: $('#registerRole').val(),
            address: $('#registerAddress').val(),
            password: $('#registerPassword').val()
        };
        
        // Show loading state
        const submitBtn = $(this);
        const originalText = submitBtn.html();
        submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>جاري التسجيل...');
        submitBtn.prop('disabled', true);
        
        $.ajax({
            url: '/api/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function(response) {
                if (response.success) {
                    showAlert('success', response.message);
                    $('#registerModal').modal('hide');
                    form[0].reset();
                } else {
                    showAlert('danger', response.error);
                }
            },
            error: function(xhr) {
                const response = xhr.responseJSON;
                showAlert('danger', response ? response.error : 'حدث خطأ في التسجيل');
            },
            complete: function() {
                // Reset button
                submitBtn.html(originalText);
                submitBtn.prop('disabled', false);
            }
        });
    });
    
    // Validate register form
    function validateRegisterForm() {
        const name = $('#registerName').val().trim();
        const nationalId = $('#registerNationalId').val().trim();
        const email = $('#registerEmail').val().trim();
        const role = $('#registerRole').val();
        const password = $('#registerPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        
        if (!name) {
            showAlert('danger', 'يرجى إدخال الاسم الكامل');
            return false;
        }
        
        if (!nationalId) {
            showAlert('danger', 'يرجى إدخال رقم الهوية');
            return false;
        }
        
        if (nationalId.length < 10) {
            showAlert('danger', 'رقم الهوية يجب أن يكون 10 أرقام على الأقل');
            return false;
        }
        
        if (!email) {
            showAlert('danger', 'يرجى إدخال البريد الإلكتروني');
            return false;
        }
        
        if (!isValidEmail(email)) {
            showAlert('danger', 'يرجى إدخال بريد إلكتروني صحيح');
            return false;
        }
        
        if (!role) {
            showAlert('danger', 'يرجى اختيار الدور');
            return false;
        }
        
        if (!password) {
            showAlert('danger', 'يرجى إدخال كلمة المرور');
            return false;
        }
        
        if (password.length < 6) {
            showAlert('danger', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return false;
        }
        
        if (password !== confirmPassword) {
            showAlert('danger', 'كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
            return false;
        }
        
        return true;
    }
    
    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show alert message
    function showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
            </div>
        `;
        
        $('#alert-container').html(alertHtml);
        
        // Auto hide after 5 seconds
        setTimeout(function() {
            $('.alert').fadeOut();
        }, 5000);
    }
    
    // Clear alerts when modal is closed
    $('#registerModal').on('hidden.bs.modal', function() {
        $('#alert-container').empty();
    });
});
