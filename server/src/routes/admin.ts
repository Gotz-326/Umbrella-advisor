import express from 'express';
import { Response } from 'express';
import { AuthRequest } from './user.ts';
import checkAuth from '../middlewares/checkAuth';
import cors from 'cors';
import {logger} from '../../../logger.ts';
import Setting from '../models/setting.ts';
import Auth from '../models/auth.ts';
import City from '../models/city.ts'
import { constants } from 'buffer';
import checkAdmin from '../middlewares/checkAdmin.ts';

const router = express.Router();
const clientPort = process.env.CLIENT_PORT;
router.use(express.json());
router.use(cors({
  origin: `http://localhost:${clientPort}`,
  credentials: true,
}))

router.get('/users', checkAuth, checkAdmin, async (req: AuthRequest, res: Response) =>{
  if(!req.user) return res.status(401).json({message: '認証情報がありません'});
  try{
    //const auths = await Auth.find({projection: {password: 0, subscription: 0}});
    const auths = await Auth.find({}).select('-password -subscription');
    return res.status(200).json(auths);
  } catch(err){
    logger.error(err);
    return res.status(500).json({message: 'データが取得できませんでした'});
  }
});

router.get('/settings', checkAuth, checkAdmin, async (req: AuthRequest, res: Response) =>{
  if(!req.user) return res.status(401).json({message: '認証情報がありません'});
  try{
    const settings = await Setting.find({});
    const ids = settings.map((s) => {
      if(s.city) return s.city;
    });
    const cities = await City.find({_id: {$in: ids}});
    const cityMap = new Map(cities.map(c => [c._id.toString(), c.ja || c.en]));
    const merged = settings.map(s => ({...s.toObject(), cityName: cityMap.get(s.city.toString()) ?? null}));
    return res.status(200).json(merged);
  } catch(err){
    logger.error(err);
    return res.status(500).json({message: 'データが取得できませんでした'});
  }
});

export default router;