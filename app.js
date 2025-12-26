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

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(TRANSACTIONS_FILE)) {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify([]));
}

// Helper functions to read and write data
const getUsers = () => {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
};

const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const getTransactions = () => {
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data);
};

const saveTransaction = (transaction) => {
    const transactions = getTransactions();
    transactions.push(transaction);
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
};

// Middleware to check login
const requireLogin = (req, res, next) => {
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

// Middleware to check admin
const requireAdmin = (req, res, next) => {
    const userId = req.cookies.userId;
    if (!userId) {
        return res.redirect('/login');
    }
    const users = getUsers();
    const user = users[userId];
    if (!user || user.role !== 'admin') {
        return res.redirect('/login');
    }
    req.user = user;
    req.userId = userId;
    next();
};

// Routes
app.get('/', (req, res) => {
    const cookieConsent = req.cookies.cookieConsent;
    const userId = req.cookies.userId;

    if (!cookieConsent) {
        return res.redirect('/cookie-consent');
    }

    if (userId) {
        const users = getUsers();
        if (users[userId]) {
            return res.redirect('/dashboard');
        }
    }

    res.redirect('/signup');
});

app.get('/cookie-consent', (req, res) => {
    res.render('cookie-consent');
});

app.post('/cookie-consent', (req, res) => {
    res.cookie('cookieConsent', 'accepted', { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.redirect('/');
});

app.get('/signup', (req, res) => {
    const cookieConsent = req.cookies.cookieConsent;
    if (!cookieConsent) {
        return res.redirect('/cookie-consent');
    }
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    const users = getUsers();

    // Check if email already exists
    for (const userId in users) {
        if (users[userId].email === email) {
            return res.send('Email already exists!');
        }
    }

    // Create new user
    const userId = Date.now().toString(); // simple ID generation
    users[userId] = {
        name,
        email,
        password, // In a real app, hash the password!
        balance: 100.00,
        role: 'user'
    };

    // Create admin user if not exists
    if (!users.admin123) {
        users.admin123 = {
            name: 'Admin',
            email: 'admin@paypal.com',
            password: 'admin123',
            balance: 10000.00,
            role: 'admin'
        };
    }

    saveUsers(users);

    res.cookie('userId', userId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.redirect('/dashboard');
});

app.get('/login', (req, res) => {
    const cookieConsent = req.cookies.cookieConsent;
    if (!cookieConsent) {
        return res.redirect('/cookie-consent');
    }
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const users = getUsers();

    for (const userId in users) {
        const user = users[userId];
        if (user.email === email && user.password === password) {
            res.cookie('userId', userId, { maxAge: 30 * 24 * 60 * 60 * 1000 });
            return res.redirect('/dashboard');
        }
    }

    res.send('Invalid email or password!');
});

app.get('/dashboard', requireLogin, (req, res) => {
    res.render('dashboard', { user: req.user });
});

app.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/');
});

app.get('/admin', requireAdmin, (req, res) => {
    const users = getUsers();
    res.render('admin', { users });
});

app.post('/admin/add-balance', requireAdmin, (req, res) => {
    const { userId, amount } = req.body;

    const users = getUsers();

    if (users[userId]) {
        users[userId].balance += parseFloat(amount);

        // Record transaction
        saveTransaction({
            type: 'admin_add',
            from: 'ADMIN',
            to: userId,
            amount: parseFloat(amount),
            timestamp: new Date().toISOString()
        });

        saveUsers(users);

        res.json({ success: true, newBalance: users[userId].balance });
    } else {
        res.json({ success: false, error: 'User not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});