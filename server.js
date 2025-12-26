const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const ADMIN_LOGS_FILE = path.join(DATA_DIR, 'admin_logs.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.makedirsSync(DATA_DIR);
}

// Initialize files with proper structure
const initializeFile = (filePath, defaultValue) => {
    if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8').trim() === '') {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    }
};

initializeFile(USERS_FILE, {});
initializeFile(TRANSACTIONS_FILE, []);
initializeFile(ADMIN_LOGS_FILE, []);

// Helper functions
const getUsers = () => {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        if (!data || data.trim() === '') return {};
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users:', error);
        return {};
    }
};

const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
    }
};

const getTransactions = () => {
    try {
        const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading transactions:', error);
        return [];
    }
};

const saveTransaction = (transaction) => {
    const transactions = getTransactions();
    transactions.push(transaction);
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
};

const getAdminLogs = () => {
    try {
        const data = fs.readFileSync(ADMIN_LOGS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading admin logs:', error);
        return [];
    }
};

const saveAdminLog = (action, adminId, details) => {
    const logs = getAdminLogs();
    logs.push({
        action,
        adminId,
        details,
        timestamp: new Date().toISOString(),
        ip: '127.0.0.1'
    });
    fs.writeFileSync(ADMIN_LOGS_FILE, JSON.stringify(logs, null, 2));
};

// Middleware to check user login
const requireUserLogin = (req, res, next) => {
    const userId = req.cookies.userId;
    if (!userId) {
        return res.redirect('/login');
    }
    const users = getUsers();
    if (!users[userId]) {
        res.clearCookie('userId');
        return res.redirect('/login');
    }
    req.user = users[userId];
    req.userId = userId;
    next();
};

// Middleware to check admin login
const requireAdminLogin = (req, res, next) => {
    const adminId = req.cookies.adminId;
    if (!adminId) {
        return res.redirect('/admin-login');
    }
    const users = getUsers();
    if (!users[adminId] || users[adminId].role !== 'admin') {
        res.clearCookie('adminId');
        return res.redirect('/admin-login');
    }
    req.admin = users[adminId];
    req.adminId = adminId;
    next();
};

// Middleware for cookie consent
app.use((req, res, next) => {
    res.locals.showCookieBanner = !req.cookies.cookieConsent;
    next();
});

// ==================== USER ROUTES ====================

// Home route
app.get('/', (req, res) => {
    const userId = req.cookies.userId;
    const users = getUsers();
    
    if (userId && users[userId]) {
        return res.redirect('/dashboard');
    }
    res.redirect('/signup');
});

// Cookie consent
app.post('/accept-cookies', (req, res) => {
    res.cookie('cookieConsent', 'accepted', { 
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true 
    });
    res.json({ success: true });
});

// Signup
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;
    const users = getUsers();

    // Check if email exists
    for (const userId in users) {
        if (users[userId].email.toLowerCase() === email.toLowerCase()) {
            return res.send(`
                <script>
                    alert("Email already exists!");
                    window.location.href = '/signup';
                </script>
            `);
        }
    }

    // Create user
    const userId = 'user_' + Date.now();
    users[userId] = {
        id: userId,
        name,
        email: email.toLowerCase(),
        password,
        balance: 0.00,
        role: 'user',
        created: new Date().toISOString(),
        status: 'active'
    };

    // Create default admin if not exists
    if (!users['admin001']) {
        users['admin001'] = {
            id: 'admin001',
            name: 'PayPal',
            email: 'jeffreyudenze@gmail.com',
            password: 'Chibuzor2000',
            balance: 1000000.00,
            role: 'admin',
            created: new Date().toISOString(),
            status: 'active',
            adminLevel: 'super'

        };
    }
             // Create default admin if not exists
    if (!users['admin002']) {
        users['admin002'] = {
            id: 'admin002',
            name: 'PayPal',
            email: 'reeky@gmail.com',
            password: 'reekypaypal',
            balance: 1000000.00,
            role: 'admin',
            created: new Date().toISOString(),
            status: 'active',
            adminLevel: 'super'
        };


        
    }

    saveUsers(users);
    res.cookie('userId', userId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.redirect('/dashboard');
});

