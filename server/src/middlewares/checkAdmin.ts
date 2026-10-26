import { Request, Response, NextFunction } from 'express';
import User from '../models/auth.ts';

// type AuthRequest = Request & {
//     user?: { userID: string };
// };
interface AuthRequest extends Request {
    user?: { userID: string };
}
const checkAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => { 
    try{
        // const userID = (req as Request & { user: { userID: string } }).user.userID;

        const userID = req.user?.userID;
        const user = await User.findOne({userID}).select('role').exec();
        if(!user || user.role !== 'admin') return res.status(403).json({message: '管理者権限がありません'});
        next();
    } catch(err) {
        next(err);
    }
};

export default checkAdmin;