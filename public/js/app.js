// متغيرات عامة
let currentPage = 'dashboard';
let cart = [];
let products = [];
let customers = [];
let sales = [];

// متغيرات جديدة للمشتريات والمصروفات

let purchases = [];
let expenses = [];
let purchaseCart = [];

// متغيرات الفلتر
let filteredPurchases = [];
let currentPurchaseFilter = 'today'; // افتراضي: مشتريات اليوم

// دوال مساعدة لتنسيق التواريخ
function formatLocalDate(dateString, options = {}) {
    if (!dateString) return 'غير محدد';
    
    try {
        const date = new Date(dateString);
        
        // التحقق من صحة التاريخ
        if (isNaN(date.getTime())) {
            return 'تاريخ غير صالح';
        }
        
        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Africa/Cairo'
        };
        
        return date.toLocaleDateString('ar-EG', { ...defaultOptions, ...options });
    } catch (error) {
        console.error('خطأ في تنسيق التاريخ:', error);
        return 'تاريخ غير صالح';
    }
}

function formatLocalDateTime(dateString, options = {}) {
    const date = new Date(dateString);
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Cairo'
    };
    return date.toLocaleString('ar-EG', { ...defaultOptions, ...options });
}

function getCurrentLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const result = `${year}-${month}-${day}`;
    console.log('تاريخ اليوم المحلي:', result);
    return result;
}

function getWeekAgoDate() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return weekAgo.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

// متغيرات المخططات
let salesChart = null;
let categoriesChart = null;

// تحديث التاريخ والوقت
function updateDateTime() {
    const now = new Date();
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('ar-EG');
    }
}

// تحميل البيانات من الخادم
async function fetchData(endpoint) {
    try {
        const response = await fetch(`/api/${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`خطأ في تحميل البيانات من ${endpoint}:`, error);
        showMessage('حدث خطأ في تحميل البيانات', 'error');
        return [];
    }
}

// إرسال البيانات إلى الخادم
async function postData(endpoint, data) {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`خطأ في إرسال البيانات إلى ${endpoint}:`, error);
        showMessage('حدث خطأ في حفظ البيانات', 'error');
        throw error;
    }
}

// عرض الرسائل
function showMessage(message, type = 'success') {
    // إنشاء حاوية الإشعارات إذا لم تكن موجودة
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // تحديد الأيقونة حسب نوع الرسالة
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.success}</div>
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        <div class="notification-progress"></div>
    `;
    
    // إضافة الإشعار للحاوية
    container.appendChild(notification);
    
    // تأثير الظهور
    setTimeout(() => {
        notification.classList.add('show');
        notification.classList.add('bounce');
    }, 100);
    
    // شريط التقدم
    const progressBar = notification.querySelector('.notification-progress');
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 4s linear';
    }, 200);
    
    // إزالة الإشعار تلقائياً بعد 5 ثوان
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 400);
        }
    }, 5000);
    
    // تشغيل صوت الإشعار إذا كان مفعلاً
    if (systemSettings && systemSettings.soundNotifications) {
        playNotificationSound(type);
    }
}

// دالة تشغيل أصوات الإشعارات
function playNotificationSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // تحديد التردد حسب نوع الإشعار
        const frequencies = {
            success: [523.25, 659.25], // C5, E5
            error: [415.30, 311.13],   // G#4, D#4
            warning: [440, 554.37],    // A4, C#5
            info: [523.25, 698.46]     // C5, F5
        };
        
        const freq = frequencies[type] || frequencies.success;
        
        oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime);
        oscillator.frequency.setValueAtTime(freq[1], audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // تجاهل أخطاء الصوت
    }
}

// دالة التحقق من صلاحية الوصول للصفحة
function checkPagePermission(pageId) {
    const sessionData = getSessionData();
    
    if (!sessionData) {
        return false;
    }
    
    // المدير الرئيسي له صلاحية الوصول لجميع الصفحات
    if (sessionData.username === 'admin' || sessionData.role === 'admin') {
        return true;
    }
    
    // التحقق من الصلاحيات المخصصة للمستخدم
    if (sessionData.permissions && Array.isArray(sessionData.permissions)) {
        return sessionData.permissions.includes(pageId);
    }
    
    // الرجوع للصلاحيات الافتراضية للدور
    const defaultPermissions = defaultRolePermissions[sessionData.role] || [];
    return defaultPermissions.includes(pageId);
}

// تحديث القائمة الجانبية لإخفاء الصفحات غير المسموحة
function updateSidebarBasedOnPermissions() {
    const sessionData = getSessionData();
    
    if (!sessionData) return;
    
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const pageId = item.getAttribute('data-page');
        
        if (checkPagePermission(pageId)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// التنقل بين الصفحات
function showPage(pageId) {
    // التحقق من صلاحية الوصول
    if (!checkPagePermission(pageId)) {
        showMessage('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
        return;
    }
    
    // إخفاء جميع الصفحات
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // إزالة الفئة النشطة من جميع عناصر القائمة
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    // إظهار الصفحة المطلوبة
    const targetPage = document.getElementById(pageId);
    const targetNavItem = document.querySelector(`[data-page="${pageId}"]`);
    
    if (targetPage && targetNavItem) {
        targetPage.classList.add('active');
        targetNavItem.classList.add('active');
        currentPage = pageId;
        
        // تحميل بيانات الصفحة
        loadPageData(pageId);
    }
}

// إعدادات النظام
let systemSettings = {
    storeName: '',
    storeAddress: '',
    storePhone: '',
    storeEmail: '',
    taxNumber: '',
    currency: 'EGP',
    taxRate: 0,
    lowStockThreshold: 5,
    autoBackup: false,
    soundNotifications: true,
    receiptPrinter: 'default',
    paperSize: '80mm',
    autoPrint: false,
    printLogo: false,
    receiptFooter: 'شكراً لزيارتكم - نتطلع لخدمتكم مرة أخرى',
    backupFrequency: 'weekly',
    sessionTimeout: 30,
    debugMode: false
};

// إعدادات كلمة مرور الحذف
let deletePasswordSettings = {
    password: '',
    enabled: false
};

// حفظ كلمة مرور الحذف
function saveDeletePassword() {
    const deletePassword = document.getElementById('delete-password').value;
    const confirmDeletePassword = document.getElementById('confirm-delete-password').value;
    const enableDeleteProtection = document.getElementById('enable-delete-protection').checked;
    
    // التحقق من صحة البيانات
    if (!deletePassword) {
        showMessage('يرجى إدخال كلمة مرور الحذف', 'error');
        return;
    }
    
    if (deletePassword !== confirmDeletePassword) {
        showMessage('كلمة المرور وتأكيد كلمة المرور غير متطابقتين', 'error');
        return;
    }
    
    if (deletePassword.length < 4) {
        showMessage('كلمة مرور الحذف يجب أن تكون 4 أحرف على الأقل', 'error');
        return;
    }
    
    try {
        // حفظ إعدادات كلمة مرور الحذف
        const deleteSettings = {
            password: deletePassword,
            enabled: enableDeleteProtection,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('deleteProtectionSettings', JSON.stringify(deleteSettings));
        
        showMessage('تم حفظ كلمة مرور الحذف بنجاح', 'success');
        
        // مسح الحقول
        document.getElementById('delete-password').value = '';
        document.getElementById('confirm-delete-password').value = '';
        
    } catch (error) {
        console.error('خطأ في حفظ كلمة مرور الحذف:', error);
        showMessage('حدث خطأ في حفظ كلمة مرور الحذف', 'error');
    }
}

// اختبار كلمة مرور الحذف
function testDeletePassword() {
    const deleteSettings = JSON.parse(localStorage.getItem('deleteProtectionSettings') || '{}');
    
    if (!deleteSettings.password) {
        showMessage('لم يتم تعيين كلمة مرور للحذف بعد', 'warning');
        return;
    }
    
    const modalContent = `
        <div class="modal-header">
            <h3>اختبار كلمة مرور الحذف</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form id="test-delete-password-form" onsubmit="verifyTestDeletePassword(event)">
                <div class="form-group">
                    <label>أدخل كلمة مرور الحذف:</label>
                    <input type="password" name="testPassword" required placeholder="كلمة مرور الحذف">
                </div>
            </form>
        </div>
        <div class="form-actions">
            <button type="submit" form="test-delete-password-form" class="btn btn-primary">
                <i class="fas fa-check"></i> اختبار
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;
    
    showModal(modalContent);
}

// إضافة دالة لعرض modal للإدخال
function showInputModal(title, placeholder, callback) {
    const modalContent = `
        <div class="modal-header">
            <h3>${title}</h3>
            <button type="button" class="close-btn" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <input type="password" id="modal-input" class="form-control" placeholder="${placeholder}" autocomplete="off">
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                <button type="button" class="btn btn-primary" onclick="submitModalInput()">تأكيد</button>
            </div>
        </div>
    `;
    
    // حفظ callback للاستخدام لاحقاً
    window.currentModalCallback = callback;
    
    showModal(modalContent);
    
    // التركيز على حقل الإدخال
    setTimeout(() => {
        const input = document.getElementById('modal-input');
        if (input) {
            input.focus();
            // إضافة مستمع للضغط على Enter
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    submitModalInput();
                }
            });
        }
    }, 100);
}

// دالة لإرسال البيانات من modal
function submitModalInput() {
    const input = document.getElementById('modal-input');
    const value = input ? input.value : null;
    
    if (window.currentModalCallback) {
        window.currentModalCallback(value);
        window.currentModalCallback = null;
    }
    
    closeModal();
}

// التحقق من كلمة مرور الحذف للاختبار
function verifyTestDeletePassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const testPassword = formData.get('testPassword');
    
    const deleteSettings = JSON.parse(localStorage.getItem('deleteProtectionSettings') || '{}');
    
    if (testPassword === deleteSettings.password) {
        showMessage('كلمة مرور الحذف صحيحة ✓', 'success');
        closeModal();
    } else {
        showMessage('كلمة مرور الحذف غير صحيحة', 'error');
    }
}

// دالة للتحقق من كلمة مرور الحذف قبل تنفيذ عملية الحذف
function verifyDeletePassword(callback, itemName = 'العنصر') {
    const deleteSettings = JSON.parse(localStorage.getItem('deleteProtectionSettings') || '{}');
    
    // إذا لم يتم تفعيل حماية الحذف، تنفيذ العملية مباشرة
    if (!deleteSettings.enabled || !deleteSettings.password) {
        if (confirm(`هل أنت متأكد من حذف ${itemName}؟`)) {
            callback();
        }
        return;
    }
    
    // إظهار نافذة إدخال كلمة مرور الحذف
    const modalContent = `
        <div class="modal-header">
            <h3>تأكيد الحذف</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="delete-confirmation">
                <div class="warning-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <p>هل أنت متأكد من حذف <strong>${itemName}</strong>؟</p>
                <p class="warning-text">هذا الإجراء لا يمكن التراجع عنه.</p>
            </div>
            <form id="delete-password-form" onsubmit="confirmDeleteWithPassword(event)">
                <div class="form-group">
                    <label>أدخل كلمة مرور الحذف للتأكيد:</label>
                    <input type="password" name="deletePassword" required placeholder="كلمة مرور الحذف" autocomplete="off">
                </div>
            </form>
        </div>
        <div class="form-actions">
            <button type="submit" form="delete-password-form" class="btn btn-danger">
                <i class="fas fa-trash"></i> تأكيد الحذف
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;
    
    showModal(modalContent);
    
    // حفظ callback للاستخدام عند التأكيد
    window.pendingDeleteCallback = callback;
}

// تأكيد الحذف بكلمة المرور
function confirmDeleteWithPassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const enteredPassword = formData.get('deletePassword');
    
    const deleteSettings = JSON.parse(localStorage.getItem('deleteProtectionSettings') || '{}');
    
    if (enteredPassword === deleteSettings.password) {
        closeModal();
        if (window.pendingDeleteCallback) {
            window.pendingDeleteCallback();
            window.pendingDeleteCallback = null;
        }
    } else {
        showMessage('كلمة مرور الحذف غير صحيحة', 'error');
        // مسح الحقل وإعادة التركيز
        const passwordField = document.querySelector('input[name="deletePassword"]');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    }
}

// تحميل إعدادات كلمة مرور الحذف عند تحميل الصفحة
function loadDeletePasswordSettings() {
    const deleteSettings = JSON.parse(localStorage.getItem('deleteProtectionSettings') || '{}');
    
    if (deleteSettings.enabled !== undefined) {
        document.getElementById('enable-delete-protection').checked = deleteSettings.enabled;
    }
}

// تحميل بيانات الصفحة
async function loadPageData(pageId) {
    switch(pageId) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'pos':
            await loadPOSData();
            break;
        case 'products':
            await loadProductsData();
            break;
        case 'customers':
            await loadCustomersData();
            break;
        case 'sales':
            await loadSalesData();
            break;
        case 'reports':
            await loadReportsData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
       
        case 'purchases':
            await loadPurchasesData();
            break;
        case 'expenses':
            await loadExpensesData();
            break;
        case 'debts':
            await loadDebtsData();
            break;
    }
}

// تحميل بيانات لوحة التحكم
async function loadDashboardData() {
    try {
        // تحميل الإحصائيات
        const [productsData, customersData, dailySalesResponse, lowStockData] = await Promise.all([
            fetchData('products'),
            fetchData('customers'),
            fetchData('reports/daily-sales'),
            fetchData('reports/low-stock')
        ]);
        
        // استخراج مصفوفة المبيعات من الاستجابة
        const dailySalesData = dailySalesResponse.sales || [];
        
        // تحديث الإحصائيات
        document.getElementById('total-products').textContent = productsData.length;
        document.getElementById('total-customers').textContent = customersData.length;
        document.getElementById('low-stock').textContent = lowStockData.length;
        
        // حساب مبيعات اليوم
        const dailyTotal = dailySalesData.reduce((sum, sale) => sum + sale.final_amount, 0);
        document.getElementById('daily-sales').textContent = `${dailyTotal.toFixed(2)} جنيه`;
        
        // عرض آخر المبيعات
        displayRecentSales(dailySalesData.slice(0, 5));
        
        // عرض تنبيهات المخزون
        displayLowStockAlerts(lowStockData);
        
    } catch (error) {
        console.error('خطأ في تحميل بيانات لوحة التحكم:', error);
    }
}

// عرض آخر المبيعات
function displayRecentSales(salesData) {
    const tbody = document.querySelector('#recent-sales-table tbody');
    if (!tbody) {
        console.error('جدول آخر المبيعات غير موجود');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!salesData || salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">لا توجد مبيعات اليوم</td></tr>';
        return;
    }
    
    salesData.forEach(sale => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${sale.id}</td>
            <td>${sale.customer_name || 'عميل نقدي'}</td>
            <td>${sale.final_amount ? sale.final_amount.toFixed(2) : '0.00'} جنيه</td>
            <td>${formatLocalDate(sale.created_at)}</td>
        `;
        tbody.appendChild(row);
    });
}

// عرض تنبيهات المخزون
function displayLowStockAlerts(lowStockData) {
    const container = document.getElementById('low-stock-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (lowStockData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #27ae60;">جميع الأصناف متوفرة بكميات كافية</p>';
        return;
    }
    
    lowStockData.forEach(product => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `stock-alert ${product.quantity === 0 ? 'critical' : ''}`;
        alertDiv.innerHTML = `
            <div class="alert-info">
                <div class="alert-title">${product.name}</div>
                <div class="alert-details">
                    الكمية المتبقية: ${product.quantity} | الحد الأدنى: ${product.min_quantity}
                </div>
            </div>
        `;
        container.appendChild(alertDiv);
    });
}

// متغيرات جديدة
let currentCategory = 'all';
let filteredProducts = [];

// تحميل بيانات نقطة البيع
async function loadPOSData() {
    try {
        products = await fetchData('products');
        customers = await fetchData('customers');
        const categories = await fetchData('categories');
        
        displayCategories(categories);
        populateCustomerSelect(customers);
        
        // عرض أول فئة متاحة بدلاً من "الكل"
        if (categories && categories.length > 0) {
            filterByCategory(categories[0]);
        } else {
            filterByCategory('all');
        }
        
        updateCart();
    } catch (error) {
        console.error('خطأ في تحميل بيانات نقطة البيع:', error);
    }
}

// عرض الفئات
function displayCategories(categories) {
    const container = document.getElementById('categories-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    // إضافة زر "الكل" في البداية
    const allButton = document.createElement('button');
    allButton.className = 'category-btn';
    allButton.setAttribute('data-category', 'all');
    allButton.textContent = 'الكل';
    allButton.onclick = () => filterByCategory('all');
    container.appendChild(allButton);
    
    // إضافة باقي الفئات
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'category-btn';
        button.setAttribute('data-category', category);
        button.textContent = category;
        button.onclick = () => filterByCategory(category);
        container.appendChild(button);
    });
}

// تصفية المنتجات حسب الفئة
function filterByCategory(category) {
    currentCategory = category;
    
    // تحديث أزرار الفئات
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        }
    });
    
    // تصفية المنتجات
    if (category === 'all') {
        filteredProducts = products.filter(product => product.quantity > 0);
    } else {
        filteredProducts = products.filter(product => 
            product.category === category && product.quantity > 0
        );
    }
    
    displayProducts();
}

// عرض المنتجات المفلترة
function displayProducts() {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-products">لا توجد منتجات في هذه الفئة</div>';
        return;
    }
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <h4>${product.name}</h4>
            <div class="price">${product.selling_price.toFixed(2)} جنيه</div>
            <div class="stock">متوفر: ${product.quantity}</div>
            <div class="category">${product.category}</div>
            <div style="font-size: 0.8rem; color: #7f8c8d; margin-top: 5px;">
                ${product.size ? `المقاس: ${product.size}` : ''} 
                ${product.color ? `| اللون: ${product.color}` : ''}
            </div>
        `;
        
        productCard.addEventListener('click', () => addToCart(product));
        container.appendChild(productCard);
    });
}

// إضافة منتج إلى السلة
function addToCart(product) {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
        if (existingItem.quantity < product.quantity) {
            existingItem.quantity++;
            existingItem.total_price = existingItem.quantity * (existingItem.unit_price - (existingItem.discount || 0)) + (existingItem.additional_amount || 0);
        } else {
            showMessage('الكمية المطلوبة غير متوفرة', 'error');
            return;
        }
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            unit_price: product.selling_price,
            purchase_price: product.purchase_price, // إضافة سعر الشراء للمقارنة
            quantity: 1,
            discount: 0, // خصم فردي للمنتج
            additional_amount: 0, // المبلغ الإضافي الفردي للمنتج
            total_price: product.selling_price
        });
    }
    
    updateCart();
}

// تحديث عرض السلة
function updateCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    
    container.innerHTML = '';
    
    let subtotalBeforeDiscount = 0; // المجموع قبل الخصم
    let totalIndividualDiscounts = 0; // إجمالي الخصومات الفردية
    let totalAdditionalAmounts = 0; // إجمالي المبالغ الإضافية الفردية
    
    cart.forEach((item, index) => {
        // حساب المجموع قبل الخصم
        const itemTotalBeforeDiscount = item.quantity * item.unit_price;
        subtotalBeforeDiscount += itemTotalBeforeDiscount;
        
        // حساب إجمالي الخصومات الفردية
        if (item.discount > 0) {
            totalIndividualDiscounts += item.quantity * item.discount;
        }
        
        // حساب إجمالي المبالغ الإضافية الفردية
        if (item.additional_amount > 0) {
            totalAdditionalAmounts += item.additional_amount;
        }
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${item.unit_price.toFixed(2)} جنيه</div>
                ${item.discount > 0 ? `<div class="item-discount">خصم: ${item.discount.toFixed(2)} جنيه</div>` : ''}
                ${item.additional_amount > 0 ? `<div class="item-additional">مبلغ إضافي: ${item.additional_amount.toFixed(2)} جنيه</div>` : ''}
                <div class="item-final-price">السعر النهائي: ${((item.unit_price - (item.discount || 0)) * item.quantity + (item.additional_amount || 0)).toFixed(2)} جنيه</div>
            </div>
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="changeQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity(${index}, 1)">+</button>
                <button class="discount-btn" onclick="showDiscountModal(${index})" title="إضافة خصم">
                    <i class="fas fa-percent"></i>
                </button>
                <button class="additional-amount-btn" onclick="showAdditionalAmountModal(${index})" title="إضافة مبلغ إضافي">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button class="quantity-btn" style="background: #e74c3c; margin-right: 10px;" onclick="removeFromCart(${index})">×</button>
            </div>
        `;
        
        container.appendChild(cartItem);
    });
    
    // تحديث المجاميع
    document.getElementById('subtotal').textContent = `${subtotalBeforeDiscount.toFixed(2)} جنيه`;
    
    // عرض الخصومات الفردية
    const individualDiscountsElement = document.getElementById('individual-discounts');
    if (individualDiscountsElement) {
        individualDiscountsElement.textContent = `${totalIndividualDiscounts.toFixed(2)} جنيه`;
    }
    
    // عرض إجمالي المبالغ الإضافية الفردية
    const individualAdditionalElement = document.getElementById('individual-additional-amounts');
    if (individualAdditionalElement) {
        individualAdditionalElement.textContent = `${totalAdditionalAmounts.toFixed(2)} جنيه`;
    }
    
    // الحصول على الخصم الإضافي
    const additionalDiscountInput = document.getElementById('additional-discount');
    const additionalDiscount = parseFloat(additionalDiscountInput?.value || 0);
    
    // حساب إجمالي الخصم
    const totalDiscount = totalIndividualDiscounts + additionalDiscount;
    const totalDiscountElement = document.getElementById('total-discount');
    if (totalDiscountElement) {
        totalDiscountElement.textContent = `${totalDiscount.toFixed(2)} جنيه`;
    }
    
    // تحديث خانة الخصم الكلي (للتوافق مع الكود الحالي)
    const discountInput = document.getElementById('discount');
    if (discountInput) {
        discountInput.value = additionalDiscount.toFixed(2);
        discountInput.readOnly = true; // جعلها للقراءة فقط لأنها محسوبة تلقائياً
    }
    
    // حساب المجموع النهائي (المجموع الفرعي - الخصومات + المبالغ الإضافية الفردية)
    const total = subtotalBeforeDiscount - totalDiscount + totalAdditionalAmounts;
    document.getElementById('total').textContent = `${Math.max(0, total).toFixed(2)} جنيه`;
}

// تغيير كمية المنتج في السلة
function changeQuantity(index, change) {
    const item = cart[index];
    const product = products.find(p => p.id === item.product_id);
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    if (newQuantity > product.quantity) {
        showMessage('الكمية المطلوبة غير متوفرة', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    // إعادة حساب السعر الإجمالي مع المبلغ الإضافي
    item.total_price = (item.unit_price - (item.discount || 0)) * item.quantity + (item.additional_amount || 0);
    
    updateCart();
}

// عرض نافذة الخصم الفردي
function showDiscountModal(itemIndex) {
    const item = cart[itemIndex];
    const currentDiscount = item.discount || 0;
    
    const modalContent = `
        <div class="modal-header">
            <h3>إضافة خصم - ${item.name}</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>سعر البيع الأصلي:</label>
                <input type="number" value="${item.unit_price.toFixed(2)}" readonly class="readonly-input">
            </div>
            <div class="form-group">
                <label>سعر الشراء:</label>
                <input type="number" value="${item.purchase_price.toFixed(2)}" readonly class="readonly-input">
            </div>
            <div class="form-group">
                <label>قيمة الخصم (جنيه):</label>
                <input type="number" id="discount-amount" value="${currentDiscount}" min="0" step="0.01" placeholder="أدخل قيمة الخصم">
            </div>
            <div class="form-group">
                <label>السعر بعد الخصم:</label>
                <input type="number" id="final-price-preview" readonly class="readonly-input">
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="applyDiscount(${itemIndex})">تطبيق الخصم</button>
            <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    
    showModal(modalContent);
    
    // تحديث المعاينة عند تغيير قيمة الخصم
    const discountInput = document.getElementById('discount-amount');
    const finalPricePreview = document.getElementById('final-price-preview');
    
    function updatePreview() {
        const discountValue = parseFloat(discountInput.value) || 0;
        const finalPrice = item.unit_price - discountValue;
        finalPricePreview.value = finalPrice.toFixed(2);
    }
    
    // التحقق من قيمة الخصم عند فقدان التركيز
    function validateDiscount() {
        const discountValue = parseFloat(discountInput.value) || 0;
        const finalPrice = item.unit_price - discountValue;
        
        if (finalPrice < item.purchase_price) {
            showMessage('تحذير: السعر بعد الخصم أقل من سعر الشراء!', 'warning');
        }
    }
    
    discountInput.addEventListener('input', updatePreview);
    discountInput.addEventListener('blur', validateDiscount); // إضافة مستمع حدث فقدان التركيز
    updatePreview(); // تحديث أولي
}



// تطبيق الخصم على المنتج
function applyDiscount(itemIndex) {
    const item = cart[itemIndex];
    const discountAmount = parseFloat(document.getElementById('discount-amount').value) || 0;
    
    // التحقق من أن الخصم لا يتجاوز سعر البيع
    if (discountAmount >= item.unit_price) {
        showMessage('قيمة الخصم لا يمكن أن تكون أكبر من أو تساوي سعر البيع', 'error');
        return;
    }
    
    // التحقق من أن السعر بعد الخصم أقل من سعر الشراء
    const finalPrice = item.unit_price - discountAmount;
    if (finalPrice < item.purchase_price) {
        showMessage(`تحذير: السعر بعد الخصم (${finalPrice.toFixed(2)} جنيه) أقل من سعر الشراء (${item.purchase_price.toFixed(2)} جنيه)`, 'warning');
    }
    
    // تطبيق الخصم
    item.discount = discountAmount;
    item.total_price = item.quantity * (item.unit_price - discountAmount) + (item.additional_amount || 0);
    
    updateCart();
    closeModal();
    
    showMessage('تم تطبيق الخصم بنجاح', 'success');
}

// عرض نافذة المبلغ الإضافي الفردي
function showAdditionalAmountModal(itemIndex) {
    const item = cart[itemIndex];
    const currentAdditionalAmount = item.additional_amount || 0;
    
    const modalContent = `
        <div class="modal-header">
            <h3>إضافة مبلغ إضافي - ${item.name}</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>سعر البيع الأصلي:</label>
                <input type="number" value="${item.unit_price.toFixed(2)}" readonly class="readonly-input">
            </div>
            <div class="form-group">
                <label>الكمية:</label>
                <input type="number" value="${item.quantity}" readonly class="readonly-input">
            </div>
            <div class="form-group">
                <label>المبلغ الإضافي الحالي:</label>
                <input type="number" value="${currentAdditionalAmount.toFixed(2)}" readonly class="readonly-input">
            </div>
            <div class="form-group">
                <label>المبلغ الإضافي الجديد (جنيه):</label>
                <input type="number" id="additional-amount-input" value="${currentAdditionalAmount}" min="0" step="0.01" placeholder="أدخل المبلغ الإضافي">
            </div>
            <div class="form-group">
                <label>إجمالي المنتج بعد المبلغ الإضافي:</label>
                <input type="number" id="total-with-additional-preview" readonly class="readonly-input">
            </div>
            <div class="warning-message" id="additional-warning" style="display: none;"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="removeItemAdditionalAmount(${itemIndex})">إزالة المبلغ الإضافي</button>
            <button class="btn btn-primary" onclick="applyAdditionalAmount(${itemIndex})">تطبيق</button>
        </div>
    `;
    
    showModal(modalContent);
    
    // إضافة مستمع للتحديث المباشر
    const additionalInput = document.getElementById('additional-amount-input');
    additionalInput.addEventListener('input', () => updateAdditionalPreview(itemIndex));
    
    // تحديث المعاينة الأولية
    updateAdditionalPreview(itemIndex);
}

// تحديث معاينة المبلغ الإضافي
function updateAdditionalPreview(itemIndex) {
    const item = cart[itemIndex];
    const additionalInput = document.getElementById('additional-amount-input');
    const previewElement = document.getElementById('total-with-additional-preview');
    const warningElement = document.getElementById('additional-warning');
    
    const additionalAmount = parseFloat(additionalInput.value) || 0;
    const itemTotal = (item.unit_price - (item.discount || 0)) * item.quantity;
    const totalWithAdditional = itemTotal + additionalAmount;
    
    previewElement.value = totalWithAdditional.toFixed(2);
    
    // إخفاء التحذير إذا كان المبلغ صحيحاً
    if (additionalAmount >= 0) {
        warningElement.style.display = 'none';
    } else {
        warningElement.style.display = 'block';
        warningElement.textContent = 'المبلغ الإضافي لا يمكن أن يكون سالباً';
    }
}

// تطبيق المبلغ الإضافي
function applyAdditionalAmount(itemIndex) {
    const additionalInput = document.getElementById('additional-amount-input');
    const additionalAmount = parseFloat(additionalInput.value) || 0;
    
    if (additionalAmount < 0) {
        showMessage('المبلغ الإضافي لا يمكن أن يكون سالباً', 'error');
        return;
    }
    
    const item = cart[itemIndex];
    item.additional_amount = additionalAmount;
    
    // إعادة حساب السعر الإجمالي للمنتج
    item.total_price = (item.unit_price - (item.discount || 0)) * item.quantity + additionalAmount;
    
    updateCart();
    closeModal();
    
    showMessage(`تم إضافة مبلغ إضافي ${additionalAmount.toFixed(2)} جنيه لـ ${item.name}`, 'success');
}

// إزالة المبلغ الإضافي من المنتج
function removeItemAdditionalAmount(itemIndex) {
    const item = cart[itemIndex];
    item.additional_amount = 0;
    item.total_price = (item.unit_price - (item.discount || 0)) * item.quantity;
    
    updateCart();
    closeModal();
    
    showMessage(`تم إزالة المبلغ الإضافي من ${item.name}`, 'success');
}

// إزالة خصم المنتج
function removeItemDiscount(index) {
    const item = cart[index];
    item.discount = 0;
    item.total_price = item.quantity * item.unit_price;
    
    updateCart();
    closeModal();
    
    showMessage(`تم إزالة الخصم من ${item.name}`, 'success');
}

// إزالة منتج من السلة
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// فاتورة جديدة
function newSale() {
    cart = [];
    
    // إعادة تعيين الخصم الأساسي
    const discountInput = document.getElementById('discount');
    if (discountInput) {
        discountInput.value = 0;
    }
    
    // إعادة تعيين الخصم الإضافي إذا كان موجوداً
    const additionalDiscountInput = document.getElementById('additional-discount');
    if (additionalDiscountInput) {
        additionalDiscountInput.value = 0;
    }
    
    // إعادة تعيين طريقة الدفع
    const paymentMethodSelect = document.getElementById('payment-method');
    if (paymentMethodSelect) {
        paymentMethodSelect.value = 'نقدي';
    }
    
    // إعادة تعيين اختيار العميل
    const customerSelect = document.getElementById('customer-select');
    if (customerSelect) {
        customerSelect.value = '';
    }
    
    // إعادة تعيين البحث عن المنتجات
    const productSearchInput = document.getElementById('product-search');
    if (productSearchInput) {
        productSearchInput.value = '';
    }
    
    // إعادة تعيين الفئة إلى "الكل"
    filterByCategory('all');
    
    // تحديث السلة
    updateCart();
    
    showMessage('تم بدء فاتورة جديدة', 'success');
}

// إتمام البيع
async function completeSale() {
    if (cart.length === 0) {
        showMessage('السلة فارغة', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    const customerId = document.getElementById('customer-select').value || null;
    
    if (paymentMethod === 'آجل' && !customerId) {
        showMessage('يجب اختيار عميل عند الدفع الآجل', 'error');
        return;
    }
    
    let subtotal = 0;
    let totalIndividualDiscounts = 0;
    let totalAdditionalAmounts = 0;
    
    cart.forEach(item => {
        subtotal += item.quantity * item.unit_price;
        if (item.discount > 0) {
            totalIndividualDiscounts += item.quantity * item.discount;
        }
        if (item.additional_amount > 0) {
            totalAdditionalAmounts += item.additional_amount;
        }
    });
    
    const additionalDiscount = parseFloat(document.getElementById('additional-discount')?.value || 0);
    const totalDiscount = totalIndividualDiscounts + additionalDiscount;
    const total = subtotal - totalDiscount + totalAdditionalAmounts;
    
    const saleData = {
        customer_id: customerId,
        payment_method: paymentMethod,
        subtotal: subtotal,
        discount: additionalDiscount,
        individual_discounts: totalIndividualDiscounts,
        individual_additional_amounts: totalAdditionalAmounts, // المبالغ الإضافية الفردية
        total: total,
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount || 0,
            additional_amount: item.additional_amount || 0, // المبلغ الإضافي للمنتج
            total_price: (item.unit_price - (item.discount || 0)) * item.quantity + (item.additional_amount || 0)
        }))
    };
    
    try {
        const response = await postData('sales', saleData);
        
        if (response.success) {
            showMessage('تم إتمام البيع بنجاح', 'success');
            printInvoice(response.saleId, saleData);
            newSale();
        } else {
            showMessage('خطأ في إتمام البيع: ' + response.message, 'error');
        }
    } catch (error) {
        console.error('خطأ في إتمام البيع:', error);
        showMessage('خطأ في إتمام البيع', 'error');
    }
}

