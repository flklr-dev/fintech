# Financial Budgeting & Expense Tracker

A secure mobile application for managing finances with real-time tracking and insights.

## Project Structure

This project is divided into two main parts:

- **client**: React Native mobile application
- **server**: Node.js with Express.js backend

## Security Features

- AES-256 encryption for sensitive data
- OAuth2 for Single Sign-On (SSO)
- TLS 1.3 for all API endpoints
- Secure local data storage using SQLite with encryption
- Strong password policies and secure token management
- MongoDB for data storage with proper input validation
- AWS/GCP cloud infrastructure with KMS for key management
- IAM roles following the principle of least privilege

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- MongoDB (local or Atlas)
- React Native development environment
- Expo CLI

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/fintech
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRES_IN=7d
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Use the Expo client on your mobile device or emulator to view the app

## Development Guidelines

- Follow OWASP MASVS guidelines
- Implement MVVM architecture
- Keep security as a priority in all development activities
- Regular code reviews focusing on security vulnerabilities
- Integrate SAST/DAST tools in CI/CD pipeline

## Compliance

This application is designed to comply with:
- PCI DSS
- GDPR
- OWASP MASVS guidelines

## License

[MIT License](LICENSE)