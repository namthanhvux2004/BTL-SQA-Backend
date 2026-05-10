import prisma from '@src/config/prisma';

/**
 * Helper to fetch existing data from the database for testing without mocking.
 */
export class DbHelper {
  static async getAnyDoctorId(): Promise<string> {
    let doctor = await prisma.doctor.findFirst();
    if (doctor) return doctor.userId;
    return this.createFreshDoctor();
  }

  static async createFreshDoctor(): Promise<string> {
    const deptId = await this.getAnyDepartmentId();
    const user = await prisma.user.create({
      data: {
        username: `test_doc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email: `test_doc_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        password: 'password',
        roleId: 1,
        name: { create: { firstName: 'Test', lastName: 'Doctor' } },
        staff: {
          create: {
            departmentId: deptId,
            position: 'Doctor',
            joinTime: new Date(),
            doctor: {
              create: {
                specialization: 'General',
                experienceYears: 10,
                level: 'Senior'
              }
            }
          }
        }
      },
      include: { staff: { include: { doctor: true } } }
    });
    return user.staff!.doctor!.userId;
  }

  static async getAnyPatientId(): Promise<string> {
    let patient = await prisma.patient.findFirst();
    if (patient) return patient.userId;
    return this.createFreshPatient();
  }

  static async createFreshPatient(): Promise<string> {
    const user = await prisma.user.create({
      data: {
        username: `test_pat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        email: `test_pat_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
        password: 'password',
        roleId: 2,
        name: { create: { firstName: 'Test', lastName: 'Patient' } },
        patient: {
          create: {
            patientId: `PAT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            ehr: {
              create: {}
            }
          }
        }
      },
      include: { patient: { include: { ehr: true } } }
    });
    return user.patient!.userId;
  }

  static async getAnyDepartmentId(): Promise<number> {
    let department = await prisma.department.findFirst();
    if (!department) {
      department = await prisma.department.create({
        data: {
          name: 'General Medicine',
          description: 'General Medicine Department',
          code: `GEN-${Date.now()}`,
          type: 'clinical'
        }
      });
    }
    return department.id;
  }

  static async getAnyMedicalServiceId(doctorId?: string): Promise<string> {
    let service = await prisma.medicalService.findFirst({ where: { isActive: true } });
    if (!service) {
      const deptId = await this.getAnyDepartmentId();
      service = await prisma.medicalService.create({
        data: {
          name: 'General Checkup',
          price: 500000,
          durationMinutes: 30,
          isActive: true,
          departmentId: deptId
        }
      });
    }
    
    if (doctorId) {
      const existingDS = await prisma.doctorService.findUnique({
        where: { doctorId_medicalServiceId: { doctorId, medicalServiceId: service.id } }
      });
      if (!existingDS) {
        await prisma.doctorService.create({
          data: {
            doctorId,
            medicalServiceId: service.id,
            price: service.price,
            durationMinutes: service.durationMinutes,
            isActive: true
          }
        });
      }
    }
    return service.id;
  }

  static async getAnyRoomId(): Promise<string> {
    let room = await prisma.room.findFirst();
    if (!room) {
      // Need a building first
      let building = await prisma.building.findFirst();
      if (!building) {
        let hospital = await prisma.hospital.findFirst();
        if (!hospital) {
          hospital = await prisma.hospital.create({
            data: {
              name: 'Test Hospital',
              phone: '0123456789'
            }
          });
        }
        building = await prisma.building.create({
          data: {
            hospitalId: hospital.id,
            name: 'Building A',
            floorCount: 5
          }
        });
      }
      room = await prisma.room.create({
        data: {
          buildingId: building.id,
          name: 'Room 101',
          number_room: 101,
          floor: 1,
          type: 'examination'
        }
      });
    }
    return room.id;
  }

  static async getAnyScheduleId(doctorId?: string): Promise<string> {
    let schedule = await prisma.schedule.findFirst({
      where: doctorId ? { staffId: doctorId } : undefined,
    });
    if (!schedule) {
      const docId = doctorId || await this.getAnyDoctorId();
      const roomId = await this.getAnyRoomId();
      const deptId = await this.getAnyDepartmentId();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(17, 0, 0, 0);

      schedule = await prisma.schedule.create({
        data: {
          staffId: docId,
          roomId: roomId,
          departmentId: deptId,
          date: tomorrow,
          startTime: tomorrow,
          endTime: end,
          maxSlot: 10,
          status: 'confirmed'
        }
      });
    }
    return schedule.id;
  }

  static async getAnyVisitId(doctorId?: string): Promise<string> {
    let visit = await prisma.visit.findFirst({
      where: doctorId ? { doctorId } : { status: { not: 'completed' } },
    });
    if (!visit) {
      const patId = await this.getAnyPatientId();
      const docId = doctorId || await this.getAnyDoctorId();
      const patient = await prisma.patient.findUnique({ where: { userId: patId }, include: { ehr: true } });
      if (!patient || !patient.ehr) throw new Error('Patient or EHR missing for visit creation');
      
      visit = await prisma.visit.create({
        data: {
          ehrId: patient.ehr.id,
          patientUserId: patId,
          doctorId: docId,
          status: 'in_progress',
          type: 'new',
          startTime: new Date()
        }
      });
    }
    return visit.id;
  }

  static async getAnyMedicalRecordId(doctorId?: string): Promise<string> {
    let record = await prisma.medicalRecord.findFirst({
      where: doctorId ? { doctorId } : undefined,
    });
    if (!record) {
      const docId = doctorId || await this.getAnyDoctorId();
      const visitId = await this.getAnyVisitId(docId);
      record = await prisma.medicalRecord.create({
        data: {
          doctorId: docId,
          visitId: visitId,
          title: 'Initial Record',
          symptoms: 'None',
          diagnosis: 'Healthy',
          treatments: 'None'
        }
      });
    }
    return record.id;
  }

  static async getAnyAppointmentId(): Promise<string> {
    const appointment = await prisma.appointment.findFirst({ where: { status: 'pending' } });
    if (appointment) return appointment.id;
    return this.createPendingAppointment();
  }

  static async createPendingAppointment(): Promise<string> {
    const patId = await this.getAnyPatientId();
    const docId = await this.getAnyDoctorId();
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 7 + Math.random() * 10);
    startTime.setHours(10, 0, 0, 0);
    
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patId,
        doctorId: docId,
        startTime: startTime,
        reason: 'Test Appointment ' + Date.now(),
        status: 'pending'
      }
    });
    return appointment.id;
  }
}
