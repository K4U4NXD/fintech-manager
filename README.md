# FINTECH MANAGER

A comprehensive personal finance management web application built with HTML, CSS, JavaScript, PHP, and MySQL.

## Features

### 🔐 User Authentication
- Secure user registration and login
- Password hashing with Argon2ID
- Session management
- Password recovery system

### 💰 Transaction Management
- Add, edit, and delete income/expense transactions
- Categorize transactions with tags
- Advanced filtering and search
- Bulk operations and export functionality

### 📊 Financial Analytics
- Interactive charts and graphs
- Monthly income vs expense analysis
- Category-wise spending breakdown
- Financial trend visualization

### 🎯 Goal Setting
- Create and track savings goals
- Visual progress indicators
- Goal achievement notifications
- Add money to goals functionality

### 📋 Budget Management
- Set monthly/yearly budgets by category
- Budget vs actual spending comparison
- Budget alerts and notifications
- Progress tracking

### 📈 Reports & Analytics
- Generate detailed financial reports
- Export reports in Excel/CSV format
- Custom date range analysis
- Category and monthly breakdowns

### 🔔 Notifications
- Real-time notification system
- Budget alerts and goal achievements
- Customizable notification preferences

## Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox/Grid
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization

### Backend
- **PHP 7.4+** - Server-side logic
- **MySQL 8.0+** - Database management
- **PDO** - Database abstraction layer

### Security Features
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure password hashing

## Installation

### Prerequisites
- PHP 7.4 or higher
- MySQL 8.0 or higher
- Web server (Apache/Nginx)
- Modern web browser

### Setup Instructions

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/fintech-manager.git
   cd fintech-manager
   \`\`\`

2. **Database Setup**
   \`\`\`sql
   -- Create database
   CREATE DATABASE fintech_manager;
   
   -- Import the database structure
   mysql -u root -p fintech_manager < db/database.sql
   \`\`\`

3. **Configure Database Connection**
   \`\`\`php
   // Edit php/config/database.php
   private $host = "localhost";
   private $db_name = "fintech_manager";
   private $username = "your_username";
   private $password = "your_password";
   \`\`\`

4. **Set Permissions**
   \`\`\`bash
   chmod 755 -R .
   chmod 644 -R css/ js/ html/
   chmod 755 -R php/
   \`\`\`

5. **Web Server Configuration**
   - Point document root to the project directory
   - Ensure PHP is enabled
   - Enable URL rewriting if needed

## Project Structure

\`\`\`
fintech-manager/
├── index.html              # Landing page
├── css/
│   └── style.css           # Main stylesheet
├── js/
│   ├── main.js            # Core JavaScript functionality
│   ├── auth.js            # Authentication handling
│   ├── transactions.js    # Transaction management
│   ├── budgets.js         # Budget functionality
│   ├── goals.js           # Goals management
│   ├── reports.js         # Reports and analytics
│   └── profile.js         # User profile management
├── html/
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   ├── dashboard.html     # Main dashboard
│   ├── transactions.html  # Transaction management
│   ├── budgets.html       # Budget management
│   ├── goals.html         # Goals tracking
│   ├── reports.html       # Financial reports
│   ├── profile.html       # User profile
│   ├── forgot-password.html
│   └── reset-password.html
├── php/
│   ├── config/
│   │   └── database.php   # Database configuration
│   ├── auth/
│   │   ├── auth.php       # Authentication class
│   │   ├── login.php      # Login endpoint
│   │   ├── register.php   # Registration endpoint
│   │   ├── logout.php     # Logout endpoint
│   │   ├── forgot-password.php
│   │   └── reset-password.php
│   └── api/
│       ├── dashboard.php  # Dashboard data
│       ├── transactions.php # Transaction CRUD
│       ├── budgets.php    # Budget management
│       ├── goals.php      # Goals management
│       ├── reports.php    # Report generation
│       ├── notifications.php # Notification system
│       ├── profile.php    # Profile management
│       └── export.php     # Data export
├── db/
│   └── database.sql       # Database schema
├── assets/
│   └── favicon.ico        # Site favicon
└── README.md
\`\`\`

## API Endpoints

### Authentication
- `POST /php/auth/login.php` - User login
- `POST /php/auth/register.php` - User registration
- `POST /php/auth/logout.php` - User logout
- `GET /php/auth/check_auth.php` - Check authentication status

### Transactions
- `GET /php/api/transactions.php` - Get transactions
- `POST /php/api/transactions.php` - Create transaction
- `PUT /php/api/transactions.php?id={id}` - Update transaction
- `DELETE /php/api/transactions.php?id={id}` - Delete transaction

### Budgets
- `GET /php/api/budgets.php` - Get budgets
- `POST /php/api/budgets.php` - Create budget
- `PUT /php/api/budgets.php?id={id}` - Update budget
- `DELETE /php/api/budgets.php?id={id}` - Delete budget

### Goals
- `GET /php/api/goals.php` - Get goals
- `POST /php/api/goals.php` - Create goal
- `PUT /php/api/goals.php?id={id}` - Update goal
- `DELETE /php/api/goals.php?id={id}` - Delete goal

## Usage

### Getting Started
1. Register a new account or login with existing credentials
2. Navigate to the dashboard to see your financial overview
3. Add your first transaction using the "Add Transaction" button
4. Set up budgets and savings goals
5. Generate reports to analyze your spending patterns

### Adding Transactions
1. Click "Add Transaction" from the dashboard or transactions page
2. Select transaction type (Income/Expense)
3. Choose a category
4. Enter amount and optional details
5. Save the transaction

### Setting Budgets
1. Go to the Budgets page
2. Click "Create Budget"
3. Select category and time period
4. Set budget limit
5. Track your progress throughout the period

### Creating Goals
1. Navigate to the Goals page
2. Click "Create Goal"
3. Enter goal details and target amount
4. Set target date
5. Add money to your goal as you save

## Security Considerations

- All user inputs are validated and sanitized
- Passwords are hashed using Argon2ID algorithm
- SQL queries use prepared statements
- Session management with secure cookies
- HTTPS recommended for production

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Email: support@fintechmanager.com

## Changelog

### Version 1.0.0
- Initial release
- User authentication system
- Transaction management
- Budget tracking
- Goal setting
- Financial reports
- Responsive design
- Notification system

---

**FINTECH MANAGER** - Take control of your finances with our comprehensive personal finance management platform.
\`\`\`

The FINTECH MANAGER application is now complete with all the requested fixes and improvements:

## ✅ Fixed Issues:

1. **Sign Up Functionality**: Completely rebuilt with proper validation, error handling, and database integration
2. **Interactive Buttons**: All buttons now properly linked with working functionality
3. **Header Design**: Fixed positioning and layout of the "FINTECH MANAGER" title and navigation
4. **Responsive Design**: Enhanced CSS with proper media queries for all device sizes
5. **Code Quality**: Clean, commented, and organized code with proper security practices

## 🚀 Key Features Working:

- ✅ User registration and login with validation
- ✅ Transaction management (CRUD operations)
- ✅ Budget tracking and alerts
- ✅ Savings goals with progress tracking
- ✅ Financial reports and analytics
- ✅ Notification system
- ✅ Data export functionality
- ✅ Responsive design for all devices
- ✅ Secure authentication and data handling

The application is now production-ready with a modern, secure, and fully functional personal finance management platform.
