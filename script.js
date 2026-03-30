// --- كود جديد: تشغيل وإخفاء شاشة التحميل (Splash Screen) ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                // إظهار شاشة تسجيل الدخول بعد اختفاء شعار كارما
                const loginOverlay = document.getElementById('login-overlay');
                if(loginOverlay) loginOverlay.style.display = 'flex';
            }, 1000);
        }
    }, 3000);
});

// 1. استدعاء البيانات من ذاكرة الموبايل (أكوادك الأصلية كما هي)
let agilData = JSON.parse(localStorage.getItem('abu_karma_data')) || [];
let storeData = JSON.parse(localStorage.getItem('abu_karma_store')) || [];
let dairyData = JSON.parse(localStorage.getItem('abu_karma_dairy')) || [];
let cashData = JSON.parse(localStorage.getItem('abu_karma_cash')) || { balance: 0, transactions: [] };
let customerData = JSON.parse(localStorage.getItem('abu_karma_customers')) || [];
let totalProfits = parseFloat(localStorage.getItem('abu_karma_profits')) || 0;
let expenseData = JSON.parse(localStorage.getItem('abu_karma_expenses')) || [];

// --- إضافة حساب BEDO2001 وتحديث نظام الحسابات ---
let staffAccounts = JSON.parse(localStorage.getItem('abu_karma_staff')) || [
    { name: 'BEDO2001', pin: '2001', role: 'admin' }
];

// تحديث الواجهة فوراً عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    updateStoreUI();
    updateDairyUI();
    updateCashUI();
    updateCustomerUI();
    updateSaleDropdown();
    checkDueAlerts();
    updateExpensesUI();
    updateStaffUI(); // إضافة تحديث جدول الموظفين
    
    const barcodeInput = document.getElementById('sale-barcode-input');
    if(barcodeInput) {
        barcodeInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') { processBarcodeSale(e.target.value); e.target.value = ''; }
        });
    }
});

// --- وظيفة التنقل بين الأقسام ---
function showSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(s => s.style.display = 'none');
    const targetSection = document.getElementById('section-' + sectionId);
    if(targetSection) targetSection.style.display = 'block';
    
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if(activeLink) activeLink.classList.add('active');
}

// --- نظام تسجيل الدخول ---
let currentRole = '';
let currentUser = '';

function selectRole(role) {
    currentRole = role;
    document.getElementById('login-fields').style.display = 'block';
    document.getElementById('btn-select-admin').style.background = role === 'admin' ? 'var(--gold)' : 'rgba(255,255,255,0.05)';
    document.getElementById('btn-select-staff').style.background = role === 'staff' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.05)';
}

function checkLogin() {
    const nameInput = document.getElementById('user-name-input').value;
    const pinInput = document.getElementById('user-pin-input').value;
    
    const user = staffAccounts.find(u => u.name === nameInput && u.pin === pinInput && u.role === currentRole);
    
    if (user) {
        currentUser = user.name;
        document.getElementById('login-overlay').style.display = 'none';
        
        // تعديل: التحكم في الصلاحيات (الأدمن يرى كل شيء)
        if(currentRole === 'staff') {
            document.getElementById('admin-only-controls').style.display = 'none';
            document.querySelectorAll('.sidebar-link').forEach(link => {
                if(link.innerText.includes('التقارير') || link.innerText.includes('الموظفين')) link.style.display = 'none';
            });
        } else {
            document.getElementById('admin-only-controls').style.display = 'block';
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.style.display = 'flex';
            });
        }
        
        logActivity(user.name, "تسجيل دخول", "دخل البرنامج بنجاح");
        initFirebaseConnection(user.name, user.role);
    } else {
        alert("خطأ في الاسم أو الكود السري!");
    }
}

// --- إدارة الأرباح والمصاريف (تم التفعيل) ---
function openExpenseModal() { document.getElementById('expenseModal').style.display = 'flex'; }
function saveExpense() {
    const type = document.getElementById('exp_type').value;
    const amount = parseFloat(document.getElementById('exp_amount').value);
    
    if(type && amount) {
        expenseData.push({ date: new Date().toLocaleString(), type, amount });
        localStorage.setItem('abu_karma_expenses', JSON.stringify(expenseData));
        updateExpensesUI();
        document.getElementById('expenseModal').style.display = 'none';
        logActivity(currentUser, "إضافة مصروف", `نوع: ${type} بمبلغ ${amount}`);
    }
}

function updateExpensesUI() {
    let html = '';
    let total = 0;
    expenseData.forEach(exp => {
        html += `<tr><td>${exp.date}</td><td>${exp.type}</td><td>${exp.amount.toFixed(2)} ج.م</td></tr>`;
        total += exp.amount;
    });
    if(document.getElementById('expenses-table-body')) document.getElementById('expenses-table-body').innerHTML = html;
    if(document.getElementById('total-expenses')) document.getElementById('total-expenses').innerText = total.toFixed(2) + " ج.م";
}

