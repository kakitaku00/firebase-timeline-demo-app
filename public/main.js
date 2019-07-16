async function initAuth() {
  const auth = firebase.auth();

  const $app = document.getElementById('app');
  const $load = document.getElementById('load');

  const $authButton = document.getElementById('auth-button');

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
    } else {
      $authButton.innerText = 'Login';
    }
  })

  $authButton.addEventListener('click', () => {
    if(loginUser) {
      auth.signOut();
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);

    await db.collection('users').doc(user.uid).set({
      name: user.displayNmae,
      photoURL: user.photoURL
    })
  })

  try {
    const result = await auth.getRedirectResult();
  } catch(err) {
    alert(err.message);
    console.error(err);
  }
}


async function main() {
  await initAuth();
}

document.addEventListener('DOMContentLoaded', function() {
  main().catch(err => console.error(err));
})

