💰 Expense Tracker Web Application

A full-stack personal finance management app that helps you track income, expenses, visualize analytics, and stay in control of your finances. Built with the MERN stack (MongoDB, Express.js, Node.js, Vanilla JS), it includes authentication, transaction history, and insightful charts.

<img width="1127" height="667" alt="image" src="https://github.com/user-attachments/assets/7f73c213-38f5-4bc1-b466-0c5f9912342b" />

<img width="1143" height="550" alt="image" src="https://github.com/user-attachments/assets/d92e4c60-a834-4b83-beb5-162a1b80c5e6" />

<img width="1167" height="658" alt="image" src="https://github.com/user-attachments/assets/1d0e9d44-0d4f-448e-8b8e-a09f2fc7fee8" />

<img width="1170" height="706" alt="image" src="https://github.com/user-attachments/assets/2a88922d-a3b9-4a9c-b56e-ed7dcaeec6f8" />




🔑 Features

- 🔐 User Authentication – Secure sign-up and login with JWT
- 💳 Transaction Management – Add, edit, delete income and expenses
- 📊 Analytics Dashboard – Visual breakdown of expenses by category and month
- 🧾 Transaction History – Filterable view of all past transactions
- 📱 Responsive UI – Optimized for mobile and desktop devices
- 🔒 Security – Encrypted password storage and token-based route protection

 🛠️ Tech Stack

| Layer         | Tech Used                             |
|---------------|----------------------------------------|
| Frontend      | HTML, CSS, JavaScript (ES6+), Chart.js |
| Backend       | Node.js, Express.js                    |
| Database      | MongoDB, Mongoose                      |
| Auth & Security | JWT, bcryptjs                        |
| Dev Tools     | Postman, Git, Chrome DevTools          |

 📁 Folder Structure


expense-tracker/
├── public/                  # Static frontend files
│   ├── css/                 # Stylesheets
│   ├── js/                  # JS modules (auth, dashboard, analytics)
│   ├── images/              # App screenshots or icons
│   └── *.html               # Main HTML files
├── server/                  # Backend source
│   ├── config/              # MongoDB connection config
│   ├── models/              # Mongoose schemas for User & Transaction
│   ├── routes/              # Express API routes
│   ├── middleware/          # JWT auth middleware
│   └── server.js            # Entry point to start the server
├── .env                     # Environment config
├── package.json             # Node dependencies
└── README.md                # You're reading it!

🚀 Getting Started

✅ Prerequisites
- Node.js v14 or higher
- MongoDB (Local or MongoDB Atlas)

⚙️ Installation

1. Clone the repo

   git clone https://github.com/your-username/expense-tracker.git
   cd expense-tracker

2. Install backend dependencies

   npm install

3. Set up `.env`
   
   Create a `.env` file in the root directory:

   PORT=5000
   MONGO_URI=mongodb://localhost:27017/expense-tracker
   JWT_SECRET=your_super_secret


4. Start the server
   
   npm run dev
   

5. Access the App
   Visit (http://localhost:5000) in your browser.

🔄 API Endpoints

🧍 Authentication

| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| POST   | `/api/auth/register`   | Register a new user      |
| POST   | `/api/auth/login`      | Login user, get JWT      |
| GET    | `/api/auth/user`       | Get logged-in user info  |

💵 Transactions

| Method | Endpoint                        | Description                         |
|--------|----------------------------------|-------------------------------------|
| GET    | `/api/transactions`             | Get all transactions                |
| POST   | `/api/transactions`             | Add a new transaction               |
| PUT    | `/api/transactions/:id`         | Edit a transaction by ID            |
| DELETE | `/api/transactions/:id`         | Delete a transaction by ID          |
| GET    | `/api/transactions/analytics`   | Get summary data for analytics      |

🧠 Usage Guide

1. Register/Login
   Secure your account with email and password. JWT tokens ensure private data access.

2. View Dashboard
   See your current balance, income vs expense chart, and recent activity.

3. Add/Edit/Delete Transactions 
   Select transaction type, enter amount, category, description, and date.

4. Analyze Spending 
   Get monthly charts and category-wise breakdowns to understand your habits.

5. Filter Transaction History
   Find transactions quickly using filters for category, date, and type.

🎨 Customization

Update Categories

Modify income/expense categories in `public/js/transactions.js`:

const categories = {
  income: ['Salary', 'Freelance', 'Investments'],
  expense: ['Groceries', 'Food & Dining', 'Transportation', 'Rent', 'Utilities']
};

Change Theme Colors

Modify CSS variables in `public/css/style.css`:

:root {
  --primary-color: #4a69bd;
  --income-color: #6ab04c;
  --expense-color: #eb4d4b;
}

🌟 Future Enhancements

- 💰 Budget planner with alerts
- 🔁 Recurring transactions
- 📱 Native mobile app (iOS/Android)
- 📷 Receipt scanning & OCR
- 🌐 Bank sync & currency conversion
- 📤 Export reports (PDF/CSV)
