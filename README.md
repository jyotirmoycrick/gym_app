# 🏋️‍♂️ FitDesert — Smart Gym Management & AI Fitness Assistant

FitDesert is a **full-stack gym management and fitness automation platform** that streamlines gym operations, attendance tracking, payments, and member engagement — powered by **AI**.

Built using **FastAPI**, **MongoDB**, and a stunning **React Native (Expo)** frontend, FitDesert allows gym owners, trainers, and members to **Train • Track • Transform** effortlessly.

---

## 🚀 Tech Stack

### 🧠 Backend
- **FastAPI (Python)** — high-performance REST API  
- **MongoDB (Motor)** — scalable async NoSQL database  
- **Razorpay API** — seamless payments & subscriptions  
- **OpenAI GPT-5** — AI fitness & nutrition assistant  
- **Emergent Auth + JWT** — secure authentication system  
- **Pydantic Models** — strict data validation  

### 📱 Frontend (Mobile App)
- **React Native (Expo Router)**  
- **Zustand** — global state management  
- **SecureStore** — token-based session storage  
- **react-native-chart-kit** — analytics & insights  
- **expo-camera** — QR-based attendance  
- **Razorpay Web Checkout** integration  
- **AI Chat Interface** for smart guidance  

---

## 💡 Core Features

### 🏢 Gym Manager
- Register and manage gyms  
- Add or assign members & trainers  
- Track attendance via QR codes  
- View analytics and export CSV reports  
- Manage subscriptions and trial plans  
- Process secure Razorpay payments  

### 🏋️ Trainers
- Manage assigned trainees  
- Create workout & diet plans  
- Track trainee progress  

### 🤸 Trainees
- Scan gym QR codes to mark attendance  
- Access AI-powered fitness assistant  
- View progress, payments & reports  
- Renew memberships easily  

### 👑 Admin
- Create and verify gyms  
- Activate or suspend gyms  
- Manage subscriptions globally  
- View overall analytics  

---

## 🧠 FitDesert AI Assistant

An intelligent in-app assistant powered by **OpenAI GPT-5**  
that can:
- Generate personalized workout and diet plans  
- Offer nutrition tips & guidance  
- Answer fitness-related questions  
- Provide motivational support  

> Integrated directly in the app — accessible to all users.

---

## ⚙️ Installation Guide

### 1️⃣ Clone Repository
```bash
git clone https://github.com/jyotirmoycrick/gym_app.git
cd gym_app

2️⃣ Backend Setup
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your MongoDB, Razorpay, and OpenAI keys
uvicorn server:app --reload

3️⃣ Frontend Setup
cd frontend
npm install
npx expo start

🔑 Environment Variables
Variable	Description
MONGO_URL	MongoDB connection string
DB_NAME	Database name
OPENAI_API_KEY	OpenAI GPT-5 key
RAZORPAY_KEY_ID	Razorpay key
RAZORPAY_KEY_SECRET	Razorpay secret
EXPO_PUBLIC_BACKEND_URL	Backend API base URL
💵 Subscription Plans
Plan	Price	Members	Features
Starter	₹99 / month	Up to 50	Basic reports & QR attendance
Professional	₹199 / month	Up to 200	Advanced analytics, SMS reminders
Enterprise	₹299 / month	Unlimited	24/7 support, automation tools

👨‍💻 Authors
Developed with ❤️ by
Jyotirmoy Malo & Somrik Sur

🛡️ License
This project is licensed under the MIT License — free to use, modify, and distribute.

⭐ Show Your Support
If you like this project, please star the repository and share it with your network.

“Built with passion by Jyotirmoy & Somrik to redefine gym automation.”


---

Would you like me to **add professional GitHub badges** (stars, forks, license, tech stack) at the top for a more eye-catching GitHub profile appearance?
