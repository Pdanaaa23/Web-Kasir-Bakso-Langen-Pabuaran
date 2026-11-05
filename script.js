// DATABASE INDEXEDDB (Menampung Data Bertahun-tahun Tanpa Lemot)
const DB_NAME = 'BaksoLangenDB';
const DB_VERSION = 1;
let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const dbRef = e.target.result;
            if (!dbRef.objectStoreNames.contains('transactions')) {
                const store = dbRef.createObjectStore('transactions', { keyPath: 'id' });
                store.createIndex('date', 'date', { unique: false });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

// DAFTAR MENU LENGKAP BAKSO LANGEN PABUARAN
const MENUS = [
    { id: 1, name: 'Bakso Polos', price: 15000, cat: 'makanan', emoji: '🥣' },
    { id: 2, name: 'Teh Manis (Es/Anget)', price: 3000, cat: 'minuman', emoji: '🍹' },
    { id: 3, name: 'Teh Tawar (Es/Anget)', price: 2000, cat: 'minuman', emoji: '🍵' },
    { id: 4, name: 'Jeruk (Anget/Es)', price: 5000, cat: 'minuman', emoji: '🍊' },
    { id: 5, name: 'Air Es', price: 2000, cat: 'minuman', emoji: '🧊' },
    { id: 6, name: 'Ketupat', price: 2000, cat: 'pelengkap', emoji: '🫔' },
    { id: 7, name: 'Kelanting', price: 2000, cat: 'pelengkap', emoji: '🥨' },
    { id: 8, name: 'Kacang Goreng/Bawang', price: 2000, cat: 'pelengkap', emoji: '🥜' },
    { id: 9, name: 'Kerupuk', price: 1000, cat: 'pelengkap', emoji: '🫓' },
    { id: 10, name: 'Pangsit Goreng', price: 1000, cat: 'pelengkap', emoji: '🥟' }
];

let cart = [];
let selectedPaymentMethod = 'TUNAI';

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    renderMenuGrid('all');
    renderCart();

    // Set Default Filter Tanggal Hari Ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('history-date').value = today;
    document.getElementById('report-start-date').value = today;
    document.getElementById('report-end-date').value = today;

    loadHistoryData();
    loadReportData();
});

// TAB SWITCHING
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabName === 'history') loadHistoryData();
    if (tabName === 'report') loadReportData();
}

// POS MENU & CART LOGIC
function renderMenuGrid(category) {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';

    const items = category === 'all' ? MENUS : MENUS.filter(m => m.cat === category);
    items.forEach(m => {
        grid.innerHTML += `
            <div class="menu-card" onclick="addToCart(${m.id})">
                <div class="menu-emoji">${m.emoji}</div>
                <div class="menu-title">${m.name}</div>
                <div class="menu-price">Rp ${m.price.toLocaleString('id-ID')}</div>
            </div>
        `;
    });
}

function filterCategory(cat) {
    document.querySelectorAll('.cat-chip').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderMenuGrid(cat);
}

function addToCart(menuId) {
    const exist = cart.find(c => c.id === menuId);
    if (exist) {
        exist.qty++;
    } else {
        const item = MENUS.find(m => m.id === menuId);
        cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

function updateCartQty(menuId, delta) {
    const item = cart.find(c => c.id === menuId);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(c => c.id !== menuId);
        }
    }
    renderCart();
}

