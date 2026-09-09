import express from 'express';
import 'dotenv/config';
import webpush, { PushSubscription } from 'web-push';
import Auth from '../models/auth.ts';
import City from '../models/city.ts';
import Setting from '../models/setting.ts';
import { logger } from '../../../logger.ts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const publicKey = process.env.PUBLIC_KEY;
const privateKey = process.env.PRIVATE_KEY;
const TIMEZONE_OFFSET: Record<string, number> = {
  JP: 9,
};
webpush.setVapidDetails(
  'mailto:mosh326@gmail.com',
  publicKey || '',
  privateKey || '',
)

interface ForecastItem {
  time: string, // ISO 8601形式の時間の配列
  pop: number, // 降水確率 (0 〜 100)
  uvIndex: number,
}

// const test = async() =>{
//     const url = `https://api.openweathermap.org/data/2.5/forecast?q=uji&units=metric&appid=${apikey}`;
//   const response = await fetch(url);
//   const data = await response.json();
//   // logger.info(data.list[0]);
//   logger.info({auths});
//   const auth = auths.find(a => a.email === 'mosh326@gmail.com');
//   const subsc = auth.subscription;
//   await sendNotification(subsc, '快晴');
// };

const notifyForecast =  async () => {
  try{

    const infoToNotify = await getSubscriptionAndForecasts();
    if(!infoToNotify) return;
    for(const info of infoToNotify){
      const time = info.time;
      const pop = info.pop;
      const subsc = info.subscription;
      const message = `傘をお持ちください
      ${time} に降水確率 ${pop}%です`;
      await sendNotification(subsc, message);

      logger.info({info}, '通知成功');
    };
  } catch(err) {
    logger.error({err}, '天気情報取得に失敗しました');
  }
};

const sendNotification = async (userSubscription: PushSubscription, weatherMessage: string) => {
  try {
    const payload = JSON.stringify({
      title: '傘予報',
      body: weatherMessage,
      //icon: '/icon.png'
    });

    await webpush.sendNotification(userSubscription, payload);
    logger.info({userSubscription}, 'プッシュ通知の送信成功');
  } catch (err) {
    logger.error({err},'通知の送信失敗');
  }
};

const getSubscriptionAndForecasts = async () =>{
  const users = await getFilteredSettings();
  if(!users) return;

  const tzOffset = TIMEZONE_OFFSET.JP;
  const now = dayjs.utc().add(tzOffset, 'hour')
  const today = now.format('YYYY-MM-DD');
  const tomorrow = now.add(1, 'day').format('YYYY-MM-DD');
  const subscriptionAndForecasts = await Promise.all(
    
  users.map(async (user) => {
    const timeFrom = `${today}T${user.timeFrom}`;
    const timeTo = user.timeFrom < user.timeTo? `${today}T${user.timeTo}`: `${tomorrow}T${user.timeTo}`;
    const forecasts = await getForecasts(user.city);
    if(!forecasts) return null;
    for(const fc of forecasts){
      const timeForecast = fc.time;
      if(timeFrom > timeForecast || timeForecast > timeTo) continue;
      const pop = Number(fc.pop);
      if(user.border <= pop){
        try{
          const auth = await Auth.findOne({userID: user.userID}).exec();
          const d = new Date(timeForecast);
          const adjustedTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          if(auth){
            return {
              subscription: auth.subscription,
              time: adjustedTime,
              pop: pop
            };
        }
        } catch(err){
          logger.error({err}, 'データ参照に失敗しました');
        }
      }
    };
    return null;
  }));
    return subscriptionAndForecasts.filter(result => result !== null);
};

//通知時間30分以内のSettingデータを取得
const getFilteredSettings = async () =>{
  
  const tzOffset = TIMEZONE_OFFSET.JP;
  const now = dayjs.utc().add(tzOffset, 'hour').toDate();
  const dayToday = now.toLocaleDateString('ja-JP',{weekday: 'short'});
  const halfHourLater = new Date(now.getTime() + 30 * 60 * 1000);

  const formatTime = (date: Date): string =>{
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };
  
  const strNow = formatTime(now);
  const str30mLater = formatTime(halfHourLater);
  const query = strNow < str30mLater
    ? {// 日付またぎなし
        days: dayToday,
        notificationTime: { $gte: strNow, $lt: str30mLater }
      }
    : {// 日付またぎあり
        days: dayToday,
        $or: [
          { notificationTime: { $gte: strNow } },
          { notificationTime: { $lt: str30mLater } }
        ]
      };

  try{
    const filteredSettings = await Setting.find(query);
    return filteredSettings;
  } catch(err){
    logger.error({err}, 'データ参照に失敗しました');
  }
};

const getForecasts = async (cityName: string) => {
  //取得時刻～翌日24:00までのデータに絞り込んだ天気情報を取得する
  try{
    const city = await City.findOne({en: cityName}).exec();
    if(!city) throw new Error(`都市取得に失敗しました City:${cityName}`);
    const latitude = city.latitude;
    const longitude = city.longitude;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability,uv_index&timezone=Asia%2FTokyo`;
    const response = await fetch(url);
    if(!response.ok) throw new Error(`天気情報取得に失敗しました Status:${response.status}`);
    const weatherData = await response.json();

    const tzOffset = TIMEZONE_OFFSET.JP;
    const now = dayjs.utc().add(tzOffset, 'hour')
    const timeNow = now.format('YYYY-MM-DDTHH:00');
    let index = weatherData.hourly.time.indexOf(timeNow);
    if(index < 0) index = 0;
    const times = weatherData.hourly.time.slice(index, 48);
    const precipitationProbability = weatherData.hourly.precipitation_probability.slice(index, 48);
    const uvIndex = weatherData.hourly.uv_index.slice(index, 48);

    const forecasts: ForecastItem[] = times.map((time: string, i: number) => ({
        time: time, // ISO 8601形式の時間の配列
        pop: precipitationProbability[i],
        uvIndex: uvIndex[i],
    }));
    return forecasts;

  } catch(err){
    logger.error({err}, 'データ参照に失敗しました');
    return null;
  }
};

//export default test;
export default notifyForecast;