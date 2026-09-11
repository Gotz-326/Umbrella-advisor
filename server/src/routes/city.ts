import express from 'express';
import cors from 'cors';
import City from '../models/city.ts';
import 'dotenv/config';

const router = express.Router();
const clientPort = process.env.CLIENT_PORT;

router.use(express.json());
router.use(cors({
  origin: `http://localhost:${clientPort}`,
  credentials: true
}));

router.get('/', async (req, res) => {
  try{
    const cities = await City.find({country_code: 'JP'});
    res.status(200).json(cities);
  } catch(err){
      return res.status(500).json({
      message: 'データが取得できませんでした',
      //message: JSON.stringify(cities)
    });
  }
});
// router.post('/test', async (req, res) => {
//   try{
//     const cities = await City.insertMany(req.body);
//     res.status(200).json(cities);
//   } catch(err){
//       return res.status(500).json({
//       message: 'データが登録できませんでした',
//     });
//   }
// });

export default router;