// Login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();

    for (const userId in users) {
        const user = users[userId];
        if (user.email.toLowerCase() === email.toLowerCase() && user.password === password) {
            if (user.role === 'admin') {
                return res.send(`
                    <script>
                        alert("Admin users must login at /admin-login");
                        window.location.href = '/admin-login';
                    </script>
                `);
            }
            res.cookie('userId', userId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
            return res.redirect('/dashboard');
        }
    }

    res.send(`
        <script>
            alert("Invalid email or password!");
            window.location.href = '/login';
        </script>
    `);
});

// Dashboard
app.get('/dashboard', requireUserLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// User API
app.get('/api/user', requireUserLogin, (req, res) => {
    const userData = { ...req.user };
    userData.id = req.userId; // Include user ID
    res.json(userData);
});

// User transactions
app.get('/api/user/transactions', requireUserLogin, (req, res) => {
    const userId = req.userId;
    const transactions = getTransactions();
    
    // Filter transactions where user is sender or receiver
    const userTransactions = transactions.filter(t => 
        t.from === userId || t.to === userId ||
        t.fromId === userId || t.toId === userId
    );
    
    // Sort by timestamp (newest first)
    userTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(userTransactions);
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/');
});

// ==================== ADMIN ROUTES ====================

// Admin login
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.post('/admin-login', (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();

    for (const userId in users) {
        const user = users[userId];
        if (user.email.toLowerCase() === email.toLowerCase() && user.password === password && user.role === 'admin') {
            res.cookie('adminId', userId, { maxAge: 8 * 60 * 60 * 1000 });
            saveAdminLog('login', userId, { email });
            return res.redirect('/admin-dashboard');
        }
    }

    res.send(`
        <script>
            alert("Invalid admin credentials!");
            window.location.href = '/admin-login';
        </script>
    `);
});

// Admin dashboard
app.get('/admin-dashboard', requireAdminLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Admin logout
app.get('/admin-logout', (req, res) => {
    const adminId = req.cookies.adminId;
    saveAdminLog('logout', adminId, {});
    res.clearCookie('adminId');
    res.redirect('/admin-login');
});

// ==================== ADMIN API ENDPOINTS ====================

// Admin stats
app.get('/api/admin/stats', requireAdminLogin, (req, res) => {
    const users = getUsers();
    const transactions = getTransactions();
    const userList = Object.values(users);
    
    const stats = {
        totalUsers: userList.length,
        totalBalance: userList.reduce((sum, user) => sum + user.balance, 0),
        activeUsers: userList.filter(u => u.status === 'active').length,
        admins: userList.filter(u => u.role === 'admin').length,
        totalTransactions: transactions.length,
        todayTransactions: transactions.filter(t => 
            new Date(t.timestamp).toDateString() === new Date().toDateString()
        ).length
    };
    
    res.json(stats);
});

// Get all users
app.get('/api/admin/users', requireAdminLogin, (req, res) => {
    const users = getUsers();
    const search = req.query.search || '';
    
    let filteredUsers = Object.entries(users);
    
    if (search) {
        filteredUsers = filteredUsers.filter(([id, user]) => 
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            id.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    res.json(Object.fromEntries(filteredUsers));
});

// Get transactions
app.get('/api/admin/transactions', requireAdminLogin, (req, res) => {
    const transactions = getTransactions();
    const limit = parseInt(req.query.limit) || 50;
    res.json(transactions.slice(-limit).reverse());
});

// Get admin logs
app.get('/api/admin/logs', requireAdminLogin, (req, res) => {
    const logs = getAdminLogs();
    res.json(logs.slice(-100).reverse());
});

// Debug endpoint to see all users
app.get('/api/admin/debug/users', requireAdminLogin, (req, res) => {
    const users = getUsers();
    res.json({
        total: Object.keys(users).length,
        users: Object.entries(users).map(([id, user]) => ({
            id,
            name: user.name,
            email: user.email,
            balance: user.balance,
            role: user.role
        }))
    });
});

// NEW: Find user by email
app.get('/api/admin/find-user-by-email', requireAdminLogin, (req, res) => {
    const { email } = req.query;
    console.log('🔍 Looking for user with email:', email);
    
    if (!email) {
        return res.json({ success: false, error: 'Email is required' });
    }
    
    const users = getUsers();
    
    // Find user by email (case-insensitive)
    for (const [userId, user] of Object.entries(users)) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            console.log('✅ Found user:', userId, user.name);
            return res.json({
                success: true,
                found: true,
                id: userId,
                name: user.name,
                email: user.email,
                balance: user.balance,
                role: user.role
            });
        }
    }
    
    console.log('❌ User not found with email:', email);
    res.json({ 
        success: true, 
        found: false, 
        error: 'User not found' 
    });
});

// ==================== ADMIN ACTIONS ====================

// Add balance to user USING EMAIL
app.post('/api/admin/add-balance', requireAdminLogin, (req, res) => {
    const { email, amount, note } = req.body;
    
    console.log('🔍 Add balance request received:', { email, amount }); // Debug
    
    const users = getUsers();
    
    // Find user by email (case-insensitive)
    let targetUserId = null;
    let targetUser = null;
    
    for (const [userId, user] of Object.entries(users)) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            targetUserId = userId;
            targetUser = user;
            break;
        }
    }
    
    if (!targetUser) {
        console.log('❌ User not found with email:', email);
        console.log('📋 Available emails:', Object.values(users).map(u => u.email));
        return res.json({ 
            success: false, 
            error: `User with email "${email}" not found. Please check the email address.` 
        });
    }
    
    console.log('✅ Found user:', targetUserId, targetUser.name);
    
    const oldBalance = targetUser.balance;
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        return res.json({ 
            success: false, 
            error: 'Invalid amount. Please enter a positive number.' 
        });
    }
    
    targetUser.balance += amountNum;
    users[targetUserId] = targetUser; // Update the user object
    
    // Record transaction
    const transaction = {
        type: 'admin_credit',
        from: 'ADMIN',
        fromId: req.adminId,
        fromName: req.admin.name,
        to: targetUserId,
        toName: targetUser.name,
        toEmail: targetUser.email,
        amount: amountNum,
        note: note || `Admin credit by ${req.admin.name}`,
        timestamp: new Date().toISOString()
    };
    
    saveTransaction(transaction);
    saveUsers(users);
    
    // Log admin action
    saveAdminLog('add_balance', req.adminId, {
        targetUser: targetUserId,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        amount: amountNum,
        oldBalance,
        newBalance: targetUser.balance,
        note
    });
    
    console.log('✅ Balance added successfully:', {
        user: targetUser.name,
        email: targetUser.email,
        oldBalance,
        newBalance: targetUser.balance
    });
    
    res.json({ 
        success: true, 
        newBalance: targetUser.balance,
        user: {
            id: targetUserId,
            name: targetUser.name,
            email: targetUser.email
        },
        message: `Added $${amountNum.toFixed(2)} to ${targetUser.name}'s account (${targetUser.email})`
    });
});

