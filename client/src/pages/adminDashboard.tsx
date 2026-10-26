import styles from './admin.module.css';
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

type AdminUser = {
  _id: string;
  userID: string;
  userName: string;
  role: "admin" | "user";
  createdAt: string; // ISO文字列(UTC),
  lastLoggedIn: string;
};

type AdminSetting = {
  _id: string;
  userID: string;
  border: number;
  cityName: string;
  days: string[];
  timeFrom: string;
  timeTo: string;
  notificationTime: string;
};

const fetchUsers = async(): Promise<AdminUser[]> => {
  const response = await fetch("/api/admin/users", {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403 ? "管理者権限がありません" : `取得に失敗しました (${response.status})`
    );
  }
  
  return response.json();
};
const fetchSettings = async(): Promise<AdminSetting[]> => {
  const response = await fetch("/api/admin/settings", {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403 ? "管理者権限がありません" : `取得に失敗しました (${response.status})`
    );
  }
  
  return response.json();
};

const formatJst = (iso: string) =>
  dayjs(iso).tz("Asia/Tokyo").format("YYYY/MM/DD HH:mm");

const AdminUserPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.userID.toLowerCase().includes(q) || u.userName.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <section>
      <header className={styles.adminHead}>
        ユーザー一覧
        <input
          type="search"
          placeholder="ユーザーID・ユーザー名で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="ユーザーを検索"
        />
      </header>
      {loading && <p>読み込み中…</p>}
      {error && <p className={styles.adminError}>{error}</p>}

      {!loading && !error && (
        <>
          <p className={styles.adminNote}>{filtered.length} 件</p>
          <div className={styles.adminTableWrap}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>ユーザーID</th>
                  <th>ユーザー名</th>
                  <th>権限</th>
                  <th>登録日時</th>
                  <th>ログイン日時</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      条件に一致するユーザーがいません
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u._id}>
                      <td>{u.userID}</td>
                      <td>{u.userName}</td>
                      <td>
                        <span className={styles[`badge${u.role}`]}>
                          {u.role === "admin" ? "管理者" : "一般"}
                        </span>
                      </td>
                      <td>{u.createdAt}</td>
                      <td>{u.lastLoggedIn}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

const AdminSettingPage = () => {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settings;
    return settings.filter(
      (s) => {
        const time = (s.notificationTime ?? "").toLowerCase(); 
        const city = (s.cityName ?? "").toLowerCase();
        return s.userID || time.includes(q) || city.includes(q)
      }
    );
  }, [settings, query]);

  return (
    <section>
      <header className={styles.adminHead}>
        通知設定一覧
        <input
          type="search"
          placeholder="ユーザーID・都市・通知時刻で検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="ユーザーを検索"
        />
      </header>

      {loading && <p className={styles.adminNote}>読み込み中…</p>}
      {error && <p className={styles.adminError}>{error}</p>}

      {!loading && !error && (
        <>
          <p>{filtered.length} 件</p>
          <div className={styles.adminTableWrap}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>ユーザーID</th>
                  <th>降水確率</th>
                  <th>エリア</th>
                  <th>曜日</th>
                  <th>監視時刻from</th>
                  <th>監視時刻to</th>
                  <th>通知時刻</th>                
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      条件に一致するユーザーがいません
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s._id}>
                      <td>{s.userID}</td>
                      <td>{s.border}%</td>
                      <td>{s.cityName}</td>
                      <td>{s.days}</td>
                      <td>{s.timeFrom}</td>
                      <td>{s.timeTo}</td>
                      <td>{s.notificationTime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
export { AdminUserPage, AdminSettingPage };