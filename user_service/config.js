module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'supersecret_jwt_key_for_course',
  JWT_EXPIRES_IN: '1h',
};