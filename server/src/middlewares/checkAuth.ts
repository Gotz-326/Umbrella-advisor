import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

interface AuthRequest extends Request {
  //jwt.verifyの戻り値型
  user?: string | jwt.JwtPayload;
}

const checkAuth = (req: AuthRequest, res: Response, next: NextFunction) =>{
  const token = req.cookies.token;

  if(token){
    try{
      const decoded = jwt.verify(token, process.env.SECRET_KEY || '');
      req.user = decoded;
      next();
    } catch(err){
      res.status(403).json(
        {message: '無効なトークンです'}
      );
    }
  }
  else {
    res.status(401).json(
      {message: 'ログインがされていません'}
    );
  }
};
export default checkAuth;