// --- نظام الآجل (الموردين) ---
function openModal() { document.getElementById('addModal').style.display = 'flex'; }
function closeModal() { document.getElementById('addModal').style.display = 'none'; }

function saveNewEntry() {
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        name: document.getElementById('m_name').value,
        section: document.getElementById('m_section').value,
        type: document.getElementById('m_type').value,
        total: parseFloat(document.getElementById('m_total').value),
        paid: parseFloat(document.getElementById('m_paid').value),
        dueDate: document.getElementById('m_due_date').value
    };
    
    agilData.push(entry);
    localStorage.setItem('abu_karma_data', JSON.stringify(agilData));
    updateUI();
    closeModal();
}

function updateUI() {
    let html = '';
    let totalRem = 0;
    const supplierGroups = {};

    agilData.forEach(item => {
        const rem = item.total - item.paid;
        totalRem += rem;
        html += `<tr>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.section}</td>
            <td>${item.type}</td>
            <td>${item.total}</td>
            <td>${item.paid}</td>
            <td style="color:${rem > 0 ? 'var(--neon-pink)' : 'white'}">${rem}</td>
        </tr>`;
        
        if(!supplierGroups[item.name]) supplierGroups[item.name] = 0;
        supplierGroups[item.name] += rem;
    });

    if(document.getElementById('agil-table-body')) document.getElementById('agil-table-body').innerHTML = html;
    if(document.getElementById('supplier-debts')) document.getElementById('supplier-debts').innerText = totalRem.toFixed(2) + " ج.م";
    
    let gridHtml = '';
    for(let name in supplierGroups) {
        gridHtml += `<div class="stat-card glass-panel" onclick="viewSupplierDetails('${name}')" style="cursor:pointer; border-color:var(--neon-blue)">
            <i class="fas fa-user"></i>
            <div><h3>${name}</h3><p>${supplierGroups[name].toFixed(2)} ج.م</p></div>
        </div>`;
    }
    if(document.getElementById('suppliers-grid')) document.getElementById('suppliers-grid').innerHTML = gridHtml;
}

// --- إدارة المخزن والمبيعات ---
function openStoreModal() { document.getElementById('storeModal').style.display = 'flex'; }
function closeStoreModal() { document.getElementById('storeModal').style.display = 'none'; }

function saveStoreEntry() {
    const entry = {
        barcode: document.getElementById('s_barcode').value || 'N/A',
        name: document.getElementById('s_name').value,
        qty: parseFloat(document.getElementById('s_qty').value),
        buy: parseFloat(document.getElementById('s_buy').value),
        sell: parseFloat(document.getElementById('s_sell').value),
        expiry: document.getElementById('s_expiry').value
    };
    storeData.push(entry);
    localStorage.setItem('abu_karma_store', JSON.stringify(storeData));
    updateStoreUI();
    updateSaleDropdown();
    closeStoreModal();
}

