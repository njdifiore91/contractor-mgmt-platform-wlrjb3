const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { router: userRoutes } = require('./routes/user.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
    specifications: {
      manufacturer: 'TestTech Inc.',
      model: 'Pro X1',
      calibrationDue: '2024-06-01',
      warranty: '2025-01-01',
    },
    maintenanceHistory: [
      {
        id: 1,
        date: '2024-01-01',
        type: 'Regular',
        technician: 'Mike Johnson',
        notes: 'Annual calibration and maintenance',
      },
      {
        id: 2,
        date: '2023-07-15',
        type: 'Repair',
        technician: 'Sarah Smith',
        notes: 'Display unit replaced',
      },
    ],
    documents: [
      {
        id: 1,
        type: 'Manual',
        name: 'User Guide',
        url: 'https://example.com/manuals/eq001',
      },
      {
        id: 2,
        type: 'Certificate',
        name: 'Calibration Certificate',
        url: 'https://example.com/certificates/eq001',
      },
    ],
  },
  {
    id: 2,
    serialNumber: 'EQ002',
    name: 'Inspector Tablet',
    type: 'TEST_KIT',
    condition: 'Excellent',
    status: 'in_use',
    purchaseDate: '2023-02-15',
    lastMaintenanceDate: '2024-02-01',
    notes: 'Software updated',
    specifications: {
      manufacturer: 'TabletCorp',
      model: 'Inspector Pro 12',
      calibrationDue: '2024-08-15',
      warranty: '2025-02-15',
    },
    maintenanceHistory: [
      {
        id: 1,
        date: '2024-02-01',
        type: 'Software',
        technician: 'Tech Support',
        notes: 'System software updated to version 2.1',
      },
    ],
    documents: [
      {
        id: 1,
        type: 'Manual',
        name: 'Quick Start Guide',
        url: 'https://example.com/manuals/eq002',
      },
    ],
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

// Inspector mock data
const inspectorData = [
  {
    id: 1,
    userId: 1,
    firstName: 'John',
    lastName: 'Smith',
    status: 'AVAILABLE',
    location: { latitude: 32.7767, longitude: -96.797 },
    badgeNumber: 'B12345',
    certifications: [
      {
        id: 1,
        inspectorId: 1,
        name: 'API Level 2',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-001',
        issueDate: '2024-01-01',
        expiryDate: '2025-12-31',
        isActive: true,
      },
    ],
    drugTests: [
      {
        id: 1,
        inspectorId: 1,
        testDate: '2025-02-01',
        result: 'Negative',
        notes: 'Regular screening',
      },
    ],
    lastMobilizedDate: null,
    lastDrugTestDate: '2025-02-01',
    isActive: true,
    createdAt: '2023-01-01',
    modifiedAt: null,
  },
  {
    id: 2,
    userId: 2,
    firstName: 'Jane',
    lastName: 'Doe',
    status: 'INACTIVE',
    location: { latitude: 32.8967, longitude: -96.82 },
    badgeNumber: 'B12346',
    certifications: [
      {
        id: 2,
        inspectorId: 2,
        name: 'API Level 1',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-002',
        issueDate: '2024-02-01',
        expiryDate: '2025-12-31',
        isActive: true,
      },
    ],
    drugTests: [
      {
        id: 2,
        inspectorId: 2,
        testDate: '2025-01-15',
        result: 'Negative',
        notes: 'Pre-mobilization screening',
      },
    ],
    lastMobilizedDate: null,
    lastDrugTestDate: '2025-01-15',
    isActive: true,
    createdAt: '2023-01-15',
    modifiedAt: null,
  },
  {
    id: 3,
    userId: 3,
    firstName: 'Michael',
    lastName: 'Johnson',
    status: 'AVAILABLE',
    location: { latitude: 32.9552, longitude: -96.827 },
    badgeNumber: 'B12347',
    certifications: [
      {
        id: 3,
        inspectorId: 3,
        name: 'API Level 3',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-003',
        issueDate: '2023-03-01',
        expiryDate: '2023-12-31',
        isActive: false,
      },
    ],
    drugTests: [
      {
        id: 3,
        inspectorId: 3,
        testDate: '2023-06-20',
        result: 'Negative',
        notes: 'Random screening',
      },
    ],
    lastMobilizedDate: null,
    lastDrugTestDate: '2023-06-20',
    isActive: true,
    createdAt: '2023-02-01',
    modifiedAt: null,
  },
  {
    id: 4,
    userId: 4,
    firstName: 'Sarah',
    lastName: 'Williams',
    status: 'SUSPENDED',
    location: { latitude: 32.8123, longitude: -96.9485 },
    badgeNumber: 'B12348',
    certifications: [
      {
        id: 4,
        inspectorId: 4,
        name: 'API Level 2',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-004',
        issueDate: '2023-01-15',
        expiryDate: '2024-01-15',
        isActive: false,
      },
    ],
    drugTests: [
      {
        id: 4,
        inspectorId: 4,
        testDate: '2023-12-01',
        result: 'Positive',
        notes: 'Random screening - Failed',
      },
    ],
    lastMobilizedDate: '2023-11-15',
    lastDrugTestDate: '2023-12-01',
    isActive: false,
    createdAt: '2023-01-10',
    modifiedAt: '2023-12-01',
  },
  {
    id: 5,
    userId: 5,
    firstName: 'Robert',
    lastName: 'Brown',
    status: 'AVAILABLE',
    location: { latitude: 33.1234, longitude: -96.789 },
    badgeNumber: 'B12349',
    certifications: [
      {
        id: 5,
        inspectorId: 5,
        name: 'API Level 2',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-005',
        issueDate: '2023-04-01',
        expiryDate: '2024-04-01',
        isActive: true,
      },
      {
        id: 6,
        inspectorId: 5,
        name: 'AWS CWI',
        issuingAuthority: 'AWS',
        certificationNumber: 'CWI-001',
        issueDate: '2023-03-15',
        expiryDate: '2024-03-15',
        isActive: true,
      },
    ],
    drugTests: [
      {
        id: 5,
        inspectorId: 5,
        testDate: '2023-11-15',
        result: 'Negative',
        notes: 'Annual screening',
      },
    ],
    lastMobilizedDate: '2023-10-01',
    lastDrugTestDate: '2023-11-15',
    isActive: true,
    createdAt: '2023-03-01',
    modifiedAt: '2023-11-15',
  },
  {
    id: 6,
    userId: 6,
    firstName: 'Emily',
    lastName: 'Davis',
    status: 'MOBILIZED',
    location: { latitude: 32.9876, longitude: -96.5432 },
    badgeNumber: 'B12350',
    certifications: [
      {
        id: 7,
        inspectorId: 6,
        name: 'API Level 1',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-006',
        issueDate: '2023-05-01',
        expiryDate: '2024-05-01',
        isActive: true,
      },
      {
        id: 8,
        inspectorId: 6,
        name: 'NACE Level 2',
        issuingAuthority: 'NACE',
        certificationNumber: 'NACE-001',
        issueDate: '2023-04-15',
        expiryDate: '2024-04-15',
        isActive: true,
      },
    ],
    drugTests: [
      {
        id: 6,
        inspectorId: 6,
        testDate: '2023-12-15',
        result: 'Negative',
        notes: 'Pre-mobilization screening',
      },
    ],
    lastMobilizedDate: '2023-12-20',
    lastDrugTestDate: '2023-12-15',
    isActive: true,
    createdAt: '2023-04-01',
    modifiedAt: '2023-12-20',
  },
  {
    id: 7,
    userId: 7,
    firstName: 'David',
    lastName: 'Miller',
    status: 'INACTIVE',
    location: { latitude: 32.8765, longitude: -96.6543 },
    badgeNumber: 'B12351',
    certifications: [
      {
        id: 9,
        inspectorId: 7,
        name: 'API Level 2',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-007',
        issueDate: '2023-02-01',
        expiryDate: '2024-02-01',
        isActive: false,
      },
    ],
    drugTests: [
      {
        id: 7,
        inspectorId: 7,
        testDate: '2023-09-01',
        result: 'Negative',
        notes: 'Last screening before inactive status',
      },
    ],
    lastMobilizedDate: '2023-08-15',
    lastDrugTestDate: '2023-09-01',
    isActive: false,
    createdAt: '2023-01-20',
    modifiedAt: '2023-09-15',
  },
  {
    id: 8,
    userId: 8,
    firstName: 'Lisa',
    lastName: 'Wilson',
    status: 'AVAILABLE',
    location: { latitude: 33.0123, longitude: -96.4567 },
    badgeNumber: 'B12352',
    certifications: [
      {
        id: 10,
        inspectorId: 8,
        name: 'API Level 3',
        issuingAuthority: 'ASNT',
        certificationNumber: 'CERT-008',
        issueDate: '2024-06-01',
        expiryDate: '2025-12-31',
        isActive: true,
      },
      {
        id: 11,
        inspectorId: 8,
        name: 'NACE Level 3',
        issuingAuthority: 'NACE',
        certificationNumber: 'NACE-002',
        issueDate: '2024-05-15',
        expiryDate: '2025-12-31',
        isActive: true,
      },
    ],
    drugTests: [
      {
        id: 8,
        inspectorId: 8,
        testDate: '2023-12-10',
        result: 'Negative',
        notes: 'Random screening',
      },
    ],
    lastMobilizedDate: '2023-11-01',
    lastDrugTestDate: '2023-12-10',
    isActive: true,
    createdAt: '2023-05-01',
    modifiedAt: '2023-12-10',
  },
];

// Customer mock data
const customerData = [
  {
    id: 1,
    code: 'CUST001',
    name: 'Acme Corporation',
    region: 'North',
    status: 'ACTIVE',
    contactPerson: 'John Doe',
    email: 'john.doe@acme.com',
    phone: '+1-555-0123',
    address: '123 Business Ave, Dallas, TX',
    createdAt: '2024-01-01',
    modifiedAt: null,
  },
  {
    id: 2,
    code: 'CUST002',
    name: 'Beta Industries',
    region: 'South',
    status: 'ACTIVE',
    contactPerson: 'Jane Smith',
    email: 'jane.smith@beta.com',
    phone: '+1-555-0124',
    address: '456 Industry Blvd, Houston, TX',
    createdAt: '2024-01-15',
    modifiedAt: null,
  },
  {
    id: 3,
    code: 'CUST003',
    name: 'Gamma Services',
    region: 'East',
    status: 'INACTIVE',
    contactPerson: 'Bob Wilson',
    email: 'bob.wilson@gamma.com',
    phone: '+1-555-0125',
    address: '789 Service St, Miami, FL',
    createdAt: '2024-02-01',
    modifiedAt: '2024-03-01',
  },
  {
    id: 4,
    code: 'CUST004',
    name: 'Delta Corp',
    region: 'West',
    status: 'PENDING',
    contactPerson: 'Alice Brown',
    email: 'alice.brown@delta.com',
    phone: '+1-555-0126',
    address: '321 Corporate Dr, Los Angeles, CA',
    createdAt: '2024-02-15',
    modifiedAt: null,
  },
  {
    id: 5,
    code: 'CUST005',
    name: 'Epsilon Tech',
    region: 'North',
    status: 'ACTIVE',
    contactPerson: 'Charlie Green',
    email: 'charlie.green@epsilon.com',
    phone: '+1-555-0127',
    address: '654 Tech Park, Chicago, IL',
    createdAt: '2024-03-01',
    modifiedAt: null,
  },
];

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Routes
app.get('/api/v1/equipment', (req, res) => {
  res.json(equipmentData);
});

app.get('/api/v1/equipment/:id', (req, res) => {
  const equipment = equipmentData.find((e) => e.id === parseInt(req.params.id));
  if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
  res.json(equipment);
});

app.post('/api/v1/equipment', (req, res) => {
  const newEquipment = {
    id: equipmentData.length + 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
  };
  equipmentData.push(newEquipment);
  res.status(201).json(newEquipment);
});

app.put('/api/v1/equipment/:id', (req, res) => {
  const index = equipmentData.findIndex((e) => e.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Equipment not found' });
  equipmentData[index] = {
    ...equipmentData[index],
    ...req.body,
    modifiedAt: new Date().toISOString(),
  };
  res.json(equipmentData[index]);
});

app.get('/api/v1/equipment/assignments', (req, res) => {
  res.json(assignments);
});

app.post('/api/v1/equipment/assignments', (req, res) => {
  const newAssignment = {
    id: assignments.length + 1,
    ...req.body,
    status: 'active',
    assignedDate: new Date().toISOString(),
  };
  assignments.push(newAssignment);

  // Update equipment status
  const equipment = equipmentData.find((e) => e.id === newAssignment.equipmentId);
  if (equipment) {
    equipment.status = 'in_use';
  }

  res.status(201).json(newAssignment);
});

app.put('/api/v1/equipment/assignments/:id/return', (req, res) => {
  // First find the active assignment for this equipment
  const assignment = assignments.find(
    (a) => a.equipmentId === parseInt(req.params.id) && a.status === 'active'
  );

  if (!assignment) {
    return res.status(404).json({ error: 'No active assignment found for this equipment' });
  }

  // Update assignment status
  assignment.status = 'returned';
  assignment.returnDate = new Date().toISOString().split('T')[0];
  assignment.returnCondition = req.body.returnCondition;
  assignment.notes = req.body.notes;

  // Update equipment status
  const equipment = equipmentData.find((e) => e.id === assignment.equipmentId);
  if (equipment) {
    equipment.status = 'available';
    equipment.condition = req.body.returnCondition;
  }

  res.json(assignment);
});

// Inspector routes
app.get('/api/v1/inspectors', (req, res) => {
  res.json(inspectorData);
});

app.get('/api/v1/inspectors/search', (req, res) => {
  const { latitude, longitude, radiusInMiles, status, certifications, isActive } = req.query;

  let filteredInspectors = [...inspectorData];

  // Filter by status if provided
  if (status) {
    console.log('Status filter:', status); // Debug log
    const statusArray = Array.isArray(status) ? status : status.split(',');
    console.log('Status array:', statusArray); // Debug log
    filteredInspectors = filteredInspectors.filter((inspector) =>
      statusArray.map((s) => s.toLowerCase()).includes(inspector.status.toLowerCase())
    );
  }

  // Filter by active status if provided
  if (isActive !== undefined && isActive !== null) {
    const isActiveBoolean = isActive === 'true';
    filteredInspectors = filteredInspectors.filter(
      (inspector) => inspector.isActive === isActiveBoolean
    );
  }

  // Filter by certifications if provided
  if (certifications) {
    const requiredCerts = Array.isArray(certifications) ? certifications : [certifications];
    filteredInspectors = filteredInspectors.filter((inspector) =>
      inspector.certifications.some((cert) => requiredCerts.includes(cert.name) && cert.isActive)
    );
  }

  // Filter by location and radius if provided
  if (latitude !== undefined && longitude !== undefined && radiusInMiles) {
    const lat = parseFloat(latitude) || 32.7767; // Default to Dallas coordinates
    const lon = parseFloat(longitude) || -96.797;
    const radius = parseFloat(radiusInMiles) || 50;

    filteredInspectors = filteredInspectors.filter((inspector) => {
      const distance = calculateDistance(
        lat,
        lon,
        inspector.location.latitude,
        inspector.location.longitude
      );
      return distance <= radius;
    });
  }

  // Log the search parameters and results count for debugging
  console.log('Search parameters:', {
    latitude: latitude || 'not provided',
    longitude: longitude || 'not provided',
    radiusInMiles: radiusInMiles || 'not provided',
    status: status || 'not provided',
    certifications: certifications || 'not provided',
    isActive: isActive || 'not provided',
  });
  console.log('Results count:', filteredInspectors.length);

  res.json({
    items: filteredInspectors,
    totalCount: filteredInspectors.length,
    searchParams: {
      latitude: latitude || 32.7767,
      longitude: longitude || -96.797,
      radiusInMiles: radiusInMiles || 50,
      status,
      isActive,
    },
  });
});

app.get('/api/v1/inspectors/:id', (req, res) => {
  const inspector = inspectorData.find((i) => i.id === parseInt(req.params.id));
  if (!inspector) {
    return res.status(404).json({ error: 'Inspector not found' });
  }
  res.json(inspector);
});

app.post('/api/v1/inspectors/:id/mobilize', (req, res) => {
  const inspector = inspectorData.find((i) => i.id === parseInt(req.params.id));
  if (!inspector) {
    return res.status(404).json({ error: 'Inspector not found' });
  }

  if (inspector.status !== 'AVAILABLE') {
    return res.status(400).json({ error: 'Inspector is not available for mobilization' });
  }

  inspector.status = 'MOBILIZED';
  inspector.lastMobilizedDate = new Date().toISOString().split('T')[0];
  inspector.modifiedAt = new Date().toISOString();

  res.json(inspector);
});

app.post('/api/v1/inspectors/:id/drug-tests', (req, res) => {
  const inspector = inspectorData.find((i) => i.id === parseInt(req.params.id));
  if (!inspector) {
    return res.status(404).json({ error: 'Inspector not found' });
  }

  const newDrugTest = {
    id: (inspector.drugTests.length || 0) + 1,
    ...req.body,
    inspectorId: inspector.id,
    testDate: new Date().toISOString().split('T')[0],
  };

  inspector.drugTests.push(newDrugTest);
  inspector.lastDrugTestDate = newDrugTest.testDate;
  inspector.modifiedAt = new Date().toISOString();

  res.status(201).json(newDrugTest);
});

// Customer routes
app.get('/api/v1/customers', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = (req.query.search || '').toLowerCase();
  const region = (req.query.region || '').toLowerCase();
  const status = (req.query.status || '').toUpperCase();
  const sortBy = req.query.sortBy || 'name';
  const sortOrder = req.query.sortOrder || 'asc';

  let filteredCustomers = [...customerData];

  // Apply search filter
  if (search) {
    filteredCustomers = filteredCustomers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(search) ||
        customer.code.toLowerCase().includes(search) ||
        customer.contactPerson.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.phone.toLowerCase().includes(search)
    );
  }

  // Apply region filter
  if (region) {
    filteredCustomers = filteredCustomers.filter(
      (customer) => customer.region.toLowerCase() === region
    );
  }

  // Apply status filter
  if (status) {
    filteredCustomers = filteredCustomers.filter((customer) => customer.status === status);
  }

  // Apply sorting
  filteredCustomers.sort((a, b) => {
    const aValue = String(a[sortBy] || '').toLowerCase();
    const bValue = String(b[sortBy] || '').toLowerCase();
    const modifier = sortOrder === 'asc' ? 1 : -1;
    return aValue.localeCompare(bValue) * modifier;
  });

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  res.json({
    items: paginatedCustomers,
    total: filteredCustomers.length,
    page,
    limit,
    totalPages: Math.ceil(filteredCustomers.length / limit),
  });
});

app.get('/api/v1/customers/:id', (req, res) => {
  const customer = customerData.find((c) => c.id === parseInt(req.params.id));
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

app.post('/api/v1/customers', (req, res) => {
  const newCustomer = {
    id: customerData.length + 1,
    ...req.body,
    createdAt: new Date().toISOString().split('T')[0],
    modifiedAt: null,
  };
  customerData.push(newCustomer);
  res.status(201).json(newCustomer);
});

app.put('/api/v1/customers/:id', (req, res) => {
  const index = customerData.findIndex((c) => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  customerData[index] = {
    ...customerData[index],
    ...req.body,
    modifiedAt: new Date().toISOString().split('T')[0],
  };
  res.json(customerData[index]);
});

app.delete('/api/v1/customers/:id', (req, res) => {
  const index = customerData.findIndex((c) => c.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  customerData.splice(index, 1);
  res.status(204).send();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/audit', auditRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Using in-memory dummy data storage');
});
