const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(express.json());

// Enable CORS and bypass tunnel warning headers for all mobile browsers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-role, x-user-phone, x-user-username, x-user-name, bypass-tunnel-reminder');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Bypass-Tunnel-Reminder', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend files
app.use(express.static(__dirname));

// Custom mock session parser from headers
app.use((req, res, next) => {
  req.user = {
    role: req.headers['x-user-role'] || null,
    phone: req.headers['x-user-phone'] || null,
    username: req.headers['x-user-username'] || null,
    name: req.headers['x-user-name'] || null
  };
  next();
});

// Helper functions for reading/writing JSON DB
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB = {
      center_info: {
        name: "Baby Massage Center",
        branches: 1,
        phone: "+998 99 879 06 76",
        address: "Yangi hayot tumani, Sputnik 16a, 25-uy",
        hours: "Dushanba — Shanba 08:00 — 18:00"
      },
      users: [
        { role: 'admin', username: 'admin', password: 'admin123', name: 'Administrator' },
        { role: 'worker', username: 'shaxnoza', password: '12345', name: 'Shaxnoza' },
        { role: 'worker', username: 'nilufar', password: '12345', name: 'Nilufar' },
        { role: 'worker', username: 'yulduz', password: '12345', name: 'Yulduz' },
        { role: 'worker', username: 'dilafruz', password: '12345', name: 'Dilafruz' },
        { role: 'client', name: 'Mijoz', phone: '+998901234567', password: '12345' }
      ],
      services: [
        { id: "c1", name: "2 oydan — 1 yoshgacha", price: 70000, category: "children", image: "assets/images/c1.png" },
        { id: "c2", name: "1 yoshdan — 3 yoshgacha", price: 80000, category: "children", image: "assets/images/c2.png" },
        { id: "c3", name: "4 yoshdan — 6 yoshgacha", price: 90000, category: "children", image: "assets/images/c3.png" },
        { id: "c4", name: "6 yoshdan — 9 yoshgacha", price: 100000, category: "children", image: "assets/images/c4.png" },
        { id: "c5", name: "Parafin", price: 15000, category: "children", image: "assets/images/c5.png" },
        { id: "c6", name: "Elektrofarez", price: 15000, category: "children", image: "assets/images/c6.png" },
        { id: "c7", name: "Gidrovanna", price: 70000, category: "children", image: "assets/images/c7.png" },
        { id: "w1", name: "Boshdan belgacha", price: 80000, category: "women", image: "assets/images/w1.png" },
        { id: "w2", name: "Oyoqlar", price: 80000, category: "women", image: "assets/images/w2.png" },
        { id: "w3", name: "Obshiy massaj", price: 200000, category: "women", image: "assets/images/w3.png" },
        { id: "w4", name: "Bosh massaj", price: 80000, category: "women", image: "assets/images/w4.png" },
        { id: "w5", name: "Bankali massaj", price: 80000, category: "women", image: "assets/images/w5.png" },
        { id: "w6", name: "Ozdiruvchi massaj", price: 200000, category: "women", image: "assets/images/w6.png" }
      ],
      bookings: [
        {
          id: "b_1",
          clientName: "Mijoz",
          clientPhone: "+998901234567",
          serviceName: "2 oydan — 1 yoshgacha",
          price: 70000,
          date: new Date().toISOString().split('T')[0],
          time: "09:00",
          workerName: "Malika",
          comment: "Birinchi marta kelishi",
          status: "confirmed"
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf8');
    return defaultDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database.json, resetting to prevent crash:", err);
    return {};
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// Remove bookings older than 10 days
function cleanOldBookings(db) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 10);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const before = db.bookings.length;
  db.bookings = db.bookings.filter(b => b.date >= cutoffStr);
  if (db.bookings.length !== before) {
    saveDB(db);
    console.log(`Cleaned ${before - db.bookings.length} old bookings (older than ${cutoffStr})`);
  }
  return db;
}

// ---------------- REST API ENDPOINTS ----------------

// 1. Center info
app.get('/api/info', (req, res) => {
  const db = getDB();
  res.json(db.center_info || {});
});

app.post('/api/info', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Ruxsat etilmagan! Faqat admin uchun." });
  }
  const db = getDB();
  db.center_info = req.body;
  saveDB(db);
  res.json({ success: true, center_info: db.center_info });
});

