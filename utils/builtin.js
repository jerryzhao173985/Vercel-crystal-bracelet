// utils/builtin.js
module.exports = {
  dayOfWeek: dob =>
    new Date(dob).toLocaleDateString('zh-CN', { weekday: 'long' }),
};

// exports.dayOfWeek = dob =>
//   new Date(dob).toLocaleDateString('zh-CN', { weekday: 'long' });
