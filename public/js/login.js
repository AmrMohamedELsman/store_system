// متغيرات تسجيل الدخول
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');

// دالة للحصول على جميع المستخدمين (من localStorage + المستخدمين الافتراضيين)
function getAllUsers() {
    // المستخدمين المحفوظين في localStorage
    const savedUsers = JSON.parse(localStorage.getItem('systemUsers') || '[]');
    
    // المستخدمين الافتراضيين (للاحتياط)
    const defaultUsers = [
        {
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'المدير الافتراضي',
            isActive: true
        }
    ];
    
    // دمج المستخدمين مع تجنب التكرار
    const allUsers = [...savedUsers];
    
    // إضافة المستخدمين الافتراضيين إذا لم يكونوا موجودين
    defaultUsers.forEach(defaultUser => {
        const exists = allUsers.find(user => user.username === defaultUser.username);
        if (!exists) {
            allUsers.push(defaultUser);
        }
    });
    
    return allUsers.filter(user => user.isActive !== false); // فقط المستخدمين النشطين
}

// دالة للحصول على اسم الدور للعرض
function getRoleDisplayName(role) {
    const roles = {
        'admin': 'مدير النظام',
        'manager': 'مدير',
        'cashier': 'كاشير'
    };
    return roles[role] || role;
}

// التحقق من حالة تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود جلسة محفوظة
    const savedSession = localStorage.getItem('userSession');
    if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.rememberMe && session.expiryDate > Date.now()) {
            // إعادة توجيه للصفحة الرئيسية
            window.location.href = 'index.html';
            return;
        } else {
            // إزالة الجلسة المنتهية الصلاحية
            localStorage.removeItem('userSession');
        }
    }
    
    // التركيز على حقل اسم المستخدم
    usernameInput.focus();
});

// معالج تسجيل الدخول
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;
    
    // التحقق من صحة البيانات
    if (!username || !password) {
        showMessage('يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    // الحصول على جميع المستخدمين
    const allUsers = getAllUsers();
    
    // البحث عن المستخدم
    const user = allUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        // التحقق من أن المستخدم نشط
        if (user.isActive === false) {
            showMessage('هذا المستخدم غير نشط. يرجى التواصل مع المدير', 'error');
            return;
        }
        
        // تسجيل دخول ناجح
        showMessage('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');
        
        // حفظ بيانات الجلسة
        const sessionData = {
            userId: user.id || user.username,
            username: user.username,
            role: user.role,
            fullName: user.fullName || user.username,
            email: user.email || '',
            loginTime: Date.now(),
            rememberMe: rememberMe,
            expiryDate: rememberMe ? Date.now() + (30 * 24 * 60 * 60 * 1000) : Date.now() + (24 * 60 * 60 * 1000) // 30 يوم أو 24 ساعة
        };
        
        if (rememberMe) {
            localStorage.setItem('userSession', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        }
        
        // التحويل للصفحة الرئيسية بعد ثانيتين
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } else {
        // بيانات خاطئة
        showMessage('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        passwordInput.value = '';
        passwordInput.focus();
    }
});

// دالة إظهار الرسائل
function showMessage(message, type) {
    // إزالة الرسائل السابقة
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // إنشاء رسالة جديدة
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // إدراج الرسالة قبل النموذج
    loginForm.insertBefore(messageDiv, loginForm.firstChild);
    
    // إخفاء الرسالة بعد 5 ثوان
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 5000);
}

// دالة إظهار/إخفاء كلمة المرور
function togglePassword() {
    const passwordField = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordField.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
}

// معالج الضغط على Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});