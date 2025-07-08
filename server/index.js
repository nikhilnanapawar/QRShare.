const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;

const USERS = path.join(__dirname, 'users.json');
const SESSIONS = path.join(__dirname, 'sessions.json');
const uploadDir = path.join(__dirname, '../uploads');

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

app.post('/upload', upload.single('file'), async (req, res) => {
  const { password, userId } = req.body;
  const file = req.file;
  if (!file || !password || !userId) return res.status(400).json({ error: 'File, userId and password required' });

  const docId = Date.now().toString(36);
  const fileUrl = `${BASE}/uploads/${file.filename}`;
  const qrPageUrl = `${BASE}/shared.html?uid=${userId}`;
  const passwordHash = await bcrypt.hash(password, 10);

  const meta = {
    fileUrl,
    passwordHash,
    userId,
    originalName: file.originalname,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(`${uploadDir}/${docId}.json`, JSON.stringify(meta));
  writeSharedMeta();

  const qr = await QRCode.toDataURL(qrPageUrl);
  res.json({ qrPageUrl, qr });
});

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
          userId: data.userId || null,
          qrUrl: `${BASE}/shared.html?uid=${data.userId}`,
          downloadUrl: data.fileUrl || ''
        };
      });

    res.json({ files });
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: 'Failed to load files' });
  }
});

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

app.post('/verify-password', async (req, res) => {
  const { docId, password } = req.body;
  if (!docId || !password)
    return res.status(400).json({ success: false, error: 'docId and password required' });

  const metaPath = path.join(uploadDir, `${docId}.json`);
  if (!fs.existsSync(metaPath))
    return res.status(404).json({ success: false, error: 'File not found' });

  const meta = safeReadJson(metaPath);

  console.log("VERIFY:", {
    docId,
    entered: password,
    stored: meta.passwordHash
  });

  if (!meta.passwordHash) {
    return res.status(400).json({ success: false, error: 'No password hash found' });
  }

  const isValid = await bcrypt.compare(password, meta.passwordHash);
  if (!isValid)
    return res.status(401).json({ success: false, error: 'Invalid password' });

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