function clearCart() {
    cart = [];
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let total = 0;

    cart.forEach(c => {
        const subtotal = c.price * c.qty;
        total += subtotal;
        container.innerHTML += `
            <div class="cart-row">
                <div>
                    <div style="font-weight: 700;">${c.name}</div>
                    <div style="font-size: 12px; color: #64748b;">Rp ${c.price.toLocaleString('id-ID')} x ${c.qty}</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQty(${c.id}, -1)">-</button>
                    <span style="font-weight: 800;">${c.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty(${c.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    document.getElementById('cart-total-text').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

// PEMBAYARAN & MODAL
function openPaymentModal() {
    if (cart.length === 0) return alert('Keranjang belanjaan masih kosong!');
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('modal-total-text').innerText = `Rp ${total.toLocaleString('id-ID')}`;
    document.getElementById('cash-input').value = '';
    document.getElementById('change-text').innerText = 'Rp 0';
    document.getElementById('payment-modal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

function setPaymentMethod(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('cash-payment-section').style.display = method === 'TUNAI' ? 'block' : 'none';
}

function setQuickCash(amount) {
    document.getElementById('cash-input').value = amount;
    calculateChange();
}

function setExactCash() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    document.getElementById('cash-input').value = total;
    calculateChange();
}

function calculateChange() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const cash = parseInt(document.getElementById('cash-input').value) || 0;
    const change = cash - total;
    const changeEl = document.getElementById('change-text');

    if (change >= 0) {
        changeEl.innerText = `Rp ${change.toLocaleString('id-ID')}`;
        changeEl.style.color = '#16a34a';
    } else {
        changeEl.innerText = 'Uang Kurang!';
        changeEl.style.color = '#dc2626';
    }
}

async function processTransaction() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const cash = parseInt(document.getElementById('cash-input').value) || 0;

    if (selectedPaymentMethod === 'TUNAI' && cash < total) {
        return alert('Uang tunai kurang dari total tagihan!');
    }

    const tx = {
        id: 'BLP-' + Date.now().toString().slice(-6),
        date: new Date().toISOString(),
        items: [...cart],
        total: total,
        method: selectedPaymentMethod,
        cash: selectedPaymentMethod === 'TUNAI' ? cash : total,
        change: selectedPaymentMethod === 'TUNAI' ? (cash - total) : 0
    };

    // Simpan ke Database IndexedDB
    const txDb = db.transaction('transactions', 'readwrite');
    const store = txDb.objectStore('transactions');
    store.add(tx);

    txDb.oncomplete = () => {
        alert('Transaksi Berhasil Disimpan!');
        clearCart();
        closePaymentModal();
    };
}

// QUERY DATABASE INDEXEDDB
function getAllTransactions() {
    return new Promise((resolve) => {
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
    });
}

// RIWAYAT TRANSAKSI
async function loadHistoryData() {
    const selectedDate = document.getElementById('history-date').value;
    const allTx = await getAllTransactions();
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    const filtered = allTx.filter(t => t.date.startsWith(selectedDate));
    filtered.reverse().forEach(t => {
        const itemsStr = t.items.map(i => `${i.name} (${i.qty})`).join(', ');
        const timeStr = new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        tbody.innerHTML += `
            <tr>
                <td><b>${t.id}</b></td>
                <td>${timeStr} WIB</td>
                <td>${itemsStr}</td>
                <td>${t.method}</td>
                <td><b>Rp ${t.total.toLocaleString('id-ID')}</b></td>
                <td><button onclick="deleteTx('${t.id}')" style="color:red; border:none; background:none; cursor:pointer;">Hapus</button></td>
            </tr>
        `;
    });
}

function resetHistoryFilter() {
    document.getElementById('history-date').value = new Date().toISOString().split('T')[0];
    loadHistoryData();
}

async function deleteTx(id) {
    if (confirm(`Hapus data nota ${id}?`)) {
        const tx = db.transaction('transactions', 'readwrite');
        tx.objectStore('transactions').delete(id);
        tx.oncomplete = () => {
            loadHistoryData();
            loadReportData();
        };
    }
}

// LAPORAN & CETAK PDF
async function loadReportData() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    document.getElementById('print-period-text').innerText = `Periode: ${startDate} s/d ${endDate}`;

    const allTx = await getAllTransactions();
    const filtered = allTx.filter(t => {
        const txDate = t.date.split('T')[0];
        return txDate >= startDate && txDate <= endDate;
    });

    let totalOmzet = 0;
    let totalItemsCount = 0;
    const summaryMap = {};

    MENUS.forEach(m => {
        summaryMap[m.name] = { price: m.price, qty: 0, total: 0 };
    });

    const detailTbody = document.getElementById('report-detail-table');
    detailTbody.innerHTML = '';

    filtered.forEach(t => {
        totalOmzet += t.total;
        const dateStr = new Date(t.date).toLocaleDateString('id-ID') + ' ' + new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const itemsStr = t.items.map(i => `${i.name} x${i.qty}`).join(', ');

        t.items.forEach(i => {
            totalItemsCount += i.qty;
            if (summaryMap[i.name]) {
                summaryMap[i.name].qty += i.qty;
                summaryMap[i.name].total += (i.price * i.qty);
            }
        });

        detailTbody.innerHTML += `
            <tr>
                <td>${dateStr}</td>
                <td>${t.id}</td>
                <td>${itemsStr}</td>
                <td>${t.method}</td>
                <td>Rp ${t.total.toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    document.getElementById('kpi-total-omzet').innerText = `Rp ${totalOmzet.toLocaleString('id-ID')}`;
    document.getElementById('kpi-total-tx').innerText = `${filtered.length} Nota`;
    document.getElementById('kpi-total-items').innerText = `${totalItemsCount} Porsi`;

    const summaryTbody = document.getElementById('report-summary-table');
    summaryTbody.innerHTML = '';

    let index = 1;
    Object.keys(summaryMap).forEach(menuName => {
        const item = summaryMap[menuName];
        summaryTbody.innerHTML += `
            <tr>
                <td>${index++}</td>
                <td><b>${menuName}</b></td>
                <td>Rp ${item.price.toLocaleString('id-ID')}</td>
                <td>${item.qty} porsi/pcs</td>
                <td><b>Rp ${item.total.toLocaleString('id-ID')}</b></td>
            </tr>
        `;
    });
}