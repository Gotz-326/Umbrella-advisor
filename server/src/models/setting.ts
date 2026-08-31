import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
  },
  border: {
    type: Number,
    default: 10,
  },
  city: {
    type: String,
    default: '',
  },
  days: {
    type: [String],
    default: [],
  },
  timeFrom: {
    type: String,
    default: '',
  },
  timeTo: {
    type: String,
    default: '',
  },
  notificationTime: {
    type: String,
    default: '',
  },
});

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;