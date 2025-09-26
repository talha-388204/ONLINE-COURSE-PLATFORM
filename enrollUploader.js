// enrollUploader.js
import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import fs from "fs";

// তোমার Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD4O6SHrpeDnzKMBWkudVFk1j1JoYiO3HY",
  authDomain: "calling-app-e7ad2.firebaseapp.com",
  projectId: "calling-app-e7ad2",
  storageBucket: "calling-app-e7ad2.firebasestorage.app",
  messagingSenderId: "241816266208",
  appId: "1:241816266208:web:16f60c06feb8919da83785"
};

// Firebase init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// JSON ফাইল পড়া
const raw = fs.readFileSync("./enrollments.json", "utf-8");
const seedData = JSON.parse(raw);

async function importEnrollments() {
  const enrollments = seedData.enrollments;
  for (const key in enrollments) {
    await setDoc(doc(db, "enrollments", key), enrollments[key]);
    console.log(`✅ Uploaded enrollment: ${enrollments[key].userId} → ${enrollments[key].courseId}`);
  }
  console.log("🎉 All enrollment seed data imported successfully!");
}

importEnrollments().catch(err => console.error("❌ Error:", err));
