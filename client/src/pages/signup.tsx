import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '../../../logger.ts';
import styles from './signup.module.css';

// バックエンドで生成した「VAPIDの公開鍵」
const publicKey = 'BDq6t0QhzhcmVpbWK3VBZnwaARUhUpSNq9G1VDh1BI0f_tXPDONRLhl6TESTh8A-PyFNoW3Oj1ChZA1dV4uXZGw';

const SignUp = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [errMsgUserName, setErrMsgUserName] = useState('');
  const [password, setPassword] = useState('');
  const [errMsgEmail, setErrMsgEmail] = useState('');
  const [errMsgPassword, setErrMsgPassword] = useState('');
  const changeUserName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserName(val);
  };
  const changeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
  };
  const changePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
  };
  const validateUserName = (val: string) => {
    if (!val) throw Error('ユーザー名を入力してください');
  };
  const validateEmail = (val: string) => {
    if (!val) throw Error('メールアドレスを入力してください');
    if (!(val.includes('@') && val.includes('.')))
      throw Error('不正なメールアドレスです');
  };
  const validatePassword = (val: string) => {
    if (!val) throw Error('パスワードを入力してください');
    if (val.length < 8) throw Error('パスワードは8文字以上にしてください');
    if (!(/[a-z]/.test(val) && /[A-Z]/.test(val) && /\d/.test(val)))
      throw Error('パスワードには大文字、小文字、数値を全て含めてください');
  };



  const getPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    // 1. 今動いているService Workerがいるか探す
    let registration = await navigator.serviceWorker.getRegistration();

    // 2. もしいなければ、ここで「強制的に」登録する
    if (!registration) {
      try {
        // public/sw.js を、アプリ全体（'/'）を守備範囲として登録
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('Service Worker の登録に成功');
      } catch (err) {
        if(err instanceof Error) alert(err.message);
        return null; // 失敗したらここで安全に終了
      }
    }
    // 3. 登録が完全に終わって「準備完了」になるまで確実に待つ
    await navigator.serviceWorker.ready;

    // ここから先は通知の許可と鍵の取得
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const convertedPublicKey = urlBase64ToUint8Array(publicKey);
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedPublicKey,
    });
  };

// 公開鍵をブラウザが読める形式（Uint8Array）に変換する
const urlBase64ToUint8Array = (base64String: Base64URLString) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

  const submitButton = async (e: React.SubmitEvent<HTMLFormElement>) => {
    let hasError = false;
    e.preventDefault();
    try {
      validateUserName(userName);
      setErrMsgUserName('');
    } catch (err) {
      if (err instanceof Error) {
        setErrMsgUserName(err.message);
        hasError = true;
      }
    }
    try {
      validateEmail(email);
      setErrMsgEmail('');
    } catch (err) {
      if (err instanceof Error) {
        setErrMsgEmail(err.message);
        hasError = true;
      }
    }
    try {
      validatePassword(password);
      setErrMsgPassword('');
    } catch (err) {
      if (err instanceof Error) {
        setErrMsgPassword(err.message);
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      // 1. 通知の許可と鍵をゲットする
      const subscription = await getPushSubscription();


      // 2. サインアップAPIに、ユーザー情報と通知の鍵を全部まとめて一気に送る
      //alert(subscription.endpoint);
      const response = await fetch('/api/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          email,
          password,
          subscription, // 許可されてれば鍵が入るし、拒否ならnullが入る
          }),
          credentials: 'include',
        });
        const data = await response.json();
        
        logger.info({data},'data');
        if (data.success) {
          navigate('/');
        }
      } catch (err) {
        alert(err);
        logger.error({ err }, '登録エラー');
      }
    };

  return (
    <div className={styles.container}>
      <form
        onSubmit={(e) => {
          submitButton(e);
        }}
      >
        <h1>Sign up</h1>
        <div className={styles.uiForm}>
          <div className={styles.formField}>
            <label>User name</label>
            <input
              type="text"
              placeholder="Kathy Selden"
              name="userName"
              onChange={(e) => changeUserName(e)}
            />
          </div>
          <p className={styles.errorMsg}>{errMsgUserName}</p>
        </div>
        <div className={styles.uiForm}>
          <div className={styles.formField}>
            <label>Email</label>
            <input
              type="text"
              placeholder="sample@gmail.com"
              name="mailAddress"
              onChange={(e) => changeEmail(e)}
            />
          </div>
          <p className={styles.errorMsg}>{errMsgEmail}</p>
        </div>
        <div className={styles.uiForm}>
          <div className={styles.formField}>
            <label>Password</label>
            <input
              type="password"
              placeholder="password"
              name="password"
              onChange={(e) => changePassword(e)}
            />
          </div>
          <p className={styles.errorMsg}>{errMsgPassword}</p>
        </div>

        

        <div>
          <button className={styles.submitButton}>新規登録</button>
        </div>
        <div>
          <p>アカウントをお持ちですか？ </p>
          <Link to="/login" className="link">
            ログイン
          </Link>
        </div>
      </form>
    </div>
  );
};
export default SignUp;
