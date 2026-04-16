import { Application } from 'express';
import authRoutes from './auth.routes';
import articleRoutes from './article.routes';
import categoryRoutes from './category.route';
import contactRoutes from './contact.route';
import userRoutes from './user.routes';
import medicalRecordRoutes from './medical-record.route';
import prescriptionRoutes from './prescription.route';
import patientRoutes from './patient.routes';
import medicalRoutes from './medical-service.routes';
import doctorRoutes from './doctor.routes';
import departmentRoutes from './department.routes';
import scheduleRoutes from './schedule.routes';
import roomRoutes from './room.routes';
import adminuserRoutes from './adminuser.routes';
import statisticsRoutes from './statistics.routes';
import emergencyContactRoutes from './emergency-contact.routes';
import healthInsuranceRoutes from './health-insurance.routes';
import uploadRoutes from './upload.routes';
import autofillRoutes from './autofill.routes';
import invoiceRoutes from './invoice.routes';
import paymentRoutes from './payment.routes';
import vnpayRoutes from './vnpay.routes';
import chatRoutes from './chat.routes';
import { authenticateToken } from '@src/middleware/auth.middleware';
import appointmentRoutes from './appointment.routes';
import notificationRoutes from './notification.routes';
import ehrRoutes from './ehr.routes';
import visitRoutes from './visit.routes';
import medicineRoutes from './medicine.routes';
import serviceUsageRoutes from './service-usage.routes';

export default function router(app: Application) {
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/doctors', doctorRoutes);
    app.use('/api/v1/users', userRoutes);
    app.use('/api/v1/medical-records', medicalRecordRoutes);
    app.use('/api/v1/prescriptions', prescriptionRoutes);
    app.use('/api/v1/departments', departmentRoutes);
    app.use('/api/v1/medical-services', medicalRoutes);
    app.use('/api/v1/contacts', contactRoutes);
    app.use('/api/v1/articles', articleRoutes);
    app.use('/api/v1/categories', categoryRoutes);
    app.use('/api/v1/ehr', authenticateToken(), ehrRoutes);
    app.use('/api/v1/schedules', scheduleRoutes);
    app.use('/api/v1/statistics', authenticateToken(), statisticsRoutes);
    app.use('/api/v1/patients', authenticateToken(), patientRoutes);
    app.use('/api/v1/rooms', authenticateToken(), roomRoutes);
    app.use('/api/v1/medicines', medicineRoutes);
    app.use('/api/v1/adminusers', authenticateToken(), adminuserRoutes);
    app.use(
        '/api/v1/emergency-contacts',
        authenticateToken(),
        emergencyContactRoutes
    );
    app.use(
        '/api/v1/health-insurances',
        authenticateToken(),
        healthInsuranceRoutes
    );
    app.use('/api/v1/uploads', uploadRoutes);
    app.use('/api/v1/autofill', autofillRoutes);
    app.use('/api/v1/invoices', invoiceRoutes);
    app.use('/api/v1/payments', paymentRoutes);
    app.use('/api/v1/vnpay', vnpayRoutes);
    app.use('/api/v1/chat', authenticateToken(), chatRoutes);
    app.use('/api/v1/appointments', authenticateToken(), appointmentRoutes);
    app.use('/api/v1/notifications', notificationRoutes);
    app.use('/api/v1/visits', visitRoutes);
    app.use('/api/v1/service-usages', serviceUsageRoutes);
}
