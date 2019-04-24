const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require('method-override');
const morgan = require('morgan');
const mongoURI = "mongodb://xad:xad123456@ds213896.mlab.com:13896/files_upload"

//
// ─── MONGO CONNECT ──────────────────────────────────────────────────────────────
//

const conn = mongoose.createConnection(mongoURI, {
    useNewUrlParser: true
});
let gfs;

conn.once('open', () => {
    // initilise stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
})

// Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({ storage });

//
// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────────
//

// view engine
app.set('view engine', 'ejs');
// body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// method override
app.use(methodOverride('_method'));
// morgan
app.use(morgan("dev"));



// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            res.render('index', { files: false })
        } else {
            files.map((file) => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    file.isImage = true
                } else {
                    file.isImage = false
                }
            });
            res.render('index', { files: files });
        }
    })
})

// @route POST/upload
// @desc Uploads file to db
app.post('/upload', upload.single("file"), (req, res) => {
    // res.json({ file: req.file })
    res.redirect('/');
})

// @route GET/files
// @desc Display all files in JSON
app.get("/files", (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: "No files exist"
            });
        }
        return res.json(files)
    })
})

// @route GET/files/:filename
// @desc Display one file in JSON
app.get("/files/:filename", (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if files
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: "No file exist"
            });
        }
        return res.json(file)
    })
})

// @route GET/files/:filename
// @desc Display image
app.get("/image/:filename", (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if files
        if (!file || file.length === 0) {
            console.log('nesto nije u redu');
            return res.status(404).json({
                err: "No file exist"
            });
        }

        // Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === "image/png") {
            // Read output to browser
            const readstrem = gfs.createReadStream(file.filename);
            readstrem.pipe(res);
        } else {
            res.status(404).json({
                err: "Not an image"
            })
        };
    });
});

// @route DELETE /files/:id
// @desc DELETE file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err });
        } else {
            res.redirect('/');
        }
    })
})

const port = 5000;

app.listen(port, () => {
    console.log(`Server started on port ${port}`);

})