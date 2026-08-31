import express from 'express';
import userRouter from './routes/user.ts';
import cityRouter from './routes/city.ts';
import notifyForecast from './controllers/forecast.ts';
import {logger} from '../../logger.ts';
import cookieParser from 'cookie-parser';
import checkAuth from './middlewares/checkAuth.ts';
import mongoose from 'mongoose';
import cron from 'node-cron';
import 'dotenv/config';
const app = express();
const port = process.env.PORT || 5000;
const uri: string | undefined = process.env.MONGODB_URI; 

app.use(cookieParser());
app.use(express.json());
app.use('/api/users', userRouter);
app.use('/api/cities', cityRouter);

if(uri){
  mongoose.connect(uri, {
    family: 4 // IPv4での接続を強制
  })
    .then(() => logger.info("DB Atlasに接続完了"))
    .catch(err => logger.error({err}));
}
cron.schedule('59 * * * *', async () => {
  await notifyForecast();
});

app.get('/api/check-auth', checkAuth, (req, res) => {
  res.status(200).json({ authenticated: true });
});

app.listen(port, () => {
  console.log('server listening');
});
