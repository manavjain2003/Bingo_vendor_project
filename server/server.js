require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const roleRoutes = require('./routes/roleRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const availabilityRoutes = require("./routes/availabilityRoutes")
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const openapiSpec = YAML.load(path.join(__dirname, 'api', 'openapi.yaml'));

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use('/vendors', vendorRoutes);
app.use('/auth', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/services', availabilityRoutes);
app.use('/services', serviceRoutes);
app.use('/roles', roleRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);

// Connecting to MongoDB
connectDB();

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});