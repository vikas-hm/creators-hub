require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('Creators Hub API is running');
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log('Server running on port ' + process.env.PORT);
    });
  })
  .catch((err) => console.log('Connection error:', err.message));