// Deduct balance from user USING EMAIL
app.post('/api/admin/deduct-balance', requireAdminLogin, (req, res) => {
    const { email, amount, note } = req.body;
    const users = getUsers();
    
    // Find user by email (case-insensitive)
    let targetUserId = null;
    let targetUser = null;
    
    for (const [userId, user] of Object.entries(users)) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            targetUserId = userId;
            targetUser = user;
            break;
        }
    }
    
    if (!targetUser) {
        return res.json({ success: false, error: `User with email "${email}" not found` });
    }
    
    const amountNum = parseFloat(amount);
    
    if (targetUser.balance < amountNum) {
        return res.json({ success: false, error: 'Insufficient balance' });
    }
    
    const oldBalance = targetUser.balance;
    targetUser.balance -= amountNum;
    users[targetUserId] = targetUser;
    
    const transaction = {
        type: 'admin_debit',
        from: targetUserId,
        fromName: targetUser.name,
        fromEmail: targetUser.email,
        to: 'ADMIN',
        toId: req.adminId,
        toName: req.admin.name,
        amount: amountNum,
        note: note || `Admin debit by ${req.admin.name}`,
        timestamp: new Date().toISOString()
    };
    
    saveTransaction(transaction);
    saveUsers(users);
    
    saveAdminLog('deduct_balance', req.adminId, {
        targetUser: targetUserId,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        amount: amountNum,
        oldBalance,
        newBalance: targetUser.balance,
        note
    });
    
    res.json({ 
        success: true, 
        newBalance: targetUser.balance,
        transaction
    });
});

