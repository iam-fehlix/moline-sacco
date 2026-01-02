const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // cb(null, path.resolve(__dirname, 'uploads/'));
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

// Middleware for handling single file upload
const uploadSingle = (fieldName) => multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/; 
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG,PDF and PNG files are allowed.'));
        }
    }
}).single(fieldName);

// Middleware for handling multiple file uploads
const uploadFields = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG files are allowed.'));
        }
    }
}).fields([
    { name: 'id_image', maxCount: 1 },
    { name: 'proofOfOwnership', maxCount: 1 },
    { name: 'passportPhoto', maxCount: 1 }
]);

module.exports = { uploadSingle, uploadFields };