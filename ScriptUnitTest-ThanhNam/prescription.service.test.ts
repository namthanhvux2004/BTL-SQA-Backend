// __tests__/prescription.service.test.js
const prescriptionService = require('@src/services/prescription.service').default;
const prescriptionDao = require('@src/daos/prescription.dao');
const visitDao = require('@src/daos/visit.dao');
const prisma = require('@src/config/prisma').default;
const { CustomError, ErrorType } = require('@src/core/Error');

// Mock dependencies
jest.mock('@src/daos/prescription.dao');
jest.mock('@src/daos/visit.dao');
jest.mock('@src/config/prisma', () => ({
    __esModule: true,
    default: {
        medicineUsage: {
            updateMany: jest.fn(),
        },
    },
}));

describe('Prescription Service', () => {
    let mockUserId;
    let mockPrescription;
    let mockVisit;
    let mockMedicineUsage;

    beforeEach(() => {
        jest.clearAllMocks();

        // mockUserId phải trùng với doctorId để validateVisitForPrescription pass
        mockUserId = 'doctor-456';
        mockVisit = {
            id: 'visit-123',
            status: 'in_progress',
            doctorId: 'doctor-456',
            patientUserId: 'patient-789',
        };
        mockPrescription = {
            id: 'prescription-123',
            visitId: 'visit-123',
            visit: mockVisit,
            createdByUserId: 'doctor-456',
            paid: false,
            medicineUsages: [],
        };
        mockMedicineUsage = {
            id: 'medicine-usage-123',
            prescriptionId: 'prescription-123',
            medicineId: 'medicine-456',
            drugName: 'Paracetamol',
            quantity: 2,
            price: 5000,
            isPurchased: false,
        };
    });

    describe('createPrescription', () => {
        const createData = {
            visitId: 'visit-123',
            medicines: [
                {
                    drugName: 'Paracetamol',
                    quantity: 2,
                    price: 5000,
                },
            ],
        };

        it('should successfully create a prescription', async () => {
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.createPrescription.mockResolvedValue(mockPrescription);

            const result = await prescriptionService.createPrescription(
                mockUserId,
                createData
            );

            expect(visitDao.findVisitById).toHaveBeenCalledWith('visit-123');
            expect(prescriptionDao.createPrescription).toHaveBeenCalledWith(
                mockUserId,
                expect.objectContaining({
                    visitId: 'visit-123',
                    medicines: expect.any(Array),
                })
            );
            expect(result).toEqual(mockPrescription);
        });

        it('should throw error when visit is not found', async () => {
            visitDao.findVisitById.mockResolvedValue(null);

            await expect(
                prescriptionService.createPrescription(mockUserId, createData)
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.createPrescription(mockUserId, createData)
            ).rejects.toMatchObject({
                type: ErrorType.NOT_FOUND,
                message: 'Visit not found',
            });
        });

        it('should throw error when visit is completed', async () => {
            mockVisit.status = 'completed';
            visitDao.findVisitById.mockResolvedValue(mockVisit);

            await expect(
                prescriptionService.createPrescription(mockUserId, createData)
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.createPrescription(mockUserId, createData)
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
                message: 'Cannot create or modify prescription for completed visit',
            });
        });

        it('should throw error when visit is cancelled', async () => {
            mockVisit.status = 'cancelled';
            visitDao.findVisitById.mockResolvedValue(mockVisit);

            await expect(
                prescriptionService.createPrescription(mockUserId, createData)
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.createPrescription(mockUserId, createData)
            ).rejects.toMatchObject({
                type: ErrorType.BAD_REQUEST,
                message: 'Cannot create or modify prescription for cancelled visit',
            });
        });

        it('should throw error when user is not assigned doctor', async () => {
            // Dùng userId khác với doctorId để trigger FORBIDDEN
            visitDao.findVisitById.mockResolvedValue(mockVisit);

            await expect(
                prescriptionService.createPrescription('non-doctor-user', createData)
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.createPrescription('non-doctor-user', createData)
            ).rejects.toMatchObject({
                type: ErrorType.FORBIDDEN,
                message: 'You are not the assigned doctor for this visit',
            });
        });
    });

    describe('getPrescriptionById', () => {
        it('should return prescription when found', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);

            const result = await prescriptionService.getPrescriptionById(
                'prescription-123'
            );

            expect(prescriptionDao.findPrescriptionById).toHaveBeenCalledWith(
                'prescription-123'
            );
            expect(result).toEqual(mockPrescription);
        });

        it('should throw error when prescription not found', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(null);

            await expect(
                prescriptionService.getPrescriptionById('prescription-123')
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.getPrescriptionById('prescription-123')
            ).rejects.toMatchObject({
                type: ErrorType.NOT_FOUND,
                message: 'Prescription not found',
            });
        });
        it('should allow access when userId matches doctorId', async () => {
            mockPrescription.visit.doctorId = 'doctor-456';
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);

            const result = await prescriptionService.getPrescriptionById(
                'prescription-123',
                'doctor-456'
            );

            expect(result).toEqual(mockPrescription);
        });

        it('should allow access when userId matches patientUserId', async () => {
            mockPrescription.visit.patientUserId = 'patient-789';
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);

            const result = await prescriptionService.getPrescriptionById(
                'prescription-123',
                'patient-789'
            );

            expect(result).toEqual(mockPrescription);
        });

        it('should throw error when user has no access', async () => {
            mockPrescription.createdByUserId = 'different-user';
            mockPrescription.visit.doctorId = 'different-doctor';
            mockPrescription.visit.patientUserId = 'different-patient';
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);

            await expect(
                prescriptionService.getPrescriptionById('prescription-123', 'unauthorized-user')
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.getPrescriptionById('prescription-123', 'unauthorized-user')
            ).rejects.toMatchObject({
                type: ErrorType.FORBIDDEN,
                message: 'You do not have access to this prescription',
            });
        });
    });

    describe('getPrescriptionsByVisitId', () => {
        it('should return prescriptions when visit exists', async () => {
            const mockPrescriptions = [mockPrescription];
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.findPrescriptionsByVisitId.mockResolvedValue(
                mockPrescriptions
            );

            const result = await prescriptionService.getPrescriptionsByVisitId(
                'visit-123'
            );

            expect(visitDao.findVisitById).toHaveBeenCalledWith('visit-123');
            expect(prescriptionDao.findPrescriptionsByVisitId).toHaveBeenCalledWith(
                'visit-123'
            );
            expect(result).toEqual(mockPrescriptions);
        });

        it('should throw error when visit not found', async () => {
            visitDao.findVisitById.mockResolvedValue(null);

            await expect(
                prescriptionService.getPrescriptionsByVisitId('visit-123')
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.getPrescriptionsByVisitId('visit-123')
            ).rejects.toMatchObject({
                type: ErrorType.NOT_FOUND,
                message: 'Visit not found',
            });
        });
    });

    describe('updatePrescription', () => {
        const updateData = { paid: true };

        it('should successfully update prescription', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.updatePrescription.mockResolvedValue({
                ...mockPrescription,
                paid: true,
            });

            const result = await prescriptionService.updatePrescription(
                'prescription-123',
                mockUserId,
                updateData
            );

            expect(prescriptionDao.findPrescriptionById).toHaveBeenCalledWith(
                'prescription-123'
            );
            expect(visitDao.findVisitById).toHaveBeenCalledWith('visit-123');
            expect(prescriptionDao.checkPrescriptionOwnership).toHaveBeenCalledWith(
                'prescription-123',
                mockUserId
            );
            expect(prescriptionDao.updatePrescription).toHaveBeenCalledWith(
                'prescription-123',
                updateData
            );
            expect(result.paid).toBe(true);
        });

        it('should throw error when prescription not found', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(null);

            await expect(
                prescriptionService.updatePrescription(
                    'prescription-123',
                    mockUserId,
                    updateData
                )
            ).rejects.toThrow(CustomError);
        });

        it('should throw error when user is not owner', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(false);

            await expect(
                prescriptionService.updatePrescription(
                    'prescription-123',
                    mockUserId,
                    updateData
                )
            ).rejects.toThrow(CustomError);
            await expect(
                prescriptionService.updatePrescription(
                    'prescription-123',
                    mockUserId,
                    updateData
                )
            ).rejects.toMatchObject({
                type: ErrorType.FORBIDDEN,
                message: 'You do not have permission to update this prescription',
            });
        });
    });

    describe('updatePrescriptionWithMedicines', () => {
        const medicines = [
            {
                medicineId: 'medicine-456',
                quantity: 3,
                drugName: 'Paracetamol',
            },
        ];

        it('should successfully replace all medicines', async () => {
            const updatedPrescription = { ...mockPrescription };
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.replaceMedicineUsages.mockResolvedValue(
                updatedPrescription
            );

            const result = await prescriptionService.updatePrescriptionWithMedicines(
                'prescription-123',
                mockUserId,
                medicines
            );

            expect(prescriptionDao.findPrescriptionById).toHaveBeenCalledWith(
                'prescription-123'
            );
            expect(prescriptionDao.replaceMedicineUsages).toHaveBeenCalledWith(
                'prescription-123',
                medicines
            );
            expect(result).toEqual(updatedPrescription);
        });

        it('should throw error when prescription not found', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(null);

            await expect(
                prescriptionService.updatePrescriptionWithMedicines(
                    'prescription-123',
                    mockUserId,
                    medicines
                )
            ).rejects.toThrow(CustomError);
        });

        it('should throw error when user is not owner', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(false);

            await expect(
                prescriptionService.updatePrescriptionWithMedicines(
                    'prescription-123',
                    mockUserId,
                    medicines
                )
            ).rejects.toThrow(CustomError);
        });
    });

    describe('deletePrescription', () => {
        it('should successfully delete prescription', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.deletePrescription.mockResolvedValue(mockPrescription);

            const result = await prescriptionService.deletePrescription(
                'prescription-123',
                mockUserId
            );

            expect(prescriptionDao.deletePrescription).toHaveBeenCalledWith(
                'prescription-123'
            );
            expect(result).toEqual(mockPrescription);
        });

        it('should throw error when prescription not found', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(null);

            await expect(
                prescriptionService.deletePrescription('prescription-123', mockUserId)
            ).rejects.toThrow(CustomError);
        });

        it('should throw error when user is not owner', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(false);

            await expect(
                prescriptionService.deletePrescription('prescription-123', mockUserId)
            ).rejects.toThrow(CustomError);
        });
    });

    describe('getPrescriptionsList', () => {
        const mockQuery = {
            page: '1',
            limit: '10',
            sortBy: 'createdAt',
            sortOrder: 'desc',
        };

        const mockResult = {
            data: [mockPrescription],
            pagination: {
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3,
            },
        };

        it('should return paginated prescriptions with default params', async () => {
            prescriptionDao.getPrescriptions.mockResolvedValue(mockResult);

            const result = await prescriptionService.getPrescriptionsList(mockQuery);

            expect(prescriptionDao.getPrescriptions).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc',
            });
            expect(result).toEqual({
                data: mockResult.data,
                metadata: {
                    page: 1,
                    limit: 10,
                    totalItems: 25,
                    totalPages: 3,
                    hasPrev: false,
                    hasNext: true,
                },
            });
        });

        it('should handle filters correctly', async () => {
            const queryWithFilters = {
                ...mockQuery,
                visitId: 'visit-123',
                // paid được truyền vào service dạng string, service chỉ gán thẳng vào filters
                paid: 'true' as any,
                fromDate: '2024-01-01T00:00:00Z',
                toDate: '2024-12-31T23:59:59Z',
            };

            prescriptionDao.getPrescriptions.mockResolvedValue(mockResult);

            await prescriptionService.getPrescriptionsList(queryWithFilters);

            expect(prescriptionDao.getPrescriptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    page: 1,
                    limit: 10,
                    visitId: 'visit-123',
                    fromDate: expect.any(Date),
                    toDate: expect.any(Date),
                })
            );
        });

        it('should handle paid filter (string passthrough)', async () => {
            const queryWithPaid = {
                ...mockQuery,
                paid: 'false' as any,
            };

            prescriptionDao.getPrescriptions.mockResolvedValue(mockResult);

            await prescriptionService.getPrescriptionsList(queryWithPaid);

            // Service gán paid trực tiếp mà không transform, nên nhận dạng string
            expect(prescriptionDao.getPrescriptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    page: 1,
                    limit: 10,
                    paid: 'false',
                })
            );
        });
    });

    describe('getMedicineUsagesByPrescriptionId', () => {
        it('should return medicine usages when prescription exists', async () => {
            const mockMedicineUsages = [mockMedicineUsage];
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            prescriptionDao.findMedicineUsagesByPrescriptionId.mockResolvedValue(
                mockMedicineUsages
            );

            const result = await prescriptionService.getMedicineUsagesByPrescriptionId(
                'prescription-123'
            );

            expect(prescriptionDao.findPrescriptionById).toHaveBeenCalledWith(
                'prescription-123'
            );
            expect(
                prescriptionDao.findMedicineUsagesByPrescriptionId
            ).toHaveBeenCalledWith('prescription-123');
            expect(result).toEqual(mockMedicineUsages);
        });
    });

    describe('createMedicineUsage', () => {
        const createMedicineData = {
            drugName: 'Paracetamol',
            quantity: 2,
            price: 5000,
        };

        it('should successfully create medicine usage', async () => {
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.createMedicineUsage.mockResolvedValue(mockMedicineUsage);

            const result = await prescriptionService.createMedicineUsage(
                'prescription-123',
                mockUserId,
                createMedicineData
            );

            expect(prescriptionDao.findPrescriptionById).toHaveBeenCalledWith(
                'prescription-123'
            );
            expect(prescriptionDao.createMedicineUsage).toHaveBeenCalledWith(
                'prescription-123',
                createMedicineData
            );
            expect(result).toEqual(mockMedicineUsage);
        });
    });

    describe('updateMedicineUsage', () => {
        const updateData = {
            medicineId: 'new-medicine',
            quantity: 5,
        };

        it('should successfully update medicine usage', async () => {
            prescriptionDao.findMedicineUsageById.mockResolvedValue(
                mockMedicineUsage
            );
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.updateMedicineUsage.mockResolvedValue({
                ...mockMedicineUsage,
                ...updateData,
            });

            const result = await prescriptionService.updateMedicineUsage(
                'medicine-usage-123',
                mockUserId,
                updateData
            );

            expect(prescriptionDao.findMedicineUsageById).toHaveBeenCalledWith(
                'medicine-usage-123'
            );
            expect(prescriptionDao.updateMedicineUsage).toHaveBeenCalledWith(
                'medicine-usage-123',
                updateData
            );
            expect(result.quantity).toBe(5);
        });
    });

    describe('deleteMedicineUsage', () => {
        it('should successfully delete medicine usage', async () => {
            prescriptionDao.findMedicineUsageById.mockResolvedValue(
                mockMedicineUsage
            );
            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.deleteMedicineUsage.mockResolvedValue(mockMedicineUsage);

            const result = await prescriptionService.deleteMedicineUsage(
                'medicine-usage-123',
                mockUserId
            );

            expect(prescriptionDao.deleteMedicineUsage).toHaveBeenCalledWith(
                'medicine-usage-123'
            );
            expect(result).toEqual(mockMedicineUsage);
        });
    });

    describe('addMedicinesToPrescription', () => {
        const medicines = [
            {
                medicineId: 'medicine-456',
                drugName: 'Paracetamol',
                quantity: 2,
                price: 5000,
            },
            {
                medicineId: 'medicine-789',
                drugName: 'Ibuprofen',
                quantity: 1,
                price: 10000,
            },
        ];

        it('should successfully add medicines to prescription', async () => {
            const createdUsages = medicines.map((m, index) => ({
                id: `usage-${index}`,
                ...m,
                prescriptionId: 'prescription-123',
            }));

            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.batchCreateMedicineUsages.mockResolvedValue(
                createdUsages
            );

            const result = await prescriptionService.addMedicinesToPrescription(
                'prescription-123',
                mockUserId,
                medicines
            );

            expect(prescriptionDao.batchCreateMedicineUsages).toHaveBeenCalledWith(
                'prescription-123',
                medicines
            );
            expect(result).toEqual(createdUsages);
        });

        it('should merge medicines with same ID', async () => {
            const medicinesWithDuplicate = [
                {
                    medicineId: 'medicine-456',
                    drugName: 'Paracetamol',
                    quantity: 2,
                    price: 5000,
                },
                {
                    medicineId: 'medicine-456',
                    drugName: 'Paracetamol',
                    quantity: 3,
                    price: 5000,
                },
            ];

            prescriptionDao.findPrescriptionById.mockResolvedValue(mockPrescription);
            visitDao.findVisitById.mockResolvedValue(mockVisit);
            prescriptionDao.checkPrescriptionOwnership.mockResolvedValue(true);
            prescriptionDao.batchCreateMedicineUsages.mockResolvedValue([]);

            await prescriptionService.addMedicinesToPrescription(
                'prescription-123',
                mockUserId,
                medicinesWithDuplicate
            );

            // Verify that batchCreateMedicineUsages was called with merged medicines
            const callArg = prescriptionDao.batchCreateMedicineUsages.mock.calls[0][1];
            expect(callArg).toHaveLength(1);
            expect(callArg[0].quantity).toBe(5);
        });
    });

    describe('togglePurchaseMedicines', () => {
        it('should successfully mark medicines as purchased', async () => {
            const medicineIds = ['usage-1', 'usage-2', 'usage-3'];
            const mockUpdateResult = { count: 3 };

            prisma.medicineUsage.updateMany.mockResolvedValue(mockUpdateResult);

            const result = await prescriptionService.togglePurchaseMedicines(
                medicineIds
            );

            expect(prisma.medicineUsage.updateMany).toHaveBeenCalledWith({
                where: {
                    id: {
                        in: medicineIds,
                    },
                },
                data: {
                    isPurchased: true,
                },
            });
            expect(result).toEqual(mockUpdateResult);
        });

        it('should handle empty array', async () => {
            const mockUpdateResult = { count: 0 };
            prisma.medicineUsage.updateMany.mockResolvedValue(mockUpdateResult);

            const result = await prescriptionService.togglePurchaseMedicines([]);

            expect(prisma.medicineUsage.updateMany).toHaveBeenCalledWith({
                where: {
                    id: {
                        in: [],
                    },
                },
                data: {
                    isPurchased: true,
                },
            });
            expect(result.count).toBe(0);
        });
    });
});