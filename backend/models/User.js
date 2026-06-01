const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  classId: {
    type: String,
    default: 'default-class'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    completedLessons: { type: [String], default: [] },
    completedChallenges: { type: [String], default: [] },
    stars: { type: Number, default: 0 },
    gallery: { type: [mongoose.Schema.Types.Mixed], default: [] },
    achievements: { type: [String], default: [] },
    lessonStars: { type: mongoose.Schema.Types.Mixed, default: {} },
    challengeStars: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Метод для проверки пароля
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);