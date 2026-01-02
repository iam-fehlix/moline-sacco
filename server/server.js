const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');

dotenv.config();

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const matatuRoutes = require('./routes/matatuRoutes');
const financeRoutes = require('./routes/financeRoutes');
const roleRoutes = require('./routes/roleRoutes');
const reportRoutes = require('./routes/reportRoutes');
const staffRoutes = require('./routes/staffRoutes');

const app = express();
const port = process.env.PORT || 5000;
const secretKey = process.env.JWT_SECRET || 'Vv2N9SCG8RncrDGvfOYlFkaRpm25MA3mRaSCtjPcke4=';

const sessionStore = new MySQLStore({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'matis'
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    key: 'my_app_session',
    secret: secretKey,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 1 * 1, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' 
    }
}));

const corsOptions = {
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/matatus', matatuRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// Start the server
app.listen(port, '0.0.0.0', () => console.log(`Server running at http://localhost:${port}`));
