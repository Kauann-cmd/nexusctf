/* ========================================
   NEXUS HARDWARE - Application Logic
======================================== */

// State
const API_URL = '';
let currentUser = null;
let sessionId = localStorage.getItem('sessionId');
let products = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadProducts();
    setupCategoryFilters();
});

// ============================================
// SESSION MANAGEMENT
// ============================================

async function checkSession() {
    if (!sessionId) {
        updateUIForGuest();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/session/${sessionId}`);
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            updateUIForUser(currentUser);
        } else {
            localStorage.removeItem('sessionId');
            sessionId = null;
            updateUIForGuest();
        }
    } catch (error) {
        updateUIForGuest();
    }
}

function updateUIForGuest() {
    document.getElementById('auth-buttons').classList.remove('hidden');
    document.getElementById('user-menu').classList.add('hidden');
    document.querySelector('.admin-link').classList.remove('visible');
}

function updateUIForUser(user) {
    document.getElementById('auth-buttons').classList.add('hidden');
    document.getElementById('user-menu').classList.remove('hidden');
    document.getElementById('nav-user-name').textContent = user.name;

    if (user.role === 'admin') {
        document.querySelector('.admin-link').classList.add('visible');
    } else {
        document.querySelector('.admin-link').classList.remove('visible');
    }
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function showView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) {
            link.classList.add('active');
        }
    });

    window.scrollTo(0, 0);

    switch(viewName) {
        case 'home':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'admin':
            if (currentUser?.role === 'admin') {
                loadAdminData();
            } else {
                showToast('Access denied', 'error');
                showView('login');
            }
            break;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('login-message');

    messageEl.className = 'form-message';
    messageEl.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            sessionId = data.sessionId;
            currentUser = data.user;
            localStorage.setItem('sessionId', sessionId);

            messageEl.textContent = 'Login successful';
            messageEl.className = 'form-message success';
            messageEl.style.display = 'block';

            showToast(`Welcome, ${currentUser.name}`, 'success');
            updateUIForUser(currentUser);

            setTimeout(() => showView('home'), 800);
        } else {
            messageEl.textContent = data.message;
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        messageEl.textContent = 'Connection error';
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const messageEl = document.getElementById('register-message');

    messageEl.className = 'form-message';
    messageEl.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            sessionId = data.sessionId;
            currentUser = data.user;
            localStorage.setItem('sessionId', sessionId);

            messageEl.textContent = 'Account created successfully';
            messageEl.className = 'form-message success';
            messageEl.style.display = 'block';

            showToast(`Welcome to NEXUS, ${currentUser.name}!`, 'success');
            updateUIForUser(currentUser);

            setTimeout(() => showView('home'), 800);
        } else {
            messageEl.textContent = data.message;
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        messageEl.textContent = 'Connection error';
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    } catch (error) {}

    localStorage.removeItem('sessionId');
    sessionId = null;
    currentUser = null;
    updateUIForGuest();
    showView('home');
    showToast('Signed out successfully', 'success');
}

// ============================================
// PRODUCTS
// ============================================

async function loadProducts(category = 'all') {
    const grid = document.getElementById('products-grid');
    
    try {
        const url = category === 'all' 
            ? `${API_URL}/api/products` 
            : `${API_URL}/api/products?category=${category}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            products = data.products;
            grid.innerHTML = data.products.map(product => createProductCard(product)).join('');
        } else {
            grid.innerHTML = '<p class="empty-message">No products found</p>';
        }
    } catch (error) {
        grid.innerHTML = '<p class="empty-message">Failed to load products</p>';
    }
}

function createProductCard(product) {
    const stockBadge = product.stock <= 5 
        ? `<span class="product-badge low-stock">Only ${product.stock} left</span>`
        : `<span class="product-badge in-stock">In Stock</span>`;
    
    // XSS VULNERABILITY: Description rendered with innerHTML without sanitization
    return `
        <div class="product-card" onclick="openProductModal(${product.id})">
            <div class="product-image-container">
                <img 
                    src="${product.image}" 
                    alt="${product.name}" 
                    class="product-image"
                    onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'"
                >
                ${stockBadge}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-description">${product.description}</div>
                <div class="product-footer">
                    <span class="product-price">$${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); buyProduct(${product.id})">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupCategoryFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadProducts(btn.dataset.category);
        });
    });
}

function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');

    // XSS VULNERABILITY: Description rendered without sanitization
    modalBody.innerHTML = `
        <div class="modal-product">
            <img src="${product.image}" alt="${product.name}" class="modal-product-image" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'">
            <div class="modal-product-info">
                <h2>${product.name}</h2>
                <div class="description">${product.description}</div>
                <div class="price">$${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div class="meta">
                    <span>Category: ${product.category}</span>
                    <span>Stock: ${product.stock} units</span>
                </div>
                <button class="btn btn-primary btn-lg btn-full" onclick="buyProduct(${product.id}); closeModal();">
                    Add to Cart — $${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('product-modal').classList.remove('active');
    document.body.style.overflow = '';
}

async function buyProduct(productId) {
    if (!currentUser) {
        showToast('Please sign in to purchase', 'warning');
        showView('login');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });

        const data = await response.json();

        if (data.success) {
            showToast(`Order #${data.orderId} placed successfully!`, 'success');
            loadProducts();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to place order', 'error');
    }
}

// ============================================
// ORDERS
// ============================================

async function loadOrders() {
    const ordersList = document.getElementById('orders-list');

    if (!currentUser) {
        ordersList.innerHTML = '<p class="empty-message">Please sign in to view your orders</p>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/orders`, {
            headers: { 'X-Session-Id': sessionId }
        });

        const data = await response.json();

        if (data.success && data.orders.length > 0) {
            ordersList.innerHTML = data.orders.map(order => createOrderCard(order)).join('');
        } else {
            ordersList.innerHTML = '<p class="empty-message">No orders yet</p>';
        }
    } catch (error) {
        ordersList.innerHTML = '<p class="empty-message">Failed to load orders</p>';
    }
}

