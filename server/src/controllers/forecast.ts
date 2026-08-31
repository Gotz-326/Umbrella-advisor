import express from 'express';
import request from 'request';
import 'dotenv/config';
import cors from 'cors';
//import nodemailer from 'nodemailer';
import webpush, { PushSubscription } from 'web-push';
import { body } from 'express-validator';
import Auth from '../models/auth.ts';
import Setting from '../models/setting.ts';
import { logger } from '../../../logger.ts';

const port = process.env.PORT;
const apikey = process.env.API_KEY;
const publicKey = process.env.PUBLIC_KEY;
const privateKey = process.env.PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:mosh326@gmail.com',
  publicKey || '',
  privateKey || '',
)

interface ForecastItem {
  pop: number;     // 降水確率 (0 〜 1)
  dt_txt: string;  // 日時文字列 ("2026-09-05 12:00:00")
}

// API全体のレスポンス型
interface WeatherResponse {
  list: ForecastItem[];
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
  //const url = `https://pro.openweathermap.org/data/2.5/forecast/hourly?q=${city}&units=metric&appid=${apikey}`;
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
  //const subscriptionAndForecasts = users.map(user => {
  const subscriptionAndForecasts = await Promise.all(
    
    users.map(async (user) => {
    let isAlreadySet = false;
    const forecasts = await getForecasts(user.city);
    const timeFrom = convertStringToNumberOfDate(user.timeFrom);
    const timeTo = convertStringToNumberOfDate(user.timeTo);
    // forecasts.map(fc =>{
    for(const fc of forecasts){
      // if(isAlreadySet) return;
      const timeForecast = convertStringToNumberOfDate(fc.time);
      if(timeFrom > timeForecast || timeForecast > timeTo) continue;
      const pop = Number(fc.pop) * 100;
      if(user.border <= pop){
        isAlreadySet = true;
        //const auth = auths.find(a => a.userID === user.userID);
        try{
          const auth = await Auth.findOne({userID: user.userID});
          const d = new Date(timeForecast);
          const adjustedTime = String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
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
  const now = new Date();
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



const getForecasts = async (city: string) => {


  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apikey}`;
  const response = await fetch(url);
  if(!response.ok) throw new Error(`天気情報取得に失敗しました Status:${response.status}`);
  const data = await response.json() as WeatherResponse;
  const listResult = data.list.slice(0, 7); //要素7つ分×3h、21h先まで取得
  const forecasts = listResult.map(result => ({
    pop: result.pop,
    time: result.dt_txt,
  }));
  return forecasts;
};

const convertStringToNumberOfDate = (time: string): number=>{
  const timeAdjust = {
    jp: 9
  };
  const date = new Date();
  //UTC time from Web API '2027-07-09 00:00:00'
  if(time.includes('-')){
    time = time.split(' ')[1];
    let [h, m, s] = time.split(':').map(Number);
    h += timeAdjust.jp;
    if(h >= 24){
      h -= 24;
      date.setDate(date.getDate() + 1);
    }
      return date.setHours(h, m, 0, 0);
  } else {
    //Local time '12:34'
    let [h, m] = time.split(':').map(Number);
    return date.setHours(h, m, 0, 0);
  }
};



//https://vitejsvitey1kwsrms-blsm--5000--29a3b5f7.local-corp.webcontainer.io/api/forecast


//export default test;
export default notifyForecast;