// 2. Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, phone, password, isStaff } = req.body;
  const db = getDB();
  const users = db.users || [];

  if (isStaff) {
    const staff = users.find(u => 
      (u.role === 'worker' || u.role === 'admin') && 
      u.username.toLowerCase() === username.toLowerCase() && 
      u.password === password
    );
    if (staff) {
      return res.json({ success: true, user: staff });
    }
  } else {
    const client = users.find(u => 
      u.role === 'client' && 
      (u.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')) && 
      u.password === password
    );
    if (client) {
      return res.json({ success: true, user: client });
    }
  }
  res.status(401).json({ error: "Login yoki parol noto'g'ri!" });
});

app.post('/api/auth/register', (req, res) => {
  const { name, phone, password } = req.body;
  const db = getDB();
  const users = db.users || [];

  const exists = users.find(u => u.phone && u.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
  if (exists) {
    return res.status(400).json({ error: "Ushbu telefon raqami allaqachon ro'yxatdan o'tgan!" });
  }

  const newClient = { role: 'client', name, phone, password };
  users.push(newClient);
  db.users = users;
  saveDB(db);

  res.json({ success: true, user: newClient });
});

// 3. Services
app.get('/api/services', (req, res) => {
  const db = getDB();
  res.json(db.services || []);
});

app.post('/api/services', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  const newService = {
    id: "s_" + Date.now(),
    name: req.body.name,
    category: req.body.category,
    price: parseInt(req.body.price),
    image: req.body.image || (req.body.category === 'children' ? 'baby_card.png' : 'women_card.png')
  };
  db.services.push(newService);
  saveDB(db);
  res.json({ success: true, service: newService });
});

app.put('/api/services/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  const service = db.services.find(s => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: "Topilmadi" });

  service.price = parseInt(req.body.price);
  saveDB(db);
  res.json({ success: true, service });
});

app.delete('/api/services/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  db.services = db.services.filter(s => s.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// 4. Workers
app.get('/api/workers', (req, res) => {
  const db = getDB();
  const workers = db.users.filter(u => u.role === 'worker');
  res.json(workers);
});

app.post('/api/workers', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  const { name, username, password } = req.body;

  const exists = db.users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase());
  if (exists) return res.status(400).json({ error: "Ushbu login band qilingan!" });

  const newWorker = { role: 'worker', name, username, password };
  db.users.push(newWorker);
  saveDB(db);
  res.json({ success: true, worker: newWorker });
});

app.delete('/api/workers/:username', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  db.users = db.users.filter(u => !u.username || u.username.toLowerCase() !== req.params.username.toLowerCase());
  saveDB(db);
  res.json({ success: true });
});

// 5. Clients list (Admin view)
app.get('/api/clients', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  const clients = db.users.filter(u => u.role === 'client');
  res.json(clients);
});

// 6. Bookings
app.get('/api/bookings/busy', (req, res) => {
  let db = getDB();
  db = cleanOldBookings(db);
  const bookings = db.bookings || [];
  const busySlots = bookings
    .filter(b => b.status !== 'cancelled')
    .map(b => ({
      date: b.date,
      time: b.time,
      workerName: b.workerName
    }));
  res.json(busySlots);
});

app.get('/api/bookings', (req, res) => {
  let db = getDB();
  db = cleanOldBookings(db);
  const bookings = db.bookings || [];

  // Filter based on roles
  if (req.user.role === 'admin') {
    return res.json(bookings);
  } else if (req.user.role === 'worker') {
    const workerBookings = bookings.filter(b => b.workerName.toLowerCase() === req.user.name.toLowerCase());
    return res.json(workerBookings);
  } else if (req.user.role === 'client') {
    const clientPhone = req.user.phone;
    const clientBookings = bookings.filter(b => b.clientPhone.replace(/\s+/g,'') === clientPhone.replace(/\s+/g,''));
    return res.json(clientBookings);
  }
  res.status(403).json({ error: "Foydalanuvchi aniqlanmadi" });
});

app.post('/api/bookings', (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: "Faqat mijoz bron qila oladi." });
  }
  const db = getDB();
  const { serviceId, workerName, date, time, comment } = req.body;

  // Validate: Sunday is a day off
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  if (dayOfWeek === 0) {
    return res.status(400).json({ error: "Yakshanba — dam olish kuni! Boshqa kun tanlang." });
  }

  const service = db.services.find(s => s.id === serviceId);
  if (!service) return res.status(404).json({ error: "Xizmat topilmadi" });

  // Double check time slot collision
  const isOccupied = db.bookings.some(b => b.date === date && b.workerName === workerName && b.time === time && b.status !== 'cancelled');
  if (isOccupied) {
    return res.status(400).json({ error: "Ushbu vaqt band qilingan! Boshqa vaqt tanlang." });
  }

  const newBooking = {
    id: "b_" + Date.now(),
    clientName: req.user.name,
    clientPhone: req.user.phone,
    serviceName: service.name,
    price: service.price,
    date,
    time,
    workerName,
    comment,
    status: 'pending'
  };

  db.bookings.push(newBooking);
  saveDB(db);
  res.json({ success: true, booking: newBooking });
});