function createOrderCard(order) {
    const date = new Date(order.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    return `
        <div class="order-card">
            <div class="order-info">
                <h4>Order #${order.id}</h4>
                <p>${order.product_name} × ${order.quantity}</p>
                <p>${date}</p>
            </div>
            <span class="order-status status-${order.status}">${order.status}</span>
            <span class="order-total">$${order.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
        </div>
    `;
}

// IDOR VULNERABILITY: Lookup any order by ID without ownership verification
async function lookupOrder() {
    const orderId = document.getElementById('order-lookup-id').value;
    const detailDiv = document.getElementById('order-detail');

    if (!orderId) {
        showToast('Please enter an order number', 'warning');
        return;
    }

    if (!currentUser) {
        showToast('Please sign in first', 'warning');
        showView('login');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
            headers: { 'X-Session-Id': sessionId }
        });

        const data = await response.json();

        if (data.success) {
            const order = data.order;
            const date = new Date(order.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            detailDiv.innerHTML = `
                <h3>Order Details</h3>
                <div class="order-detail-grid">
                    <div class="order-detail-item">
                        <label>Order ID</label>
                        <span>#${order.id}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Customer ID</label>
                        <span>${order.user_id}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Product</label>
                        <span>${order.product_name}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Quantity</label>
                        <span>${order.quantity}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Total</label>
                        <span>$${order.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Status</label>
                        <span class="order-status status-${order.status}">${order.status}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Date</label>
                        <span>${date}</span>
                    </div>
                    <div class="order-detail-item">
                        <label>Shipping Address</label>
                        <span>${order.shipping_address || 'Not provided'}</span>
                    </div>
                </div>
            `;
            detailDiv.classList.remove('hidden');
        } else {
            detailDiv.classList.add('hidden');
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to lookup order', 'error');
    }
}

// ============================================
// ADMIN
// ============================================

async function loadAdminData() {
    loadAdminStats();
    loadAdminUsers();
    loadAdminOrders();
    loadAdminProducts();
}

async function loadAdminStats() {
    try {
        const response = await fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'X-Session-Id': sessionId }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('stat-users').textContent = data.stats.totalUsers;
            document.getElementById('stat-orders').textContent = data.stats.totalOrders;
            document.getElementById('stat-revenue').textContent = `$${(data.stats.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
            document.getElementById('stat-products').textContent = data.stats.totalProducts;
        }
    } catch (error) {}
}

async function loadAdminUsers() {
    const container = document.getElementById('admin-users');

    try {
        const response = await fetch(`${API_URL}/api/admin/users`, {
            headers: { 'X-Session-Id': sessionId }
        });

        const data = await response.json();

        if (data.success && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="admin-list-item">
                    <div class="info">
                        <strong>${user.name}</strong>
                        <small>${user.email}</small>
                    </div>
                    <span class="order-status status-${user.role === 'admin' ? 'processing' : 'delivered'}">${user.role}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-message">No users found</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="empty-message">Failed to load users</p>';
    }
}

async function loadAdminOrders() {
    const container = document.getElementById('admin-orders');

    try {
        const response = await fetch(`${API_URL}/api/admin/orders`, {
            headers: { 'X-Session-Id': sessionId }
        });

        const data = await response.json();

        if (data.success && data.orders.length > 0) {
            container.innerHTML = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Product</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.orders.map(order => `
                            <tr>
                                <td>#${order.id}</td>
                                <td>${order.user_name || 'Unknown'}</td>
                                <td>${order.product_name}</td>
                                <td>$${order.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                <td><span class="order-status status-${order.status}">${order.status}</span></td>
                                <td>${new Date(order.date).toLocaleDateString('en-US')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = '<p class="empty-message">No orders yet</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="empty-message">Failed to load orders</p>';
    }
}

async function loadAdminProducts() {
    const container = document.getElementById('admin-products');

    try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();

        if (data.success && data.products.length > 0) {
            container.innerHTML = data.products.map(product => `
                <div class="admin-product-card">
                    <h4>${product.name}</h4>
                    <div class="price">$${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div class="stock">Stock: ${product.stock}</div>
                    <button class="btn btn-danger btn-sm btn-full" onclick="deleteProduct(${product.id})">
                        Delete
                    </button>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-message">No products</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="empty-message">Failed to load products</p>';
    }
}

// XSS VULNERABILITY: Product description not sanitized before storage
async function handleAddProduct(event) {
    event.preventDefault();

    const messageEl = document.getElementById('product-message');
    
    const productData = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value) || 10,
        category: document.getElementById('product-category').value,
        image: document.getElementById('product-image').value || ''
    };

    try {
        const response = await fetch(`${API_URL}/api/admin/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Id': sessionId
            },
            body: JSON.stringify(productData)
        });

        const data = await response.json();

        if (data.success) {
            messageEl.textContent = 'Product added successfully';
            messageEl.className = 'form-message success';
            messageEl.style.display = 'block';

            showToast('Product added', 'success');
            document.getElementById('product-form').reset();
            
            loadAdminProducts();
            loadProducts();

            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        } else {
            messageEl.textContent = data.message;
            messageEl.className = 'form-message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        messageEl.textContent = 'Failed to add product';
        messageEl.className = 'form-message error';
        messageEl.style.display = 'block';
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: { 'X-Session-Id': sessionId }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Product deleted', 'success');
            loadAdminProducts();
            loadProducts();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to delete product', 'error');
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
