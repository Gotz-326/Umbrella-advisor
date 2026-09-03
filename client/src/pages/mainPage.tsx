import { useEffect, useState } from 'react';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import styles from './main.module.css';
import { logger } from '../../../logger.ts';
interface Settings{
    userName: string,
    border: string,
    city: string,
    days: string[],
    timeFrom: string,
    timeTo: string,
    notificationTime: string,
}
interface Cities{
  ja: string;
  en: string;
}
interface CityOption {
  value: string,
  label: string,
}
const MainPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const initialSettings: Settings = {
    userName: '',
    border: '',
    city: '',
    days: [],
    timeFrom: '',
    timeTo: '',
    notificationTime: '',
  };
  const [settingValues, setSettingValues] = useState(initialSettings);
  const [editingValues, setEditingValues] = useState(initialSettings);
  const [cities, setCities] = useState<Cities[]>([]);
  const [IsSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isAccountModalOpen, setisAccountModalOpen] = useState(false);
  const daysOfWeek = ['日','月','火','水','木','金','土'];
  //const [selectedDays, setSelectedDays] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/check-auth');
        if (!response.ok) throw new Error('未認証、またはトークン無効');
        setLoading(false);
      } catch (err) {
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (loading) return;
    const getSetting = async () => {
      try {
        const response = await fetch('/api/users/setting-data', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
           const data = await response.json();
            alert(data.message);
        } else {
          
          const setting = await response.json();
          if(!setting.city){

            setSettingValues({
              ...settingValues,
              userName: setting.userName,
            });
            setEditingValues({
              ...editingValues,
              userName: setting.userName,
            });
            alert('通知設定を入力してください ' + setting.userName + 'さん');

            setIsSettingModalOpen(true);

          } else{
            setSettingValues({
              ...settingValues,
              userName: setting.userName,
              border: setting.border,
              city: setting.city,
              days: setting.days,
              timeFrom: setting.timeFrom,
              timeTo: setting.timeTo,
              notificationTime: setting.notificationTime,
            });
          }
        }
      } catch (err) {
        if(err instanceof Error) alert(err.message);
      }
    };

    const getCities = async () =>{
      try{
        const response = await fetch('/api/cities', {
          method: 'GET',
          credentials: 'include',
        });
        
        if(!response.ok){
          const data = await response.json();
          logger.error({data}, '都市データ取得失敗');
        } else{
          const data = await response.json();
          setCities(data);
        }
      } catch (err) {
        logger.error({err}, '都市データ取得失敗');
      }
    };

    getSetting();
    getCities();
  }, [loading]);

  if (loading) {
    return <div>🐋 認証確認中 🐋</div>;
  }

  const editSetting = () => {
    setEditingValues(settingValues);
    setIsSettingModalOpen(true);
  };

  const updateAccount = async () => {
    setSettingValues(editingValues);
    const response  = await fetch('/api/users/user-data',{
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify(editingValues),
      credentials: 'include',
    });
    if(!response.ok){
      const data = await response.json();
      alert(data);
    }
    cancelAccount();
  };
  const updateSetting = async () => {

    const response = await fetch('/api/users/setting-data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingValues),
      credentials: 'include',
    });

    if(!response.ok){
      const data = await response.json();
      alert(data);
    } else {    
      setSettingValues(editingValues);
      cancelSetting();
    }
  };
  const cancelSetting = () => {
    setIsSettingModalOpen(false);
  };
  const editAccount = () => {
    setEditingValues(settingValues);
    setisAccountModalOpen(true);
    cancelAccount();
  };
  const cancelAccount = () => {
    setisAccountModalOpen(false);
  };
  const deleteAccount = async () => {
    if(confirm('アカウントを削除します。よろしいですか？')){
      const response = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
      });
      if(response.ok){
        alert('アカウントを削除しました');
      } else {
        const data = await response.json();
        alert(data);
      }
      cancelAccount();
    }
  };
  const cityOptions: CityOption[] = cities.map(c =>({
    value: c.en,
    label: c.ja,
  }));

  const getJapaneseCity = () =>{
    const city = cities.find(c => c.en === settingValues.city);
    return city? city.ja: '指定なし';
  };
  const changeBorder = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val: string  = e.target.value;
    setEditingValues({...editingValues, border: val});
  };
  const changeUserName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditingValues({...editingValues, userName: val});
  };
  const toggleDays = (e: React.MouseEvent<HTMLButtonElement>) => {
    const val: string = e.currentTarget.value;

    if(editingValues.days.includes(val)){
      const filteredDays = editingValues.days.filter(d => d !== val);
      setEditingValues({...editingValues, days: filteredDays});
    } else{
      const selectedDays = [...editingValues.days, val];
      setEditingValues({...editingValues, days: selectedDays})
    }
  };

  const displayDays = () => {
    switch(settingValues.days.length){
      case 0:
        return '指定なし';
      case 7:
        return '毎日';
      default:
        const result: string = settingValues.days.join('');
        return result;
    }
  };
  const generatePercent = () =>{
    const percents = [];
    for(let i = 10; i <= 100; i += 10){
      percents.push(String(i));
    }
    return percents;
  };
  const generateTimes = () =>{
    const times = [];
    for(let h = 0; h < 24; h++){
      for(let m = 0; m < 60; m += 30){
        times.push(`${h}:${String(m).padStart(2, '0')}`);
      }
    }
     return times;
  };
  const percentOptions = generatePercent();
  const timeOptions = generateTimes();

  const changeTimeFrom = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if(val !== editingValues.timeTo){
      setEditingValues({...editingValues, timeFrom: val});
    } else {
      alert('終了時間と同じ値は設定できません');
    }
  };
  const changeTimeTo = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if(val !== editingValues.timeFrom){
      setEditingValues({...editingValues, timeTo: val});
    } else{
      alert('開始時間と同じ値は設定できません');
    }
  };
  const changeNotificationTime = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setEditingValues({...editingValues, notificationTime: val});
  };
  
  return (
    <>
      <div className={styles.container}>
        {settingValues.userName}さんの通知設定
        <div className={styles.parameterGroup}>
          <div className={styles.parameter}>
            降水確率：{settingValues.border} %以上
          </div>
          <div className={styles.parameter}>エリア：{getJapaneseCity()}</div>
          <div className={styles.parameter}>
            曜日：{displayDays()}
          </div>
          <div className={styles.parameter}>
            時間：{settingValues.timeFrom} 〜 {settingValues.timeTo}
          </div>
          <div className={styles.parameter}>
            通知時刻：{settingValues.notificationTime}
          </div>
        </div>
        <div>
          <button className={styles.settingButton} onClick={editSetting}>
            通知設定
          </button>
          <button className={styles.settingButton} onClick={editAccount}>
            アカウント
          </button>
        </div>
      </div>

      <div id="modalSetting" className={IsSettingModalOpen ? styles.modalSetting : styles.hidden}>
        <form>
          <div className={styles.uiForm}>
            <label>降水確率</label>
            <select
              value={editingValues.border}
              onChange={(e) =>changeBorder(e)}
            >
              {percentOptions.map((o) => (
                <option key={o} value={o}>
                {o}
                </option>
              ))}
            </select> %以上
          </div>
          <div className={styles.uiForm}>
          <label>エリア</label>
            <Select
            className={styles.cityListbox}
              options={cityOptions}
              value={cityOptions.find(opt => opt.value === editingValues.city)}
              onChange={(selectedOption) => {
                setEditingValues({...editingValues, city: selectedOption? selectedOption.value: ''});
              }}
              placeholder="都市を入力"
              isClearable
            />
          </div>
          <div className={styles.uiForm}>
            {daysOfWeek.map(d =>{
      //        const isSelected = selectedDays.includes(d);
              const isSelected = editingValues.days.includes(d);
              return(
                <button 
                key={d} 
                value={d}
                type="button" 
                className={isSelected? styles.selectedDays: styles.nonSelectedDays}
                onClick={(e) =>toggleDays(e)}
                >{d}</button>
            )})}
          </div>
          <div className={styles.uiForm}>
            <div className={styles.timeInput}>
            <label>時間</label>
            <select value={editingValues.timeFrom} onChange={(e) => changeTimeFrom(e)}>
              {timeOptions.map((t) => (
                <option key={t} value={t} className={styles.timeListbox}>
                  {t}
                </option>
              ))}
            </select>
            〜
            <select value={editingValues.timeTo} onChange={(e) => changeTimeTo(e)}>
              {timeOptions.map((t) => (
                <option key={t} value={t} className={styles.timeListbox}>
                  {t}
                </option>
              ))}
            </select>
            </div>
          </div>
          <div className={styles.uiForm}>
            <label>通知時刻</label>
            <select value={editingValues.notificationTime} onChange={(e) => changeNotificationTime(e)}>
              {timeOptions.map((t) => (
                <option key={t} value={t} className={styles.timeListbox}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button className={styles.updateButton} type="button" onClick={updateSetting}>
            更新
          </button>
          <button className={styles.cancelButton} type="button" onClick={cancelSetting}>
            キャンセル
          </button>
        </form>
      </div>
            <div id="modalAccount" className={isAccountModalOpen ? styles.modalAccount : styles.hidden}>
        <form>
          <div className={styles.uiForm}>
            <label>ユーザ名</label>
            <input type="text" value={editingValues.userName} onChange={(e) => changeUserName(e)}>
              
            </input>
          </div>
          <button className={styles.updateButton} type="button" onClick={updateAccount}>
            更新
          </button>
          <button className={styles.cancelButton} type="button" onClick={cancelAccount}>
            キャンセル
          </button>
          <div>
          <button className={styles.deleteButton} type="button" onClick={deleteAccount}>
            アカウント削除
          </button>
          </div>
        </form>
      </div>
      <div
        id="mask"
        className={isAccountModalOpen ? styles.mask : styles.hidden}
      ></div>
    </>
  );
};
export default MainPage;