app.put('/api/bookings/:id/status', (req, res) => {
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  const db = getDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Topilmadi" });

  booking.status = req.body.status;
  saveDB(db);
  res.json({ success: true, booking });
});

// Save procedure note by worker
app.put('/api/bookings/:id/note', (req, res) => {
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  const db = getDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Topilmadi" });

  booking.procedureNote = req.body.note || '';
  booking.noteDate = new Date().toISOString();
  saveDB(db);
  res.json({ success: true, booking });
});

// Reschedule booking (client, worker, or admin)
app.put('/api/bookings/:id/reschedule', (req, res) => {
  const db = getDB();
  const booking = db.bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Bron topilmadi" });

  // Client can only reschedule their own bookings
  if (req.user.role === 'client') {
    const userPhone = (req.user.phone || '').replace(/\s+/g, '');
    const bookingPhone = (booking.clientPhone || '').replace(/\s+/g, '');
    if (userPhone !== bookingPhone) {
      return res.status(403).json({ error: "Bu bron sizniki emas!" });
    }
  }

  const { newDate, newTime } = req.body;
  if (!newDate || !newTime) {
    return res.status(400).json({ error: "Yangi sana va vaqt kiritilmadi" });
  }

  // Sunday check
  const dayOfWeek = new Date(newDate + 'T00:00:00').getDay();
  if (dayOfWeek === 0) {
    return res.status(400).json({ error: "Yakshanba — dam olish kuni! Boshqa kun tanlang." });
  }

  // Conflict check (exclude current booking)
  const slotStart = newTime.split(':').reduce((h, m, i) => i === 0 ? +h * 60 : +h + +m, 0);
  const slotEnd = slotStart + 45;
  const conflict = db.bookings.some(b => {
    if (b.id === req.params.id || b.date !== newDate || b.workerName !== booking.workerName || b.status === 'cancelled') return false;
    const bStart = b.time.split(':').reduce((h, m, i) => i === 0 ? +h * 60 : +h + +m, 0);
    const bEnd = bStart + 45;
    return slotStart < bEnd && slotEnd > bStart;
  });
  if (conflict) {
    return res.status(400).json({ error: "Bu yangi vaqt band! Boshqa vaqt tanlang." });
  }

  booking.date = newDate;
  booking.time = newTime;
  // Keep existing status if confirmed, otherwise set pending
  if (booking.status !== 'confirmed' && booking.status !== 'cancelled') {
    booking.status = 'pending';
  }
  booking.rescheduled = true;
  saveDB(db);
  res.json({ success: true, booking });
});



app.delete('/api/bookings/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Ruxsat yo'q" });
  const db = getDB();
  db.bookings = db.bookings.filter(b => b.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// 7. Certificates
app.get('/api/certificates', (req, res) => {
  const db = getDB();
  res.json(db.certificates || []);
});

app.post('/api/certificates', (req, res) => {
  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Faqat xodimlar sertifikat qo'sha oladi." });
  }
  const db = getDB();
  if (!db.certificates) db.certificates = [];

  const { title, imageUrl, description } = req.body;
  if (!title || !imageUrl) {
    return res.status(400).json({ error: "Sarlavha va rasm URL kiritilishi shart!" });
  }

  const newCert = {
    id: 'cert_' + Date.now(),
    workerName: req.user.name,
    title,
    imageUrl,
    description: description || '',
    addedAt: new Date().toISOString()
  };
  db.certificates.push(newCert);
  saveDB(db);
  res.json({ success: true, certificate: newCert });
});

app.delete('/api/certificates/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Faqat admin o'chirishi mumkin." });
  const db = getDB();
  if (!db.certificates) db.certificates = [];
  db.certificates = db.certificates.filter(c => c.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// SEO Static Routes
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// Fallback to serve index.html for undefined front routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT} (Accessible on network & phones)`);
  // Run db check to seed
  getDB();
});
