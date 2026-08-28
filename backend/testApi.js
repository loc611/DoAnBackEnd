import http from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign({ id: 'dummy', role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

http.get('http://localhost:5000/api/tuition/debtors/10a1', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('RESPONSE:', res.statusCode, data));
}).on('error', err => console.error('ERROR:', err));
