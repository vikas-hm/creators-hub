require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// In production set CLIENT_URL to your website address. Locally it allows everything.
const allowed = (process.env.CLIENT_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowed.length ? allowed : true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));

app.get('/', (req, res) => {
  res.send('Creators Hub API is running');
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log('Server running on port ' + port);
    });
  })
  .catch((err) => console.log('Connection error:', err.message));