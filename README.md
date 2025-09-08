# Splitwise Clone

A full-stack web application for managing shared expenses among friends, built with Flask and React.

## Features

- User authentication (register/login)
- Create and manage groups
- Add and split expenses
- Track balances
- Record payments
- View expense history

## Tech Stack

- **Backend**: Python with Flask
- **Frontend**: React.js
- **Database**: SQLite (can be changed to PostgreSQL in production)
- **Authentication**: JWT (JSON Web Tokens)

## Setup Instructions

### Backend Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` as needed

4. Initialize the database:
   ```bash
   flask shell
   >>> db.create_all()
   >>> exit()
   ```

5. Run the Flask development server:
   ```bash
   flask run
   ```
   The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## API Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `GET /api/protected` - Example protected route (requires authentication)

## Project Structure

```
splitwise/
├── app.py                 # Main Flask application
├── models.py              # Database models
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables
├── .gitignore
└── README.md
```

## License

MIT
