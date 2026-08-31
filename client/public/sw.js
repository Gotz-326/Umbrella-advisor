// self.addEventListener('push', (event) => {
//     console.log('プッシュ通知を受け取ったよ！');
//     alert('プッシュ通知を受け取ったよ！');
// })


// Service Workerの型定義を有効にするための宣言
//declare const self: ServiceWorkerGlobalScope;

// 1. Expressからのプッシュ通知を受け取るイベント
self.addEventListener('push', (event) => {
  console.log('プッシュ通知を受信したよ！');

  // デフォルトの通知内容
  let title = '雨予報アラート';
  let options = {
    body: '天気の情報を取得できませんでした。',
    icon: '/icon.png',
    badge: '/badge.png', // スマホのステータスバーに出る小さいアイコン
  };

  // Expressから送られてきたデータ（ペイロード）があれば解析する
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = {
        ...options,
        body: data.body || options.body,
        // ネイティブアプリっぽくするためにバイブレーションを鳴らす（ミリ秒単位）
        vibrate: [200, 100, 200], 
        // 通知にデータを埋め込んでおく（クリックされたときに使うよ）
        data: {
          url: data.url || '/'
        }
      };
    } catch (e) {
      console.error('データの解析に失敗:', e);
    }
  }

  // 表示処理が終わるまでService Workerを眠らせないようにするおまじない
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 2. ユーザーが通知をクリックしたときのイベント
self.addEventListener('notificationclick', (event) => {
  // ポップアップを閉じる
  event.notification.close();

  // 通知に埋め込んでおいたURL（なければトップページ）を取得
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    // すでにアプリのタブが開いているかチェックして、開いていればそこにフォーカス、なければ新しく開く
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