// طباعة الفاتورة
function printInvoice(saleId, saleData) {
    const printWindow = window.open('', '_blank');
    
    // حساب المجموع الفرعي قبل الخصم
    const subtotalBeforeDiscount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    
    // حساب الخصومات الفردية
    const totalIndividualDiscounts = cart.reduce((sum, item) => {
        return sum + (item.quantity * (item.discount || 0));
    }, 0);
    
    // الحصول على الخصم الإضافي
    const additionalDiscount = parseFloat(document.getElementById('additional-discount')?.value || 0);
    
    // إجمالي الخصومات
    const totalDiscount = totalIndividualDiscounts + additionalDiscount;
    
    // المجموع النهائي
    const total = subtotalBeforeDiscount - totalDiscount;
    
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>فاتورة رقم ${saleId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-details { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .total-section { margin-top: 20px; text-align: left; }
                .discount-details { background-color: #f9f9f9; padding: 10px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>فاتورة بيع</h1>
                <p>رقم الفاتورة: ${saleId}</p>
                <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>الصنف</th>
                        <th>السعر الأصلي</th>
                        <th>الخصم الفردي</th>
                        <th>السعر بعد الخصم</th>
                        <th>الكمية</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${cart.map(item => {
                        const itemDiscount = item.discount || 0;
                        const finalPrice = item.unit_price - itemDiscount;
                        const itemTotal = item.quantity * finalPrice;
                        return `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.unit_price.toFixed(2)}</td>
                                <td>${itemDiscount.toFixed(2)}</td>
                                <td>${finalPrice.toFixed(2)}</td>
                                <td>${item.quantity}</td>
                                <td>${itemTotal.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="total-section">
                <p>المجموع الفرعي: ${subtotalBeforeDiscount.toFixed(2)} جنيه</p>
                ${totalIndividualDiscounts > 0 ? `<p>الخصومات الفردية: ${totalIndividualDiscounts.toFixed(2)} جنيه</p>` : ''}
                ${additionalDiscount > 0 ? `<p>خصم إضافي: ${additionalDiscount.toFixed(2)} جنيه</p>` : ''}
                <p><strong>إجمالي الخصم: ${totalDiscount.toFixed(2)} جنيه</strong></p>
                <p><strong>الإجمالي النهائي: ${total.toFixed(2)} جنيه</strong></p>
                <p>طريقة الدفع: ${saleData.payment_method}</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    window.close();
                }
            </script>
        </body>
        </html>
    `);
}

// تحميل بيانات الأصناف مع الفلاتر
async function loadProductsData() {
    try {
        products = await fetchData('products');
        filteredProductsData = [...products];
        populateFilterOptions();
        displayProductsTable();
    } catch (error) {
        console.error('خطأ في تحميل بيانات الأصناف:', error);
    }
}

// ملء خيارات الفلاتر
function populateFilterOptions() {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const sizes = [...new Set(products.map(p => p.size).filter(Boolean))];
    const colors = [...new Set(products.map(p => p.color).filter(Boolean))];
    
    populateSelect('category-filter', categories);
    populateSelect('size-filter', sizes);
    populateSelect('color-filter', colors);
}

// ملء قائمة منسدلة
function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // الاحتفاظ بالخيار الأول (جميع...)
    const firstOption = select.children[0];
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

// فلترة الأصناف
function filterProducts() {
    // جمع قيم الفلاتر
    productFilters.search = document.getElementById('product-search')?.value.toLowerCase() || '';
    productFilters.category = document.getElementById('category-filter')?.value || '';
    productFilters.size = document.getElementById('size-filter')?.value || '';
    productFilters.color = document.getElementById('color-filter')?.value || '';
    productFilters.stock = document.getElementById('stock-filter')?.value || '';
    productFilters.profit = document.getElementById('profit-filter')?.value || '';
    
    // تطبيق الفلاتر
    filteredProductsData = products.filter(product => {
        // فلتر البحث العام
        if (productFilters.search) {
            const searchMatch = 
                product.name.toLowerCase().includes(productFilters.search) ||
                (product.barcode && product.barcode.toLowerCase().includes(productFilters.search)) ||
                product.category.toLowerCase().includes(productFilters.search);
            if (!searchMatch) return false;
        }
        
        // فلتر الفئة
        if (productFilters.category && product.category !== productFilters.category) {
            return false;
        }
        
        // فلتر المقاس
        if (productFilters.size && product.size !== productFilters.size) {
            return false;
        }
        
        // فلتر اللون
        if (productFilters.color && product.color !== productFilters.color) {
            return false;
        }
        
        // فلتر المخزون
        if (productFilters.stock) {
            switch (productFilters.stock) {
                case 'out':
                    if (product.quantity !== 0) return false;
                    break;
                case 'low':
                    if (product.quantity > 5 || product.quantity === 0) return false;
                    break;
                case 'medium':
                    if (product.quantity <= 5 || product.quantity > 20) return false;
                    break;
                case 'high':
                    if (product.quantity <= 20) return false;
                    break;
            }
        }
        
        // فلتر نسبة الربح
        if (productFilters.profit) {
            const profitAmount = product.selling_price - product.purchase_price;
            const profitPercentage = product.purchase_price > 0 
                ? (profitAmount / product.purchase_price) * 100
                : 0;
            
            switch (productFilters.profit) {
                case 'negative':
                    if (profitPercentage >= 0) return false;
                    break;
                case 'low':
                    if (profitPercentage >= 20 || profitPercentage < 0) return false;
                    break;
                case 'medium':
                    if (profitPercentage < 20 || profitPercentage > 50) return false;
                    break;
                case 'high':
                    if (profitPercentage <= 50) return false;
                    break;
            }
        }
        
        return true;
    });
    
    displayProductsTable(filteredProductsData);
    updateProductsStats();
}

// مسح جميع الفلاتر
function clearProductFilters() {
    document.getElementById('product-search').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('size-filter').value = '';
    document.getElementById('color-filter').value = '';
    document.getElementById('stock-filter').value = '';
    document.getElementById('profit-filter').value = '';
    
    filteredProductsData = [...products];
    displayProductsTable();
    updateProductsStats();
}

// تحديث إحصائيات الأصناف
function updateProductsStats() {
    const totalProducts = filteredProductsData.length;
    const lowStockProducts = filteredProductsData.filter(p => p.quantity <= 5 && p.quantity > 0).length;
    const outOfStockProducts = filteredProductsData.filter(p => p.quantity === 0).length;
    const totalValue = filteredProductsData.reduce((sum, p) => sum + (p.selling_price * p.quantity), 0);
    
    // عرض الإحصائيات (يمكن إضافة عناصر HTML لعرضها)
    console.log(`إجمالي الأصناف: ${totalProducts}`);
    console.log(`مخزون منخفض: ${lowStockProducts}`);
    console.log(`نفد المخزون: ${outOfStockProducts}`);
    console.log(`القيمة الإجمالية: ${totalValue.toFixed(2)} جنيه`);
}

// تصدير النتائج المفلترة
function exportFilteredProducts() {
    if (filteredProductsData.length === 0) {
        showMessage('لا توجد بيانات للتصدير', 'warning');
        return;
    }
    
    const csvContent = generateProductsCSV(filteredProductsData);
    downloadCSV(csvContent, `products_filtered_${new Date().toISOString().split('T')[0]}.csv`);
    showMessage('تم تصدير البيانات بنجاح', 'success');
}

// إنشاء ملف CSV للأصناف
function generateProductsCSV(productsData) {
    const headers = ['الكود', 'اسم المنتج', 'الفئة', 'المقاس', 'اللون', 'سعر الشراء', 'سعر البيع', 'الكمية', 'مبلغ الربح', 'نسبة الربح'];
    
    const rows = productsData.map(product => {
        const profitAmount = product.selling_price - product.purchase_price;
        const profitPercentage = product.purchase_price > 0 
            ? ((profitAmount / product.purchase_price) * 100).toFixed(1)
            : 0;
        
        return [
            product.barcode || '',
            product.name,
            product.category,
            product.size || '',
            product.color || '',
            product.purchase_price.toFixed(2),
            product.selling_price.toFixed(2),
            product.quantity,
            profitAmount.toFixed(2),
            profitPercentage + '%'
        ];
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// متغيرات الديون
let debts = [];

// تحميل بيانات الديون
async function loadDebtsData() {
    try {
        const debtsData = await fetchData('debts');
        debts = debtsData;
        
        displayDebtsTable(debtsData);
        updateDebtsStats(debtsData);
        updateFilteredDebtsSummary(debtsData); // إضافة هذا السطر
        
    } catch (error) {
        console.error('خطأ في تحميل بيانات الديون:', error);
        showMessage('حدث خطأ في تحميل البيانات', 'error');
    }
}

// عرض جدول الديون
function displayDebtsTable(debtsData) {
    const tbody = document.getElementById('debts-table-body');
    tbody.innerHTML = '';
    
    debtsData.forEach(debt => {
        const row = document.createElement('tr');
        
        // تحديد لون الصف حسب الحالة
        if (debt.status === 'مسدد') {
            row.classList.add('paid-debt');
        } else if (new Date(debt.due_date) < new Date()) {
            row.classList.add('overdue-debt');
        }
        
        row.innerHTML = `
            <td>${debt.id}</td>
            <td>${debt.customer_name || 'غير محدد'}</td>
            <td>${debt.customer_phone || 'غير محدد'}</td>
            <td>${debt.total_amount.toFixed(2)} جنيه</td>
            <td>${debt.paid_amount.toFixed(2)} جنيه</td>
            <td>${debt.remaining_amount.toFixed(2)} جنيه</td>
            <td>${new Date(debt.due_date).toLocaleDateString('ar-EG')}</td>
            <td><span class="status-badge status-${debt.status.replace(' ', '-')}">${debt.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="showPaymentModal(${debt.id})" title="إضافة دفعة">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-sm btn-info" onclick="viewDebtDetails(${debt.id})" title="التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// تحديث إحصائيات الديون
function updateDebtsStats(debtsData) {
    const totalAmount = debtsData.reduce((sum, debt) => sum + debt.remaining_amount, 0);
    const overdueDebts = debtsData.filter(debt => 
        debt.status !== 'مسدد' && new Date(debt.due_date) < new Date()
    ).length;
    const debtorsCount = new Set(debtsData.map(debt => debt.customer_id)).size;
    
    updateElementText('total-debts-amount', `${totalAmount.toFixed(2)} جنيه`);
    updateElementText('overdue-debts-count', overdueDebts);
    updateElementText('debtors-count', debtorsCount);
}

// عرض نافذة إضافة دفعة
function showPaymentModal(debtId) {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;
    
    const modalContent = `
        <div class="modal-header">
            <h3>إضافة دفعة - ${debt.customer_name}</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <form id="payment-form" onsubmit="processPayment(${debtId}); return false;">
            <div class="modal-body">
                <div class="form-group">
                    <label>المبلغ المتبقي:</label>
                    <input type="text" value="${debt.remaining_amount.toFixed(2)} جنيه" readonly class="form-control">
                </div>
                <div class="form-group">
                    <label>مبلغ الدفعة: *</label>
                    <input type="number" name="amount" step="0.01" min="0.01" max="${debt.remaining_amount}" required class="form-control">
                </div>
                <div class="form-group">
                    <label>طريقة الدفع:</label>
                    <select name="payment_method" class="form-control">
                        <option value="نقدي">نقدي</option>
                        <option value="فيزا">فيزا</option>
                        <option value="بنكي">بنكي</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>ملاحظات:</label>
                    <textarea name="notes" class="form-control" rows="3"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
                <button type="submit" class="btn btn-primary">تسجيل الدفعة</button>
            </div>
        </form>
    `;
    
    showModal(modalContent);
}

// معالجة الدفعة
async function processPayment(debtId) {
    const form = document.getElementById('payment-form');
    const formData = new FormData(form);
    
    const paymentData = {
        amount: parseFloat(formData.get('amount')),
        payment_method: formData.get('payment_method'),
        notes: formData.get('notes')
    };
    
    try {
        await postData(`debts/${debtId}/payment`, paymentData);
        showMessage('تم تسجيل الدفعة بنجاح', 'success');
        closeModal();
        loadDebtsData();
    } catch (error) {
        showMessage('حدث خطأ في تسجيل الدفعة', 'error');
    }
}

// عرض تفاصيل الدين
async function viewDebtDetails(debtId) {
    try {
        const debtDetails = await fetchData(`debts/${debtId}/details`);
        showDebtDetailsModal(debtDetails);
    } catch (error) {
        showMessage('حدث خطأ في تحميل تفاصيل الدين', 'error');
    }
}

// عرض نافذة تفاصيل الدين
function showDebtDetailsModal(debtDetails) {
    const { debt, payments } = debtDetails;
    
    const paymentsHtml = payments.map(payment => `
        <tr>
            <td>${new Date(payment.created_at).toLocaleDateString('ar-EG')}</td>
            <td>${payment.amount.toFixed(2)} جنيه</td>
            <td>${payment.payment_method}</td>
            <td>${payment.notes || '-'}</td>
        </tr>
    `).join('');
    
    const modalContent = `
        <div class="modal-header">
            <h3>تفاصيل الدين - ${debt.customer_name}</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="debt-info">
                <div class="info-row">
                    <strong>رقم الدين:</strong> ${debt.id}
                </div>
                <div class="info-row">
                    <strong>العميل:</strong> ${debt.customer_name}
                </div>
                <div class="info-row">
                    <strong>رقم الهاتف:</strong> ${debt.customer_phone || 'غير محدد'}
                </div>
                <div class="info-row">
                    <strong>المبلغ الإجمالي:</strong> ${debt.total_amount.toFixed(2)} جنيه
                </div>
                <div class="info-row">
                    <strong>المبلغ المدفوع:</strong> ${debt.paid_amount.toFixed(2)} جنيه
                </div>
                <div class="info-row">
                    <strong>المبلغ المتبقي:</strong> ${debt.remaining_amount.toFixed(2)} جنيه
                </div>
                <div class="info-row">
                    <strong>تاريخ الاستحقاق:</strong> ${new Date(debt.due_date).toLocaleDateString('ar-EG')}
                </div>
                <div class="info-row">
                    <strong>الحالة:</strong> <span class="status-badge status-${debt.status.replace(' ', '-')}">${debt.status}</span>
                </div>
            </div>
            
            <h4>سجل الدفعات:</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>طريقة الدفع</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentsHtml || '<tr><td colspan="4">لا توجد دفعات</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">إغلاق</button>
            ${debt.remaining_amount > 0 ? `<button type="button" class="btn btn-primary" onclick="closeModal(); showPaymentModal(${debt.id})">إضافة دفعة</button>` : ''}
        </div>
    `;
    
    showModal(modalContent);
}

// تطبيق فلاتر الديون
function applyDebtsFilters() {
    const statusFilter = document.getElementById('debt-status-filter').value;
    const dueStartFilter = document.getElementById('debt-due-start').value;
    const dueEndFilter = document.getElementById('debt-due-end').value;
    const searchFilter = document.getElementById('debt-search').value.toLowerCase();
    
    let filteredDebts = debts.filter(debt => {
        const matchesStatus = !statusFilter || debt.status === statusFilter;
        const matchesSearch = !searchFilter || 
            debt.customer_name.toLowerCase().includes(searchFilter) ||
            debt.customer_phone?.includes(searchFilter);
        
        let matchesDueDate = true;
        if (dueStartFilter || dueEndFilter) {
            const dueDate = new Date(debt.due_date);
            if (dueStartFilter) {
                matchesDueDate = matchesDueDate && dueDate >= new Date(dueStartFilter);
            }
            if (dueEndFilter) {
                matchesDueDate = matchesDueDate && dueDate <= new Date(dueEndFilter);
            }
        }
        
        return matchesStatus && matchesSearch && matchesDueDate;
    });
    
    displayDebtsTable(filteredDebts);
    updateFilteredDebtsSummary(filteredDebts);
}

// تحديث ملخص الديون المفلترة
function updateFilteredDebtsSummary(debtsData) {
    const totalAmount = debtsData.reduce((sum, debt) => sum + debt.remaining_amount, 0);
    
    updateElementText('filtered-debts-count', debtsData.length);
    updateElementText('filtered-debts-total', `${totalAmount.toFixed(2)} جنيه`);
}

// مسح فلاتر الديون
function clearDebtsFilters() {
    document.getElementById('debt-status-filter').value = '';
    document.getElementById('debt-due-start').value = '';
    document.getElementById('debt-due-end').value = '';
    document.getElementById('debt-search').value = '';
    
    displayDebtsTable(debts);
    updateFilteredDebtsSummary(debts);
}

// تحديث بيانات الديون
function refreshDebtsData() {
    loadDebtsData();
    showMessage('تم تحديث البيانات', 'success');
}

// تصدير الديون
function exportDebts() {
    const csvContent = generateDebtsCSV();
    downloadCSV(csvContent, 'debts-report.csv');
}

// إنشاء CSV للديون
function generateDebtsCSV() {
    const headers = ['رقم الدين', 'العميل', 'رقم الهاتف', 'المبلغ الإجمالي', 'المبلغ المدفوع', 'المبلغ المتبقي', 'تاريخ الاستحقاق', 'الحالة'];
    const rows = debts.map(debt => [
        debt.id,
        debt.customer_name || 'غير محدد',
        debt.customer_phone || 'غير محدد',
        debt.total_amount.toFixed(2),
        debt.paid_amount.toFixed(2),
        debt.remaining_amount.toFixed(2),
        new Date(debt.due_date).toLocaleDateString('ar-EG'),
        debt.status
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}


// متغيرات الفلترة
let filteredProductsData = [];
let productFilters = {
    search: '',
    category: '',
    size: '',
    color: '',
    stock: '',
    profit: ''
};

// عرض جدول الأصناف
function displayProductsTable(productsToShow = null) {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    
    const productsData = productsToShow || products;
    tbody.innerHTML = '';
    
    if (productsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="no-data">لا توجد أصناف تطابق معايير البحث</td></tr>';
        return;
    }
    
    productsData.forEach(product => {
        // حساب مبلغ الربح
        const profitAmount = product.selling_price - product.purchase_price;
        
        // حساب نسبة الربح
        const profitPercentage = product.purchase_price > 0 
            ? ((profitAmount / product.purchase_price) * 100).toFixed(1)
            : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.barcode || '-'}</td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.size || '-'}</td>
            <td>${product.color || '-'}</td>
            <td>${product.purchase_price.toFixed(2)}</td>
            <td>${product.selling_price.toFixed(2)}</td>
            <td class="${getStockClass(product.quantity)}">${product.quantity}</td>
            <td class="${profitAmount >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${profitAmount.toFixed(2)} جنيه
            </td>
            <td class="${profitAmount >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${profitPercentage}%
            </td>
            <td>
                <button class="btn btn-primary" onclick="editProduct(${product.id})">تعديل</button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// دالة لتحديد فئة المخزون
function getStockClass(quantity) {
    if (quantity === 0) return 'stock-out';
    if (quantity <= 5) return 'stock-low';
    if (quantity <= 20) return 'stock-medium';
    return 'stock-high';
}

// إظهار نافذة إضافة منتج
async function showAddProductModal() {
    try {
        // جلب الفئات الموجودة من قاعدة البيانات
        const categories = await fetchData('categories');
        
        const categoryOptions = categories.map(category => 
            `<option value="${category}">${category}</option>`
        ).join('');
        
        const modalContent = `
            <div class="modal-header">
                <h3>إضافة صنف جديد</h3>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="product-form" onsubmit="saveProduct(event)">
                    <div class="form-group">
                        <label>اسم المنتج:</label>
                        <input type="text" name="name" required placeholder="أدخل اسم المنتج">
                    </div>
                    <div class="form-group">
                        <label>الفئة:</label>
                        <select name="category" id="category-select" onchange="toggleCustomCategory()" required>
                            <option value="">اختر الفئة</option>
                            ${categoryOptions}
                            <option value="custom">إضافة فئة جديدة...</option>
                        </select>
                        <div class="custom-category-input" id="custom-category-input">
                            <input type="text" id="custom-category" placeholder="أدخل اسم الفئة الجديدة">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>المقاس:</label>
                        <input type="text" name="size" placeholder="اختياري">
                    </div>
                    <div class="form-group">
                        <label>اللون:</label>
                        <input type="text" name="color" placeholder="اختياري">
                    </div>
                    <div class="form-group">
                        <label>سعر الشراء:</label>
                        <input type="number" name="purchase_price" step="0.01" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>سعر البيع:</label>
                        <input type="number" name="selling_price" step="0.01" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>الكمية:</label>
                        <input type="number" name="quantity" required placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>الحد الأدنى للمخزون:</label>
                        <input type="number" name="min_quantity" value="5" placeholder="5">
                    </div>
                    <div class="form-group">
                        <label>الباركود:</label>
                        <input type="text" name="barcode" placeholder="اختياري">
                    </div>
                </form>
            </div>
            <div class="form-actions">
                <button type="submit" form="product-form" class="btn btn-primary">
                    <i class="fas fa-save"></i> حفظ المنتج
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        `;
        
        showModal(modalContent);
    } catch (error) {
        console.error('خطأ في جلب الفئات:', error);
        showMessage('حدث خطأ في تحميل الفئات', 'error');
    }
}

// دالة للتحكم في إظهار حقل الفئة المخصصة
function toggleCustomCategory() {
    const categorySelect = document.getElementById('category-select');
    const customCategoryInput = document.getElementById('custom-category-input');
    
    if (categorySelect.value === 'custom') {
        customCategoryInput.classList.add('show');
        document.getElementById('custom-category').required = true;
    } else {
        customCategoryInput.classList.remove('show');
        document.getElementById('custom-category').required = false;
        document.getElementById('custom-category').value = '';
    }
}

// حفظ المنتج
async function saveProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = Object.fromEntries(formData.entries());
    
    // التحقق من الفئة المخصصة
    if (productData.category === 'custom') {
        const customCategory = document.getElementById('custom-category').value.trim();
        if (!customCategory) {
            showMessage('يرجى إدخال اسم الفئة الجديدة', 'error');
            return;
        }
        productData.category = customCategory;
    }
    
    // تحويل الأرقام
    productData.purchase_price = parseFloat(productData.purchase_price);
    productData.selling_price = parseFloat(productData.selling_price);
    productData.quantity = parseInt(productData.quantity);
    productData.min_quantity = parseInt(productData.min_quantity);
    
    try {
        await postData('products', productData);
        showMessage('تم حفظ المنتج بنجاح', 'success');
        closeModal();
        await loadProductsData();
    } catch (error) {
        console.error('خطأ في حفظ المنتج:', error);
        showMessage('حدث خطأ في حفظ المنتج', 'error');
    }
}

// إظهار النافذة المنبثقة
function showModal(content) {
    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    modalContent.innerHTML = content;
    modal.classList.add('active');
    
    // التأكد من أن الحقول قابلة للتفاعل
    setTimeout(() => {
        const inputs = modalContent.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (!input.hasAttribute('readonly') && !input.hasAttribute('disabled')) {
                input.removeAttribute('disabled');
                input.removeAttribute('readonly');
            }
        });
        
        // تركيز على أول حقل إدخال
        const firstInput = modalContent.querySelector('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])');
        if (firstInput) {
            firstInput.focus();
        }
    }, 50);
}

// إغلاق النافذة المنبثقة
function closeModal() {
    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    modal.classList.remove('active');
    
    // تنظيف المحتوى بعد إغلاق المودال
    setTimeout(() => {
        modalContent.innerHTML = '';
    }, 300); // انتظار انتهاء الانيميشن
}

// البحث في المنتجات - نسخة محسنة مع قائمة منسدلة
function searchProducts() {
    const searchTerm = document.getElementById('product-search').value.toLowerCase().trim();
    const dropdown = document.getElementById('search-results-dropdown');
    
    if (searchTerm === '') {
        dropdown.style.display = 'none';
        filterByCategory(currentCategory);
        return;
    }
    
    let searchResults;
    if (currentCategory === 'all') {
        searchResults = products.filter(product => 
            product.quantity > 0 && (
                // البحث في اسم المنتج
                product.name.toLowerCase().includes(searchTerm) ||
                // البحث في الباركود
                (product.barcode && product.barcode.toLowerCase().includes(searchTerm)) ||
                // البحث في ID المنتج
                product.id.toString().includes(searchTerm) ||
                // البحث في الفئة
                (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                // البحث في المقاس
                (product.size && product.size.toLowerCase().includes(searchTerm)) ||
                // البحث في اللون
                (product.color && product.color.toLowerCase().includes(searchTerm))
            )
        );
    } else {
        searchResults = products.filter(product => 
            product.quantity > 0 && 
            product.category === currentCategory && (
                // البحث في اسم المنتج
                product.name.toLowerCase().includes(searchTerm) ||
                // البحث في الباركود
                (product.barcode && product.barcode.toLowerCase().includes(searchTerm)) ||
                // البحث في ID المنتج
                product.id.toString().includes(searchTerm) ||
                // البحث في المقاس
                (product.size && product.size.toLowerCase().includes(searchTerm)) ||
                // البحث في اللون
                (product.color && product.color.toLowerCase().includes(searchTerm))
            )
        );
    }
    
    // عرض النتائج في القائمة المنسدلة
    displaySearchResults(searchResults, searchTerm);
    
    // تحديث الشبكة الرئيسية أيضاً
    filteredProducts = searchResults;
    displayProducts();
}

// البحث في صفحة الأصناف
function searchProductsInTable() {
    filterProducts();
}

// عرض نتائج البحث في القائمة المنسدلة
function displaySearchResults(results, searchTerm) {
    const dropdown = document.getElementById('search-results-dropdown');
    
    if (results.length === 0) {
        dropdown.innerHTML = `
            <div class="no-results">
                لم يتم العثور على منتجات تحتوي على "${searchTerm}"
            </div>
        `;
        dropdown.style.display = 'block';
        return;
    }
    
    // عرض أول 10 نتائج فقط في القائمة المنسدلة
    const limitedResults = results.slice(0, 10);
    
    dropdown.innerHTML = limitedResults.map(product => `
        <div class="search-result-item" onclick="addToCartFromSearch(${product.id})">
            <div class="search-result-info">
                <div class="search-result-name">${product.name}</div>
                <div class="search-result-details">
                    ${product.barcode ? `الباركود: ${product.barcode}` : ''}
                    ${product.category ? ` | الفئة: ${product.category}` : ''}
                    ${product.size ? ` | المقاس: ${product.size}` : ''}
                    ${product.color ? ` | اللون: ${product.color}` : ''}
                </div>
            </div>
            <div>
                <span class="search-result-price">${product.selling_price} جنيه</span>
                <span class="search-result-stock">(${product.quantity} متوفر)</span>
            </div>
        </div>
    `).join('');
    
    dropdown.style.display = 'block';
}

// إضافة منتج للسلة من نتائج البحث
function addToCartFromSearch(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        addToCart(product);
        // إخفاء القائمة المنسدلة بعد الإضافة
        document.getElementById('search-results-dropdown').style.display = 'none';
        // مسح حقل البحث
        document.getElementById('product-search').value = '';
    }
}

// ملء قائمة العملاء
function populateCustomerSelect(customersData) {
    const customerSelect = document.getElementById('customer-select');
    if (!customerSelect) return;
    
    // مسح الخيارات الحالية (عدا الخيار الأول)
    customerSelect.innerHTML = '<option value="">عميل نقدي</option>';
    
    customersData.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        customerSelect.appendChild(option);
    });
}

function setupProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchProducts);
        
        // إضافة مستمع لمفتاح Enter للبحث السريع
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const dropdown = document.getElementById('search-results-dropdown');
                const firstResult = dropdown.querySelector('.search-result-item');
                if (firstResult) {
                    firstResult.click();
                }
            }
        });
    }
}

// البحث السريع بالباركود
function quickBarcodeSearch(barcode) {
    const product = products.find(p => 
        p.barcode === barcode && p.quantity > 0
    );
    
    if (product) {
        // إضافة المنتج مباشرة للسلة
        addToCart(product);
        showMessage(`تم إضافة ${product.name} للسلة`, 'success');
        
        // مسح حقل البحث
        document.getElementById('product-search').value = '';
        filterByCategory(currentCategory);
    } else {
        showMessage('لم يتم العثور على منتج بهذا الباركود', 'warning');
    }
}

// تحسين حقل البحث للتعامل مع الباركود
function setupEnhancedSearch() {
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.trim();
                
                // إذا كان النص يبدو كباركود (أرقام فقط)
                if (/^\d+$/.test(searchTerm)) {
                    quickBarcodeSearch(searchTerm);
                } else {
                    // البحث العادي
                    searchProducts();
                }
            }
        });
        
        searchInput.addEventListener('input', searchProducts);
    }
}

// تحميل بيانات العملاء
async function loadCustomersData() {
    try {
        const customersData = await fetchData('customers');
        const salesData = await fetchData('sales');
        
        customers = customersData;
        
        displayCustomersTable(customersData, salesData);
        updateCustomersStats(customersData, salesData);
        setupCustomerSearch();
        
        console.log('تم تحميل بيانات العملاء:', customers.length);
    } catch (error) {
        console.error('خطأ في تحميل بيانات العملاء:', error);
        showMessage('حدث خطأ في تحميل بيانات العملاء', 'error');
    }
}

// عرض جدول العملاء
function displayCustomersTable(customersData, salesData = []) {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (customersData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">لا يوجد عملاء</td></tr>';
        return;
    }
    
    customersData.forEach(customer => {
        // حساب إحصائيات العميل
        const customerSales = salesData.filter(sale => sale.customer_id === customer.id);
        const totalPurchases = customerSales.reduce((sum, sale) => sum + sale.final_amount, 0);
        const purchaseCount = customerSales.length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.phone || 'غير محدد'}</td>
            <td>${customer.address || 'غير محدد'}</td>
            <td>${formatLocalDate(customer.created_at)}</td>
            <td>${purchaseCount}</td>
            <td>${totalPurchases.toFixed(2)} جنيه</td>
            <td class="actions">
                <button class="btn btn-sm btn-info" onclick="viewCustomerDetails(${customer.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="editCustomer(${customer.id})" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// تحديث إحصائيات العملاء
function updateCustomersStats(customersData, salesData = []) {
    const totalCustomers = customersData.length;
    
    // العملاء الجدد هذا الشهر
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newCustomersThisMonth = customersData.filter(customer => {
        const customerDate = new Date(customer.created_at);
        return customerDate.getMonth() === currentMonth && customerDate.getFullYear() === currentYear;
    }).length;
    
    // العملاء النشطين (لديهم مشتريات)
    const activeCustomers = customersData.filter(customer => 
        salesData.some(sale => sale.customer_id === customer.id)
    ).length;
    
    updateElementText('total-customers-count', totalCustomers);
    updateElementText('new-customers-month', newCustomersThisMonth);
    updateElementText('active-customers', activeCustomers);
}

// إظهار نافذة إضافة عميل جديد
function showAddCustomerModal() {
    console.log('تم استدعاء showAddCustomerModal'); // إضافة لوج للتشخيص
    
    const modalContent = `
        <div class="modal-header">
            <h3>إضافة عميل جديد</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form id="add-customer-form" onsubmit="saveCustomer(event)">
                <div class="form-group">
                    <label>اسم العميل: *</label>
                    <input type="text" name="name" required>
                </div>
                <div class="form-group">
                    <label>رقم الهاتف:</label>
                    <input type="tel" name="phone">
                </div>
                <div class="form-group">
                    <label>العنوان:</label>
                    <textarea name="address" rows="3"></textarea>
                </div>
            </form>
        </div>
        <div class="form-actions">
            <button type="submit" form="add-customer-form" class="btn btn-primary">
                <i class="fas fa-save"></i> حفظ العميل
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;
    
    showModal(modalContent);
}

// حفظ عميل جديد
async function saveCustomer(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const customerData = Object.fromEntries(formData.entries());
    
    // التحقق من البيانات المطلوبة
    if (!customerData.name.trim()) {
        showMessage('يرجى إدخال اسم العميل', 'error');
        return;
    }
    
    try {
        const result = await postData('customers', customerData);
        showMessage('تم إضافة العميل بنجاح', 'success');
        closeModal();
        loadCustomersData(); // إعادة تحميل البيانات
    } catch (error) {
        console.error('خطأ في حفظ العميل:', error);
        showMessage('حدث خطأ في حفظ العميل', 'error');
    }
}

// تعديل عميل
async function editCustomer(customerId) {
    try {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            showMessage('العميل غير موجود', 'error');
            return;
        }
        
        const modalContent = `
            <div class="modal-header">
                <h3>تعديل بيانات العميل</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="edit-customer-form" onsubmit="updateCustomer(event, ${customerId})">
                    <div class="form-group">
                        <label>اسم العميل: *</label>
                        <input type="text" name="name" value="${customer.name}" required>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف:</label>
                        <input type="tel" name="phone" value="${customer.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>العنوان:</label>
                        <textarea name="address" rows="3">${customer.address || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="form-actions">
                <button type="submit" form="edit-customer-form" class="btn btn-primary">
                    <i class="fas fa-save"></i> حفظ التعديلات
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        `;
        
        showModal(modalContent);
    } catch (error) {
        console.error('خطأ في تحميل بيانات العميل:', error);
        showMessage('حدث خطأ في تحميل بيانات العميل', 'error');
    }
}

// تحديث بيانات العميل
async function updateCustomer(event, customerId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const customerData = Object.fromEntries(formData.entries());
    
    // التحقق من البيانات المطلوبة
    if (!customerData.name.trim()) {
        showMessage('يرجى إدخال اسم العميل', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });
        
        if (!response.ok) {
            throw new Error('فشل في تحديث العميل');
        }
        
        showMessage('تم تحديث بيانات العميل بنجاح', 'success');
        closeModal();
        loadCustomersData(); // إعادة تحميل البيانات
    } catch (error) {
        console.error('خطأ في تحديث العميل:', error);
        showMessage('حدث خطأ في تحديث العميل', 'error');
    }
}

// حذف عميل
async function deleteCustomer(customerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟\nسيتم حذف جميع بيانات العميل نهائياً.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/customers/${customerId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'فشل في حذف العميل');
        }
        
        showMessage('تم حذف العميل بنجاح', 'success');
        loadCustomersData(); // إعادة تحميل البيانات
    } catch (error) {
        console.error('خطأ في حذف العميل:', error);
        showMessage(error.message, 'error');
    }
}

// عرض تفاصيل العميل
async function viewCustomerDetails(customerId) {
    try {
        const customer = customers.find(c => c.id === customerId);
        const salesData = await fetchData('sales');
        const customerSales = salesData.filter(sale => sale.customer_id === customerId);
        
        const totalPurchases = customerSales.reduce((sum, sale) => sum + sale.final_amount, 0);
        const lastPurchase = customerSales.length > 0 ? 
            new Date(Math.max(...customerSales.map(s => new Date(s.created_at)))).toLocaleDateString('ar-EG') : 
            'لا توجد مشتريات';
        
        const modalContent = `
            <div class="modal-header">
                <h3>تفاصيل العميل</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="customer-details">
                    <div class="detail-row">
                        <strong>الاسم:</strong> ${customer.name}
                    </div>
                    <div class="detail-row">
                        <strong>رقم الهاتف:</strong> ${customer.phone || 'غير محدد'}
                    </div>
                    <div class="detail-row">
                        <strong>العنوان:</strong> ${customer.address || 'غير محدد'}
                    </div>
                    <div class="detail-row">
                        <strong>تاريخ التسجيل:</strong> ${new Date(customer.created_at).toLocaleDateString('ar-EG')}
                    </div>
                    <div class="detail-row">
                        <strong>عدد المشتريات:</strong> ${customerSales.length}
                    </div>
                    <div class="detail-row">
                        <strong>إجمالي المشتريات:</strong> ${totalPurchases.toFixed(2)} جنيه
                    </div>
                    <div class="detail-row">
                        <strong>آخر عملية شراء:</strong> ${lastPurchase}
                    </div>
                </div>
                
                ${customerSales.length > 0 ? `
                    <h4>آخر المشتريات:</h4>
                    <div class="customer-sales">
                        ${customerSales.slice(0, 5).map(sale => `
                            <div class="sale-item">
                                <span>فاتورة #${sale.id}</span>
                                <span>${sale.final_amount.toFixed(2)} جنيه</span>
                                <span>${new Date(sale.created_at).toLocaleDateString('ar-EG')}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="editCustomer(${customerId})">
                    <i class="fas fa-edit"></i> تعديل البيانات
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        `;
        
        showModal(modalContent);
    } catch (error) {
        console.error('خطأ في عرض تفاصيل العميل:', error);
        showMessage('حدث خطأ في عرض تفاصيل العميل', 'error');
    }
}

// إعداد البحث في العملاء
function setupCustomerSearch() {
    const searchInput = document.getElementById('customer-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredCustomers = customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm)) ||
            (customer.address && customer.address.toLowerCase().includes(searchTerm))
        );
        
        displayCustomersTable(filteredCustomers);
    });
}

// تصدير بيانات العملاء
function exportCustomers() {
    const csvContent = generateCustomersCSV();
    downloadCSV(csvContent, 'customers-report.csv');
}

function generateCustomersCSV() {
    const headers = ['الكود', 'اسم العميل', 'رقم الهاتف', 'العنوان', 'تاريخ التسجيل'];
    const rows = customers.map(customer => [
        customer.id,
        customer.name,
        customer.phone || '',
        customer.address || '',
        new Date(customer.created_at).toLocaleDateString('ar-EG')
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// تحميل بيانات المبيعات
async function loadSalesData() {
    try {
        const [salesData, customersData, dailyStatsData, weeklyStatsData] = await Promise.all([
            fetchData('sales'),
            fetchData('customers'),
            fetchData('reports/stats'),
            fetchData('reports/weekly-stats')
        ]);
        
        sales = salesData;
        
        // إضافة رسائل تشخيص
        console.log('تم تحميل بيانات المبيعات:', salesData);
        console.log('عدد المبيعات المحملة:', salesData.length);
        
        // تعيين تاريخ اليوم في حقول التاريخ تلقائيًا
        const today = getCurrentLocalDate();
        document.getElementById('start-date').value = today;
        document.getElementById('end-date').value = today;
        
        displaySalesTable(salesData);
        populateCustomerFilter(customersData);
        
        // تطبيق فلتر اليوم تلقائياً
        applySalesFilters();
        
    } catch (error) {
        console.error('خطأ في تحميل بيانات المبيعات:', error);
        showMessage('حدث خطأ في تحميل البيانات', 'error');
    }
}

function displaySalesTable(salesData) {
    const tbody = document.getElementById('sales-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-data">لا توجد مبيعات</td></tr>';
        return;
    }
    
    salesData.forEach(sale => {
        const row = document.createElement('tr');
        
        // حساب الخصومات الفردية من بيانات البيع
        const individualDiscounts = sale.individual_discounts || 0;
        const additionalDiscount = sale.additional_discount || 0;
        const totalDiscount = sale.discount || 0;
        
        row.innerHTML = `
            <td>#${sale.id}</td>
            <td>${formatLocalDateTime(sale.created_at)}</td>
            <td>${sale.customer_name || 'عميل نقدي'}</td>
            <td>${sale.items_count || 0}</td>
            <td>${sale.total_amount.toFixed(2)} جنيه</td>
            <td>${individualDiscounts.toFixed(2)} جنيه</td>
            <td>${totalDiscount.toFixed(2)} جنيه</td>
            <td class="total-amount">${sale.final_amount.toFixed(2)} جنيه</td>
            <td><span class="payment-method ${sale.payment_method}">${sale.payment_method}</span></td>
            <td class="actions">
                <button class="btn btn-sm btn-info" onclick="viewSaleDetails(${sale.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="printSaleInvoice(${sale.id})" title="طباعة">
                    <i class="fas fa-print"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSale(${sale.id})" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateFilteredSalesSummary(salesData);
}


function populateCustomerFilter(customersData) {
    const customerFilter = document.getElementById('customer-filter');
    if (!customerFilter) return;
    
    // مسح الخيارات الحالية (عدا الخيار الأول)
    customerFilter.innerHTML = '<option value="">جميع العملاء</option>';
    
    customersData.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        customerFilter.appendChild(option);
    });
}

function applySalesFilters() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const customerId = document.getElementById('customer-filter').value;
    const paymentMethod = document.getElementById('payment-filter').value;
    const invoiceSearch = document.getElementById('invoice-search').value.trim();
    const customerNameSearch = document.getElementById('customer-name-search').value.trim().toLowerCase();
    
    let filteredSales = [...sales];
    
    // إذا لم يتم تحديد تاريخ، استخدم تاريخ اليوم كافتراضي
    const today = getCurrentLocalDate();
    const filterStartDate = startDate || today;
    const filterEndDate = endDate || today;
    
    // فلترة حسب التاريخ
    filteredSales = filteredSales.filter(sale => {
        const saleDate = sale.created_at.split(' ')[0];
        return saleDate >= filterStartDate && saleDate <= filterEndDate;
    });
    
    // فلترة حسب رقم الفاتورة
    if (invoiceSearch) {
        filteredSales = filteredSales.filter(sale => 
            sale.id.toString().includes(invoiceSearch)
        );
    }
    
    // فلترة حسب اسم العميل
    if (customerNameSearch) {
        filteredSales = filteredSales.filter(sale => {
            const customerName = (sale.customer_name || 'عميل نقدي').toLowerCase();
            return customerName.includes(customerNameSearch);
        });
    }
    
    // فلترة حسب طريقة الدفع
    if (paymentMethod) {
        filteredSales = filteredSales.filter(sale => 
            sale.payment_method === paymentMethod
        );
    }
    
    // فلترة حسب العميل (من القائمة المنسدلة)
    if (customerId) {
        filteredSales = filteredSales.filter(sale => 
            sale.customer_id && sale.customer_id.toString() === customerId
        );
    }
    
    displaySalesTable(filteredSales);
    updateFilteredSalesSummary(filteredSales);
    
    // عرض رسالة توضيحية
    if (invoiceSearch || customerNameSearch) {
        showMessage(`تم العثور على ${filteredSales.length} نتيجة`, 'info');
    } else if (filterStartDate === today && filterEndDate === today && !customerId && !paymentMethod) {
        showMessage('يتم عرض مبيعات اليوم الحالي', 'info');
    }
}

function clearSalesFilters() {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('customer-filter').value = '';
    document.getElementById('payment-filter').value = '';
    document.getElementById('invoice-search').value = '';
    document.getElementById('customer-name-search').value = '';
    
    displaySalesTable(sales);
    updateFilteredSalesSummary(sales);
}

function updateFilteredSalesSummary(salesData) {
    // تصفية المبيعات لاستبعاد الآجلة
    const nonDeferredSales = salesData.filter(sale => sale.payment_method !== 'آجل');
    const totalSales = nonDeferredSales.reduce((sum, sale) => sum + sale.final_amount, 0);
    
    updateElementText('filtered-sales-count', salesData.length);
    updateElementText('filtered-sales-total', `${totalSales.toFixed(2)} جنيه`);
}

async function viewSaleDetails(saleId) {
    try {
        const saleDetails = await fetchData(`sales/${saleId}/details`);
        showSaleDetailsModal(saleDetails);
    } catch (error) {
        showMessage('حدث خطأ في تحميل تفاصيل الفاتورة', 'error');
    }
}

function showSaleDetailsModal(saleDetails) {
    const modalContent = `
        <div class="sale-details-modal">
            <h3>تفاصيل الفاتورة #${saleDetails.id}</h3>
            <div class="sale-info">
                <p><strong>التاريخ:</strong> ${new Date(saleDetails.created_at).toLocaleString('ar-EG')}</p>
                <p><strong>العميل:</strong> ${saleDetails.customer_name || 'عميل نقدي'}</p>
                <p><strong>طريقة الدفع:</strong> ${saleDetails.payment_method}</p>
            </div>
            
            <table class="sale-items-table">
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${saleDetails.items.map(item => `
                        <tr>
                            <td>${item.product_name}</td>
                            <td>${item.quantity}</td>
                            <td>${item.unit_price.toFixed(2)} جنيه</td>
                            <td>${item.total_price.toFixed(2)} جنيه</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="sale-summary">
                <p><strong>المجموع الفرعي:</strong> ${saleDetails.total_amount.toFixed(2)} جنيه</p>
                <p><strong>الخصومات الفردية:</strong> ${(saleDetails.individual_discounts || 0).toFixed(2)} جنيه</p>
                <p><strong>الخصم الإضافي:</strong> ${(saleDetails.additional_discount || 0).toFixed(2)} جنيه</p>
                <p><strong>إجمالي الخصم:</strong> ${saleDetails.discount.toFixed(2)} جنيه</p>
                <p class="total"><strong>الإجمالي:</strong> ${saleDetails.final_amount.toFixed(2)} جنيه</p>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="printSaleInvoice(${saleDetails.id})">طباعة</button>
                <button class="btn btn-primary" onclick="closeModal()">إغلاق</button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

function printSaleInvoice(saleId) {
    // استخدام الدالة الموجودة في الكود
    printInvoice(saleId, sales.find(s => s.id === saleId));
}

async function deleteSale(saleId) {
    verifyDeletePassword(async () => {
        try {
            await fetch(`/api/sales/${saleId}`, { method: 'DELETE' });
            showMessage('تم حذف الفاتورة بنجاح', 'success');
            loadSalesData(); // إعادة تحميل البيانات
        } catch (error) {
            showMessage('حدث خطأ في حذف الفاتورة', 'error');
        }
    }, `الفاتورة رقم ${saleId}`);
}

function refreshSalesData() {
    loadSalesData();
    showMessage('تم تحديث البيانات', 'success');
}

function exportSales() {
    // تصدير البيانات إلى Excel
    const csvContent = generateSalesCSV();
    downloadCSV(csvContent, 'sales-report.csv');
}

function generateSalesCSV() {
    const headers = ['رقم الفاتورة', 'التاريخ', 'العميل', 'المجموع الفرعي', 'الخصم', 'الإجمالي', 'طريقة الدفع'];
    const rows = sales.map(sale => [
        sale.id,
        new Date(sale.created_at).toLocaleString('ar-EG'),
        sale.customer_name || 'عميل نقدي',
        sale.total_amount.toFixed(2),
        sale.discount.toFixed(2),
        sale.final_amount.toFixed(2),
        sale.payment_method
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// تعديل منتج
async function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showMessage('المنتج غير موجود', 'error');
        return;
    }
    
    try {
        // جلب الفئات الموجودة من قاعدة البيانات
        const categories = await fetchData('categories');
        
        const categoryOptions = categories.map(category => 
            `<option value="${category}" ${product.category === category ? 'selected' : ''}>${category}</option>`
        ).join('');
        
        // التحقق إذا كانت فئة المنتج الحالية موجودة في القائمة
        const isCustomCategory = !categories.includes(product.category);
        
        const modalContent = `
            <div class="modal-header">
                <h3>تعديل المنتج</h3>
                <button class="close-btn" onclick="closeModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="edit-product-form" onsubmit="updateProduct(event, ${productId})">
                    <div class="form-group">
                        <label>اسم المنتج:</label>
                        <input type="text" name="name" value="${product.name}" required>
                    </div>
                    <div class="form-group">
                        <label>الفئة:</label>
                        <select name="category" id="edit-category-select" onchange="toggleEditCustomCategory()" required>
                            <option value="">اختر الفئة</option>
                            ${categoryOptions}
                            <option value="custom" ${isCustomCategory ? 'selected' : ''}>إضافة فئة جديدة...</option>
                        </select>
                        <div class="custom-category-input" id="edit-custom-category-input" ${isCustomCategory ? 'style="display: block;"' : ''}>
                            <input type="text" id="edit-custom-category" value="${isCustomCategory ? product.category : ''}" placeholder="أدخل اسم الفئة الجديدة">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>المقاس:</label>
                        <input type="text" name="size" value="${product.size || ''}">
                    </div>
                    <div class="form-group">
                        <label>اللون:</label>
                        <input type="text" name="color" value="${product.color || ''}">
                    </div>
                    <div class="form-group">
                        <label>سعر الشراء:</label>
                        <input type="number" name="purchase_price" step="0.01" value="${product.purchase_price}" required>
                    </div>
                    <div class="form-group">
                        <label>سعر البيع:</label>
                        <input type="number" name="selling_price" step="0.01" value="${product.selling_price}" required>
                    </div>
                    <div class="form-group">
                        <label>الكمية:</label>
                        <input type="number" name="quantity" value="${product.quantity}" required>
                    </div>
                    <div class="form-group">
                        <label>الحد الأدنى للكمية:</label>
                        <input type="number" name="min_quantity" value="${product.min_quantity || 0}" required>
                    </div>
                    <div class="form-group">
                        <label>الباركود:</label>
                        <input type="text" name="barcode" value="${product.barcode || ''}">
                    </div>
                </form>
            </div>
            <div class="form-actions">
                <button type="submit" form="edit-product-form" class="btn btn-primary">
                    <i class="fas fa-save"></i> حفظ التعديلات
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        `;
        
        showModal(modalContent);
    } catch (error) {
        console.error('خطأ في جلب الفئات:', error);
        showMessage('حدث خطأ في تحميل الفئات', 'error');
    }
}

// دالة للتحكم في إظهار حقل الفئة المخصصة في التعديل
function toggleEditCustomCategory() {
    const categorySelect = document.getElementById('edit-category-select');
    const customCategoryInput = document.getElementById('edit-custom-category-input');
    
    if (categorySelect.value === 'custom') {
        customCategoryInput.style.display = 'block';
        document.getElementById('edit-custom-category').required = true;
    } else {
        customCategoryInput.style.display = 'none';
        document.getElementById('edit-custom-category').required = false;
        document.getElementById('edit-custom-category').value = '';
    }
}

// تحديث المنتج
async function updateProduct(event, productId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productData = Object.fromEntries(formData.entries());
    
    // التحقق من الفئة المخصصة
    if (productData.category === 'custom') {
        const customCategory = document.getElementById('edit-custom-category').value.trim();
        if (!customCategory) {
            showMessage('يرجى إدخال اسم الفئة الجديدة', 'error');
            return;
        }
        productData.category = customCategory;
    }
    
    // تحويل الأرقام
    productData.purchase_price = parseFloat(productData.purchase_price);
    productData.selling_price = parseFloat(productData.selling_price);
    productData.quantity = parseInt(productData.quantity);
    productData.min_quantity = parseInt(productData.min_quantity);
    
    console.log('محاولة تحديث المنتج:', productId, productData);
    
    try {
        // التحقق من وجود المنتج أولاً
        const checkResponse = await fetch(`/api/products/${productId}`);
        if (!checkResponse.ok) {
            throw new Error(`المنتج رقم ${productId} غير موجود`);
        }
        
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        console.log('استجابة الخادم:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('تفاصيل الخطأ:', errorText);
            
            let errorMessage = 'خطأ غير معروف';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('نتيجة التحديث:', result);
        
        showMessage('تم تحديث المنتج بنجاح', 'success');
        closeModal();
        await loadProductsData();
    } catch (error) {
        console.error('خطأ في تحديث المنتج:', error);
        showMessage(`حدث خطأ في تحديث المنتج: ${error.message}`, 'error');
    }
}

// حذف منتج
async function deleteProduct(productId) {
    // الحصول على اسم المنتج للعرض
    const product = products.find(p => p.id === productId);
    const productName = product ? product.name : 'المنتج';
    
    verifyDeletePassword(async () => {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('فشل في حذف المنتج');
            }
            
            showMessage('تم حذف المنتج بنجاح', 'success');
            await loadProductsData();
        } catch (error) {
            console.error('خطأ في حذف المنتج:', error);
            showMessage('حدث خطأ في حذف المنتج', 'error');
        }
    }, productName);
}

function refreshSalesData() {
    loadSalesData();
    showMessage('تم تحديث البيانات', 'success');
}

function exportSales() {
    // تصدير البيانات إلى Excel
    const csvContent = generateSalesCSV();
    downloadCSV(csvContent, 'sales-report.csv');
}

function generateSalesCSV() {
    const headers = ['رقم الفاتورة', 'التاريخ', 'العميل', 'المجموع الفرعي', 'الخصم', 'الإجمالي', 'طريقة الدفع'];
    const rows = sales.map(sale => [
        sale.id,
        new Date(sale.created_at).toLocaleString('ar-EG'),
        sale.customer_name || 'عميل نقدي',
        sale.total_amount.toFixed(2),
        sale.discount.toFixed(2),
        sale.final_amount.toFixed(2),
        sale.payment_method
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// تحميل كمية المبيعات لجميع المنتجات
async function loadAllProductsSales(period, startDate, endDate) {
    try {
        let url = '/api/reports/all-products-sales';
        const category = document.getElementById('product-sales-category-filter')?.value || '';
        
        const params = new URLSearchParams();
        if (period === 'custom' && startDate && endDate) {
            params.append('start', startDate);
            params.append('end', endDate);
        } else if (period) {
            params.append('period', period);
        }
        if (category) {
            params.append('category', category);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        displayAllProductsSalesTable(data);
        
        // إضافة معالج حدث لفلتر الفئات
        const categoryFilter = document.getElementById('product-sales-category-filter');
        if (categoryFilter && !categoryFilter.hasAttribute('data-listener-added')) {
            categoryFilter.addEventListener('change', function() {
                const currentPeriod = document.getElementById('report-period')?.value || 'today';
                const currentStartDate = document.getElementById('report-start-date')?.value;
                const currentEndDate = document.getElementById('report-end-date')?.value;
                loadAllProductsSales(currentPeriod, currentStartDate, currentEndDate);
            });
            categoryFilter.setAttribute('data-listener-added', 'true');
        }
        
    } catch (error) {
        console.error('خطأ في تحميل مبيعات المنتجات:', error);
        const tbody = document.querySelector('#all-products-sales-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

// عرض جدول مبيعات جميع المنتجات
function displayAllProductsSalesTable(products) {
    const tbody = document.querySelector('#all-products-sales-table tbody');
    if (!tbody) {
        console.error('جدول مبيعات المنتجات غير موجود');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">لا توجد بيانات للفترة المحددة</td></tr>';
        updateProductsSalesSummary(0, 0, 0, 0, 0);
        return;
    }
    
    let totalProducts = 0;
    let totalQuantitySold = 0;
    let totalSalesValue = 0;
    let totalPurchaseValue = 0;
    let totalNetProfit = 0;
    
    products.forEach(product => {
        const row = document.createElement('tr');
        const quantitySold = product.total_quantity_sold || 0;
        const salesValue = product.total_sales_value || 0;
        const remainingQty = product.remaining_quantity || 0;
        const purchasePrice = product.purchase_price || 0;
        const sellingPrice = product.selling_price || 0;
        
        // حساب إجمالي سعر الشراء للكمية المباعة
        const totalPurchasePrice = quantitySold * purchasePrice;
        
        // حساب صافي الربح
        const netProfit = quantitySold * (sellingPrice - purchasePrice);
        
        // إضافة كلاس للمنتجات التي لم تُباع
        if (quantitySold === 0) {
            row.classList.add('no-sales');
        }
        
        row.innerHTML = `
            <td>${product.name || 'غير محدد'}</td>
            <td>${product.category || 'غير محدد'}</td>
            <td class="quantity-sold">${quantitySold}</td>
            <td class="remaining-quantity">${remainingQty}</td>
            <td class="sales-value">${salesValue.toFixed(2)} جنيه</td>
            <td class="total-purchase-price">${totalPurchasePrice.toFixed(2)} جنيه</td>
            <td class="net-profit ${netProfit >= 0 ? 'positive' : 'negative'}">${netProfit.toFixed(2)} جنيه</td>
        `;
        
        tbody.appendChild(row);
        
        totalProducts++;
        totalQuantitySold += quantitySold;
        totalSalesValue += salesValue;
        totalPurchaseValue += totalPurchasePrice;
        totalNetProfit += netProfit;
    });
    
    // تحديث الملخص
    updateProductsSalesSummary(totalProducts, totalQuantitySold, totalSalesValue, totalPurchaseValue, totalNetProfit);
}

// تحديث ملخص مبيعات المنتجات
function updateProductsSalesSummary(totalProducts, totalQuantitySold, totalSalesValue, totalPurchaseValue, totalNetProfit) {
    const totalProductsElement = document.getElementById('total-products-count');
    const totalQuantityElement = document.getElementById('total-quantity-sold');
    const totalValueElement = document.getElementById('total-sales-value');
    
    if (totalProductsElement) totalProductsElement.textContent = totalProducts;
    if (totalQuantityElement) totalQuantityElement.textContent = totalQuantitySold;
    if (totalValueElement) totalValueElement.textContent = `${totalSalesValue.toFixed(2)} جنيه`;
    
    // إضافة عنصر إجمالي سعر الشراء إذا لم يكن موجوداً
    let totalPurchaseElement = document.getElementById('total-purchase-value');
    if (!totalPurchaseElement) {
        const summaryContainer = document.querySelector('.products-sales-summary');
        if (summaryContainer) {
            const purchaseItem = document.createElement('div');
            purchaseItem.className = 'summary-item';
            purchaseItem.innerHTML = `
                <span>إجمالي سعر الشراء:</span>
                <span id="total-purchase-value">0.00 جنيه</span>
            `;
            summaryContainer.appendChild(purchaseItem);
            totalPurchaseElement = document.getElementById('total-purchase-value');
        }
    }
    
    if (totalPurchaseElement) {
        totalPurchaseElement.textContent = `${totalPurchaseValue.toFixed(2)} جنيه`;
    }
    
    // إضافة عنصر صافي الربح الإجمالي إذا لم يكن موجوداً
    let totalProfitElement = document.getElementById('total-net-profit');
    if (!totalProfitElement) {
        const summaryContainer = document.querySelector('.products-sales-summary');
        if (summaryContainer) {
            const profitItem = document.createElement('div');
            profitItem.className = 'summary-item';
            profitItem.innerHTML = `
                <span>إجمالي صافي الربح:</span>
                <span id="total-net-profit">0.00 جنيه</span>
            `;
            summaryContainer.appendChild(profitItem);
            totalProfitElement = document.getElementById('total-net-profit');
        }
    }
    
    if (totalProfitElement) {
        totalProfitElement.textContent = `${totalNetProfit.toFixed(2)} جنيه`;
        totalProfitElement.className = totalNetProfit >= 0 ? 'positive' : 'negative';
    }
}

// تحميل فئات المنتجات لفلتر الجدول
async function loadProductCategoriesFilter() {
    try {
        const categories = await fetchData('categories');
        const select = document.getElementById('product-sales-category-filter');
        if (select && categories) {
            // حفظ القيمة المحددة حالياً
            const currentValue = select.value;
            
            select.innerHTML = '<option value="">جميع الفئات</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                if (category === currentValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('خطأ في تحميل فئات المنتجات:', error);
    }
}

// تحميل بيانات التقارير المحدثة
async function loadReportsData() {
    try {
        const period = document.getElementById('report-period')?.value || 'today';
        const startDate = document.getElementById('custom-start-date')?.value;
        const endDate = document.getElementById('custom-end-date')?.value;
        
        // تحميل جميع التقارير
        await Promise.all([
            loadReportsStats(period, startDate, endDate),
            loadTopProducts(period, startDate, endDate),
            loadTopCustomers(period, startDate, endDate),
            loadAllProductsSales(period, startDate, endDate), // إضافة الجدول الجديد
            loadLowStockAlerts(),
            loadSalesChart(period, startDate, endDate),
            loadCategoriesChart(period, startDate, endDate),
            loadProductCategoriesFilter() // تحميل فئات المنتجات للفلتر
        ]);
        
        console.log('تم تحميل بيانات التقارير');
    } catch (error) {
        console.error('خطأ في تحميل بيانات التقارير:', error);
        showMessage('حدث خطأ في تحميل التقارير', 'error');
    }
}

// إنشاء التقارير
async function generateReports() {
    const period = document.getElementById('report-period')?.value || 'today';
    const startDate = document.getElementById('custom-start-date')?.value;
    const endDate = document.getElementById('custom-end-date')?.value;
    
    try {
        // تحميل الإحصائيات العامة
        await loadReportsStats(period, startDate, endDate);
        
        // تحميل أفضل المنتجات
        await loadTopProducts(period, startDate, endDate);
        
        // تحميل أفضل العملاء
        await loadTopCustomers(period, startDate, endDate);
        
        // تحميل جدول مبيعات جميع المنتجات
        await loadAllProductsSales(period, startDate, endDate);
        
        // تحميل تنبيهات المخزون
        await loadLowStockAlerts();
        
        // تحميل المخططات (مؤقتاً)
        await loadSalesChart(period, startDate, endDate);
        await loadCategoriesChart(period, startDate, endDate);
        
        // تحميل البيانات المحذوفة (إذا كانت الصفحة تحتوي على هذا القسم)
        const deletedDataSection = document.getElementById('deleted-data-section');
        if (deletedDataSection) {
            await loadDeletedData();
        }
        
        showMessage('تم إنشاء التقارير بنجاح', 'success');
        
    } catch (error) {
        console.error('خطأ في إنشاء التقارير:', error);
        showMessage('خطأ في إنشاء التقارير', 'error');
    }
}

// تحميل الإحصائيات العامة
async function loadReportsStats(period, startDate, endDate) {
    try {
        let url = '/api/reports/stats';
        if (period === 'custom' && startDate && endDate) {
            url += `?start=${startDate}&end=${endDate}`;
        } else {
            url += `?period=${period}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const stats = await response.json();
        
        // تحديث عناصر المبيعات
        const totalSalesEl = document.getElementById('report-total-sales');
        const totalInvoicesEl = document.getElementById('report-total-invoices');
        const avgInvoiceEl = document.getElementById('report-avg-invoice');
        const profitMarginEl = document.getElementById('report-profit-margin');
        
        // إضافة تحديث صافي الإيراد وإجمالي المرتجعات
        const netRevenueEl = document.getElementById('report-net-revenue');
        const totalReturnsEl = document.getElementById('report-total-returns');
        
        // تحديث عناصر المشتريات والمصروفات الجديدة
        const totalPurchasesEl = document.getElementById('report-total-purchases');
        const totalExpensesEl = document.getElementById('report-total-expenses');
        
        // تحديث بيانات المبيعات
        if (totalSalesEl) totalSalesEl.textContent = (stats.total || 0).toFixed(2) + ' جنيه';
        if (totalInvoicesEl) totalInvoicesEl.textContent = stats.count || 0;
        if (avgInvoiceEl) avgInvoiceEl.textContent = (stats.average || 0).toFixed(2) + ' جنيه';
        
        // تحديث صافي الإيراد وإجمالي المرتجعات
        if (netRevenueEl) netRevenueEl.textContent = (stats.netRevenue || 0).toFixed(2) + ' جنيه';
        if (totalReturnsEl) totalReturnsEl.textContent = (stats.totalReturns || 0).toFixed(2) + ' جنيه';
        
        // عرض صافي الربح
        if (profitMarginEl) {
            const profit = stats.totalProfit || 0;
            profitMarginEl.textContent = profit.toFixed(2) + ' جنيه';
            
            // إضافة لون حسب مقدار الربح
            if (profit > 1000) {
                profitMarginEl.style.color = '#28a745'; // أخضر للربح الجيد
            } else if (profit > 500) {
                profitMarginEl.style.color = '#ffc107'; // أصفر للربح المتوسط
            } else if (profit > 0) {
                profitMarginEl.style.color = '#17a2b8'; // أزرق للربح المنخفض
            } else {
                profitMarginEl.style.color = '#dc3545'; // أحمر للخسارة
            }
        }
        
        // تحديث بيانات المشتريات
        if (totalPurchasesEl) {
            totalPurchasesEl.textContent = (stats.totalPurchases || 0).toFixed(2) + ' جنيه';
        }
        
        // تحديث بيانات المصروفات
        if (totalExpensesEl) {
            totalExpensesEl.textContent = (stats.totalExpenses || 0).toFixed(2) + ' جنيه';
        }
        
        // إضافة معلومات إضافية في وحدة التحكم للمطورين
        console.log('تفاصيل التقرير:', {
            إجمالي_المبيعات: stats.total,
            عدد_الفواتير: stats.count,
            متوسط_الفاتورة: stats.average,
            صافي_الإيراد: stats.netRevenue,
            إجمالي_المرتجعات: stats.totalReturns,
            صافي_الربح: stats.totalProfit,
            إجمالي_المشتريات: stats.totalPurchases,
            إجمالي_المصروفات: stats.totalExpenses
        });
        
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        // عرض قيم افتراضية في حالة الخطأ
        const elements = {
            'report-total-sales': '0.00 جنيه',
            'report-total-invoices': '0',
            'report-avg-invoice': '0.00 جنيه',
            'report-net-revenue': '0.00 جنيه',
            'report-total-returns': '0.00 جنيه',
            'report-profit-margin': '0.00 جنيه',
            'report-total-purchases': '0.00 جنيه',
            'report-total-expenses': '0.00 جنيه'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }
}

// تحميل أفضل المنتجات
async function loadTopProducts(period, startDate, endDate) {
    try {
        let url = '/api/reports/top-products';
        if (period === 'custom' && startDate && endDate) {
            url += `?start=${startDate}&end=${endDate}`;
        } else {
            url += `?period=${period}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // التأكد من أن البيانات مصفوفة
        const products = Array.isArray(data) ? data : [];
        
        const tbody = document.querySelector('#top-products-table tbody');
        if (!tbody) {
            console.error('جدول أفضل المنتجات غير موجود');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">لا توجد بيانات للفترة المحددة</td></tr>';
            return;
        }
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name || 'غير محدد'}</td>
                <td>${product.total_quantity || 0}</td>
                <td>${(product.total_sales || 0).toFixed(2)} جنيه</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل أفضل المنتجات:', error);
        const tbody = document.querySelector('#top-products-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

// تحميل أفضل العملاء
async function loadTopCustomers(period, startDate, endDate) {
    try {
        let url = '/api/reports/top-customers';
        if (period === 'custom' && startDate && endDate) {
            url += `?period=custom&start=${startDate}&end=${endDate}`;
        } else {
            url += `?period=${period || 'today'}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const customers = await response.json();
        
        // التأكد من أن customers هو array
        if (!Array.isArray(customers)) {
            console.error('البيانات المستلمة ليست array:', customers);
            return;
        }
        
        const tbody = document.querySelector('#top-customers-table tbody');
        if (!tbody) {
            console.error('جدول أفضل العملاء غير موجود');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="no-data">لا توجد بيانات عملاء</td></tr>';
            return;
        }
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.name || 'غير محدد'}</td>
                <td>${customer.total_orders || 0}</td>
                <td>${(customer.total_spent || 0).toFixed(2)} جنيه</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل أفضل العملاء:', error);
        const tbody = document.querySelector('#top-customers-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3" class="error">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

// تحميل تنبيهات المخزون
async function loadLowStockAlerts() {
    try {
        const response = await fetch('/api/reports/low-stock');
        const products = await response.json();
        
        const container = document.getElementById('low-stock-alerts');
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<p>لا توجد تنبيهات مخزون حالياً</p>';
            return;
        }
        
        products.forEach(product => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `stock-alert-item ${product.quantity === 0 ? 'critical' : ''}`;
            alertDiv.innerHTML = `
                <div>
                    <strong>${product.name}</strong>
                    <br>
                    <small>الكمية المتاحة: ${product.quantity}</small>
                </div>
                <div>
                    <span class="badge ${product.quantity === 0 ? 'badge-danger' : 'badge-warning'}">
                        ${product.quantity === 0 ? 'نفد المخزون' : 'مخزون منخفض'}
                    </span>
                </div>
            `;
            container.appendChild(alertDiv);
        });
        
    } catch (error) {
        console.error('خطأ في تحميل تنبيهات المخزون:', error);
    }
}

// تحميل مخطط المبيعات
async function loadSalesChart(period, startDate, endDate) {
    try {
        let url = '/api/reports/sales-chart';
        if (period === 'custom' && startDate && endDate) {
            url += `?start=${startDate}&end=${endDate}`;
        } else {
            url += `?period=${period}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const canvas = document.getElementById('sales-chart');
        if (!canvas) {
            console.error('عنصر مخطط المبيعات غير موجود');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // تدمير المخطط السابق إن وجد
        if (salesChart) {
            salesChart.destroy();
        }
        
        // تحضير البيانات
        const labels = data.map(item => {
            if (period === 'today') {
                return `${item.period}:00`; // عرض الساعة
            } else if (period === 'year') {
                return item.period; // عرض الشهر
            } else {
                return item.period; // عرض التاريخ
            }
        });
        
        const salesData = data.map(item => item.total_sales || 0);
        const countData = data.map(item => item.sales_count || 0);
        
        // إنشاء المخطط
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'إجمالي المبيعات (جنيه)',
                    data: salesData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y'
                }, {
                    label: 'عدد الفواتير',
                    data: countData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: period === 'today' ? 'الساعة' : period === 'year' ? 'الشهر' : 'التاريخ'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'إجمالي المبيعات (جنيه)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'عدد الفواتير'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'مخطط المبيعات'
                    },
                    legend: {
                        display: true
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('خطأ في تحميل مخطط المبيعات:', error);
        
        // عرض رسالة خطأ في المخطط
        const canvas = document.getElementById('sales-chart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('خطأ في تحميل بيانات المخطط', canvas.width/2, canvas.height/2);
        }
    }
}

// تحميل مخطط الفئات
async function loadCategoriesChart(period, startDate, endDate) {
    try {
        let url = '/api/reports/categories-chart';
        if (period === 'custom' && startDate && endDate) {
            url += `?start=${startDate}&end=${endDate}`;
        } else {
            url += `?period=${period}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        const canvas = document.getElementById('categories-chart');
        if (!canvas) {
            console.error('عنصر مخطط الفئات غير موجود');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // تدمير المخطط السابق إن وجد
        if (categoriesChart) {
            categoriesChart.destroy();
        }
        
        if (data.length === 0) {
            // عرض رسالة عدم وجود بيانات
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('لا توجد بيانات للفترة المحددة', canvas.width/2, canvas.height/2);
            return;
        }
        
        // تحضير البيانات
        const labels = data.map(item => item.category || 'غير محدد');
        const salesData = data.map(item => item.total_sales || 0);
        
        // ألوان مختلفة لكل فئة
        const colors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)'
        ];
        
        // إنشاء المخطط
        categoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'مبيعات الفئات (جنيه)',
                    data: salesData,
                    backgroundColor: colors.slice(0, data.length),
                    borderColor: colors.slice(0, data.length).map(color => color.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'مبيعات الفئات'
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toFixed(2)} جنيه (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('خطأ في تحميل مخطط الفئات:', error);
        
        // عرض رسالة خطأ في المخطط
        const canvas = document.getElementById('categories-chart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('خطأ في تحميل بيانات المخطط', canvas.width/2, canvas.height/2);
        }
    }
}

// تحديث إحصائيات التقارير
function updateReportsStats(stats) {
    // تحديث إجمالي المبيعات
    document.getElementById('report-total-sales').textContent = `${stats.total.toFixed(2)} جنيه`;
    
    // تحديث إجمالي المرتجعات
    document.getElementById('report-total-returns').textContent = `${stats.totalReturns.toFixed(2)} جنيه`;
    
    // تحديث صافي الإيراد
    document.getElementById('report-net-revenue').textContent = `${stats.netRevenue.toFixed(2)} جنيه`;
    
    // تحديث عدد الفواتير
    document.getElementById('report-total-invoices').textContent = stats.count;
    
    // تحديث متوسط الفاتورة
    document.getElementById('report-avg-invoice').textContent = `${(stats.average || 0).toFixed(2)} جنيه`;
    
    // تحديث صافي الربح
    const profitElement = document.getElementById('report-profit-margin');
    if (profitElement) {
        const profit = stats.totalProfit || 0;
        profitElement.textContent = `${profit.toFixed(2)} جنيه`;
        
        // تلوين حسب الربح
        if (profit > 0) {
            profitElement.style.color = '#28a745'; // أخضر للربح
        } else {
            profitElement.style.color = '#dc3545'; // أحمر للخسارة
        }
    }
}

// عرض جدول المرتجعات
function displayReturnsTable(returns) {
    const tbody = document.getElementById('returns-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (returns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">لا توجد مرتجعات</td></tr>';
        return;
    }
    
    returns.forEach(returnItem => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${returnItem.id}</td>
            <td>${returnItem.product_name}</td>
            <td>${returnItem.quantity}</td>
            <td>${returnItem.unit_price.toFixed(2)} جنيه</td>
            <td>${returnItem.total_amount.toFixed(2)} جنيه</td>
            <td>${returnItem.reason}</td>
            <td>${returnItem.original_invoice || 'غير محدد'}</td>
            <td>${formatLocalDate(returnItem.created_at)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-info" onclick="viewReturnDetails(${returnItem.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="printReturnReceipt(${returnItem.id}, ${JSON.stringify(returnItem).replace(/"/g, '&quot;')})" title="طباعة الإيصال">
                    <i class="fas fa-print"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// عرض تفاصيل المرتجع
function viewReturnDetails(returnId) {
    // يمكن إضافة مودل لعرض تفاصيل المرتجع
    showMessage(`عرض تفاصيل المرتجع رقم ${returnId}`, 'info');
}

// تصدير التقارير مع المرتجعات
async function exportReports() {
    try {
        const period = document.getElementById('report-period')?.value || 'today';
        const statsData = await fetchData(`reports/stats?period=${period}`);
        const dailyData = await fetchData('reports/daily-sales');
        
        // إنشاء ملف Excel يتضمن المبيعات والمرتجعات
        const workbook = XLSX.utils.book_new();
        
        // ورقة الإحصائيات
        const statsSheet = XLSX.utils.json_to_sheet([
            { 'البيان': 'إجمالي المبيعات', 'القيمة': `${statsData.total.toFixed(2)} جنيه` },
            { 'البيان': 'إجمالي المرتجعات', 'القيمة': `${statsData.totalReturns.toFixed(2)} جنيه` },
            { 'البيان': 'صافي الإيراد', 'القيمة': `${statsData.netRevenue.toFixed(2)} جنيه` },
            { 'البيان': 'عدد الفواتير', 'القيمة': statsData.count },
            { 'البيان': 'عدد المرتجعات', 'القيمة': statsData.returnsCount }
        ]);
        
        // ورقة المبيعات
        const salesSheet = XLSX.utils.json_to_sheet(
            dailyData.sales.map(sale => ({
                'رقم الفاتورة': sale.id,
                'العميل': sale.customer_name || 'عميل نقدي',
                'المبلغ الإجمالي': sale.final_amount,
                'طريقة الدفع': sale.payment_method,
                'التاريخ': formatLocalDate(sale.created_at)
            }))
        );
        
        // ورقة المرتجعات
        const returnsSheet = XLSX.utils.json_to_sheet(
            dailyData.returns.map(returnItem => ({
                'رقم المرتجع': returnItem.id,
                'المنتج': returnItem.product_name,
                'الكمية': returnItem.quantity,
                'سعر الوحدة': returnItem.unit_price,
                'المبلغ الإجمالي': returnItem.total_amount,
                'سبب الإرجاع': returnItem.reason,
                'الفاتورة الأصلية': returnItem.original_invoice || 'غير محدد',
                'التاريخ': formatLocalDate(returnItem.created_at)
            }))
        );
        
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'الإحصائيات');
        XLSX.utils.book_append_sheet(workbook, salesSheet, 'المبيعات');
        XLSX.utils.book_append_sheet(workbook, returnsSheet, 'المرتجعات');
        
        XLSX.writeFile(workbook, `تقرير_${period}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showMessage('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير التقرير:', error);
        showMessage('حدث خطأ في تصدير التقرير', 'error');
    }
}

// تحميل بيانات الإعدادات
async function loadSettingsData() {
    try {
        // تحميل الإعدادات من localStorage
        const savedSettings = localStorage.getItem('systemSettings');
        if (savedSettings) {
            systemSettings = { ...systemSettings, ...JSON.parse(savedSettings) };
        }
        
        // تحديث النموذج
        updateSettingsForm();
        
        // تحميل إعدادات النسخ الاحتياطي المتقدم
        await loadAdvancedBackupSettings();
        
        // تحميل معلومات النظام
        await loadSystemInfo();
        
        // تحميل قائمة المستخدمين
        loadUsersList();
        
        // تحميل إعدادات كلمة مرور الحذف
        loadDeletePasswordSettings();
        
        console.log('تم تحميل إعدادات النظام');
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
    }
}

// تحديث نموذج الإعدادات
function updateSettingsForm() {
    // معلومات المحل
    updateElementValue('store-name', systemSettings.storeName);
    updateElementValue('store-address', systemSettings.storeAddress);
    updateElementValue('store-phone', systemSettings.storePhone);
    updateElementValue('store-email', systemSettings.storeEmail);
    updateElementValue('tax-number', systemSettings.taxNumber);
    
    // إعدادات النظام
    updateElementValue('currency', systemSettings.currency);
    updateElementValue('tax-rate', systemSettings.taxRate);
    updateElementValue('low-stock-threshold', systemSettings.lowStockThreshold);
    updateElementChecked('auto-backup', systemSettings.autoBackup);
    updateElementChecked('sound-notifications', systemSettings.soundNotifications);
    
    // إعدادات الطباعة
    updateElementValue('receipt-printer', systemSettings.receiptPrinter);
    updateElementValue('paper-size', systemSettings.paperSize);
    updateElementChecked('auto-print', systemSettings.autoPrint);
    updateElementChecked('print-logo', systemSettings.printLogo);
    updateElementValue('receipt-footer', systemSettings.receiptFooter);
    
    // إعدادات متقدمة
    updateElementValue('backup-frequency', systemSettings.backupFrequency);
    updateElementValue('session-timeout', systemSettings.sessionTimeout);
    updateElementChecked('debug-mode', systemSettings.debugMode);
}

// حفظ إعدادات المحل
function saveStoreSettings() {
    try {
        systemSettings.storeName = getElementValue('store-name');
        systemSettings.storeAddress = getElementValue('store-address');
        systemSettings.storePhone = getElementValue('store-phone');
        systemSettings.storeEmail = getElementValue('store-email');
        systemSettings.taxNumber = getElementValue('tax-number');
        
        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        showMessage('تم حفظ معلومات المحل بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في حفظ معلومات المحل:', error);
        showMessage('حدث خطأ في حفظ معلومات المحل', 'error');
    }
}

// حفظ إعدادات النظام
function saveSystemSettings() {
    try {
        systemSettings.currency = getElementValue('currency');
        systemSettings.taxRate = parseFloat(getElementValue('tax-rate')) || 0;
        systemSettings.lowStockThreshold = parseInt(getElementValue('low-stock-threshold')) || 5;
        systemSettings.autoBackup = getElementChecked('auto-backup');
        systemSettings.soundNotifications = getElementChecked('sound-notifications');
        
        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        showMessage('تم حفظ إعدادات النظام بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في حفظ إعدادات النظام:', error);
        showMessage('حدث خطأ في حفظ إعدادات النظام', 'error');
    }
}

// حفظ إعدادات الطباعة
function savePrintSettings() {
    try {
        systemSettings.receiptPrinter = getElementValue('receipt-printer');
        systemSettings.paperSize = getElementValue('paper-size');
        systemSettings.autoPrint = getElementChecked('auto-print');
        systemSettings.printLogo = getElementChecked('print-logo');
        systemSettings.receiptFooter = getElementValue('receipt-footer');
        
        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        showMessage('تم حفظ إعدادات الطباعة بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في حفظ إعدادات الطباعة:', error);
        showMessage('حدث خطأ في حفظ إعدادات الطباعة', 'error');
    }
}

// طباعة تجريبية
function testPrint() {
    const testReceipt = `
${systemSettings.storeName || 'اسم المحل'}
${systemSettings.storeAddress || 'عنوان المحل'}
${systemSettings.storePhone || 'رقم الهاتف'}

================================
فاتورة تجريبية
================================

التاريخ: ${new Date().toLocaleDateString('ar-EG')}
الوقت: ${new Date().toLocaleTimeString('ar-EG')}

الأصناف:
1x منتج تجريبي        10.00 جنيه

--------------------------------
الإجمالي:            10.00 جنيه

${systemSettings.receiptFooter}
    `;
    
    // فتح نافذة طباعة
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>فاتورة تجريبية</title>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; }
                pre { white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <pre>${testReceipt}</pre>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    showMessage('تم إرسال الفاتورة التجريبية للطباعة', 'success');
}


// إنشاء نسخة احتياطية متقدمة
async function createAdvancedBackup() {
  try {
    showMessage('جاري إنشاء النسخة الاحتياطية...', 'info');
    
    const backupPath = getElementValue('backup-path') || 'D:\\store-backups';
    
    const response = await fetch('/api/backup/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ backupPath })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showMessage(`تم إنشاء النسخة الاحتياطية بنجاح في: ${result.filePath}`, 'success');
      await loadBackupsList();
    } else {
      showMessage(result.error || 'فشل في إنشاء النسخة الاحتياطية', 'error');
    }
  } catch (error) {
    console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
    showMessage('حدث خطأ في إنشاء النسخة الاحتياطية', 'error');
  }
}

// تحميل النسخة الاحتياطية
function downloadBackup() {
    try {
        const backupData = localStorage.getItem('lastBackup');
        if (!backupData) {
            showMessage('لا توجد نسخة احتياطية للتحميل', 'warning');
            return;
        }
        
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('تم تحميل النسخة الاحتياطية', 'success');
    } catch (error) {
        console.error('خطأ في تحميل النسخة الاحتياطية:', error);
        showMessage('حدث خطأ في تحميل النسخة الاحتياطية', 'error');
    }
}

// استعادة نسخة احتياطية
function restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backupData = JSON.parse(e.target.result);
                
                if (confirm('هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
                    // استعادة الإعدادات
                    if (backupData.data.settings) {
                        systemSettings = backupData.data.settings;
                        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
                        updateSettingsForm();
                    }
                    
                    showMessage('تم استعادة النسخة الاحتياطية بنجاح. يرجى إعادة تشغيل النظام.', 'success');
                }
            } catch (error) {
                console.error('خطأ في استعادة النسخة الاحتياطية:', error);
                showMessage('ملف النسخة الاحتياطية غير صالح', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// استعادة النسخة الاحتياطية من ملف
async function restoreFromFile() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      if (confirm('هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
        const reader = new FileReader();
        reader.onload = async function(e) {
          try {
            const backupData = JSON.parse(e.target.result);
            
            // إنشاء ملف مؤقت على الخادم
            const tempFileName = `temp-restore-${Date.now()}.json`;
            const tempPath = `D:\\store-backups\\${tempFileName}`;
            
            // حفظ الملف مؤقتاً
            await fetch('/api/backup/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                backupPath: 'D:\\store-backups',
                tempData: backupData,
                tempFileName: tempFileName
              })
            });
            
            // استعادة البيانات
            const response = await fetch('/api/backup/restore', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ filePath: tempPath })
            });
            
            const result = await response.json();
            
            if (result.success) {
              showMessage('تم استعادة النسخة الاحتياطية بنجاح', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              showMessage(result.error || 'فشل في استعادة النسخة الاحتياطية', 'error');
            }
          } catch (error) {
            console.error('خطأ في قراءة ملف النسخة الاحتياطية:', error);
            showMessage('ملف النسخة الاحتياطية غير صالح', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  } catch (error) {
    console.error('خطأ في استعادة النسخة الاحتياطية:', error);
    showMessage('حدث خطأ في استعادة النسخة الاحتياطية', 'error');
  }
}


// تحميل إعدادات النسخ الاحتياطي المتقدم
async function loadAdvancedBackupSettings() {
  try {
    const response = await fetch('/api/backup/settings');
    const result = await response.json();
    
    if (result.success && result.settings) {
      const settings = result.settings;
      
      // تحديث عناصر الواجهة
      updateElementChecked('auto-backup-advanced', settings.autoBackup);
      updateElementValue('backup-path', settings.backupPath || 'D:\\store-backups');
      updateElementValue('backup-frequency-advanced', settings.frequency || 'daily');
      
      console.log('تم تحميل إعدادات النسخ الاحتياطي المتقدم');
    }
  } catch (error) {
    console.error('خطأ في تحميل إعدادات النسخ الاحتياطي المتقدم:', error);
  }
}


// تحميل قائمة النسخ الاحتياطية
async function loadBackupsList() {
  try {
    const backupPath = getElementValue('backup-path') || 'D:\\store-backups';
    
    const response = await fetch(`/api/backup/list?backupPath=${encodeURIComponent(backupPath)}`);
    const result = await response.json();
    
    displayBackupsList(result.backups);
  } catch (error) {
    console.error('خطأ في تحميل قائمة النسخ الاحتياطية:', error);
  }
}

// عرض قائمة النسخ الاحتياطية
function displayBackupsList(backups) {
  const container = document.getElementById('backups-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (backups.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">لا توجد نسخ احتياطية متاحة</p>';
    return;
  }
  
  backups.forEach(backup => {
    const backupElement = document.createElement('div');
    backupElement.className = 'backup-item';
    backupElement.innerHTML = `
      <div class="backup-info">
        <h4>${backup.fileName}</h4>
        <p>تاريخ الإنشاء: ${new Date(backup.createdAt).toLocaleString('ar-EG')}</p>
        <p>الحجم: ${(backup.size / 1024).toFixed(2)} KB</p>
      </div>
      <div class="backup-actions">
        <button class="btn btn-warning" onclick="restoreSpecificBackup('${backup.filePath}')">استعادة</button>
        <button class="btn btn-danger" onclick="deleteBackup('${backup.filePath}')">حذف</button>
      </div>
    `;
    container.appendChild(backupElement);
  });
}

// استعادة نسخة احتياطية محددة
async function restoreSpecificBackup(filePath) {
  if (confirm('هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.')) {
    try {
      showMessage('جاري استعادة النسخة الاحتياطية...', 'info');
      
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showMessage('تم استعادة النسخة الاحتياطية بنجاح', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showMessage(result.error || 'فشل في استعادة النسخة الاحتياطية', 'error');
      }
    } catch (error) {
      console.error('خطأ في استعادة النسخة الاحتياطية:', error);
      showMessage('حدث خطأ في استعادة النسخة الاحتياطية', 'error');
    }
  }
}

// حفظ إعدادات النسخ الاحتياطي المتقدمة
async function saveAdvancedBackupSettings() {
  try {
    const autoBackup = getElementChecked('auto-backup-advanced');
    const backupPath = getElementValue('backup-path') || 'D:\\store-backups';
    const frequency = getElementValue('backup-frequency-advanced');
    
    const response = await fetch('/api/backup/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ autoBackup, backupPath, frequency })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showMessage('تم حفظ إعدادات النسخ الاحتياطي بنجاح', 'success');
    } else {
      showMessage(result.error || 'فشل في حفظ الإعدادات', 'error');
    }
  } catch (error) {
    console.error('خطأ في حفظ إعدادات النسخ الاحتياطي:', error);
    showMessage('حدث خطأ في حفظ الإعدادات', 'error');
  }
}

// تحميل معلومات النظام
async function loadSystemInfo() {
    try {
        const [productsData, customersData, salesData] = await Promise.all([
            fetchData('products'),
            fetchData('customers'),
            fetchData('sales')
        ]);
        
        updateElementText('total-products-info', productsData.length);
        updateElementText('total-customers-info', customersData.length);
        
        // تصفية المبيعات لاستبعاد الآجلة
        const nonDeferredSales = salesData.filter(sale => sale.payment_method !== 'آجل');
        const totalSales = nonDeferredSales.reduce((sum, sale) => sum + sale.final_amount, 0);
        updateElementText('total-sales-info', `${totalSales.toFixed(2)} جنيه`);
        
        // تاريخ التثبيت (افتراضي)
        updateElementText('install-date', '2024-01-01');
        
        // آخر نسخة احتياطية
        const lastBackupDate = localStorage.getItem('lastBackupDate');
        if (lastBackupDate) {
            updateElementText('last-backup-date', new Date(lastBackupDate).toLocaleString('ar-EG'));
        }
        
        // حجم قاعدة البيانات (تقديري)
        const dataSize = JSON.stringify({ products: productsData, customers: customersData, sales: salesData }).length;
        updateElementText('database-size', `${(dataSize / 1024).toFixed(2)} KB`);
        
    } catch (error) {
        console.error('خطأ في تحميل معلومات النظام:', error);
    }
}

// إعادة تعيين النظام
function resetSystem() {
    if (confirm('هل أنت متأكد من إعادة تعيين النظام؟ سيتم حذف جميع الإعدادات.')) {
        if (confirm('هذا الإجراء لا يمكن التراجع عنه. هل تريد المتابعة؟')) {
            localStorage.removeItem('systemSettings');
            systemSettings = {
                storeName: '',
                storeAddress: '',
                storePhone: '',
                storeEmail: '',
                taxNumber: '',
                currency: 'EGP',
                taxRate: 0,
                lowStockThreshold: 5,
                autoBackup: false,
                soundNotifications: true,
                receiptPrinter: 'default',
                paperSize: '80mm',
                autoPrint: false,
                printLogo: false,
                receiptFooter: 'شكراً لزيارتكم - نتطلع لخدمتكم مرة أخرى',
                backupFrequency: 'weekly',
                sessionTimeout: 30,
                debugMode: false
            };
            updateSettingsForm();
            showMessage('تم إعادة تعيين النظام بنجاح', 'success');
        }
    }
}

// مسح جميع البيانات
async function clearAllData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ سيتم حذف جميع المنتجات والعملاء والمبيعات.')) {
        if (confirm('هذا الإجراء لا يمكن التراجع عنه وسيؤدي إلى فقدان جميع البيانات نهائياً. هل تريد المتابعة؟')) {
            
            // استخدام modal بدلاً من prompt
            showInputModal(
                'كود التأكيد',
                'أدخل كود التأكيد الخاص لمسح جميع البيانات',
                async function(confirmationCode) {
                    if (!confirmationCode) {
                        showMessage('تم إلغاء العملية', 'info');
                        return;
                    }
                    
                    try {
                        const response = await fetch('/api/system/clear-all-data', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ confirmationCode })
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                            showMessage('تم مسح جميع البيانات بنجاح', 'success');
                            // إعادة تحميل الصفحة لتحديث البيانات
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        } else {
                            showMessage(result.error || 'فشل في مسح البيانات', 'error');
                        }
                        
                    } catch (error) {
                        console.error('خطأ في مسح البيانات:', error);
                        showMessage('حدث خطأ أثناء مسح البيانات', 'error');
                    }
                }
            );
        }
    }
}

// تغيير كلمة المرور
function changePassword() {
    const modalContent = `
        <div class="modal-header">
            <h3>تغيير كلمة المرور</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form id="change-password-form" onsubmit="updatePassword(event)">
                <div class="form-group">
                    <label>كلمة المرور الحالية: *</label>
                    <input type="password" name="currentPassword" required>
                </div>
                <div class="form-group">
                    <label>كلمة المرور الجديدة: *</label>
                    <input type="password" name="newPassword" required>
                </div>
                <div class="form-group">
                    <label>تأكيد كلمة المرور الجديدة: *</label>
                    <input type="password" name="confirmPassword" required>
                </div>
            </form>
        </div>
        <div class="form-actions">
            <button type="submit" form="change-password-form" class="btn btn-primary">
                <i class="fas fa-save"></i> تغيير كلمة المرور
            </button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">
                <i class="fas fa-times"></i> إلغاء
            </button>
        </div>
    `;
    
    showModal(modalContent);
}

// تحديث كلمة المرور
async function updatePassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const passwordData = {
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // التحقق من تطابق كلمات المرور الجديدة
    if (passwordData.newPassword !== passwordData.confirmPassword) {
        showMessage('كلمات المرور الجديدة غير متطابقة', 'error');
        return;
    }
    
    // التحقق من قوة كلمة المرور
    if (passwordData.newPassword.length < 6) {
        showMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    try {
        // في التطبيق الحقيقي، يجب التحقق من كلمة المرور الحالية من قاعدة البيانات
        // هنا سنستخدم localStorage مؤقتاً
        const users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
        const currentUser = users.find(u => u.id === 1); // افتراض أن المستخدم الحالي هو المدير
        
        if (!currentUser || currentUser.password !== passwordData.currentPassword) {
            showMessage('كلمة المرور الحالية غير صحيحة', 'error');
            return;
        }
        
        // تحديث كلمة المرور
        currentUser.password = passwordData.newPassword;
        currentUser.updatedAt = new Date().toISOString();
        
        localStorage.setItem('systemUsers', JSON.stringify(users));
        
        showMessage('تم تغيير كلمة المرور بنجاح', 'success');
        closeModal();
        
    } catch (error) {
        console.error('خطأ في تغيير كلمة المرور:', error);
        showMessage('حدث خطأ في تغيير كلمة المرور', 'error');
    }
}

// تحميل قائمة المستخدمين (محدثة)
function loadUsersList() {
    let users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
    const usersList = document.querySelector('.users-list');
    
    if (!usersList) return;
    
    // إضافة المدير الافتراضي إذا لم يكن موجوداً
    if (users.length === 0) {
        const defaultAdmin = {
            id: Date.now(),
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            fullName: 'المدير الافتراضي',
            email: '',
            isActive: true,
            createdAt: new Date().toISOString()
        };
        
        users.push(defaultAdmin);
        localStorage.setItem('systemUsers', JSON.stringify(users));
    }
    
    // عرض قائمة المستخدمين
    usersList.innerHTML = users.map(user => `
        <div class="user-item" data-user-id="${user.id}">
            <div class="user-info">
                <div class="user-details">
                    <strong>${user.fullName || user.username}</strong>
                    <span class="user-role">${getRoleDisplayName(user.role)}</span>
                    <span class="user-username">@${user.username}</span>
                    ${user.email ? `<span class="user-email">${user.email}</span>` : ''}
                </div>
                <div class="user-status ${user.isActive ? 'active' : 'inactive'}">
                    ${user.isActive ? 'نشط' : 'غير نشط'}
                </div>
            </div>
            <div class="user-actions">
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                ${user.username !== 'admin' ? `
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// الحصول على اسم الدور للعرض
function getRoleDisplayName(role) {
    const roles = {
        'admin': 'مدير النظام',
        'manager': 'مدير',
        'cashier': 'كاشير'
    };
    return roles[role] || role;
}

// قائمة الصفحات المتاحة في النظام
const systemPages = [
    { id: 'dashboard', name: 'لوحة التحكم', icon: 'fas fa-tachometer-alt' },
    { id: 'pos', name: 'نقطة البيع', icon: 'fas fa-cash-register' },
    { id: 'products', name: 'إدارة الأصناف', icon: 'fas fa-box' },
    { id: 'customers', name: 'إدارة العملاء', icon: 'fas fa-users' },
    { id: 'debts', name: 'إدارة الديون', icon: 'fas fa-money-bill-wave' },
    { id: 'sales', name: 'المبيعات', icon: 'fas fa-chart-line' },
    { id: 'purchases', name: 'المشتريات', icon: 'fas fa-shopping-cart' },
    { id: 'expenses', name: 'المصروفات', icon: 'fas fa-money-bill-wave' },
    { id: 'reports', name: 'التقارير', icon: 'fas fa-file-alt' },
    { id: 'settings', name: 'الإعدادات', icon: 'fas fa-cog' }
];

// الصلاحيات الافتراضية للأدوار
const defaultRolePermissions = {
    'admin': ['dashboard', 'pos', 'products', 'customers', 'debts', 'sales', 'purchases', 'expenses', 'reports', 'settings'],
    'manager': ['dashboard', 'pos', 'products', 'customers', 'debts', 'sales', 'purchases', 'expenses', 'reports'],
    'cashier': ['dashboard', 'pos', 'customers', 'debts', 'sales']
};

// إضافة مستخدم جديد (محدثة)
function showAddUserModal() {
    const modalContent = `
        <div class="modal-header">
            <h3>إضافة مستخدم جديد</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form id="add-user-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>اسم المستخدم: *</label>
                        <input type="text" name="username" required placeholder="أدخل اسم المستخدم">
                    </div>
                    <div class="form-group">
                        <label>الاسم الكامل:</label>
                        <input type="text" name="fullName" placeholder="الاسم الكامل">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>كلمة المرور: *</label>
                        <input type="password" name="password" required placeholder="أدخل كلمة المرور">
                    </div>
                    <div class="form-group">
                        <label>تأكيد كلمة المرور: *</label>
                        <input type="password" name="confirmPassword" required placeholder="أعد إدخال كلمة المرور">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>الدور:</label>
                        <select name="role" required onchange="updatePermissionsBasedOnRole(this.value)">
                            <option value="">اختر الدور</option>
                            <option value="admin">مدير النظام</option>
                            <option value="manager">مدير</option>
                            <option value="cashier">كاشير</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني:</label>
                        <input type="email" name="email" placeholder="البريد الإلكتروني">
                    </div>
                </div>
                
                <!-- قسم الصلاحيات -->
                <div class="permissions-section">
                    <h4><i class="fas fa-shield-alt"></i> صلاحيات الوصول للصفحات</h4>
                    <div class="permissions-note">
                        <i class="fas fa-info-circle"></i>
                        حدد الصفحات التي يمكن للمستخدم الوصول إليها
                    </div>
                    
                    <div class="permissions-controls">
                        <button type="button" class="btn btn-sm btn-success" onclick="selectAllPermissions()">
                            <i class="fas fa-check-double"></i> تحديد الكل
                        </button>
                        <button type="button" class="btn btn-sm btn-warning" onclick="clearAllPermissions()">
                            <i class="fas fa-times"></i> إلغاء تحديد الكل
                        </button>
                    </div>
                    
                    <div class="permissions-grid" id="permissions-grid">
                        ${systemPages.map(page => `
                            <div class="permission-item">
                                <label class="permission-label">
                                    <input type="checkbox" name="permissions" value="${page.id}" id="perm-${page.id}">
                                    <span class="permission-checkbox"></span>
                                    <div class="permission-info">
                                        <i class="${page.icon}"></i>
                                        <span class="permission-name">${page.name}</span>
                                    </div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="saveUserFromForm()">
                        <i class="fas fa-save"></i> حفظ المستخدم
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalContent);
}

// تحديث الصلاحيات بناءً على الدور المختار
function updatePermissionsBasedOnRole(role) {
    if (!role) return;
    
    const defaultPermissions = defaultRolePermissions[role] || [];
    
    // إلغاء تحديد جميع الصلاحيات أولاً
    clearAllPermissions();
    
    // تحديد الصلاحيات الافتراضية للدور
    defaultPermissions.forEach(pageId => {
        const checkbox = document.getElementById(`perm-${pageId}`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

// تحديد جميع الصلاحيات
function selectAllPermissions() {
    const checkboxes = document.querySelectorAll('input[name="permissions"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

// إلغاء تحديد جميع الصلاحيات
function clearAllPermissions() {
    const checkboxes = document.querySelectorAll('input[name="permissions"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

// دالة مساعدة لحفظ المستخدم من النموذج
function saveUserFromForm() {
    const form = document.getElementById('add-user-form');
    const event = { target: form, preventDefault: () => {} };
    saveUser(event);
}

// حفظ مستخدم جديد (محدثة)
async function saveUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        role: formData.get('role'),
        fullName: formData.get('fullName'),
        email: formData.get('email')
    };
    
    // جمع الصلاحيات المحددة
    const selectedPermissions = [];
    const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]:checked');
    permissionCheckboxes.forEach(checkbox => {
        selectedPermissions.push(checkbox.value);
    });
    
    // التحقق من صحة البيانات
    if (!userData.username || !userData.password || !userData.role) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if (userData.password !== userData.confirmPassword) {
        showMessage('كلمة المرور وتأكيد كلمة المرور غير متطابقتين', 'error');
        return;
    }
    
    if (selectedPermissions.length === 0) {
        showMessage('يجب تحديد صلاحية واحدة على الأقل', 'error');
        return;
    }
    
    try {
        const users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
        
        // التحقق من عدم وجود اسم المستخدم مسبقاً
        if (users.find(u => u.username === userData.username)) {
            showMessage('اسم المستخدم موجود مسبقاً', 'error');
            return;
        }
        
        const newUser = {
            id: Date.now(),
            username: userData.username,
            password: userData.password, // في التطبيق الحقيقي يجب تشفيرها
            role: userData.role,
            fullName: userData.fullName,
            email: userData.email,
            permissions: selectedPermissions, // إضافة الصلاحيات
            createdAt: new Date().toISOString(),
            isActive: true
        };
        
        users.push(newUser);
        localStorage.setItem('systemUsers', JSON.stringify(users));
        
        showMessage('تم إضافة المستخدم بنجاح', 'success');
        closeModal();
        loadUsersList(); // تحديث قائمة المستخدمين
        
    } catch (error) {
        console.error('خطأ في حفظ المستخدم:', error);
        showMessage('حدث خطأ في حفظ المستخدم', 'error');
    }
}

// تعديل مستخدم (محدثة)
function editUser(userId) {
    const users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        showMessage('المستخدم غير موجود', 'error');
        return;
    }
    
    const modalContent = `
        <div class="modal-header">
            <h3>تعديل بيانات المستخدم</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form id="edit-user-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>اسم المستخدم: *</label>
                        <input type="text" name="username" value="${user.username}" required ${user.username === 'admin' ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label>الاسم الكامل:</label>
                        <input type="text" name="fullName" value="${user.fullName || ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>كلمة المرور الجديدة:</label>
                        <input type="password" name="password" placeholder="اتركه فارغاً إذا كنت لا تريد تغييرها">
                    </div>
                    <div class="form-group">
                        <label>تأكيد كلمة المرور:</label>
                        <input type="password" name="confirmPassword" placeholder="تأكيد كلمة المرور الجديدة">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>الدور:</label>
                        <select name="role" required onchange="updatePermissionsBasedOnRole(this.value)" ${user.username === 'admin' ? 'disabled' : ''}>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير النظام</option>
                            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>مدير</option>
                            <option value="cashier" ${user.role === 'cashier' ? 'selected' : ''}>كاشير</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني:</label>
                        <input type="email" name="email" value="${user.email || ''}">
                    </div>
                </div>
                
                <!-- قسم الصلاحيات -->
                <div class="permissions-section">
                    <h4><i class="fas fa-shield-alt"></i> صلاحيات الوصول للصفحات</h4>
                    <div class="permissions-note">
                        <i class="fas fa-info-circle"></i>
                        حدد الصفحات التي يمكن للمستخدم الوصول إليها
                    </div>
                    
                    ${user.username !== 'admin' ? `
                        <div class="permissions-controls">
                            <button type="button" class="btn btn-sm btn-success" onclick="selectAllPermissions()">
                                <i class="fas fa-check-double"></i> تحديد الكل
                            </button>
                            <button type="button" class="btn btn-sm btn-warning" onclick="clearAllPermissions()">
                                <i class="fas fa-times"></i> إلغاء تحديد الكل
                            </button>
                        </div>
                    ` : ''}
                    
                    <div class="permissions-grid" id="permissions-grid">
                        ${systemPages.map(page => {
                            const isChecked = user.permissions ? user.permissions.includes(page.id) : defaultRolePermissions[user.role]?.includes(page.id);
                            const isDisabled = user.username === 'admin';
                            return `
                                <div class="permission-item">
                                    <label class="permission-label">
                                        <input type="checkbox" name="permissions" value="${page.id}" id="perm-${page.id}" 
                                               ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                                        <span class="permission-checkbox"></span>
                                        <div class="permission-info">
                                            <i class="${page.icon}"></i>
                                            <span class="permission-name">${page.name}</span>
                                        </div>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    ${user.username === 'admin' ? '<p class="admin-note"><i class="fas fa-crown"></i> المدير الرئيسي له صلاحية الوصول لجميع الصفحات</p>' : ''}
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="updateUser(event, ${userId})">
                        <i class="fas fa-save"></i> حفظ التغييرات
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalContent);
}

// تحديث بيانات المستخدم (محدثة)
async function updateUser(event, userId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        role: formData.get('role'),
        fullName: formData.get('fullName'),
        email: formData.get('email')
    };
    
    // جمع الصلاحيات المحددة
    const selectedPermissions = [];
    const permissionCheckboxes = document.querySelectorAll('input[name="permissions"]:checked');
    permissionCheckboxes.forEach(checkbox => {
        selectedPermissions.push(checkbox.value);
    });
    
    // التحقق من صحة البيانات
    if (userData.password && userData.password !== userData.confirmPassword) {
        showMessage('كلمة المرور وتأكيد كلمة المرور غير متطابقتين', 'error');
        return;
    }
    
    if (selectedPermissions.length === 0) {
        showMessage('يجب تحديد صلاحية واحدة على الأقل', 'error');
        return;
    }
    
    try {
        const users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            showMessage('المستخدم غير موجود', 'error');
            return;
        }
        
        // تحديث بيانات المستخدم
        users[userIndex] = {
            ...users[userIndex],
            username: userData.username,
            role: userData.role,
            fullName: userData.fullName,
            email: userData.email,
            permissions: selectedPermissions, // تحديث الصلاحيات
            updatedAt: new Date().toISOString()
        };
        
        // تحديث كلمة المرور إذا تم إدخالها
        if (userData.password) {
            users[userIndex].password = userData.password;
        }
        
        localStorage.setItem('systemUsers', JSON.stringify(users));
        
        showMessage('تم تحديث بيانات المستخدم بنجاح', 'success');
        closeModal();
        loadUsersList();
        
    } catch (error) {
        console.error('خطأ في تحديث المستخدم:', error);
        showMessage('حدث خطأ في تحديث المستخدم', 'error');
    }
}

// حذف مستخدم
async function deleteUser(userId) {
    // الحصول على اسم المستخدم للعرض
    const users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
    const user = users.find(u => u.id === userId);
    const userName = user ? user.username : 'المستخدم';
    
    verifyDeletePassword(async () => {
        try {
            let users = JSON.parse(localStorage.getItem('systemUsers') || '[]');
            users = users.filter(u => u.id !== userId);
            
            localStorage.setItem('systemUsers', JSON.stringify(users));
            
            showMessage('تم حذف المستخدم بنجاح', 'success');
            closeModal();
            loadUsersList();
            
        } catch (error) {
            console.error('خطأ في حذف المستخدم:', error);
            showMessage('حدث خطأ في حذف المستخدم', 'error');
        }
    }, userName);
}

// دوال مساعدة
function getElementValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

function updateElementValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function getElementChecked(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

function updateElementChecked(id, checked) {
    const element = document.getElementById(id);
    if (element) element.checked = checked;
}






// تحميل بيانات المشتريات
async function loadPurchasesData() {
    try {
        // تحميل بيانات المنتجات أولاً للبحث
        if (products.length === 0) {
            products = await fetchData('products');
        }
        
        purchases = await fetchData('purchases');
        // تطبيق فلتر اليوم بشكل افتراضي
        applyPurchaseFilters();
        updatePurchasesStats();
    } catch (error) {
        console.error('خطأ في تحميل بيانات المشتريات:', error);
    }
}

// تحميل بيانات المصروفات
async function loadExpensesData() {
    try {
        expenses = await fetchData('expenses');
        displayExpensesTable();
        updateExpensesStats();
    } catch (error) {
        console.error('خطأ في تحميل بيانات المصروفات:', error);
    }
}



// دالة تطبيق فلاتر المشتريات
function applyPurchaseFilters() {
    const supplierSearch = document.getElementById('supplier-search')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('date-filter')?.value || 'today';
    const startDate = document.getElementById('start-date-filter')?.value;
    const endDate = document.getElementById('end-date-filter')?.value;
    
    currentPurchaseFilter = dateFilter;
    
    filteredPurchases = purchases.filter(purchase => {
        // فلتر المورد
        const supplierMatch = !supplierSearch || 
            (purchase.supplier_name && purchase.supplier_name.toLowerCase().includes(supplierSearch));
        
        // فلتر التاريخ
        let dateMatch = true;
        if (purchase.purchase_date) {
            const purchaseDate = new Date(purchase.purchase_date);
            const today = new Date();
            
            switch (dateFilter) {
                case 'today':
                    const todayStr = today.toISOString().split('T')[0];
                    const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
                    dateMatch = purchaseDateStr === todayStr;
                    break;
                    
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    dateMatch = purchaseDate >= weekAgo && purchaseDate <= today;
                    break;
                    
                case 'month':
                    dateMatch = purchaseDate.getMonth() === today.getMonth() && 
                               purchaseDate.getFullYear() === today.getFullYear();
                    break;
                    
                case 'custom':
                    if (startDate && endDate) {
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999); // نهاية اليوم
                        dateMatch = purchaseDate >= start && purchaseDate <= end;
                    }
                    break;
                    
                case 'all':
                default:
                    dateMatch = true;
                    break;
            }
        }
        
        return supplierMatch && dateMatch;
    });
    
    displayFilteredPurchases();
    updateFilteredPurchasesStats();
    
    // إظهار/إخفاء حقول التاريخ المخصص
    const customDateFields = document.querySelectorAll('#start-date-filter, #end-date-filter');
    customDateFields.forEach(field => {
        field.style.display = dateFilter === 'custom' ? 'block' : 'none';
    });
}

// عرض المشتريات المفلترة
function displayFilteredPurchases() {
    const tbody = document.getElementById('purchases-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredPurchases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد مشتريات تطابق معايير البحث</td></tr>';
        return;
    }
    
    filteredPurchases.forEach(purchase => {
        const row = document.createElement('tr');
        
        // تنسيق التاريخ
        const purchaseDate = purchase.purchase_date ? formatLocalDate(purchase.purchase_date) : 'غير محدد';
        
        // رقم الفاتورة
        const invoiceNumber = purchase.invoice_number || 'غير محدد';
        
        // اسم المورد
        const supplierName = purchase.supplier_name || 'غير محدد';
        
        // عدد الأصناف
        const itemsCount = purchase.items_count || 0;
        
        row.innerHTML = `
            <td>${invoiceNumber}</td>
            <td>${supplierName}</td>
            <td>${purchaseDate}</td>
            <td>${itemsCount}</td>
            <td>${purchase.total_amount ? purchase.total_amount.toFixed(2) : '0.00'} جنيه</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewPurchaseDetails(${purchase.id})">
                    <i class="fas fa-eye"></i> عرض
                </button>
                <button class="btn btn-secondary btn-sm" onclick="printPurchase(${purchase.id})">
                    <i class="fas fa-print"></i> طباعة
                </button>
                <button class="btn btn-danger btn-sm" onclick="deletePurchase(${purchase.id})">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// تحديث إحصائيات المشتريات المفلترة
function updateFilteredPurchasesStats() {
    const filteredTotal = filteredPurchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
    
    // تحديث عنوان الجدول ليعكس الفلتر الحالي
    const tableContainer = document.querySelector('#purchases .table-container');
    if (tableContainer) {
        let filterTitle = '';
        switch (currentPurchaseFilter) {
            case 'today':
                filterTitle = 'مشتريات اليوم';
                break;
            case 'week':
                filterTitle = 'مشتريات هذا الأسبوع';
                break;
            case 'month':
                filterTitle = 'مشتريات هذا الشهر';
                break;
            case 'all':
                filterTitle = 'جميع المشتريات';
                break;
            case 'custom':
                filterTitle = 'المشتريات في الفترة المحددة';
                break;
        }
        
        // إضافة عنوان فوق الجدول
        let titleElement = tableContainer.querySelector('.filter-title');
        if (!titleElement) {
            titleElement = document.createElement('h4');
            titleElement.className = 'filter-title';
            tableContainer.insertBefore(titleElement, tableContainer.firstChild);
        }
        titleElement.textContent = `${filterTitle} (${filteredPurchases.length} فاتورة - ${filteredTotal.toFixed(2)} جنيه)`;
    }
}

// عرض جدول المشتريات
function displayPurchasesTable() {
    displayFilteredPurchases();
}

// عرض جدول المصروفات
function displayExpensesTable() {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">لا توجد مصروفات</td></tr>';
        return;
    }
    
    expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatLocalDate(expense.created_at)}</td>
            <td><span class="category-badge category-${expense.category}">${expense.category}</span></td>
            <td>${expense.description}</td>
            <td class="amount">${expense.amount.toFixed(2)} جنيه</td>
            <td><span class="payment-method ${expense.payment_method}">${expense.payment_method}</span></td>
            <td>
                <button class="btn-icon btn-edit" onclick="editExpense(${expense.id})" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteExpense(${expense.id})" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// تحديث إحصائيات المشتريات
function updatePurchasesStats() {
    const totalPurchases = purchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
    
    // حساب مشتريات اليوم
    const today = new Date().toISOString().split('T')[0]; // تنسيق YYYY-MM-DD
    const todayPurchases = purchases.filter(purchase => {
        if (!purchase.purchase_date) return false;
        // تحويل تاريخ المشتريات إلى نفس التنسيق للمقارنة
        const purchaseDate = new Date(purchase.purchase_date).toISOString().split('T')[0];
        return purchaseDate === today;
    });
    
    const todayTotal = todayPurchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
    
    // حساب مشتريات الشهر
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthPurchases = purchases.filter(purchase => {
        if (!purchase.purchase_date) return false;
        const purchaseDate = new Date(purchase.purchase_date);
        return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
    });
    
    const monthTotal = monthPurchases.reduce((sum, purchase) => sum + (purchase.total_amount || 0), 0);
    
    // تحديث العناصر في الواجهة
    updateElementText('total-purchases', totalPurchases.toFixed(2));
    updateElementText('today-purchases', todayTotal.toFixed(2));
    updateElementText('month-purchases', monthTotal.toFixed(2));
    updateElementText('purchases-count', purchases.length);
}

// تحديث إحصائيات المصروفات
function updateExpensesStats() {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // مصروفات اليوم - تحسين المقارنة
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    const todayExpenses = expenses.filter(expense => {
        if (!expense.created_at) return false;
        // استخراج التاريخ من created_at بغض النظر عن التنسيق
        const expenseDate = new Date(expense.created_at);
        const expenseDateStr = expenseDate.getFullYear() + '-' + 
                              String(expenseDate.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(expenseDate.getDate()).padStart(2, '0');
        return expenseDateStr === todayStr;
    });
    
    const todayTotal = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // مصروفات هذا الشهر
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthExpenses = expenses.filter(expense => {
        if (!expense.created_at) return false;
        const expenseDate = new Date(expense.created_at);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
    const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    updateElementText('total-expenses', `${totalExpenses.toFixed(2)} جنيه`);
    updateElementText('today-expenses', `${todayTotal.toFixed(2)} جنيه`);
    updateElementText('month-expenses', `${monthTotal.toFixed(2)} جنيه`);
    updateElementText('expenses-count', expenses.length);
}

// إضافة مشتريات جديدة - نسخة محدثة
function togglePurchaseForm() {
    const formContainer = document.getElementById('purchase-form-container');
    const toggleButton = document.getElementById('toggle-form-text');
    
    if (formContainer.style.display === 'none' || formContainer.style.display === '') {
        // إظهار النموذج
        formContainer.style.display = 'block';
        toggleButton.textContent = 'إخفاء نموذج المشتريات';
        
        // تنظيف النموذج
        clearPurchaseForm();
        
        // إضافة صنف واحد افتراضياً
        setTimeout(() => {
            addPurchaseItem();
        }, 100);
        
        // التمرير إلى النموذج
        formContainer.scrollIntoView({ behavior: 'smooth' });
    } else {
        // إخفاء النموذج
        hidePurchaseForm();
    }
}

// دالة إخفاء النموذج
function hidePurchaseForm() {
    const formContainer = document.getElementById('purchase-form-container');
    const toggleButton = document.getElementById('toggle-form-text');
    
    formContainer.style.display = 'none';
    toggleButton.textContent = 'إضافة مشتريات جديدة';
}

// دالة إلغاء النموذج
function cancelPurchaseForm() {
    if (confirm('هل أنت متأكد من إلغاء إضافة المشتريات؟ سيتم فقدان جميع البيانات المدخلة.')) {
        hidePurchaseForm();
        clearPurchaseForm();
    }
}

// دالة تنظيف النموذج
function clearPurchaseForm() {
    const form = document.querySelector('#purchase-form-container form');
    if (form) {
        form.reset();
        
        // تعيين التاريخ الحالي
        const dateInput = form.querySelector('input[name="purchase_date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // تنظيف قائمة الأصناف
        const itemsContainer = document.getElementById('purchase-items');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }
        
        // إعادة تعيين الملخص
        updateElementText('total-items', '0');
        updateElementText('total-quantity', '0');
        updateElementText('purchase-total', '0.00 جنيه');
    }
}

// إضافة مشتريات جديدة - نسخة محدثة (للتوافق مع الكود القديم)
function showAddPurchaseModal() {
    togglePurchaseForm();
}

// البحث عن المنتج بالكود
function searchProductByCode(input, index) {
    const code = input.value.trim();
    if (!code) return;
    
    const product = products.find(p => p.barcode === code || p.id.toString() === code);
    
    if (product) {
        fillProductDetails(product, index);
        showMessage('تم العثور على المنتج - يمكنك تعديل أي من القيم حسب الحاجة', 'success');
    } else {
        // منتج جديد - عرض رسالة وتمكين الإضافة
        showMessage('هذا منتج جديد - يمكنك إضافة تفاصيله وسيتم حفظه في النظام', 'info');
        
        // مسح التفاصيل السابقة
        clearProductDetails(index);
        
        // ملء الكود في حقل الباركود للمنتج الجديد
        const container = document.querySelector(`[data-index="${index}"]`);
        if (container) {
            // إذا كان الكود رقمي، ضعه كباركود
            if (/^\d+$/.test(code)) {
                const barcodeInput = container.querySelector('.product-barcode');
                if (barcodeInput) {
                    barcodeInput.value = code;
                }
            }
            
            // تمكين جميع الحقول للتعديل
            const inputs = container.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = false;
                input.style.backgroundColor = '#fff3cd'; // لون خلفية مميز للمنتج الجديد
            });
            
            // إضافة مؤشر بصري أن هذا منتج جديد
            const nameInput = container.querySelector('.product-name');
            if (nameInput) {
                nameInput.placeholder = 'أدخل اسم المنتج الجديد';
                nameInput.focus();
            }
        }
    }
}

// اختيار المنتج من القائمة
function selectProduct(select, index) {
    const selectedValue = select.value;
    const item = select.closest('.purchase-item');
    
    if (selectedValue) {
        // منتج موجود
        const option = select.querySelector(`option[value="${selectedValue}"]`);
        const productData = JSON.parse(option.getAttribute('data-product'));
        
        fillProductDetails(productData, index);
        
        // جعل اسم المنتج والفئة للقراءة فقط
        item.querySelector('.product-name').readOnly = true;
        item.querySelector('.product-category').readOnly = true;
        item.querySelector('.product-barcode').readOnly = true;
    } else {
        // لا يوجد اختيار
        clearProductDetails(index);
        item.querySelector('.product-name').readOnly = false;
        item.querySelector('.product-category').readOnly = false;
        item.querySelector('.product-barcode').readOnly = false;
    }
}

// تفعيل وضع إضافة صنف جديد
function enableNewProductMode(container, index) {
    // تفعيل الحقول للتحرير
    const productNameInput = container.querySelector('.product-name');
    const categoryInput = container.querySelector('.product-category');
    const barcodeInput = container.querySelector('.product-barcode');
    const isNewProductInput = container.querySelector('.is-new-product');
    
    productNameInput.removeAttribute('readonly');
    productNameInput.placeholder = 'أدخل اسم المنتج الجديد';
    categoryInput.removeAttribute('readonly');
    categoryInput.placeholder = 'أدخل فئة المنتج';
    barcodeInput.removeAttribute('readonly');
    barcodeInput.placeholder = 'أدخل الباركود (اختياري)';
    
    // تعيين قيمة المنتج الجديد
    if (isNewProductInput) {
        isNewProductInput.value = 'true';
    }
    
    // مسح الحقول
    clearProductDetails(index);
    
    // إضافة تنبيه بصري
    container.style.border = '2px solid #28a745';
    container.style.backgroundColor = '#f8fff9';
    
    showMessage('تم تفعيل وضع إضافة صنف جديد', 'info');
}

// ملء تفاصيل المنتج
function fillProductDetails(product, index) {
    const container = document.querySelector(`[data-index="${index}"]`);
    if (!container) return;
    
    // ملء الحقول
    container.querySelector('.product-id').value = product.id;
    container.querySelector('.product-name').value = product.name;
    container.querySelector('.product-category').value = product.category || '';
    container.querySelector('.product-size').value = product.size || '';
    container.querySelector('.product-color').value = product.color || '';
    container.querySelector('.product-barcode').value = product.barcode || '';
    container.querySelector('.min-quantity').value = product.min_quantity || 5;
    container.querySelector('.purchase-price').value = product.purchase_price || '';
    container.querySelector('.selling-price').value = product.selling_price || '';
    container.querySelector('.current-quantity').value = product.quantity || 0;
    
    // تحديث القائمة المنسدلة
    const select = container.querySelector('.product-select');
    select.value = product.id;
    
    // تمكين جميع الحقول للتعديل (ما عدا الحقول المحسوبة)
    const inputs = container.querySelectorAll('input, select');
    inputs.forEach(input => {
        // إزالة التنسيق المميز للمنتج الجديد
        input.style.backgroundColor = '';
        
        // تمكين التعديل لجميع الحقول ما عدا الحقول المحسوبة
        if (!input.classList.contains('current-quantity') && 
            !input.classList.contains('item-total') &&
            !input.classList.contains('product-id')) {
            input.disabled = false;
            input.readOnly = false;
        }
    });
}

// مسح تفاصيل المنتج
function clearProductDetails(index) {
    const container = document.querySelector(`[data-index="${index}"]`);
    if (!container) return;
    
    container.querySelector('.product-id').value = '';
    container.querySelector('.product-name').value = '';
    container.querySelector('.product-category').value = '';
    container.querySelector('.product-size').value = '';
    container.querySelector('.product-color').value = '';
    container.querySelector('.product-barcode').value = '';
    container.querySelector('.min-quantity').value = '5';
    container.querySelector('.purchase-price').value = '';
    container.querySelector('.selling-price').value = '';
    container.querySelector('.current-quantity').value = '';
    container.querySelector('.purchased-quantity').value = '';
    container.querySelector('.item-total').value = '';
    
    const select = container.querySelector('.product-select');
    select.value = '';
    
    // إزالة التنسيق المميز للمنتج الجديد
    const inputs = container.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.style.backgroundColor = '';
    });
    
    updatePurchaseTotal();
}

// حساب إجمالي الصنف
function calculateItemTotal(input) {
    const container = input.closest('.purchase-item');
    const quantity = parseFloat(input.value) || 0;
    const price = parseFloat(container.querySelector('.purchase-price').value) || 0;
    const total = quantity * price;
    
    container.querySelector('.item-total').value = total.toFixed(2);
    updatePurchaseTotal();
}

// تحديث الإجمالي الكلي
function updatePurchaseTotal() {
    const itemTotals = document.querySelectorAll('.item-total');
    let total = 0;
    
    itemTotals.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    const totalElement = document.getElementById('purchase-total');
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// حفظ المشتريات - نسخة محدثة
async function savePurchase(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const supplierName = formData.get('supplier_name');
    let invoiceNumber = formData.get('invoice_number');
    const purchaseDate = formData.get('purchase_date');
    const notes = formData.get('notes');
    
    // التحقق من رقم الفاتورة وإنشاء رقم تلقائي إذا لم يتم إدخاله
    if (!invoiceNumber || invoiceNumber.trim() === '') {
        const timestamp = Date.now();
        invoiceNumber = `INV-${timestamp}`;
    }
    
    // التحقق من التاريخ
    if (!purchaseDate) {
        showMessage('يرجى إدخال تاريخ المشتريات', 'error');
        return;
    }
    
    // جمع بيانات الأصناف
    const items = [];
    const purchaseItems = document.querySelectorAll('.purchase-item');
    
    let hasErrors = false;
    
    for (let i = 0; i < purchaseItems.length; i++) {
        const item = purchaseItems[i];
        const productId = item.querySelector('.product-id').value;
        const productName = item.querySelector('.product-name').value;
        const category = item.querySelector('.product-category').value;
        const size = item.querySelector('.product-size').value;
        const color = item.querySelector('.product-color').value;
        const barcode = item.querySelector('.product-barcode').value;
        const minQuantity = parseInt(item.querySelector('.min-quantity').value) || 5;
        const purchasePrice = parseFloat(item.querySelector('.purchase-price').value);
        const sellingPrice = parseFloat(item.querySelector('.selling-price').value) || purchasePrice;
        const quantity = parseInt(item.querySelector('.purchased-quantity').value);
        
        if (!productName || !purchasePrice || !quantity) {
            showMessage(`يرجى ملء جميع البيانات المطلوبة للصنف ${i + 1}`, 'error');
            hasErrors = true;
            break;
        }
        
        // تحديد ما إذا كان المنتج جديداً (إذا لم يكن له product_id)
        const isNewProduct = !productId || productId === '';
        
        const itemData = {
            product_id: productId ? parseInt(productId) : null,
            product_name: productName,
            category: category,
            size: size,
            color: color,
            barcode: barcode,
            min_quantity: minQuantity,
            quantity: quantity,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            unit_price: purchasePrice,
            total_price: quantity * purchasePrice,
            is_new_product: isNewProduct  // إضافة هذا الحقل
        };
        
        items.push(itemData);
    }
    
    if (hasErrors) return;
    
    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
    
    const purchaseData = {
        supplier_name: supplierName,
        invoice_number: invoiceNumber,
        purchase_date: purchaseDate,
        notes: notes,
        items: items,
        total_amount: totalAmount
    };
    
    try {
        const response = await fetch('/api/purchases', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseData)
        });
        
        if (response.ok) {
            // إغلاق جميع المودالات
            closeModal(); // إغلاق المودال العام
            
            showMessage('تم حفظ المشتريات بنجاح وتحديث المخزون', 'success');
            hidePurchaseForm(); // إخفاء نموذج المشتريات
            clearPurchaseForm(); // تنظيف النموذج
            
            // تحديث البيانات
            await loadPurchasesData();
            await loadProductsData(); // تحديث المخزون
            await loadDashboardData(); // تحديث لوحة التحكم
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'فشل في حفظ المشتريات');
        }
    } catch (error) {
        showMessage('حدث خطأ في حفظ المشتريات: ' + error.message, 'error');
        console.error('خطأ:', error);
    }
}

// حفظ المصروف
async function saveExpense(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const expenseData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            showMessage('تم حفظ المصروف بنجاح', 'success');
            closeModal();
            await loadExpensesData();
        } else {
            throw new Error('فشل في حفظ المصروف');
        }
    } catch (error) {
        showMessage('حدث خطأ في حفظ المصروف', 'error');
        console.error('خطأ:', error);
    }
}

// عرض تفاصيل المشتريات
async function viewPurchaseDetails(purchaseId) {
    try {
        const response = await fetch(`/api/purchases/${purchaseId}`);
        if (!response.ok) {
            throw new Error('فشل في جلب تفاصيل المشتريات');
        }
        
        const purchaseDetails = await response.json();
        showPurchaseDetailsModal(purchaseDetails);
    } catch (error) {
        console.error('خطأ في جلب تفاصيل المشتريات:', error);
        showMessage('حدث خطأ في تحميل تفاصيل المشتريات', 'error');
    }
}

// عرض نافذة تفاصيل المشتريات
function showPurchaseDetailsModal(purchaseDetails) {
    const modalContent = `
        <div class="purchase-details-modal">
            <div class="modal-header">
                <h3>تفاصيل المشتريات #${purchaseDetails.id}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="purchase-info">
                    <div class="info-row">
                        <span><strong>التاريخ:</strong> ${new Date(purchaseDetails.created_at).toLocaleString('ar-EG')}</span>
                        <span><strong>المورد:</strong> ${purchaseDetails.supplier_name || 'غير محدد'}</span>
                    </div>
                    <div class="info-row">
                        <span><strong>إجمالي الأصناف:</strong> ${purchaseDetails.items ? purchaseDetails.items.length : 0}</span>
                        <span><strong>الإجمالي:</strong> ${purchaseDetails.total_amount.toFixed(2)} جنيه</span>
                    </div>
                </div>
                
                <div class="items-section">
                    <h4>أصناف المشتريات</h4>
                    <table class="purchase-items-table">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>الكود</th>
                                <th>الكمية</th>
                                <th>سعر الشراء</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${purchaseDetails.items && purchaseDetails.items.length > 0 ? 
                                purchaseDetails.items.map(item => `
                                    <tr>
                                        <td>${item.product_name}</td>
                                        <td>${item.barcode || 'غير محدد'}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.unit_price.toFixed(2)} جنيه</td>
                                        <td>${item.total_price.toFixed(2)} جنيه</td>
                                    </tr>
                                `).join('') : 
                                '<tr><td colspan="5" class="no-data">لا توجد أصناف</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="printPurchase(${purchaseDetails.id})">
                    <i class="fas fa-print"></i> طباعة
                </button>
                <button class="btn btn-primary" onclick="closeModal()">
                    <i class="fas fa-times"></i> إغلاق
                </button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

// طباعة المشتريات
function printPurchase(purchaseId) {
    // يمكن تطوير هذه الدالة لاحقاً لطباعة تفاصيل المشتريات
    showMessage('ميزة الطباعة قيد التطوير', 'info');
}

// دالة حذف المشتريات
async function deletePurchase(purchaseId) {
    const purchase = purchases.find(p => p.id === purchaseId);
    const purchaseName = purchase ? `مشتريات ${purchase.supplier_name || 'غير محدد'}` : `المشتريات رقم ${purchaseId}`;
    
    verifyDeletePassword(async function() {
        try {
            const response = await fetch(`/api/purchases/${purchaseId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('تم حذف المشتريات بنجاح', 'success');
                loadPurchasesData();
            } else {
                showMessage(result.error || 'حدث خطأ أثناء حذف المشتريات', 'error');
            }
        } catch (error) {
            console.error('خطأ في حذف المشتريات:', error);
            showMessage('حدث خطأ أثناء حذف المشتريات', 'error');
        }
    }, purchaseName);
}

// إضافة صنف جديد للمشتريات - نسخة محدثة بدون تقسيط
function addPurchaseItem() {
    const container = document.getElementById('purchase-items');
    if (!container) {
        console.error('Purchase items container not found');
        return;
    }
    
    const currentItems = container.querySelectorAll('.purchase-item');
    const newIndex = currentItems.length;
    
    const newItem = document.createElement('div');
    newItem.className = 'purchase-item';
    newItem.setAttribute('data-index', newIndex);
    newItem.innerHTML = `
        <div class="product-search-section">
            <div class="form-row">
                <div class="form-group">
                    <label>كود المنتج:</label>
                    <input type="text" class="product-code" placeholder="أدخل كود المنتج" onchange="searchProductByCode(this, ${newIndex})">
                </div>
                <div class="form-group">
                    <label>أو اختر من القائمة:</label>
                    <select class="product-select" onchange="selectProduct(this, ${newIndex})">
                        <option value="">اختر المنتج</option>
                        ${products.map(product => `<option value="${product.id}" data-product='${JSON.stringify(product)}'>${product.name} - ${product.barcode || 'بدون كود'}</option>`).join('')}
                    </select>
                </div>
            </div>
        </div>
        
        <div class="product-details-section">
            <div class="form-row">
                <div class="form-group">
                    <label>اسم المنتج: *</label>
                    <input type="text" name="product_name[]" class="product-name" required>
                    <input type="hidden" name="product_id[]" class="product-id">
                </div>
                <div class="form-group">
                    <label>الفئة:</label>
                    <input type="text" name="category[]" class="product-category">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>المقاس:</label>
                    <input type="text" name="size[]" class="product-size">
                </div>
                <div class="form-group">
                    <label>اللون:</label>
                    <input type="text" name="color[]" class="product-color">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>الباركود:</label>
                    <input type="text" name="barcode[]" class="product-barcode" placeholder="الباركود (اختياري)">
                </div>
                <div class="form-group">
                    <label>الحد الأدنى للمخزون:</label>
                    <input type="number" name="min_quantity[]" class="min-quantity" value="5" min="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>سعر الشراء: *</label>
                    <input type="number" name="purchase_price[]" class="purchase-price" step="0.01" min="0" required onchange="calculateItemTotal(this.closest('.purchase-item').querySelector('.purchased-quantity'))">
                </div>
                <div class="form-group">
                    <label>سعر البيع:</label>
                    <input type="number" name="selling_price[]" class="selling-price" step="0.01" min="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>الكمية الحالية:</label>
                    <input type="number" class="current-quantity" readonly>
                </div>
                <div class="form-group">
                    <label>الكمية المشتراة: *</label>
                    <input type="number" name="quantity[]" class="purchased-quantity" min="1" required onchange="calculateItemTotal(this)">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>إجمالي الصنف:</label>
                    <input type="number" class="item-total" step="0.01" readonly>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger remove-item-btn" onclick="removePurchaseItem(this)">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(newItem);
    updatePurchaseTotal();
}

// دالة جديدة لتحديث عداد الأصناف
function updatePurchaseItemsCount() {
    const container = document.getElementById('purchase-items');
    if (container) {
        const itemsCount = container.querySelectorAll('.purchase-item').length;
        updateElementText('total-items', itemsCount.toString());
    }
}

// حذف صنف من المشتريات - نسخة محدثة
function removePurchaseItem(button) {
    const container = document.getElementById('purchase-items');
    if (!container) {
        console.error('Purchase items container not found');
        return;
    }
    
    if (container.children.length > 1) {
        button.closest('.purchase-item').remove();
        updatePurchaseTotal();
        
        // إعادة ترقيم العناصر
        const items = container.querySelectorAll('.purchase-item');
        items.forEach((item, index) => {
            item.setAttribute('data-index', index);
            
            // تحديث دوال البحث والاختيار
            const productCodeInput = item.querySelector('.product-code');
            if (productCodeInput) {
                productCodeInput.setAttribute('onchange', `searchProductByCode(this, ${index})`);
            }
            
            const productSelect = item.querySelector('.product-select');
            if (productSelect) {
                productSelect.setAttribute('onchange', `selectProduct(this, ${index})`);
            }
        });
    } else {
        showMessage('يجب أن يحتوي على صنف واحد على الأقل', 'warning');
    }
}



// إضافة مورد جديد
function showAddSupplierModal() {
    const modalContent = `
        <h3>إضافة مورد جديد</h3>
        <form onsubmit="saveSupplier(event)">
            <div class="form-group">
                <label>اسم المورد:</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>رقم الهاتف:</label>
                <input type="tel" name="phone">
            </div>
            <div class="form-group">
                <label>العنوان:</label>
                <textarea name="address" rows="3"></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">حفظ</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </form>
    `;
    showModal(modalContent);
}

// إضافة مصروف جديد - تصميم محسن
function showAddExpenseModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-plus-circle"></i> إضافة مصروف جديد</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form onsubmit="saveExpense(event)" class="expense-form">
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-tags"></i> فئة المصروف *</label>
                        <select name="category" required class="form-control">
                            <option value="">اختر الفئة</option>
                            <option value="إيجار">💰 إيجار</option>
                            <option value="كهرباء">⚡ كهرباء</option>
                            <option value="مياه">💧 مياه</option>
                            <option value="رواتب">👥 رواتب</option>
                            <option value="صيانة">🔧 صيانة</option>
                            <option value="مواد خام">📦 مواد خام</option>
                            <option value="تسويق">📢 تسويق</option>
                            <option value="نقل ومواصلات">🚚 نقل ومواصلات</option>
                            <option value="أخرى">📋 أخرى</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-dollar-sign"></i> المبلغ *</label>
                        <input type="number" name="amount" step="0.01" min="0" required class="form-control" placeholder="0.00">
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-align-left"></i> وصف المصروف *</label>
                    <input type="text" name="description" required class="form-control" placeholder="أدخل وصف تفصيلي للمصروف">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-credit-card"></i> طريقة الدفع</label>
                        <select name="payment_method" class="form-control">
                            <option value="نقدي">💵 نقدي</option>
                            <option value="بنكي">🏦 بنكي</option>
                            <option value="شيك">📄 شيك</option>
                            <option value="فيزا">💳 فيزا</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-receipt"></i> رقم الإيصال</label>
                        <input type="text" name="receipt_number" class="form-control" placeholder="رقم الإيصال (اختياري)">
                    </div>
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-calendar"></i> تاريخ المصروف</label>
                    <input type="date" name="expense_date" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                
                <div class="form-group">
                    <label><i class="fas fa-sticky-note"></i> ملاحظات إضافية</label>
                    <textarea name="notes" rows="3" class="form-control" placeholder="أي ملاحظات إضافية (اختياري)"></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> حفظ المصروف
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> إلغاء
                    </button>
                </div>
            </form>
        </div>
    `;
    showModal(modalContent);
}

// تطبيق فلاتر المصروفات المحسنة
function applyExpenseFilters() {
    const category = document.getElementById('expense-category-filter').value;
    const startDate = document.getElementById('expense-start-date').value;
    const endDate = document.getElementById('expense-end-date').value;
    const paymentMethod = document.getElementById('expense-payment-filter').value;
    const searchText = document.getElementById('expense-search').value.toLowerCase();
    
    let filteredExpenses = expenses.filter(expense => {
        // فلتر الفئة
        if (category && expense.category !== category) return false;
        
        // فلتر التاريخ
        const expenseDate = expense.created_at.split('T')[0];
        if (startDate && expenseDate < startDate) return false;
        if (endDate && expenseDate > endDate) return false;
        
        // فلتر طريقة الدفع
        if (paymentMethod && expense.payment_method !== paymentMethod) return false;
        
        // فلتر البحث في النص
        if (searchText && !expense.description.toLowerCase().includes(searchText)) return false;
        
        return true;
    });
    
    displayFilteredExpenses(filteredExpenses);
    updateFilteredExpensesStats(filteredExpenses);
    showMessage(`تم العثور على ${filteredExpenses.length} مصروف`, 'info');
}

// عرض المصروفات المفلترة
function displayFilteredExpenses(filteredExpenses) {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">لا توجد مصروفات تطابق معايير البحث</td></tr>';
        return;
    }
    
    filteredExpenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatLocalDate(expense.created_at)}</td>
            <td><span class="category-badge category-${expense.category}">${expense.category}</span></td>
            <td>${expense.description}</td>
            <td class="amount">${expense.amount.toFixed(2)} جنيه</td>
            <td><span class="payment-method ${expense.payment_method}">${expense.payment_method}</span></td>
            <td>
                <button class="btn-icon btn-edit" onclick="editExpense(${expense.id})" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteExpense(${expense.id})" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// تحديث إحصائيات المصروفات المفلترة
function updateFilteredExpensesStats(filteredExpenses) {
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const avgAmount = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
    
    updateElementText('filtered-expenses-count', filteredExpenses.length);
    updateElementText('filtered-expenses-total', `${totalAmount.toFixed(2)} جنيه`);
    updateElementText('filtered-expenses-avg', `${avgAmount.toFixed(2)} جنيه`);
}

// عرض مبيعات اليوم
function showTodaySales() {
    const today = getCurrentLocalDate();
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
    document.getElementById('customer-filter').value = '';
    document.getElementById('payment-filter').value = '';
    
    applySalesFilters();
    showMessage('يتم عرض مبيعات اليوم الحالي', 'success');
}

// مسح الفلاتر
function clearExpenseFilters() {
    document.getElementById('expense-category-filter').value = '';
    document.getElementById('expense-start-date').value = '';
    document.getElementById('expense-end-date').value = '';
    document.getElementById('expense-payment-filter').value = '';
    document.getElementById('expense-search').value = '';
    
    displayExpensesTable();
    updateExpensesStats();
    showMessage('تم مسح جميع الفلاتر', 'success');
}

// تعديل مصروف
async function editExpense(expenseId) {
    try {
        const expense = expenses.find(e => e.id === expenseId);
        if (!expense) {
            showMessage('المصروف غير موجود', 'error');
            return;
        }

        const modalContent = `
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> تعديل المصروف</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form onsubmit="updateExpense(event, ${expenseId})" class="expense-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-tags"></i> فئة المصروف *</label>
                            <select name="category" required class="form-control">
                                <option value="">اختر الفئة</option>
                                <option value="إيجار" ${expense.category === 'إيجار' ? 'selected' : ''}>💰 إيجار</option>
                                <option value="كهرباء" ${expense.category === 'كهرباء' ? 'selected' : ''}>⚡ كهرباء</option>
                                <option value="مياه" ${expense.category === 'مياه' ? 'selected' : ''}>💧 مياه</option>
                                <option value="رواتب" ${expense.category === 'رواتب' ? 'selected' : ''}>👥 رواتب</option>
                                <option value="صيانة" ${expense.category === 'صيانة' ? 'selected' : ''}>🔧 صيانة</option>
                                <option value="مواد خام" ${expense.category === 'مواد خام' ? 'selected' : ''}>📦 مواد خام</option>
                                <option value="تسويق" ${expense.category === 'تسويق' ? 'selected' : ''}>📢 تسويق</option>
                                <option value="نقل ومواصلات" ${expense.category === 'نقل ومواصلات' ? 'selected' : ''}>🚚 نقل ومواصلات</option>
                                <option value="أخرى" ${expense.category === 'أخرى' ? 'selected' : ''}>📋 أخرى</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-dollar-sign"></i> المبلغ *</label>
                            <input type="number" name="amount" step="0.01" min="0" required class="form-control" value="${expense.amount}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-align-left"></i> وصف المصروف *</label>
                        <input type="text" name="description" required class="form-control" value="${expense.description}">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-credit-card"></i> طريقة الدفع</label>
                            <select name="payment_method" class="form-control">
                                <option value="نقدي" ${expense.payment_method === 'نقدي' ? 'selected' : ''}>💵 نقدي</option>
                                <option value="بنكي" ${expense.payment_method === 'بنكي' ? 'selected' : ''}>🏦 بنكي</option>
                                <option value="شيك" ${expense.payment_method === 'شيك' ? 'selected' : ''}>📄 شيك</option>
                                <option value="فيزا" ${expense.payment_method === 'فيزا' ? 'selected' : ''}>💳 فيزا</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-receipt"></i> رقم الإيصال</label>
                            <input type="text" name="receipt_number" class="form-control" value="${expense.receipt_number || ''}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-calendar"></i> تاريخ المصروف</label>
                        <input type="date" name="expense_date" class="form-control" value="${expense.created_at.split('T')[0]}">
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-sticky-note"></i> ملاحظات إضافية</label>
                        <textarea name="notes" rows="3" class="form-control">${expense.notes || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> حفظ التعديلات
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal()">
                            <i class="fas fa-times"></i> إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;
        showModal(modalContent);
    } catch (error) {
        console.error('خطأ في تحميل بيانات المصروف:', error);
        showMessage('خطأ في تحميل بيانات المصروف', 'error');
    }
}

// تحديث المصروف
async function updateExpense(event, expenseId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const expenseData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            showMessage('تم تحديث المصروف بنجاح', 'success');
            closeModal();
            await loadExpensesData();
        } else {
            const error = await response.json();
            showMessage(error.error || 'خطأ في تحديث المصروف', 'error');
        }
    } catch (error) {
        console.error('خطأ في تحديث المصروف:', error);
        showMessage('خطأ في الاتصال بالخادم', 'error');
    }
}

// حذف مصروف
async function deleteExpense(expenseId) {
    // الحصول على وصف المصروف للعرض
    const expense = expenses.find(e => e.id === expenseId);
    const expenseDescription = expense ? expense.description : 'المصروف';
    
    verifyDeletePassword(async () => {
        try {
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showMessage('تم حذف المصروف بنجاح', 'success');
                await loadExpensesData();
            } else {
                const error = await response.json();
                showMessage(error.error || 'خطأ في حذف المصروف', 'error');
            }
        } catch (error) {
            console.error('خطأ في حذف المصروف:', error);
            showMessage('خطأ في الاتصال بالخادم', 'error');
        }
    }, expenseDescription);
}

// تصدير المصروفات
function exportExpenses() {
    if (expenses.length === 0) {
        showMessage('لا توجد مصروفات للتصدير', 'warning');
        return;
    }
    
    const csvContent = generateExpensesCSV();
    downloadCSV(csvContent, `expenses_${getCurrentLocalDate()}.csv`);
    showMessage('تم تصدير المصروفات بنجاح', 'success');
}

// إنشاء ملف CSV للمصروفات
function generateExpensesCSV() {
    const headers = ['التاريخ', 'الفئة', 'الوصف', 'المبلغ', 'طريقة الدفع', 'رقم الإيصال', 'الملاحظات'];
    const csvRows = [headers.join(',')];
    
    expenses.forEach(expense => {
        const row = [
            formatLocalDate(expense.created_at),
            expense.category,
            `"${expense.description}"`,
            expense.amount,
            expense.payment_method,
            expense.receipt_number || '',
            `"${expense.notes || ''}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// مسح الفلاتر
function clearPurchaseFilters() {
    document.getElementById('supplier-search').value = '';
    document.getElementById('date-filter').value = 'today';
    document.getElementById('start-date-filter').value = '';
    document.getElementById('end-date-filter').value = '';
    
    applyPurchaseFilters();
}

// تصدير المشتريات
function exportPurchases() {
    if (filteredPurchases.length === 0) {
        showMessage('لا توجد مشتريات للتصدير', 'warning');
        return;
    }
    
    const csv = generatePurchasesCSV();
    downloadCSV(csv, `purchases_${getCurrentLocalDate()}.csv`);
}

// إنشاء ملف CSV للمشتريات
function generatePurchasesCSV() {
    const headers = ['رقم الفاتورة', 'المورد', 'التاريخ', 'عدد الأصناف', 'الإجمالي'];
    const rows = filteredPurchases.map(purchase => [
        purchase.invoice_number || 'غير محدد',
        purchase.supplier_name || 'غير محدد',
        purchase.purchase_date ? formatLocalDate(purchase.purchase_date) : 'غير محدد',
        purchase.items_count || 0,
        purchase.total_amount ? purchase.total_amount.toFixed(2) : '0.00'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}




// التحقق من تسجيل الدخول
function checkAuthentication() {
    const sessionData = getSessionData();
    
    if (!sessionData) {
        // إعادة توجيه لصفحة تسجيل الدخول
        window.location.href = 'login.html';
        return false;
    }
    
    // التحقق من انتهاء صلاحية الجلسة
    if (sessionData.expiryDate < Date.now()) {
        clearSession();
        window.location.href = 'login.html';
        return false;
    }
    
    // تحديث معلومات المستخدم في الواجهة
    updateUserInfo(sessionData);
    updateSidebarBasedOnPermissions(); // تحديث القائمة الجانبية
    return true;
}

// دالة الحصول على بيانات الجلسة
function getSessionData() {
    let sessionData = localStorage.getItem('userSession');
    if (!sessionData) {
        sessionData = sessionStorage.getItem('userSession');
    }
    
    return sessionData ? JSON.parse(sessionData) : null;
}

// دالة تحديث معلومات المستخدم
function updateUserInfo(sessionData) {
    const userInfoElement = document.querySelector('.user-info span');
    if (userInfoElement) {
        const displayName = sessionData.fullName || sessionData.username;
        const roleDisplay = getRoleDisplayName(sessionData.role);
        userInfoElement.textContent = `مرحباً، ${roleDisplay} ${displayName}`;
    }
}

// دالة للحصول على اسم الدور للعرض (نفس الدالة في login.js)
function getRoleDisplayName(role) {
    const roles = {
        'admin': 'مدير النظام',
        'manager': 'مدير', 
        'cashier': 'كاشير'
    };
    return roles[role] || role;
}

// دالة تسجيل الخروج
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// دالة مسح الجلسة
function clearSession() {
    localStorage.removeItem('userSession');
    sessionStorage.removeItem('userSession');
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من المصادقة أولاً
    if (!checkAuthentication()) {
        return;
    }
    
    // تحميل إعدادات كلمة مرور الحذف
    loadDeletePasswordSettings();
    
    // ربط أزرار التنقل
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            if (pageId) {
                showPage(pageId);
            }
        });
    });
    
    // تحديث التاريخ والوقت كل ثانية
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // تحميل بيانات الصفحة الافتراضية
    loadPageData('dashboard');
    
    // إعداد البحث في المنتجات
    setupProductSearch();
    setupEnhancedSearch();
    
    // إغلاق النافذة المنبثقة عند النقر على الخلفية
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    // إغلاق القائمة المنسدلة للمستخدم عند النقر خارجها
    document.addEventListener('click', function(event) {
        const userMenu = document.querySelector('.user-menu');
        const dropdown = document.getElementById('userDropdown');
        
        if (userMenu && dropdown && !userMenu.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // إغلاق النافذة المنبثقة بمفتاح Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // إضافة مستمع للخصم الإضافي
    const additionalDiscountInput = document.getElementById('additional-discount');
    if (additionalDiscountInput) {
        additionalDiscountInput.addEventListener('input', updateCart);
        additionalDiscountInput.addEventListener('change', updateCart);
    }
    
    // إخفاء القائمة المنسدلة عند النقر خارجها
    document.addEventListener('click', function(event) {
        const searchBar = document.querySelector('.search-bar');
        const dropdown = document.getElementById('search-results-dropdown');
        
        if (searchBar && dropdown && !searchBar.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    // معالج تغيير فترة التقرير
    const reportPeriod = document.getElementById('report-period');
    const startDate = document.getElementById('custom-start-date');
    const endDate = document.getElementById('custom-end-date');
    
    if (reportPeriod) {
        reportPeriod.addEventListener('change', function() {
            if (this.value === 'custom') {
                if (startDate) startDate.style.display = 'inline-block';
                if (endDate) endDate.style.display = 'inline-block';
            } else {
                if (startDate) startDate.style.display = 'none';
                if (endDate) endDate.style.display = 'none';
                // تحديث التقارير تلقائياً عند تغيير الفترة
                generateReports();
            }
        });
    }
    
    // معالج تغيير التواريخ المخصصة
    if (startDate && endDate) {
        startDate.addEventListener('change', function() {
            if (endDate.value) {
                generateReports();
            }
        });
        
        endDate.addEventListener('change', function() {
            if (startDate.value) {
                generateReports();
            }
        });
    }
    
    // إضافة معالجات أحداث فلاتر المبيعات
    const salesStartDate = document.getElementById('start-date');
    const salesEndDate = document.getElementById('end-date');
    const customerFilter = document.getElementById('customer-filter');
    const paymentFilter = document.getElementById('payment-filter');
    
    if (salesStartDate) {
        salesStartDate.addEventListener('change', function() {
            applySalesFilters();
        });
    }
    
    if (salesEndDate) {
        salesEndDate.addEventListener('change', function() {
            applySalesFilters();
        });
    }
    
    if (customerFilter) {
        customerFilter.addEventListener('change', function() {
            applySalesFilters();
        });
    }
    
    if (paymentFilter) {
        paymentFilter.addEventListener('change', function() {
            applySalesFilters();
        });
    }
    
    // إضافة البحث الفوري
    const invoiceSearchInput = document.getElementById('invoice-search');
    const customerNameSearchInput = document.getElementById('customer-name-search');
    
    if (invoiceSearchInput) {
        invoiceSearchInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                applySalesFilters();
            }, 300); // تأخير 300ms لتجنب البحث المفرط
        });
    }
    
    if (customerNameSearchInput) {
        customerNameSearchInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                applySalesFilters();
            }, 300);
        });
    }
    
    // إضافة معالجات أحداث فلاتر الأصناف
    const productSearchInput = document.getElementById('product-search');
    const categoryFilterSelect = document.getElementById('category-filter');
    const sizeFilterSelect = document.getElementById('size-filter');
    const colorFilterSelect = document.getElementById('color-filter');
    const stockFilterSelect = document.getElementById('stock-filter');
    const profitFilterSelect = document.getElementById('profit-filter');
    
    if (productSearchInput) {
        productSearchInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                filterProducts();
            }, 300);
        });
    }
    
    if (categoryFilterSelect) {
        categoryFilterSelect.addEventListener('change', filterProducts);
    }
    
    if (sizeFilterSelect) {
        sizeFilterSelect.addEventListener('change', filterProducts);
    }
    
    if (colorFilterSelect) {
        colorFilterSelect.addEventListener('change', filterProducts);
    }
    
    if (stockFilterSelect) {
        stockFilterSelect.addEventListener('change', filterProducts);
    }
    
    if (profitFilterSelect) {
        profitFilterSelect.addEventListener('change', filterProducts);
    }
});


// متغيرات المرتجعات
let returnProducts = [];

// البحث عن فاتورة للمرتجع
async function searchInvoiceForReturn() {
    const invoiceNumber = document.getElementById('invoice-search-input').value.trim();
    const productsSection = document.getElementById('invoice-products-section');
    const productsList = document.getElementById('invoice-products-list');
    
    if (!invoiceNumber) {
        productsSection.style.display = 'none';
        return;
    }
    
    try {
        // البحث عن الفاتورة - إزالة api/ لأن fetchData تضيفها تلقائياً
        const saleDetails = await fetchData(`sales/${invoiceNumber}/details`);
        
        if (saleDetails && saleDetails.items && saleDetails.items.length > 0) {
            // عرض منتجات الفاتورة
            displayInvoiceProducts(saleDetails.items, invoiceNumber);
            productsSection.style.display = 'block';
        } else {
            productsList.innerHTML = '<div class="no-products">لا توجد منتجات في هذه الفاتورة</div>';
            productsSection.style.display = 'block';
        }
    } catch (error) {
        console.error('خطأ في البحث عن الفاتورة:', error);
        productsList.innerHTML = '<div class="error-message">خطأ في البحث عن الفاتورة أو الفاتورة غير موجودة</div>';
        productsSection.style.display = 'block';
    }
}

// عرض منتجات الفاتورة للاختيار
function displayInvoiceProducts(items, invoiceNumber) {
    const productsList = document.getElementById('invoice-products-list');
    
    productsList.innerHTML = items.map((item, index) => `
        <div class="invoice-product-item" onclick="selectInvoiceProduct('${item.product_name}', ${item.quantity}, ${item.unit_price}, ${invoiceNumber})">
            <div class="product-info">
                <div class="product-name">
                    <strong>${item.product_name}</strong>
                </div>
                <div class="product-details">
                    <span class="quantity">الكمية: ${item.quantity}</span>
                    <span class="price">السعر: ${item.unit_price.toFixed(2)} جنيه</span>
                    <span class="total">الإجمالي: ${item.total_price.toFixed(2)} جنيه</span>
                </div>
            </div>
            <div class="select-indicator">
                <i class="fas fa-hand-pointer"></i>
                <span>اختر للمرتجع</span>
            </div>
        </div>
    `).join('');
}

// اختيار منتج من الفاتورة للمرتجع
function selectInvoiceProduct(productName, maxQuantity, unitPrice, invoiceNumber) {
    // البحث عن المنتج في قائمة المنتجات
    const product = products.find(p => p.name === productName);
    
    if (product) {
        // تعبئة بيانات المنتج في نافذة المرتجع
        document.getElementById('selected-return-product').value = `${product.name} - ${product.selling_price} جنيه`;
        document.getElementById('selected-return-product-id').value = product.id;
        document.getElementById('return-product-search').value = product.name;
        
        // تعبئة الكمية المباعة كحد أقصى للمرتجع
        document.getElementById('return-quantity').value = 1;
        document.getElementById('return-quantity').max = maxQuantity;
        
        // تعبئة رقم الفاتورة الأصلية
        document.getElementById('original-invoice').value = invoiceNumber;
        
        // إخفاء قائمة المنتجات
        document.getElementById('invoice-products-section').style.display = 'none';
        
        showMessage(`تم اختيار المنتج: ${product.name} (الحد الأقصى: ${maxQuantity})`, 'success');
    } else {
        showMessage('لم يتم العثور على المنتج في النظام', 'error');
    }
}

// عرض مودل المرتجعات
function showReturnModal() {
    const returnModalContent = document.querySelector('#return-modal .modal-content').innerHTML;
    showModal(returnModalContent);
    
    // إعادة تعيين النموذج
    document.getElementById('return-form').reset();
    document.getElementById('selected-return-product').value = '';
    document.getElementById('selected-return-product-id').value = '';
    document.getElementById('return-search-results').style.display = 'none';
}

// إغلاق مودل المرتجعات
function closeReturnModal() {
    closeModal();
}

// دالة لفتح نافذة المرتجع من صفحة المبيعات مع تعبئة البيانات تلقائياً
async function showReturnModalFromSale(saleId) {
    try {
        // جلب تفاصيل الفاتورة
        const saleDetails = await fetchData(`sales/${saleId}/details`);
        
        // فتح نافذة المرتجع
        showReturnModal();
        
        // تعبئة رقم الفاتورة الأصلية
        document.getElementById('original-invoice').value = saleId;
        
        // إذا كانت الفاتورة تحتوي على منتج واحد فقط، قم بتعبئته تلقائياً
        if (saleDetails.items && saleDetails.items.length === 1) {
            const item = saleDetails.items[0];
            
            // البحث عن المنتج في قائمة المنتجات
            const product = products.find(p => p.name === item.product_name);
            
            if (product) {
                // تعبئة بيانات المنتج
                document.getElementById('selected-return-product').value = `${product.name} - ${product.selling_price} جنيه`;
                document.getElementById('selected-return-product-id').value = product.id;
                document.getElementById('return-product-search').value = product.name;
                
                // تعبئة الكمية المباعة كحد أقصى للمرتجع
                document.getElementById('return-quantity').value = item.quantity;
                document.getElementById('return-quantity').max = item.quantity;
                
                showMessage(`تم تعبئة بيانات المنتج: ${product.name}`, 'success');
            }
        } else if (saleDetails.items && saleDetails.items.length > 1) {
            // إذا كانت الفاتورة تحتوي على أكثر من منتج، اعرض قائمة للاختيار
            showProductSelectionForReturn(saleDetails.items, saleId);
        }
        
    } catch (error) {
        console.error('خطأ في جلب تفاصيل الفاتورة:', error);
        showMessage('حدث خطأ في تحميل بيانات الفاتورة', 'error');
        // فتح النافذة مع رقم الفاتورة فقط
        showReturnModal();
        document.getElementById('original-invoice').value = saleId;
    }
}

// دالة لعرض قائمة المنتجات للاختيار في حالة وجود أكثر من منتج
function showProductSelectionForReturn(items, saleId) {
    const modalContent = `
        <div class="product-selection-modal">
            <div class="modal-header">
                <h3>اختر المنتج للمرتجع - فاتورة #${saleId}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>الفاتورة تحتوي على عدة منتجات. اختر المنتج الذي تريد إرجاعه:</p>
                <div class="products-list">
                    ${items.map((item, index) => `
                        <div class="product-item" onclick="selectProductForReturn('${item.product_name}', ${item.quantity}, ${item.unit_price})">
                            <div class="product-info">
                                <strong>${item.product_name}</strong>
                                <span>الكمية: ${item.quantity}</span>
                                <span>السعر: ${item.unit_price.toFixed(2)} جنيه</span>
                                <span>الإجمالي: ${item.total_price.toFixed(2)} جنيه</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
            </div>
        </div>
    `;
    
    showModal(modalContent);
}

// دالة لاختيار منتج محدد للمرتجع
function selectProductForReturn(productName, maxQuantity, unitPrice) {
    // البحث عن المنتج في قائمة المنتجات
    const product = products.find(p => p.name === productName);
    
    if (product) {
        // إغلاق نافذة الاختيار
        closeModal();
        
        // فتح نافذة المرتجع
        showReturnModal();
        
        // تعبئة رقم الفاتورة الأصلية
        const originalInvoiceField = document.getElementById('original-invoice');
        if (originalInvoiceField && originalInvoiceField.value) {
            // الاحتفاظ برقم الفاتورة إذا كان موجوداً
        }
        
        // تعبئة بيانات المنتج في نافذة المرتجع
        document.getElementById('selected-return-product').value = `${product.name} - ${product.selling_price} جنيه`;
        document.getElementById('selected-return-product-id').value = product.id;
        document.getElementById('return-product-search').value = product.name;
        
        // تعبئة الكمية المباعة كحد أقصى للمرتجع
        document.getElementById('return-quantity').value = maxQuantity;
        document.getElementById('return-quantity').max = maxQuantity;
        
        showMessage(`تم اختيار المنتج: ${product.name}`, 'success');
    } else {
        showMessage('لم يتم العثور على المنتج في النظام', 'error');
    }
}

// البحث عن المنتجات للمرتجعات
function searchReturnProducts() {
    const searchTerm = document.getElementById('return-product-search').value.trim();
    const resultsDiv = document.getElementById('return-search-results');
    
    if (searchTerm.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchTerm)) ||
        (product.code && product.code.includes(searchTerm))
    );
    
    if (filteredProducts.length > 0) {
        resultsDiv.innerHTML = filteredProducts.map(product => `
            <div class="return-search-item" onclick="selectReturnProduct(${product.id}, '${product.name}', ${product.selling_price})">
                <strong>${product.name}</strong><br>
                <small>السعر: ${product.selling_price} جنيه - المخزون: ${product.quantity}</small>
            </div>
        `).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.innerHTML = '<div class="return-search-item">لا توجد نتائج</div>';
        resultsDiv.style.display = 'block';
    }
}

// اختيار منتج للمرتجع
function selectReturnProduct(productId, productName, price) {
    document.getElementById('selected-return-product').value = `${productName} - ${price} جنيه`;
    document.getElementById('selected-return-product-id').value = productId;
    document.getElementById('return-product-search').value = productName;
    document.getElementById('return-search-results').style.display = 'none';
}

// معالجة المرتجع
async function processReturn() {
    const productId = document.getElementById('selected-return-product-id').value;
    const quantity = parseInt(document.getElementById('return-quantity').value);
    const reason = document.getElementById('return-reason').value;
    const notes = document.getElementById('return-notes').value;
    const originalInvoice = document.getElementById('original-invoice').value;
    
    if (!productId || !quantity || !reason) {
        showMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // العثور على المنتج
    const product = products.find(p => p.id == productId);
    if (!product) {
        showMessage('المنتج غير موجود', 'error');
        return;
    }
    
    const returnAmount = quantity * product.selling_price;
    
    const returnData = {
        product_id: productId,
        product_name: product.name,
        quantity: quantity,
        unit_price: product.selling_price,
        total_amount: returnAmount,
        reason: reason,
        notes: notes,
        original_invoice: originalInvoice
    };
    
    try {
        const result = await postData('returns', returnData);
        showMessage(`تم تسجيل المرتجع بنجاح. المبلغ المسترد: ${returnAmount.toFixed(2)} جنيه`, 'success');
        
        // إغلاق المودل
        closeReturnModal();
        
        // تحديث جميع البيانات المطلوبة
        await loadPOSData();           // تحديث نقطة البيع
        await loadProductsData();      // تحديث صفحة الأصناف
        await loadSalesData();         // تحديث صفحة المبيعات
        await loadDashboardData();     // تحديث لوحة التحكم
        
        // تحديث الصفحة الحالية إذا كانت إحدى الصفحات المتأثرة
        if (['products', 'sales', 'dashboard', 'pos'].includes(currentPage)) {
            await loadPageData(currentPage);
        }
        
        // طباعة إيصال المرتجع
        if (confirm('هل تريد طباعة إيصال المرتجع؟')) {
            printReturnReceipt(result.id, returnData);
        }
        
    } catch (error) {
        console.error('خطأ في تسجيل المرتجع:', error);
        showMessage('حدث خطأ في تسجيل المرتجع', 'error');
    }
}

// طباعة إيصال المرتجع
function printReturnReceipt(returnId, returnData) {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>إيصال مرتجع رقم ${returnId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
                .return-details { margin-bottom: 20px; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .total-section { margin-top: 20px; text-align: center; background: #f8f9fa; padding: 15px; }
                .return-amount { font-size: 1.5em; color: #dc3545; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>إيصال مرتجع</h1>
                <p>رقم المرتجع: ${returnId}</p>
                <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                <p>الوقت: ${new Date().toLocaleTimeString('ar-EG')}</p>
            </div>
            
            <div class="return-details">
                <div class="detail-row">
                    <strong>المنتج:</strong>
                    <span>${returnData.product_name}</span>
                </div>
                <div class="detail-row">
                    <strong>الكمية:</strong>
                    <span>${returnData.quantity}</span>
                </div>
                <div class="detail-row">
                    <strong>سعر الوحدة:</strong>
                    <span>${returnData.unit_price.toFixed(2)} جنيه</span>
                </div>
                <div class="detail-row">
                    <strong>سبب الإرجاع:</strong>
                    <span>${returnData.reason}</span>
                </div>
                ${returnData.notes ? `
                <div class="detail-row">
                    <strong>ملاحظات:</strong>
                    <span>${returnData.notes}</span>
                </div>
                ` : ''}
                ${returnData.original_invoice ? `
                <div class="detail-row">
                    <strong>رقم الفاتورة الأصلية:</strong>
                    <span>${returnData.original_invoice}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="total-section">
                <div class="return-amount">المبلغ المسترد: ${returnData.total_amount.toFixed(2)} جنيه</div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);
}

// تحميل البيانات المحذوفة
async function loadDeletedData() {
    try {
        const typeFilter = document.getElementById('deleted-data-type-filter')?.value || '';
        let url = '/api/deleted-data';
        
        if (typeFilter) {
            url += `?type=${encodeURIComponent(typeFilter)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const deletedData = await response.json();
        displayDeletedDataTable(deletedData);
        
    } catch (error) {
        console.error('خطأ في تحميل البيانات المحذوفة:', error);
        showMessage('حدث خطأ في تحميل البيانات المحذوفة', 'error');
    }
}

// عرض جدول البيانات المحذوفة
function displayDeletedDataTable(deletedData) {
    const tbody = document.querySelector('#deleted-data-table tbody');
    if (!tbody) {
        console.error('جدول البيانات المحذوفة غير موجود');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!deletedData || deletedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">لا توجد بيانات محذوفة</td></tr>';
        updateElementText('total-deleted-count', '0');
        return;
    }
    
    deletedData.forEach(item => {
        const row = document.createElement('tr');
        
        // تحديد البيانات المعروضة حسب النوع
        let displayData = '';
        if (item.data_type === 'منتج') {
            const product = item.data_content;
            displayData = `${product.name} - ${product.category} (${product.barcode || 'بدون باركود'})`;
        } else if (item.data_type === 'عميل') {
            const customer = item.data_content;
            displayData = `${customer.name} - ${customer.phone || 'بدون هاتف'}`;
        } else {
            displayData = 'بيانات متنوعة';
        }
        
        row.innerHTML = `
            <td><span class="data-type-badge ${item.data_type}">${item.data_type}</span></td>
            <td>#${item.original_id}</td>
            <td class="data-preview" title="${JSON.stringify(item.data_content, null, 2)}">${displayData}</td>
            <td>${formatLocalDate(item.deleted_at)}</td>
            <td>${item.deletion_reason || 'غير محدد'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewDeletedDataDetails(${item.id})" title="عرض التفاصيل">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="restoreDeletedData(${item.id})" title="استعادة البيانات">
                    <i class="fas fa-undo"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    updateElementText('total-deleted-count', deletedData.length);
}

// عرض تفاصيل البيانات المحذوفة
function viewDeletedDataDetails(deletedId) {
    // البحث عن البيانات في الجدول المحمل
    const deletedDataTable = document.querySelector('#deleted-data-table tbody');
    const rows = deletedDataTable.querySelectorAll('tr');
    
    let selectedData = null;
    rows.forEach(row => {
        const viewButton = row.querySelector(`button[onclick="viewDeletedDataDetails(${deletedId})"]`);
        if (viewButton) {
            const dataPreview = row.querySelector('.data-preview');
            const fullData = dataPreview.getAttribute('title');
            const dataType = row.cells[0].textContent.trim();
            const originalId = row.cells[1].textContent.trim();
            const deletedAt = row.cells[3].textContent.trim();
            const reason = row.cells[4].textContent.trim();
            
            selectedData = {
                id: deletedId,
                type: dataType,
                originalId: originalId,
                data: fullData,
                deletedAt: deletedAt,
                reason: reason
            };
        }
    });
    
    if (!selectedData) {
        showMessage('لم يتم العثور على البيانات', 'error');
        return;
    }
    
    // إنشاء modal لعرض التفاصيل
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-info-circle"></i> تفاصيل البيانات المحذوفة</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="deleted-data-details">
                <div class="detail-row">
                    <strong>النوع:</strong> <span class="data-type-badge ${selectedData.type}">${selectedData.type}</span>
                </div>
                <div class="detail-row">
                    <strong>الرقم الأصلي:</strong> ${selectedData.originalId}
                </div>
                <div class="detail-row">
                    <strong>تاريخ الحذف:</strong> ${selectedData.deletedAt}
                </div>
                <div class="detail-row">
                    <strong>سبب الحذف:</strong> ${selectedData.reason}
                </div>
                <div class="detail-row">
                    <strong>البيانات الكاملة:</strong>
                    <pre class="json-data">${selectedData.data}</pre>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-warning" onclick="restoreDeletedData(${deletedId})">
                <i class="fas fa-undo"></i> استعادة البيانات
            </button>
            <button class="btn btn-danger" onclick="permanentlyDeleteData(${deletedId})">
                <i class="fas fa-trash"></i> حذف نهائي
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">إغلاق</button>
        </div>
    `;
    
    showModal(modalContent);
}

// استعادة البيانات المحذوفة
async function restoreDeletedData(deletedId) {
    if (!confirm('هل أنت متأكد من استعادة هذه البيانات؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/deleted-data/${deletedId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // التحقق من نوع المحتوى
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('الخادم لا يعمل بشكل صحيح - تأكد من تشغيل الخادم');
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'فشل في استعادة البيانات');
        }
        
        showMessage(`تم استعادة ${result.type} بنجاح`, 'success');
        
        // إعادة تحميل جدول البيانات المحذوفة
        await loadDeletedData();
        
        // إغلاق المودال إذا كان مفتوحاً
        closeModal();
        
        // إعادة تحميل البيانات المناسبة حسب النوع
        if (result.type === 'منتج') {
            await loadProductsData();
        } else if (result.type === 'عميل') {
            await loadCustomersData();
        }
        
    } catch (error) {
        console.error('خطأ في استعادة البيانات:', error);
        showMessage('حدث خطأ في استعادة البيانات: ' + error.message, 'error');
    }
}

// حذف البيانات نهائياً
async function permanentlyDeleteData(deletedId) {
    if (!confirm('هل أنت متأكد من حذف هذه البيانات نهائياً؟ لن يمكن استعادتها مرة أخرى!')) {
        return;
    }
    
    if (!confirm('تأكيد أخير: سيتم حذف البيانات نهائياً ولن يمكن استعادتها!')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/deleted-data/${deletedId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'فشل في حذف البيانات');
        }
        
        showMessage('تم حذف البيانات نهائياً', 'success');
        
        // إعادة تحميل جدول البيانات المحذوفة
        await loadDeletedData();
        
        // إغلاق المودال إذا كان مفتوحاً
        closeModal();
        
    } catch (error) {
        console.error('خطأ في حذف البيانات:', error);
        showMessage('حدث خطأ في حذف البيانات: ' + error.message, 'error');
    }
}

// إضافة معالج حدث لفلتر نوع البيانات المحذوفة
document.addEventListener('DOMContentLoaded', function() {
    const deletedDataTypeFilter = document.getElementById('deleted-data-type-filter');
    if (deletedDataTypeFilter) {
        deletedDataTypeFilter.addEventListener('change', function() {
            loadDeletedData();
        });
    }
});

// إضافة هذه الدالة في ملف app.js
function openDevTools() {
    // للتطبيقات المبنية بـ Electron
    if (window.require) {
        try {
            const { remote } = window.require('electron');
            if (remote && remote.getCurrentWindow) {
                remote.getCurrentWindow().webContents.openDevTools();
            }
        } catch (error) {
            console.log('لا يمكن فتح أدوات المطور عبر remote module');
        }
    }
    
    // للمتصفحات العادية
    if (typeof window !== 'undefined' && window.console) {
        console.log('استخدم F12 أو انقر بالزر الأيمن واختر "فحص العنصر" لفتح أدوات المطور');
    }
}

// إضافة مستمع للوحة المفاتيح
document.addEventListener('keydown', function(event) {
    if (event.key === 'F12') {
        event.preventDefault();
        openDevTools();
    }
});

// إضافة دالة toggleUserMenu
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// إضافة دالة showAboutCompany
function showAboutCompany() {
    showMessage('معلومات الشركة: CodeVia - شركة تطوير البرمجيات', 'info');
}

// إضافة دالة showContactSupport
function showContactSupport() {
    showMessage('للدعم الفني: WhatsApp: 01040180521 | Email: codevia.tech@gmail.com', 'info');
}

// عرض مودل تقسيم الكمية
function showQuantitySplitModal(itemIndex) {
    const purchaseItem = document.querySelector(`[data-index="${itemIndex}"]`);
    const totalQuantity = parseInt(purchaseItem.querySelector('.purchased-quantity').value) || 0;
    const productName = purchaseItem.querySelector('.product-name').value;
    
    if (totalQuantity <= 0) {
        showMessage('يرجى إدخال الكمية الإجمالية أولاً', 'error');
        return;
    }
    
    const modalContent = `
        <div class="modal-header">
            <h3>تقسيم الكمية - ${productName}</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="split-info">
                <p><strong>الكمية الإجمالية:</strong> ${totalQuantity}</p>
                <p><strong>الكمية المتبقية:</strong> <span id="remaining-qty">${totalQuantity}</span></p>
            </div>
            
            <div class="split-form">
                <h4>إضافة تقسيم جديد:</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>المقاس:</label>
                        <input type="text" id="split-size" placeholder="مثال: L, XL, 42">
                    </div>
                    <div class="form-group">
                        <label>اللون:</label>
                        <input type="text" id="split-color" placeholder="مثال: أحمر, أزرق">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>الكمية:</label>
                        <input type="number" id="split-quantity" min="1" max="${totalQuantity}" placeholder="أدخل الكمية">
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-success" onclick="addQuantitySplit(${itemIndex})">إضافة التقسيم</button>
                    </div>
                </div>
            </div>
            
            <div class="splits-list">
                <h4>التقسيمات الحالية:</h4>
                <div id="current-splits">
                    <!-- سيتم عرض التقسيمات هنا -->
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="applySplits(${itemIndex})">تطبيق التقسيمات</button>
            <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        </div>
    `;
    
    showModal(modalContent);
    
    // عرض التقسيمات الحالية إن وجدت - مع تأخير للتأكد من تحميل العناصر
    setTimeout(() => {
        displayCurrentSplits(itemIndex);
    }, 100);
}

// إضافة تقسيم جديد
function addQuantitySplit(itemIndex) {
    // التحقق من وجود العناصر قبل الوصول إليها
    const sizeElement = document.getElementById('split-size');
    const colorElement = document.getElementById('split-color');
    const quantityElement = document.getElementById('split-quantity');
    
    if (!sizeElement || !colorElement || !quantityElement) {
        showMessage('خطأ في تحميل النموذج، يرجى المحاولة مرة أخرى', 'error');
        return;
    }
    
    const size = sizeElement.value.trim();
    const color = colorElement.value.trim();
    const quantity = parseInt(quantityElement.value) || 0;
    
    if (!size && !color) {
        showMessage('يرجى إدخال المقاس أو اللون على الأقل', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showMessage('يرجى إدخال كمية صحيحة', 'error');
        return;
    }
    
    const purchaseItem = document.querySelector(`[data-index="${itemIndex}"]`);
    if (!purchaseItem) {
        showMessage('خطأ في العثور على العنصر', 'error');
        return;
    }
    
    const totalQuantity = parseInt(purchaseItem.querySelector('.purchased-quantity').value) || 0;
    
    // الحصول على التقسيمات الحالية
    let splits = JSON.parse(purchaseItem.dataset.splits || '[]');
    
    // حساب الكمية المستخدمة
    const usedQuantity = splits.reduce((sum, split) => sum + split.quantity, 0);
    const remainingQuantity = totalQuantity - usedQuantity;
    
    if (quantity > remainingQuantity) {
        showMessage(`الكمية المتاحة: ${remainingQuantity}`, 'error');
        return;
    }
    
    // إضافة التقسيم الجديد
    splits.push({
        size: size,
        color: color,
        quantity: quantity,
        id: Date.now() // معرف فريد
    });
    
    // حفظ التقسيمات
    purchaseItem.dataset.splits = JSON.stringify(splits);
    
    // تحديث العرض
    displayCurrentSplits(itemIndex);
    updateRemainingQuantity(itemIndex);
    
    // مسح النموذج
    sizeElement.value = '';
    colorElement.value = '';
    quantityElement.value = '';
    
    showMessage('تم إضافة التقسيم بنجاح', 'success');
}

// عرض التقسيمات الحالية
function displayCurrentSplits(itemIndex) {
    // البحث عن العنصر باستخدام الفهرس الحالي
    const purchaseItems = document.querySelectorAll('.purchase-item');
    const purchaseItem = purchaseItems[itemIndex];
    
    if (!purchaseItem) {
        console.error('Purchase item not found for index:', itemIndex);
        return;
    }
    
    const splits = JSON.parse(purchaseItem.dataset.splits || '[]');
    const container = document.getElementById('current-splits');
    
    if (!container) {
        console.error('Current splits container not found');
        return;
    }
    
    if (splits.length === 0) {
        container.innerHTML = '<p class="no-splits">لا توجد تقسيمات حتى الآن</p>';
        return;
    }
    
    container.innerHTML = splits.map(split => `
        <div class="split-item">
            <div class="split-details">
                <span><strong>المقاس:</strong> ${split.size || 'غير محدد'}</span>
                <span><strong>اللون:</strong> ${split.color || 'غير محدد'}</span>
                <span><strong>الكمية:</strong> ${split.quantity}</span>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeSplit(${itemIndex}, ${split.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// حذف تقسيم
function removeSplit(itemIndex, splitId) {
    const purchaseItem = document.querySelector(`[data-index="${itemIndex}"]`);
    let splits = JSON.parse(purchaseItem.dataset.splits || '[]');
    
    splits = splits.filter(split => split.id !== splitId);
    purchaseItem.dataset.splits = JSON.stringify(splits);
    
    displayCurrentSplits(itemIndex);
    updateRemainingQuantity(itemIndex);
    
    showMessage('تم حذف التقسيم', 'success');
}

// تحديث الكمية المتبقية
function updateRemainingQuantity(itemIndex) {
    const purchaseItem = document.querySelector(`[data-index="${itemIndex}"]`);
    const totalQuantity = parseInt(purchaseItem.querySelector('.purchased-quantity').value) || 0;
    const splits = JSON.parse(purchaseItem.dataset.splits || '[]');
    
    const usedQuantity = splits.reduce((sum, split) => sum + split.quantity, 0);
    const remainingQuantity = totalQuantity - usedQuantity;
    
    const remainingElement = document.getElementById('remaining-qty');
    if (remainingElement) {
        remainingElement.textContent = remainingQuantity;
        remainingElement.style.color = remainingQuantity === 0 ? '#27ae60' : '#e74c3c';
    }
}

// تطبيق التقسيمات
function applySplits(itemIndex) {
    const purchaseItem = document.querySelector(`[data-index="${itemIndex}"]`);
    if (!purchaseItem) {
        showMessage('خطأ في العثور على العنصر', 'error');
        return;
    }
    
    const splits = JSON.parse(purchaseItem.dataset.splits || '[]');
    
    if (splits.length === 0) {
        showMessage('لا توجد تقسيمات لتطبيقها', 'error');
        return;
    }
    
    // عرض قسم التقسيمات في العنصر الأصلي
    const splitsSection = purchaseItem.querySelector('.quantity-splits-section');
    const splitsContainer = purchaseItem.querySelector('.splits-container');
    const totalSplitQty = purchaseItem.querySelector('.total-split-quantity');
    
    if (splitsSection && splitsContainer && totalSplitQty) {
        splitsSection.style.display = 'block';
        
        // عرض التقسيمات
        splitsContainer.innerHTML = splits.map(split => `
            <div class="split-display">
                <span>المقاس: ${split.size || 'غير محدد'}</span>
                <span>اللون: ${split.color || 'غير محدد'}</span>
                <span>الكمية: ${split.quantity}</span>
            </div>
        `).join('');
        
        // تحديث إجمالي الكمية المقسمة
        const totalSplitQuantity = splits.reduce((sum, split) => sum + split.quantity, 0);
        totalSplitQty.textContent = totalSplitQuantity;
    }
    
    closeModal();
    showMessage('تم تطبيق التقسيمات بنجاح', 'success');
}

// تحديث دالة حفظ المشتريات لتشمل التقسيمات
function collectSplitsData(itemIndex) {
    const purchaseItem = document.querySelector(`[data-index="${itemIndex}"]`);
    if (!purchaseItem) return [];
    
    const splitsSection = purchaseItem.querySelector('.quantity-splits-section');
    if (!splitsSection || splitsSection.style.display === 'none') return [];
    
    const splits = [];
    const sizeInputs = purchaseItem.querySelectorAll(`input[name="split_size_${itemIndex}[]"]`);
    const colorInputs = purchaseItem.querySelectorAll(`input[name="split_color_${itemIndex}[]"]`);
    const quantityInputs = purchaseItem.querySelectorAll(`input[name="split_quantity_${itemIndex}[]"]`);
    
    for (let i = 0; i < quantityInputs.length; i++) {
        splits.push({
            size: sizeInputs[i]?.value || '',
            color: colorInputs[i]?.value || '',
            quantity: parseInt(quantityInputs[i]?.value) || 0
        });
    }
    
    return splits;
}

