import emergencyContactDao from '@src/daos/emergencyContact.dao';
import { EmergencyContactDataDto } from '@src/dtos/emergency-contact.dto';
import { PaginationQuery } from '@src/types';

const getEmergencyContactById = (id: string) => {
    return emergencyContactDao.getEmergencyContactById(id);
};

const getEmergencyContactsByPatientId = async (
    patientId: string,
    queryParams?: PaginationQuery
) => {
    return emergencyContactDao.getEmergencyContactsByPatientId(
        patientId,
        queryParams
    );
};

const createEmergencyContact = async (
    patientId: string,
    data: EmergencyContactDataDto
) => {
    return emergencyContactDao.createEmergencyContact(patientId, data);
};

const updateEmergencyContact = async (
    id: string,
    data: Partial<EmergencyContactDataDto>
) => {
    return emergencyContactDao.updateEmergencyContact(id, data);
};

const deleteEmergencyContact = async (id: string) => {
    return emergencyContactDao.deleteEmergencyContact(id);
};

export default {
    getEmergencyContactById,
    getEmergencyContactsByPatientId,
    createEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
};
