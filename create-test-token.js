const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Create a test token
const token = jwt.sign(
  { 
    userId: 'test-user', 
    email: 'test@example.com' 
  }, 
  JWT_SECRET, 
  { expiresIn: '1h' }
);

console.log('Test token:', token);