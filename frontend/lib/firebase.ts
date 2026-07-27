import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyABZOmwmhvi6nb6BkE2Rlg0gexYCumWS8U",
  authDomain: "surepay-965a7.firebaseapp.com",
  projectId: "surepay-965a7",
  storageBucket: "surepay-965a7.firebasestorage.app",
  messagingSenderId: "287051631067",
  appId: "1:287051631067:web:432ad934cef9e17580fffe",
  measurementId: "G-XRM220GMHN",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
