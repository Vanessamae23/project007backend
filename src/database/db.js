import { initializeApp } from 'firebase/app';
import { getDatabase, child, get, ref, set, push, remove, orderByChild, startAt, endAt, query, equalTo } from 'firebase/database';
import { signInWithEmailAndPassword, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
import bcrypt from "bcryptjs";

// Now you can use bcrypt as usual, for example:
const saltRounds = 10;
const plainTextPassword = "your_password_here";
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
  return get(child(ref(db), "balance/" + uid + "/value/")).then((snapshot) => {
    if (snapshot.exists()) {
      return Number(snapshot.val());
    } else {
      return 0;
    }
  });
};

export const getUserPin = async (uid) => {
  return get(child(ref(db), "users/" + uid + "/hashed/")).then((snapshot) => {
    if (snapshot.exists()) {
      return (snapshot.val());
    } else {
      return 0;
    }
  });
};



export const setUserBalance = (uid, newValue) => {
  const balanceRef = ref(db, "balance/" + uid + "/value/");
  return set(balanceRef, newValue);
};

export const topupBalance = async (uid, amount) => {
  return getUserBalance(uid).then((balance) => {
    return setUserBalance(uid, balance + amount);
  });
};

export const transferAmount = async (senderUid, receiverUid, amount) => {
  return topupBalance(senderUid, -amount)
    .then(() => topupBalance(receiverUid, amount));
}

export const getUserOTP = async (uid) => {
  return get(child(ref(db), "otp/" + uid + "/value/")).then((snapshot) => {
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return "";
    }
  });
};

export const setUserOTP = (uid, newValue) => {
  const otpRef = ref(db, "otp/" + uid + "/value/");
  return set(otpRef, newValue);
};

function randomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const generateWalletId = (digits) => {
  let uuid = [];
  for (let i = 0; i < digits; i++) {
      uuid.push(Math.floor(Math.random() * 10));
  }
  return uuid.join('');
}

const setupSession = (uid) => {
  const session = randomString(20);
  const expiry = 1000 * 3600 * 24; // one day
  set(ref(db, 'sessions/' + session + '/'), {
    uid: uid,
    expiry: new Date().getTime() + expiry,
  });
  return session;
}

export const signIn = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then(async (res) => {
      // setup balance for existing users
      get(child(ref(db), "balance/" + res.user.uid + "/value/")).then(
        (snapshot) => {
          if (!snapshot.exists()) {
            set(ref(db, "balance/" + res.user.uid + "/value/"), 0);
          }
        });
      // setup session
      const session = setupSession(res.user.uid);
      return get(child(ref(db), 'users/' + res.user.uid + '/'))
        .then(snapshot => ({
          ...snapshot.val(),
          session: session,
        }));
    })
    .catch(() => 'failed');
}

async function checkWalletIdExists() {
    const walletSnapshot = await get(child(ref(db), 'wallet/'));

    if (walletSnapshot.exists()) {
      walletId = generateWalletId(12);
      await checkWalletIdExists(); // Recursive call to check the new walletId
    } else {
      return walletId;
    }
}

export const createUser = async (email, password, fullName, pin) => {
  let walletId = generateWalletId(12);

  let walletRef = ref(db, 'wallet/')

  // checkWalletIdExists()
  //   .then((res) => {
  //     // Use the walletId once it's confirmed to be unique
  //     console.log("Unique walletId:", walletId);
  //   })
  //   .catch((err) => {
  //     console.error("Error checking walletId:", err);
  //   });

    

  return createUserWithEmailAndPassword(auth, email, password)
    .then(async (credentials) => {
      const userRef = ref(db, "users/" + credentials.user.uid + "/");
      
      
      const hashedPass = await bcrypt.hash(pin, saltRounds);

      const data = {
        fullName: fullName,
        email: email,
        uid: credentials.user.uid,
        walletId : walletId,
        hashed: hashedPass
      }
      const walletData = {
        [data.uid]: walletId,
      };
  
      set(ref(db, "wallet/" + data.uid), walletData).then((res) => {
        console.log(res)
      }).catch((err) => console.log(err))
      
      const balanceRef = ref(db, 'balance/' + credentials.user.uid, '/value/')

      
      const session = setupSession(credentials.user.uid);
      return set(userRef, data)
        .then(() => set(balanceRef, 0))
        .then(() => ({
          ...data,
          session: session,
          walletId: walletId,
          message: 'success',
        }));
    })
    .catch((e) => ({
      message: e.message,
    }));
};

export const getUser = async (token) => {
  return get(child(ref(db), 'sessions/' + token + '/'))
    .then(snapshot => {
      if (snapshot.exists()) {
        if (new Date().getTime() > snapshot.val().expiry) {
          remove(ref(db, 'sessions/' + token));
          return null;
        }
        return get(child(ref(db), 'users/' + snapshot.val().uid + '/'))
          .then(snapshot => snapshot.val());
      } else {
        return null;
      }
    });
}

export const clearSession = async (session) => {
  const userNode = ref(db, 'sessions/' + session, '/');
  return remove(userNode)
    .then(() => ({
      message: 'success',
    }));
}

export const getUserFrom = async (email, name) => {
  if (email !== undefined) {
    return get(query(
      ref(db, 'users/'), 
      orderByChild('email'), 
      startAt(email), 
      endAt(email + "\uf8ff"),
    ))
      .then(snapshot => snapshot.val());
  } else {
    return get(query(
      ref(db, 'users/'),
      orderByChild('fullName'),
      startAt(name),
      endAt(name + "\uf8ff"),
    ))
      .then(snapshot => snapshot.val());
  }
}