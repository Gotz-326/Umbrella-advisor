import express from 'express';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import cors from 'cors';
import {logger} from '../../../logger.ts';
import Setting from '../models/setting.ts';
import Auth from '../models/auth.ts';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import checkAuth from '../middlewares/checkAuth.ts';

const router = express.Router();
const port = process.env.PORT;
const secret = process.env.SECRET_KEY;
if(!secret) throw Error('Secret keyの読み込みに失敗しました');
router.use(express.json());
router.use(cookieParser());
router.use(cors({
  origin: `http://localhost:${port}`, credentials: true
 }));

router.post(
  '/login',
  body('email').isEmail(),
  body('password').isLength({ min: 7 }),
  async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
// const user = auths.find((user) => user.email === email);
    const user = await Auth.findOne({ email }).exec();
    if (!user) return res.status(401).json({ message: '未登録のユーザーです' });

    const userID = user.userID;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'パスワードが正しくありません' });

    const token = await jwt.sign(
      {
        userID,
        email,
      },
      secret,
      {
        expiresIn: '5d',
      }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 5 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
      success: true,
      message: `Email: ${email} login succeeded`,
    });
    logger.info({email}, 'Login succeeded!')
  }
);

router.post(
  '/signup',
  body('email').isEmail(),
  body('password').isLength({ min: 7 }),
  async (req, res) => {
    try{
      const userName = req.body.userName;
      const email = req.body.email;
      const subscription = req.body.subscription;
      const password = req.body.password;
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const user = await Auth.findOne({ email }).exec();
      if (user)
        return res.status(400).json({ message: '登録済みのメールアドレスです' });

      const userID = crypto.randomUUID();
      let hashedPassword = await bcrypt.hash(password, 10);

      const token = await jwt.sign(
        {
          userID,
          email,
        },
        secret,
        {
          expiresIn: '5d',
        }
      );
      const newUser = new Auth({
        userID,
        userName,
        email,
        password: hashedPassword,
        subscription,
      });
      try{
        await newUser.save();
        logger.info({newUser}, 'DB保存に成功')
      } catch(err){
        logger.error({err}, 'DB保存に失敗')
      }

      const newSetting = new Setting({
        userID: userID,
        userName: userName,
        border: 10,
        city: '',
        days: [],
        timeFrom: '',
        timeTo: '',
        notificationTime: '', 
      });
      try{
        await newSetting.save();
        logger.info({newSetting}, 'DB保存に成功')
      } catch(err){
        logger.error({err}, 'DB保存に失敗')
        return res.status(500).json({message: 'ユーザー登録に失敗'});
      }
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 5 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({
        success: true,
        message: `Mail address: ${email} signed up successfully`,
      });
    }catch(err){
      logger.error({ err }, 'Sign up error');
      res.status(500).json({ message: 'サーバーエラーが発生しました' });
    }
    //res.send(auth);
  }
);

// JWTの中身（Payload）の型
interface CustomJwtPayload extends jwt.JwtPayload {
  userID: string; // トークンに入れている項目追加
}

// req.user を持つ専用の Request 型
export interface AuthRequest extends Request {
  user?: CustomJwtPayload; // JWT解読後のデータ
}
router.get('/setting-data', checkAuth, async (req: AuthRequest, res: Response) => {
  if(!req.user) return res.status(401).json({message: '認証情報がありません'});
    const {userID} = req.user;
  try{
    const setting = await Setting.findOne({userID}).exec();
    if(!setting){
      const user = await Auth.findOne({userID}).exec();
      logger.info('データ未登録です');
      if(!user){
        res.status(404).json({
          success: false,
          message: 'データ未登録です',
        });
      } else {
        res.status(404).json({
          userName: user.userName,
          success: false,
          message: 'データ未登録です',
        });
      }
      return;
    } else {
      logger.info({setting}, 'データ参照に成功しました');
      res.status(200).json(setting)      
    }
  } catch (err){
    logger.error({err}, 'データ参照に失敗しました');
    res.status(500).json({
      success: false,
      message: 'データ参照に失敗しました',
    });
  }
});

router.patch(
  '/setting-data',
  checkAuth,
  async (req: AuthRequest, res: Response) => {
    if(!req.user) return res.status(401).json({message: '認証情報がありません'});
    const {userID} = req.user;
    const {border, city, days, timeFrom, timeTo, notificationTime} = req.body;
    const settingData = {border, city, days, timeFrom, timeTo, notificationTime};
    try{
      const setting = await Setting.findOneAndUpdate(
        {userID},
        {$set: settingData},
        {new: true, runValidators:true}
      );
      if(!setting){
      logger.info({userID}, '設定データが見つかりませんでした');
        return res.status(404).json({
          success: false,
          message: '設定データが見つかりませんでした'
        })
      }
    } catch (err){
      logger.error({err}, 'データ更新に失敗しました');
      return res.status(500).json({
        success: false,
        message: 'データ更新に失敗しました'
      })
    }  
    res.status(200).json({
      success: true,
      message: '設定更新に成功しました',
    });
  }
);

router.patch(
  '/user-data',
  checkAuth,
  async (req: AuthRequest, res: Response) => {
    if(!req.user) return res.status(401).json({message: '認証情報がありません'});
    const {userID} = req.user;
    const {userName} = req.body;
    const settingData = {userName};
    const session = await mongoose.startSession();
    session.startTransaction();
    try{
      const setting = await Setting.findOneAndUpdate(
        {userID},
        {$set: settingData},
        {new: true, runValidators:true, session}
      );
      const user = await Auth.findOneAndUpdate(
        {userID},
        {$set: settingData},
        {new: true, runValidators:true, session}
      );
      if(!setting){
        await session.abortTransaction();
        logger.info({userID}, '設定データが見つかりませんでした');
        return res.status(404).json({
          success: false,
          message: '設定データが見つかりませんでした'
        });
      }
      if(!user){
        await session.abortTransaction();
        logger.info({userID}, 'ユーザデータが見つかりませんでした');
        return res.status(404).json({
          success: false,
          message: 'ユーザデータが見つかりませんでした'
        });
      }
      await session.commitTransaction();
    } catch (err){
      await session.abortTransaction();
      logger.error({err}, 'データ更新に失敗しました');
      return res.status(500).json({
        success: false,
        message: 'データ更新に失敗しました'
      });
    } finally {
      session.endSession();
    } 
    res.status(200).json({
      success: true,
      message: 'データ更新に成功しました',
    });
  }
);

router.delete(
  '/account',
  checkAuth,
  async (req: AuthRequest, res: Response) => { 
    if(!req.user) return res.status(401).json({message: '認証情報がありません'});
    const session = await mongoose.startSession();
      try{
        const userID = req.user.userID;
        session.startTransaction();
        await Auth.findOneAndDelete({ userID }, {session});
        await Setting.findOneAndDelete({ userID }, {session});
        await session.commitTransaction();
        res.clearCookie('token');
        res.status(200).json({
          success: true,
          message: 'アカウント削除に成功しました',
        });
      } catch(err){
        await session.abortTransaction();
        res.status(500).json({
          success: false,
          message: 'アカウント削除に失敗しました',
        });
      } finally{
        session.endSession();
      }
    
  }
);

export default router;
