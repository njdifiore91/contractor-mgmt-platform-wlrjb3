# Dummy Backend for Equipment Management System

A simple Express.js backend that provides dummy endpoints for the equipment management system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will run on http://localhost:8000

## Available Endpoints

### Equipment

- `GET /api/v1/equipment` - Get all equipment
- `GET /api/v1/equipment/:id` - Get equipment by ID
- `POST /api/v1/equipment` - Create new equipment
- `PUT /api/v1/equipment/:id` - Update equipment

### Assignments

- `GET /api/v1/equipment/assignments` - Get all assignments
- `POST /api/v1/equipment/assignments` - Create new assignment
- `PUT /api/v1/equipment/assignments/:id/return` - Return equipment

## Data Format

### Equipment Object
```json
{
  "id": 1,
  "serialNumber": "EQ001",
  "name": "Test Kit Pro",
  "type": "TEST_KIT",
  "condition": "Good",
  "status": "available",
  "purchaseDate": "2023-01-01",
  "lastMaintenanceDate": "2024-01-01",
  "notes": "Regular maintenance performed"
}
```

### Assignment Object
```json
{
  "id": 1,
  "equipmentId": 2,
  "inspectorId": 1,
  "assignedDate": "2024-01-15",
  "status": "active"
} 