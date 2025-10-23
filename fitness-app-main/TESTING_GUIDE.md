# FitDesert Phase 1 Testing Guide

## Backend API Testing

### 1. User Registration (Gym Manager)
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@fitdesert.com","password":"password123","name":"John Manager","role":"gym_manager","phone":"9876543210"}'
```

### 2. User Registration (Trainee)
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"trainee@fitdesert.com","password":"password123","name":"Sarah Trainee","role":"trainee","phone":"9876543211"}'
```

### 3. Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@fitdesert.com","password":"password123"}'
```
**Save the session_token from response for next requests**

### 4. Register Gym (as Gym Manager)
```bash
curl -X POST http://localhost:8001/api/gyms/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"name":"FitDesert Mumbai","address":"123 Gym Street","city":"Mumbai","state":"Maharashtra","phone":"9876543210","email":"gym@fitdesert.com"}'
```

### 5. Get My Gym (as Gym Manager)
```bash
curl http://localhost:8001/api/gyms/my-gym \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### 6. AI Chat Test
```bash
curl -X POST http://localhost:8001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"message":"What are the best exercises for beginners?"}'
```

### 7. Health Check
```bash
curl http://localhost:8001/api/health
```

## Frontend (Mobile App) Testing

### Access URLs:
- **Mobile Web Preview**: Check Expo tunnel output for the preview URL
- **Expo Go App**: Scan the QR code shown in terminal

### Test Flows:

#### Flow 1: Gym Manager Registration & Login
1. Open app → Click "Register"
2. Fill in details, select "Gym Manager" role
3. Complete registration
4. Should navigate to Manager Dashboard
5. Register a gym using the dashboard
6. View gym QR code and stats

#### Flow 2: Trainee Registration & Login
1. Open app → Click "Register"
2. Fill in details, select "Trainee" role
3. Complete registration
4. Should navigate to Trainee Dashboard
5. View membership status (will be empty until gym manager adds you)

#### Flow 3: Google OAuth Login
1. Open app → Click "Login"
2. Click "Continue with Google"
3. Complete OAuth flow
4. Should redirect back to app and login

#### Flow 4: AI Assistant
1. Login as trainee
2. Navigate to "AI Assistant" tab
3. Ask fitness questions
4. Receive AI-powered responses

#### Flow 5: QR Attendance (Needs gym registered)
1. Login as trainee
2. Navigate to "Attendance" tab
3. Grant camera permission
4. Scan gym QR code
5. Attendance should be marked

## Phase 1 Features Implemented

✅ **Authentication:**
- JWT-based email/password login
- Emergent Google OAuth integration
- Session management with secure storage

✅ **Gym Management:**
- Gym registration
- QR code generation
- Dashboard with stats

✅ **Member Management:**
- Member profiles
- Membership tracking
- Dashboard views

✅ **QR-based Attendance:**
- QR scanning
- Attendance tracking
- History views

✅ **AI Fitness Assistant:**
- Chat interface
- OpenAI GPT-4 integration
- Fitness advice and tips

✅ **Role-Based Dashboards:**
- Gym Manager dashboard
- Trainee dashboard
- Tab navigation

## Known Limitations (Phase 1)

- Payment integration (Razorpay) is set up but needs testing with real keys
- Trainer role not implemented yet (Phase 2)
- Head Admin role not implemented yet (Phase 2)
- Workout/Diet plan management UI is basic
- No advanced analytics yet

## Next Steps for Phase 2

1. Add Trainer role and dashboard
2. Implement Head Admin dashboard
3. Complete workout/diet plan management UI
4. Add progress tracking charts
5. Implement payment flow with Razorpay
6. Add notifications and reminders
7. Add member management (add/edit/delete) UI for gym managers
8. Add attendance stats and reports

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
EMERGENT_LLM_KEY=sk-emergent-9FcF9EbC003D7819a5
RAZORPAY_KEY_ID=your_key_here (optional for Phase 1)
RAZORPAY_KEY_SECRET=your_secret_here (optional for Phase 1)
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://your-preview-url.com
EXPO_PACKAGER_PROXY_URL=(auto-configured)
EXPO_PACKAGER_HOSTNAME=(auto-configured)
```

## Troubleshooting

### Backend Issues
- Check logs: `tail -f /var/log/supervisor/backend.err.log`
- Restart: `sudo supervisorctl restart backend`

### Frontend Issues
- Check logs: `tail -f /var/log/supervisor/expo.out.log`
- Restart: `sudo supervisorctl restart expo`

### Database Issues
- Check MongoDB: `mongosh mongodb://localhost:27017/test_database`
- View collections: `db.getCollectionNames()`
