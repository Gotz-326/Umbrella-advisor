import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logger } from '../../../logger.ts';
import styles from './login.module.css';
const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errMsgEmail, setErrMsgEmail] = useState('');
  const [errMsgPassword, setErrMsgPassword] = useState('');
  const changeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
  };
  const changePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
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
  const submitButton = async (e: React.SubmitEvent<HTMLFormElement>) => {
    let hasError = false;
    e.preventDefault();
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
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
      credentials: 'include',
    });

    const data = await response.json();
    if (data.success) {
      logger.info({data}, 'ログイン成功！');
      navigate('/');
    } else {
      alert(data.message);
    }

  };
  return (
    <div className={styles.container}>
      <form
        onSubmit={(e) => {
          submitButton(e);
        }}
      >
        <h1>Login</h1>
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
          <button className={styles.submitButton}>ログイン</button>
        </div>
      <div>
        <p>アカウントをお持ちでないですか？ </p>
        <Link to="/signup" className="link">
          新規登録
        </Link>
      </div>
      </form>
    </div>
  );
};
export default Login;
