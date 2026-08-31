import mongoose from 'mongoose'

const citySchema = new mongoose.Schema({
  ja: {
    type: String,
  },
  en: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  country_code: {
    type: String,
    required: true,
  }
});

const City = mongoose.model('City', citySchema);

export default City;

