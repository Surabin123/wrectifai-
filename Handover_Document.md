# WrectifAI - Complete Handover Document

## 1. Introduction
Welcome to the WrectifAI platform. This handover document is designed to provide a comprehensive, easy-to-understand guide to the system, detailing the core features, workflows, and access credentials. Even if you have no prior knowledge of the project, this document will help you understand the entire system completely.

## 2. Project Architecture & Stack
WrectifAI is built as an advanced monorepo containing three main parts:
- **Backend API**: Node.js (Express & PostgreSQL)
- **Web Portal**: Next.js (React)
- **Mobile App**: React Native (Expo)

---

## 3. Login Credentials & Demo Accounts
The system is equipped with predefined demo accounts to help you test the platform without registering. All demo accounts use the same OTP for login.

### Customer & Admin Access
- **Demo Customer (Surabin)**
  - Phone: `9876543210`
  - OTP: `123456`
- **Demo Admin (Test Admin)**
  - Phone: `0000000000`
  - OTP: `123456`

### Garage Access
All 12 of these demo garages have full garage functionality. You can log in using their respective phone numbers:

1. **Metro Auto Bay** - Phone: `9999999901`, OTP: `123456`
2. **Speed Motors** - Phone: `9999999902`, OTP: `123456`
3. **Elite Garage** - Phone: `9999999903`, OTP: `123456`
4. **Star Auto Care** - Phone: `9999999904`, OTP: `123456`
5. **Prime Mechanics** - Phone: `9999999905`, OTP: `123456`
6. **Ultimate Auto** - Phone: `9999999906`, OTP: `123456`
7. **Pro Fix Garage** - Phone: `9999999907`, OTP: `123456`
8. **Apex Motors** - Phone: `9999999908`, OTP: `123456`
9. **City Garage** - Phone: `9999999909`, OTP: `123456`
10. **Trust Auto** - Phone: `9999999910`, OTP: `123456`
11. **Quick Fix Motors** - Phone: `9999999911`, OTP: `123456`
12. **Auto Care Pro** - Phone: `9999999912`, OTP: `123456`

---

## 4. Platform Features & Sidebar Navigation
The platform has a rich sidebar navigation for the Customer Web Portal. Here is an explanation of what each feature does and whether it is powered by real or mock data.

- **Home**: The main dashboard overview showing quick actions, recent vehicles, and active service status. *(Real Data)*
- **WrectifAI Diagnose**: The core AI Engine feature. Users can describe their car issues (via text, image, or audio) to get a preliminary diagnosis. *(Real Data powered by AI Engine and PostgreSQL database)*
- **Services**: Browse available car repair and maintenance services. *(Mock Data - Sprint Pending)*
- **Shop**: An auto-parts and accessories marketplace. *(Mock Data - Sprint Pending)*
- **Garages**: Discover and view nearby registered garages. *(Mock Data UI, backed by Demo Garages in DB)*
- **Bookings**: Manage active and past service appointments. *(Mock Data - Sprint Pending)*
- **Quotes**: View and compare repair estimates from different garages. *(Mock Data - Sprint Pending)*
- **Vehicles**: Manage user's saved vehicles (add, edit, delete). *(Real Data)*
- **Offers**: View promotional discounts, referral links, and reward points. *(Mock Data)*
- **Car Tips**: Articles and maintenance tips to keep the vehicle in top shape. *(Mock Data)*
- **Wallet & Payments**: Manage digital wallet balance and past transactions. *(Mock Data - Sprint Pending)*
- **Profile**: Manage user account details and personal info. *(Real Data)*
- **Settings**: Adjust application preferences and notification settings. *(Real Data)*
- **Help & Support**: Customer service contact and FAQs. *(Mock Data)*

---

## 5. Core Workflows
### A. The AI Diagnosis Workflow (Completed)
This is the most advanced feature in the platform, acting as a two-stage diagnostic pipeline:
1. **Stage 1 (Questions)**: The user submits a problem. The system searches the database (using PostgreSQL Full-Text Search) against `known_issues`. It generates 3–5 targeted questions to narrow down the problem.
2. **Stage 2 (Final Diagnosis)**: The user answers the questions. They can also upload images or audio. The system processes images (via Groq Vision AI) and transcribes audio (via Whisper AI). The AI then evaluates everything, applies safety constraints, and provides a final diagnosis which is saved to the database.

### B. User Registration & Auth Workflow (Completed)
1. User enters their phone number on the login page.
2. System sends an OTP (mocked in demo mode as `123456`).
3. User verifies OTP and is logged into their specific role (Customer, Garage, or Admin). The system uses strict Role-Based Access Control (RBAC).

### C. Booking & Marketplace Workflow (Pending / Mocked)
1. After diagnosis, the user requests quotes from nearby garages.
2. Garages receive the request and submit price estimates.
3. The user compares quotes in the **Quotes** section, selects the best option, and confirms a **Booking**.
4. Payment is processed via Stripe (Implementation scheduled for upcoming sprints).

## 6. Implementation Status
- **Completed**: Core API, Database setup, Authentication, Vehicle Management, AI Diagnosis Engine.
- **Pending (Sprints 4-9)**: Bookings, Quotes, Marketplace Payments (Stripe), Real-time notifications. These pending sections currently utilize **Mock Data** in the UI to demonstrate the flow.

## 7. Developer Notes
- Do not use ORMs (Object-Relational Mappers). All database queries are raw SQL for performance.
- Any new backend APIs must go under `/api/v1`.
- The platform uses `Nx` to run all applications concurrently (`pnpm api`, `pnpm web`, `pnpm mobile`).
