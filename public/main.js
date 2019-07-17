function showError(err) {
  alert(err.message);
  console.error(err);
};

function updateProfile(user) {
  const $profileName = document.getElementById('profile-name');
  const $profileImage = document.getElementById('profile-image');
  const $followButton = document.getElementById('follow-button');

  const authUser = firebase.auth().currentUser;

  $profileName.href = `${user.uid}`;
  $profileName.innerText = user.displayName || user.name ||  '';
  $profileImage.src = user.photoURL;

  if (authUser.uid === user.uid) {
    $followButton.style.display = 'none';
  } else {
    $followButton.style.display = '';
  }
}

async function initAuth() {
  const auth = firebase.auth();
  const db = firebase.firestore();

  const $app = document.getElementById('app');
  const $load = document.getElementById('load');
  const $authButton = document.getElementById('auth-button');
  const $appTl = document.getElementById('app-tl');

  let loginUser = null;
  let loaded = false;

  auth.onAuthStateChanged(user => {
    if(!loaded) {
      loaded = true;
      $load.style.display =  'none';
      $app.style.display = '';
    }
    console.log('@@@', user);

    loginUser = user;
    // loginBtnText
    if (user) {
      $authButton.innerText = 'Logout';
      $appTl.style.display = 'flex';

      updateProfile(user);

      // DBのユーザーIDに保存 db.collection('users').doc(user.uid).set()
      db.collection('users').doc(user.uid).set({
          name: user.displayName,
          photoURL: user.photoURL,
      }).catch(showError);

      initPost().catch(showError);
      initTimeline().catch(showError);
      // initProfile().catch(showError);

    } else {
      $authButton.innerText = 'Login';
    }
  })

  $authButton.addEventListener('click', () => {
    if(loginUser) {
      auth.signOut();
      return;
    }
    // Google プロバイダ オブジェクトのインスタンスを作成 => Googleアカウントを利用してログイン
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
  })
  try {
    const result = await auth.getRedirectResult();
  } catch(err) {
    alert(err.message);
    console.error(err);
  }
}

async function initPost() {
  const auth = firebase.auth();
  const db = firebase.firestore();

  const $postBox = document.getElementById('post-box');
  const $post = document.getElementById('post');
  const $postButton = document.getElementById('post-button');

  // 現在のユーザー
  const user = auth.currentUser;
  const userRef = db.collection('users').doc(user.uid);

  $postButton.addEventListener('click', async () => {
    // 二重投稿の予防(ボタンをクリックしたら投稿無効)
    $post.disabled = true;
    $postButton.disabled = true;

    const text = $post.value;
    const postRef = userRef.collection('timeline').doc();
    try {
      await postRef.set({
        uid: user.uid,
        // = text: text,
        text,
        // サーバーの時間で作成日時ををDBに登録
        created: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      showError(err);
    } finally {
      // 初期化
      $post.value = '';
      $post.disabled = false;
      $postButton.disabled = false;
    }
  })
}

// 投稿を表示するためのviewを作る処理
function getProfilePageId() {
  const hash = location.hash;
  if (!hash) {
    return;
  }
  return hash.slice(1)
}

async function createPostEl(doc) {
  const db = doc.ref.firestore
  const data = doc.data();
  const userRef = db.collection('users').doc(data.uid);
  const tmpl = document.querySelector('#post-template');
  const $el = document.importNode(tmpl.content, true);
  const $container = $el.querySelector('div');

  $container.id = 'post-' + doc.id;

  $el.querySelector('div').id = 'post-' + doc.id;

  const profileSnap = await userRef.get();
  const profile = profileSnap.data();

  // 投稿者名前
  const $name = $el.querySelector('.name');
  $name.innerText = profile.name || '';
  $name.href = `#${profileSnap.id}`

  // 投稿者アイコン
  const $icon = $el.querySelector('.icon');
  $icon.src = profile.photoURL;

  const $text = $el.querySelector('.text');
  if (data.text) {
    $text.innerText = data.text;
  }

  const $time = $el.querySelector('.time');
  let created = new Date();
  // DBにタイムデータがあれば上書き
  if (data.created) {
    created = data.created.toDate();
  }
  $time.innerText = `${created.getFullYear()}/${created.getMonth() + 1}/${created.getDate()} ${created.getHours()}:${created.getMinutes()}`;
  $container.dataset.created = created.getTime();

  return $el;
}

async function initTimeline() {

  const auth = firebase.auth();
  const db = firebase.firestore();

  const user = auth.currentUser;
  const userRef = db.collection('users').doc(user.uid);
  const tlRef = userRef.collection('timeline');

  const $tl = document.getElementById('tl');

  function sortTl() {
    [].slice.call(document.querySelectorAll('#tl div'))
      .map(dom => {
        const value = dom.dataset.created;
        return { dom, value };
      })
      .sort((a, b) => { return b.value - a.value; })
      .forEach(v => { $tl.appendChild(v.dom); });
  }

  function subscribeTL() {
    const uid = getProfilePageId();
    let ref = tlRef;
    if (uid) {
      ref = db.collection('users')
        .doc(uid)
        .collection('timeline')
        .where('uid', '==', uid);
    }
    return ref.orderBy('created').limit(50).onSnapshot(async snap => {
      snap.docChanges().forEach(async change => {
        if (change.type === 'added') {
          const $post = await createPostEl(change.doc);
          $tl.insertBefore($post, $tl.firstChild);
          sortTl();
        } else if (change.type === 'removed') {
          const $post = $tl.querySelector(`#post-${change.doc.id}`);
          $post.parentNode.removeChild($post);
        }
      });
    });
  };

  let unsubscribe = subscribeTL();
  window.addEventListener('hashchange', async () => {
    unsubscribe();
    $tl.innerText = '';
    unsubscribe = subscribeTL();
  });
}

async function main() {
  await initAuth();
}

document.addEventListener('DOMContentLoaded', function() {
  main().catch(err => console.error(err));
})

