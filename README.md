# Contractor Management Platform

A modern web application for managing contractors, equipment, and inspections. This project uses Vue 3 with TypeScript for the frontend and includes a dummy backend for development purposes.

## Prerequisites

- Node.js (v16.x or higher)
- npm (v8.x or higher)
- Git

## Project Structure

```
contractor-mgmt-platform/
├── src/
│   ├── web/                 # Frontend application
│   │   ├── src/            # Source code
│   │   ├── dummy-backend/  # Mock backend server
│   │   └── package.json    # Frontend dependencies
│   └── README.md           # This file
```

## Setup Instructions

### 1. Install Dependencies

First, navigate to the frontend directory:

```bash
cd src/web
```

Install the frontend dependencies:

```bash
npm install or npm install --legacy-peer-deps
```

Install the dummy backend dependencies:

```bash
cd dummy-backend
npm install or npm install --legacy-peer-deps
```

### 2. Environment Configuration

Create a `.env` file in the `src/web` directory:

The `.env` file should contain:

```
VITE_APP_API_URL=http://localhost:3000
VITE_APP_API_VERSION=v1
```

### 3. Start the Development Servers

1. Start the dummy backend server (from the `src/web/dummy-backend` directory):

```bash
cd dummy-backend
npm run dev
```

The dummy backend will run on `http://localhost:3000`.

2. In a new terminal, start the frontend development server (from the `src/web` directory):

```bash
cd src/web
npm run dev
```

The frontend will run on `http://localhost:5173`.

## Accessing the Application

1. Open your browser and navigate to `http://localhost:5173`
2. You will be automatically logged in with a dummy user account:
   - Email: admin@example.com
   - Password: (not required for dummy backend)

## Available Features

- **User Management**

  - View list of users
  - Create new users
  - Edit existing users
  - Delete users
  - Role assignment

- **Audit Logs**

  - View system activity logs
  - Filter logs by type, action, and date
  - View detailed statistics

- **Equipment Management**

  - Track equipment inventory (laptops, mobile devices, tablets, test kits, safety gear, inspection tools)
  - View equipment details and history
  - Assign equipment to inspectors
  - Process equipment returns
  - Track equipment conditions and maintenance
  - Equipment status tracking (Available, In Use, Maintenance, Retired)
  - Maintenance scheduling and history
  - Equipment specifications and documentation

- **Inspector Management**
  - Inspector profile management
  - Geographic location tracking
  - Certification tracking
  - Drug test management and history
  - Equipment assignment history
  - Inspector status tracking (Available, Mobilized, Suspended)
  - Inspector mobilization workflow
  - Search inspectors by location (zip code and radius)
  - Track inspector qualifications and specialties

## Development Notes

- The dummy backend provides mock data and simulated API responses
- All API calls have a simulated delay to mimic real-world conditions
- Data is not persisted between server restarts
- The mock API follows RESTful conventions and returns properly structured responses

## API Endpoints

The dummy backend provides the following endpoints:

```
Users:
- GET    /api/v1/users
- POST   /api/v1/users
- PUT    /api/v1/users/:id
- DELETE /api/v1/users/:id

Audit Logs:
- GET    /api/v1/audit/logs
- POST   /api/v1/audit/logs
- GET    /api/v1/audit/statistics

Equipment:
- GET    /api/v1/equipment
- GET    /api/v1/equipment/:id
- POST   /api/v1/equipment
- PUT    /api/v1/equipment/:id
- POST   /api/v1/equipment/:id/assign
- POST   /api/v1/equipment/:id/return
- POST   /api/v1/equipment/:id/maintenance

Inspectors:
- GET    /api/v1/inspectors
- GET    /api/v1/inspectors/:id
- POST   /api/v1/inspectors
- PUT    /api/v1/inspectors/:id
- POST   /api/v1/inspectors/:id/drug-tests
- POST   /api/v1/inspectors/:id/mobilize
- POST   /api/v1/inspectors/:id/demobilize
- GET    /api/v1/inspectors/search
```

## Troubleshooting

1. If you see CORS errors:

   - Ensure both servers are running
   - Check that the `VITE_APP_API_URL` in `.env` matches the dummy backend URL

2. If the frontend can't connect to the backend:

   - Verify the dummy backend is running on port 3000
   - Check the console for any error messages

3. If changes aren't reflecting:
   - Clear your browser cache
   - Restart both development servers
