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
const forecastCache = new Map<string, ForecastCacheInterface>();
const CACHE_TTL = 6 * 60 * 60 * 1000;   //6時間以内であれば更新せず使う

webpush.setVapidDetails(
  'mailto:mosh326@gmail.com',
  publicKey || '',
  privateKey || '',
)

interface ForecastItem {
  time: string; // ISO 8601形式の時間の配列
  pop: number; // 降水確率 (0 〜 100)
  uvIndex: number;
}

interface ForecastCacheInterface {
  data: ForecastItem[];
  cachedAt: number;
}

const notifyForecast =  async () => {
  try{
    await warmForecastCache();
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
  } catch (err) {
    logger.error({err},'通知の送信失敗');
  }
};

const getSubscriptionAndForecasts = async () =>{
  const users = await getFilteredSettings();
  if(!users) return;
  logger.info({count: users.length}, '対象ユーザー数');
  const tzOffset = TIMEZONE_OFFSET.JP;
  const now = dayjs.utc().add(tzOffset, 'hour')
  const today = now.format('YYYY-MM-DD');
  const tomorrow = now.add(1, 'day').format('YYYY-MM-DD');
  const timeNow = now.format('YYYY-MM-DDTHH:mm');
  const subscriptionAndForecasts = await Promise.all(
    
  users.map(async (user) => {
    const timeFrom = `${today}T${user.timeFrom}`;
    const timeTo = user.timeFrom < user.timeTo? `${today}T${user.timeTo}`: `${tomorrow}T${user.timeTo}`;
    const forecasts = await getForecastsCached(user.city);
    if(!forecasts) return null;
    for(const fc of forecasts){
      const timeForecast = fc.time;
      if(timeFrom > timeForecast || timeForecast > timeTo || timeNow > timeForecast) continue;
      const pop = Number(fc.pop);
      logger.info({timeFrom, timeTo, timeForecast, pop, border: user.border}, '判定対象'); 
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

//notificationTimeの6時間前からキャッシュを準備する
const warmForecastCache = async () => {
  const upcomingUsers = await getFilteredSettings(360);
  if(!upcomingUsers) return;
  const cities = [...new Set(upcomingUsers.map(u => u.city))];
  await Promise.all(cities.map(c => getForecastsCached(c)));
};


//通知時間10分以内またはキャッシュ確保時間以内のSettingデータを取得
const getFilteredSettings = async (leadTimeMinute = 10) =>{
  
  const tzOffset = TIMEZONE_OFFSET.JP;
  const now = dayjs.utc().add(tzOffset, 'hour');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const dayToday = weekdays[now.day()];
  const dayTomorrow = weekdays[now.add(1, 'day').day()];
  const leadTimeLater = now.add(leadTimeMinute, 'minute');

  const strNow = now.format('HH:mm');
  const strleadTimeLater = leadTimeLater.format('HH:mm');
  const query = strNow < strleadTimeLater
    ? {// 日付またぎなし
        days: dayToday,
        notificationTime: { $gte: strNow, $lt: strleadTimeLater }
      }
    : {// 日付またぎあり
        $or: [
          { days: dayToday, notificationTime: { $gte: strNow } },
          { days: dayTomorrow, notificationTime: { $lt: strleadTimeLater } }
        ]
      };

  logger.info({query}, 'クエリ');
  try{
    return await Setting.find(query);
  } catch(err){
    logger.error({err}, 'データ参照に失敗しました');
  }
};

const getForecastsCached = async (cityID: string): Promise<ForecastItem[] | null> => {
  const cached = forecastCache.get(cityID);
  const now = Date.now();
  if(cached && now - cached.cachedAt < CACHE_TTL) return cached.data;
  const fresh = await getForecasts(cityID);
  if(fresh){
    forecastCache.set(cityID, {data: fresh, cachedAt: now});
    return fresh;
  }
  return null;
};


const getForecasts = async (cityID: string) => {
  //取得時刻～翌日24:00までのデータに絞り込んだ天気情報を取得する
  try{
    const city = await City.findOne({_id: cityID}).exec();
    if(!city) throw new Error(`都市取得に失敗しました City:${cityID}`);
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
    const times = weatherData.hourly.time.slice(index, 72);
    const precipitationProbability = weatherData.hourly.precipitation_probability.slice(index, 72);
    const uvIndex = weatherData.hourly.uv_index.slice(index, 72);

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