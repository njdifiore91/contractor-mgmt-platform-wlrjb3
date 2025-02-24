const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const userRoutes = require('./routes/user.routes');

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: 'http://localhost:8080', // Allow frontend dev server
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email'],
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Register routes
app.use('/api', userRoutes.router);

// Dummy data
const equipmentData = [
  {
    id: 1,
    serialNumber: 'EQ001',
    name: 'Test Kit Pro',
    type: 'TEST_KIT',
    condition: 'Good',
    status: 'available',
    purchaseDate: '2023-01-01',
    lastMaintenanceDate: '2024-01-01',
    notes: 'Regular maintenance performed',
  },
  {
    id: 2,
    serialNumber: 'EQ002',
    name: 'Inspector Tablet',
    type: 'TEST_KIT',
    condition: 'Excellent',
    status: 'assigned',
    purchaseDate: '2023-02-15',
    lastMaintenanceDate: '2024-02-01',
    notes: 'Software updated',
  },
];

const assignments = [
  {
    id: 1,
    equipmentId: 2,
    inspectorId: 1,
    assignedDate: '2024-01-15',
    status: 'active',
  },
];

// Routes
app.get('/api/equipment', (req, res) => {
  res.json(equipmentData);
});

app.get('/api/equipment/:id', (req, res) => {
  const equipment = equipmentData.find((e) => e.id === parseInt(req.params.id));
  if (!equipment) {
    return res.status(404).json({ error: 'Equipment not found' });
  }
  res.json(equipment);
});

app.post('/api/equipment', (req, res) => {
  const newEquipment = {
    id: equipmentData.length + 1,
    ...req.body,
    status: 'available',
  };
  equipmentData.push(newEquipment);
  res.status(201).json(newEquipment);
});

app.put('/api/equipment/:id', (req, res) => {
  const index = equipmentData.findIndex((e) => e.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Equipment not found' });
  }
  equipmentData[index] = { ...equipmentData[index], ...req.body };
  res.json(equipmentData[index]);
});

app.get('/api/equipment/assignments', (req, res) => {
  res.json(assignments);
});

app.post('/api/equipment/assignments', (req, res) => {
  const newAssignment = {
    id: assignments.length + 1,
    ...req.body,
    assignedDate: new Date().toISOString().split('T')[0],
    status: 'active',
  };
  assignments.push(newAssignment);

  // Update equipment status
  const equipment = equipmentData.find((e) => e.id === req.body.equipmentId);
  if (equipment) {
    equipment.status = 'assigned';
  }

  res.status(201).json(newAssignment);
});

app.put('/api/equipment/assignments/:id/return', (req, res) => {
  const assignment = assignments.find((a) => a.id === parseInt(req.params.id));
  if (!assignment) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  assignment.status = 'returned';
  assignment.returnDate = new Date().toISOString().split('T')[0];

  // Update equipment status
  const equipment = equipmentData.find((e) => e.id === assignment.equipmentId);
  if (equipment) {
    equipment.status = 'available';
  }

  res.json(assignment);
});

// Start server with error handling
app
  .listen(port, () => {
    console.log(`Server running on port ${port}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please use a different port.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
