const express = require('express');
const studentRoutes = require('./src/routes/students');
const errorHandler = require('./src/middlewares/errorHandler');
const config = require('./src/config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/students', studentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Student Management API is running', environment: config.env });
});

app.use(errorHandler);

const port = config.port || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