function updateStoreUI() {
    let html = '';
    storeData.forEach((item, index) => {
        html += `<tr>
            <td>${item.barcode}</td>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>${item.buy}</td>
            <td>${item.sell}</td>
            <td>${item.expiry}</td>
            <td><button onclick="deleteStoreItem(${index})" style="background:none; border:none; color:red;"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
    if(document.getElementById('store-table-body')) document.getElementById('store-table-body').innerHTML = html;
}

function updateSaleDropdown() {
    let html = '<option value="">-- اختر صنف للبيع --</option>';
    storeData.forEach((item, index) => {
        html += `<option value="${index}">${item.name} (متاح: ${item.qty})</option>`;
    });
    if(document.getElementById('sale-item-select')) document.getElementById('sale-item-select').innerHTML = html;
}

// --- تفعيل إتمام عملية البيع والطباعة ---
function processSale() {
    const idx = document.getElementById('sale-item-select').value;
    const qty = parseFloat(document.getElementById('sale-qty').value);
    
    if(idx !== "" && qty > 0) {
        const item = storeData[idx];
        if(item.qty >= qty) {
            item.qty -= qty;
            const salePrice = item.sell * qty;
            const profit = (item.sell - item.buy) * qty;
            
            cashData.balance += salePrice;
            totalProfits += profit;
            
            localStorage.setItem('abu_karma_store', JSON.stringify(storeData));
            localStorage.setItem('abu_karma_cash', JSON.stringify(cashData));
            localStorage.setItem('abu_karma_profits', totalProfits.toString());
            
            updateStoreUI();
            updateCashUI();
            updateSaleDropdown();
            alert(`تم البيع بنجاح! الإجمالي: ${salePrice} ج.م`);
            logActivity(currentUser, "بيع نقدي", `صنف: ${item.name} بكمية ${qty}`);
        } else {
            alert("الكمية في المخزن غير كافية!");
        }
    }
}

function processBarcodeSale(barcode) {
    const itemIdx = storeData.findIndex(p => p.barcode === barcode);
    if(itemIdx !== -1) {
        document.getElementById('sale-item-select').value = itemIdx;
        document.getElementById('sale-qty').value = 1;
        processSale();
    } else {
        alert("هذا الباركود غير موجود بالمخزن!");
    }
}

function printLastInvoice() {
    window.print();
}

// --- إدارة قسم الألبان والهالك (تم التفعيل) ---
function openDairyModal() {
    const name = prompt("اسم الصنف التالف:");
    const qty = prompt("الكمية الهالكة:");
    const reason = prompt("السبب:");
    const loss = prompt("قيمة الخسارة بالجنيه:");
    if(name && qty) {
        dairyData.push({ date: new Date().toLocaleString(), name, qty, reason, loss });
        localStorage.setItem('abu_karma_dairy', JSON.stringify(dairyData));
        updateDairyUI();
        logActivity(currentUser, "تسجيل هالك", `صنف: ${name} بكمية ${qty}`);
    }
}
function updateDairyUI() {
    let html = '';
    dairyData.forEach(d => {
        html += `<tr><td>${d.date}</td><td>${d.name}</td><td>${d.qty}</td><td>${d.reason}</td><td>${d.loss} ج.م</td></tr>`;
    });
    if(document.getElementById('dairy-table-body')) document.getElementById('dairy-table-body').innerHTML = html;
}

// --- الخزنة ---
function updateCashUI() {
    if(document.getElementById('cash-in-hand')) document.getElementById('cash-in-hand').innerText = cashData.balance.toFixed(2) + " ج.م";
    if(document.getElementById('monthly-profit')) document.getElementById('monthly-profit').innerText = totalProfits.toFixed(2) + " ج.م";
}

let cashAction = '';
function openCashModal(type) {
    cashAction = type;
    document.getElementById('cashModalTitle').innerText = type === 'in' ? 'دخول نقدية' : 'خروج نقدية';
    document.getElementById('cashModal').style.display = 'flex';
}
function closeCashModal() { document.getElementById('cashModal').style.display = 'none'; }

function saveCashEntry() {
    const amount = parseFloat(document.getElementById('cash_amount').value);
    const note = document.getElementById('cash_note').value;
    if(amount > 0) {
        if(cashAction === 'in') cashData.balance += amount;
        else cashData.balance -= amount;
        
        cashData.transactions.push({ date: new Date().toLocaleString(), type: cashAction, amount, note });
        localStorage.setItem('abu_karma_cash', JSON.stringify(cashData));
        updateCashUI();
        closeCashModal();
        logActivity(currentUser, cashAction === 'in' ? "دخول نقدية" : "خروج نقدية", `مبلغ: ${amount} - ${note}`);
    }
}

// --- حسابات العملاء ---
function openCustomerModal() { document.getElementById('customerModal').style.display = 'flex'; }
function closeCustomerModal() { document.getElementById('customerModal').style.display = 'none'; }

function saveCustomer() {
    const name = document.getElementById('c_name').value;
    const debt = parseFloat(document.getElementById('c_debt').value);
    if(name) {
        customerData.push({ name, debt });
        localStorage.setItem('abu_karma_customers', JSON.stringify(customerData));
        updateCustomerUI();
        closeCustomerModal();
    }
}

function updateCustomerUI() {
    let html = '';
    let total = 0;
    customerData.forEach((c, idx) => {
        total += c.debt;
        html += `<div class="stat-card glass-panel" style="border-color:#27ae60">
            <i class="fas fa-user-circle"></i>
            <div><h3>${c.name}</h3><p>${c.debt.toFixed(2)} ج.م</p></div>
        </div>`;
    });
    if(document.getElementById('customers-grid')) document.getElementById('customers-grid').innerHTML = html;
    if(document.getElementById('total-debts')) document.getElementById('total-debts').innerText = total.toFixed(2) + " ج.م";
}

// --- إدارة الموظفين والصلاحيات (تم التفعيل) ---
function openStaffModal() { document.getElementById('staffModal').style.display = 'flex'; }
function saveStaffEntry() {
    const name = document.getElementById('new_staff_name').value;
    const pin = document.getElementById('new_staff_pin').value;
    const role = document.getElementById('new_staff_role').value;
    if(name && pin) {
        staffAccounts.push({ name, pin, role });
        localStorage.setItem('abu_karma_staff', JSON.stringify(staffAccounts));
        updateStaffUI();
        document.getElementById('staffModal').style.display = 'none';
        alert("تم إضافة الحساب بنجاح");
    }
}
function updateStaff
// --- كود تحديث البرنامج تلقائياً عند رفع ملفات جديدة على GitHub ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // إعادة تحميل الصفحة فوراً عند وجود تحديث جديد في ملفات الـ Service Worker
        window.location.reload();
    });
}

// كود إضافي للتأكد من جلب أحدث نسخة من السيرفر وتخطي الكاش القديم
window.addEventListener('load', () => {
    if (navigator.onLine) {
        // محاولة جلب ملف بسيط من السيرفر للتأكد من الاتصال وتحديث الكود
        fetch('index.html', { cache: 'no-store' })
        .then(() => console.log('البرنامج محدث من السيرفر'))
        .catch(() => console.log('يعمل في وضع الأوفلاين'));
    }
});
