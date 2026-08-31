import pino from 'pino';

const isBrowser = typeof window !== 'undefined';
const isDevelopment = typeof process !== 'undefined' 
  ? process.env.NODE_ENV !== 'production' 
  : true; 

export const logger = pino({
  level: (typeof process !== 'undefined' && process.env?.LOG_LEVEL) 
    || (isDevelopment ? 'debug' : 'info'),

  browser: {
    asObject: true,
  },
  ...(isBrowser ? {} : {
    transport: isDevelopment ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid, hostname',
      }
    } : undefined,
  })
});


// import pino from 'pino';
// const isBrowser = typeof window !== 'undefined';
// //export const logger = pino({ browser: { asObject: true } });
// const isDevelopment = true;
// export const logger = pino({
//   level: process.env.LOG_LEVEL || (isDevelopment? 'debug': 'info'),

//   browser: {
//     asObject: true, // ログを通常のオブジェクトとしてコンソールに出力する
//   },
//   isBrowser? {}: {
//     transport: isDevelopment? {
//       target: 'pino-pretty',
//       options: {
//         colorize: true,
//         translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
//         ignore: 'pid, hostname',
//       }
//     }: undefined,
//   }
// });