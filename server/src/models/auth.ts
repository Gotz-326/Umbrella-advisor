import mongoose from 'mongoose';

const authSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  subscription: {
    type: Object,
    required: false,
    default: null,
  },
});

const Auth = mongoose.model('Auth', authSchema);

export default Auth;