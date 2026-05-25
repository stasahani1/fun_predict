import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAR_ft7SRFzl8mEH-c3wPYGHap0eno6psU",
  authDomain: "fun-predict.firebaseapp.com",
  projectId: "fun-predict",
  storageBucket: "fun-predict.firebasestorage.app",
  messagingSenderId: "607678203176",
  appId: "1:607678203176:web:0479f039443d0655d97c1d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