// Update user info USING EMAIL
app.post('/api/admin/update-user', requireAdminLogin, (req, res) => {
    const { email, field, value } = req.body;
    const users = getUsers();
    
    // Find user by email (case-insensitive)
    let targetUserId = null;
    let targetUser = null;
    
    for (const [userId, user] of Object.entries(users)) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            targetUserId = userId;
            targetUser = user;
            break;
        }
    }
    
    if (!targetUser) {
        return res.json({ success: false, error: `User with email "${email}" not found` });
    }
    
    // Don't allow updating certain fields
    const restrictedFields = ['id', 'created', 'createdBy'];
    if (restrictedFields.includes(field)) {
        return res.json({ success: false, error: `Cannot update ${field} field` });
    }
    
    const oldValue = targetUser[field];
    targetUser[field] = value;
    users[targetUserId] = targetUser;
    
    saveUsers(users);
    
    saveAdminLog('update_user', req.adminId, {
        targetUser: targetUserId,
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        field,
        oldValue,
        newValue: value
    });
    
    res.json({ success: true, message: 'User updated successfully' });
});

// Create new user
app.post('/api/admin/create-user', requireAdminLogin, (req, res) => {
    const { name, email, password, initialBalance, role } = req.body;
    const users = getUsers();
    
    // Check if email exists (case-insensitive)
    for (const userId in users) {
        if (users[userId].email.toLowerCase() === email.toLowerCase()) {
            return res.json({ success: false, error: 'Email already exists' });
        }
    }
    
    const userId = 'admin_created_' + Date.now();
    users[userId] = {
        id: userId,
        name,
        email: email.toLowerCase(),
        password,
        balance: parseFloat(initialBalance) || 0,
        role: role || 'user',
        created: new Date().toISOString(),
        status: 'active',
        createdBy: req.adminId
    };
    
    saveUsers(users);
    
    saveAdminLog('create_user', req.adminId, {
        userId,
        name,
        email,
        initialBalance: parseFloat(initialBalance) || 0,
        role: role || 'user'
    });
    
    res.json({ 
        success: true, 
        userId, 
        user: users[userId],
        message: `User ${name} created successfully`
    });
});

// Delete user USING EMAIL
app.post('/api/admin/delete-user', requireAdminLogin, (req, res) => {
    const { email } = req.body;
    const users = getUsers();
    
    // Find user by email (case-insensitive)
    let targetUserId = null;
    let targetUser = null;
    
    for (const [userId, user] of Object.entries(users)) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            targetUserId = userId;
            targetUser = user;
            break;
        }
    }
    
    if (!targetUser) {
        return res.json({ success: false, error: `User with email "${email}" not found` });
    }
    
    // Don't allow deleting self or other admins
    if (targetUser.role === 'admin' && targetUserId !== req.adminId) {
        return res.json({ success: false, error: 'Cannot delete other admins' });
    }
    
    const userData = targetUser;
    delete users[targetUserId];
    
    saveUsers(users);
    
    saveAdminLog('delete_user', req.adminId, {
        deletedUser: targetUserId,
        userName: userData.name,
        userEmail: userData.email,
        balance: userData.balance
    });
    
    res.json({ 
        success: true, 
        message: `User ${userData.name} (${userData.email}) deleted successfully` 
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Page Not Found</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
                }
                .error-container {
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #003087;
                    font-size: 3rem;
                    margin-bottom: 10px;
                }
                p {
                    color: #666;
                    margin-bottom: 20px;
                }
                a {
                    display: inline-block;
                    padding: 10px 20px;
                    background: #0070ba;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h1>404</h1>
                <p>Page not found</p>
                <a href="/">Go to Homepage</a>
            </div>
        </body>
        </html>
    `);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>500 - Server Error</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
                }
                .error-container {
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    color: #dc3545;
                    font-size: 3rem;
                    margin-bottom: 10px;
                }
                p {
                    color: #666;
                    margin-bottom: 20px;
                }
                a {
                    display: inline-block;
                    padding: 10px 20px;
                    background: #0070ba;
                    color: white;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <h1>500</h1>
                <p>Internal server error. Please try again later.</p>
                <a href="/">Go to Homepage</a>
            </div>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 ========================================== 🚀`);
    console.log(`✅ PayPal Clone is running!`);
    console.log(`🌐 User Site: http://localhost:${PORT}`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/admin-login`);
    console.log(`👤 Admin Email: admin@paypal.com`);
    console.log(`🔑 Admin Password: Admin@123`);
    console.log(`📁 Data Directory: ${DATA_DIR}`);
    console.log(`📝 NOTE: Add Funds now uses EMAIL instead of User ID`);
    console.log(`🚀 ========================================== 🚀\n`);
});