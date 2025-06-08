const jwt = require('jsonwebtoken');

const verification = async (req, res, next) => {
  try {
    let token = req.header('Authorization');
    if (!token) return res.status(403).send('Access Denied');

    if (token.startsWith('queue ')) {
      token = token.slice(6, token.length).trimLeft();
    }

    const verifiendToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verifiendToken;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error Authenticaition' });
    console.log(error);
  }
};

module.exports = verification;
