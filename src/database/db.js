import { initializeApp } from 'firebase/app';
import { getDatabase, child, get, ref, set } from 'firebase/database';
import { signInWithEmailAndPassword, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
dotenv.config();

const app = initializeApp({
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.PUBLIC_MEASUREMENT_ID,
});

const db = getDatabase(app);
const auth = getAuth(app);

export const getUserBalance = async (uid) => {
  return get(child(ref(db), 'balance/' + uid + '/value/'))
    .then(snapshot => {
      if (snapshot.exists()) {
        return Number(snapshot.val());
      } else {
        return 0;
      }
    });
};

export const setUserBalance = (uid, newValue) => {
  const balanceRef = ref(db, 'balance/' + uid + '/value/');
  return set(balanceRef, newValue);
};

export const topupBalance = async (uid, amount) => {
  return getUserBalance(uid).then(balance => {
    return setUserBalance(uid, balance + amount);
  });
};

export const signIn = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then(async res => {
      // setup balance for existing users
      get(child(ref(db), 'balance/' + res.user.uid + '/value/'))
        .then(snapshot => {
          if (!snapshot.exists()) {
            set(ref(db, 'balance/' + res.user.uid + '/value/'), 0);
          }
        });
      return get(child(ref(db), 'users/' + res.user.uid + '/'))
        .then(snapshot => snapshot.val());
    })
    .catch(() => {
      return 'failed';
    });
}

export const createUser = async (email, password, fullName) => {
  return createUserWithEmailAndPassword(auth, email, password)
    .then(async credentials => {
      const userRef = ref(db, 'users/' + credentials.user.uid + '/');
      const data = {
        fullName: fullName,
        email: email,
        uid: credentials.user.uid,
      }
      const balanceRef = ref(db, 'balance/' + credentials.user.uid, '/value/')
      return set(userRef, data)
        .then(() => set(balanceRef, 0))
        .then(() => ({
          ...data,
          message: 'success',
        }));
    })
    .catch(() => ({
      message: 'email already in use',
    }));
}

export const isLoggedIn = async (uid) => {
  return get(child(ref(db), 'balance/' + uid + '/value/'))
    .then(snapshot => snapshot.exists());
}