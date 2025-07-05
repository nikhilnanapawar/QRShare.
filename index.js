const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

const USERS = path.join(__dirname, 'users.json');
const SESSIONS = path.join(__dirname, 'sessions.json');
const uploadDir = path.join(__dirname, '../uploads');

// Ensure directories and files exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(USERS)) fs.writeFileSync(USERS, JSON.stringify([]));
if (!fs.existsSync(SESSIONS)) fs.writeFileSync(SESSIONS, JSON.stringify({}));

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const safeReadJson = (filepath, fallback = []) => {
  try {
    const raw = fs.readFileSync(filepath).toString().trim();
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// ✅ Shared Meta Writer
const writeSharedMeta = () => {
  const all = fs.readdirSync(uploadDir)
    .filter(f => f.endsWith('.json') && f !== 'shared-meta.json')
    .map(f => {
      const meta = safeReadJson(path.join(uploadDir, f));
      return {
        name: meta.originalName || f,
        createdAt: meta.createdAt || new Date().toISOString(),
        downloadUrl: meta.fileUrl || ''
      };
    });

  fs.writeFileSync(path.join(uploadDir, 'shared-meta.json'), JSON.stringify({ files: all }, null, 2));
};

// ✅ SIGNUP
app.post('/signup', (req, res) => {
  const { name, email, username, password } = req.body;
  if (!name || !email || !username || !password)
    return res.status(400).json({ error: 'All fields are required' });

  const users = safeReadJson(USERS, []);
  if (users.find(u => u.username === username))
    return res.status(409).json({ error: 'User already exists' });

  const hashed = bcrypt.hashSync(password, 10);
  users.push({ name, email, username, password: hashed });
  fs.writeFileSync(USERS, JSON.stringify(users, null, 2));

  res.json({ success: true, message: 'Signup successful' });
});

// ✅ LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = safeReadJson(USERS, []);
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid username' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  const token = Date.now().toString(36);
  const sessions = safeReadJson(SESSIONS, {});
  sessions[token] = username;
  fs.writeFileSync(SESSIONS, JSON.stringify(sessions, null, 2));

  res.json({ success: true, token });
});

// ✅ UPLOAD
app.post('/upload', upload.single('file'), async (req, res) => {
  const { password } = req.body;
  const file = req.file;
  if (!file || !password) return res.status(400).json({ error: 'File and password required' });

  const docId = Date.now().toString(36);
  const fileUrl = `http://localhost:${PORT}/uploads/${file.filename}`;
  const qrPageUrl = `http://localhost:${PORT}/shared.html`;
  const passwordHash = await bcrypt.hash(password, 10);

  const meta = {
    fileUrl,
    passwordHash,
    originalName: file.originalname,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(`${uploadDir}/${docId}.json`, JSON.stringify(meta));
  writeSharedMeta();

  const qr = await QRCode.toDataURL(qrPageUrl);
  res.json({ qrPageUrl, qr });
});

// ✅ DELETE FILE
app.delete('/files/:docId', (req, res) => {
  const { docId } = req.params;
  const metaPath = path.join(uploadDir, `${docId}.json`);

  if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'File not found' });

  const meta = safeReadJson(metaPath);
  const fileName = meta.fileUrl?.split('/').pop();
  const filePath = path.join(uploadDir, fileName || '');

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  fs.unlinkSync(metaPath);
  writeSharedMeta();

  res.json({ success: true });
});

// ✅ RENAME FILE
app.post('/files/:docId/rename', (req, res) => {
  const { docId } = req.params;
  const { newName } = req.body;

  const metaPath = path.join(uploadDir, `${docId}.json`);
  if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'File not found' });

  const meta = safeReadJson(metaPath);
  meta.originalName = newName;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  writeSharedMeta();

  res.json({ success: true });
});

// ✅ LIST FILES
app.get('/files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter(file => file.endsWith('.json') && file !== 'shared-meta.json')
      .map(file => {
        const metaPath = path.join(uploadDir, file);
        const data = safeReadJson(metaPath);
        const docId = path.basename(file, '.json');

        return {
          docId,
          name: data.originalName || 'Unnamed File',
          createdAt: data.createdAt || null,
          qrUrl: `http://localhost:${PORT}/shared.html`,
          downloadUrl: data.fileUrl || ''
        };
      });

    res.json({ files });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Failed to load files' });
  }
});

// ✅ CONTACT
app.post('/contact', async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message)
    return res.status(400).json({ error: 'Email and message required' });

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'np876093@gmail.com',
        pass: 'etkb xwts oqsu hjxy'
      }
    });

    await transporter.sendMail({
      from: 'QR DocShare <np876093@gmail.com>',
      to: 'np876093@gmail.com',
      subject: 'New Contact Message from QR DocShare',
      text: `From: ${email}\n\n${message}`,
      replyTo: email
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ✅ TEST EMAIL
app.get('/test-email', async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'np876093@gmail.com',
        pass: 'etkb xwts oqsu hjxy'
      }
    });

    await transporter.sendMail({
      from: 'np876093@gmail.com',
      to: 'np876093@gmail.com',
      subject: 'Test Email from QR DocShare',
      text: 'This is a test email.'
    });

    res.send('✅ Test email sent successfully!');
  } catch (err) {
    console.error('❌ Email send error:', err);
    res.status(500).send('❌ Failed to send test email');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
