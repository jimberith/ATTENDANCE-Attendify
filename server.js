
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your frontend can talk to this server
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Higher limit for facial images

// In-memory data store (Reset on server restart)
// In a real app, you would use MongoDB or PostgreSQL
let db = {
  users: [],
  attendance: [],
  classes: [],
  hardware: [],
  leave_requests: [],
  audit_logs: []
};

// --- USER ROUTES ---
app.get('/users', (req, res) => res.json(db.users));
app.post('/users', (req, res) => {
  const user = req.body;
  db.users.push(user);
  res.status(201).json(user);
});
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const index = db.users.findIndex(u => u.id === id);
  if (index !== -1) {
    db.users[index] = { ...db.users[index], ...req.body };
    return res.json(db.users[index]);
  }
  res.status(404).json({ message: 'User not found' });
});

// --- ATTENDANCE ROUTES ---
app.get('/attendance', (req, res) => res.json(db.attendance));
app.post('/attendance', (req, res) => {
  const record = req.body;
  db.attendance.unshift(record); // Add to beginning
  res.status(201).json(record);
});

// --- CLASS ROUTES ---
app.get('/classes', (req, res) => res.json(db.classes));
app.post('/classes', (req, res) => {
  const newClass = req.body;
  db.classes.push(newClass);
  res.status(201).json(newClass);
});
app.delete('/classes/:id', (req, res) => {
  const { id } = req.params;
  db.classes = db.classes.filter(c => c.id !== id);
  // Also unassign users
  db.users = db.users.map(u => u.classId === id ? { ...u, classId: '' } : u);
  res.status(204).send();
});

// --- LEAVE REQUESTS ---
app.get('/leave-requests', (req, res) => res.json(db.leave_requests));
app.post('/leave-requests', (req, res) => {
  const request = req.body;
  db.leave_requests.unshift(request);
  res.status(201).json(request);
});
app.patch('/leave-requests/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const index = db.leave_requests.findIndex(r => r.id === id);
  if (index !== -1) {
    db.leave_requests[index].status = status;
    return res.json(db.leave_requests[index]);
  }
  res.status(404).json({ message: 'Request not found' });
});

// --- HARDWARE ---
app.get('/hardware', (req, res) => res.json(db.hardware));
app.post('/hardware', (req, res) => {
  const node = req.body;
  db.hardware.push(node);
  res.status(201).json(node);
});
app.delete('/hardware/:id', (req, res) => {
  db.hardware = db.hardware.filter(h => h.id !== req.params.id);
  res.status(204).send();
});

// --- AUDIT LOGS ---
app.get('/audit-logs', (req, res) => res.json(db.audit_logs));
app.post('/audit-logs', (req, res) => {
  const entry = req.body;
  db.audit_logs.unshift(entry);
  res.status(201).json(entry);
});

// Root check
app.get('/', (req, res) => res.send('Attendify Backend API is running...'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
