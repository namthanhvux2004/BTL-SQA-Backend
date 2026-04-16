import healthInsuranceDao from '@src/daos/healthInsurance.dao';
import { HealthInsuranceDataDto } from '@src/dtos/healthInsurance.dto';
import { mapBenefitLevelToCoverage } from '@src/helpers/healthInsurance';
import { PaginationQuery } from '@src/types';

const getHealthInsuranceById = (id: string) => {
    return healthInsuranceDao.getHealthInsuranceById(id);
};

type HealthInsuranceWithCoverage = {
    createdAt: Date;
    type: string;
    insuranceId: string;
    startAt: Date;
    endAt: Date;
    level_of_benefit: number | null;
    province_code: string | null;
    initial_kcb_code: string | null;
    initial_kcb_name: string | null;
    id: string;
    userId: string;
    updatedAt: Date;
    coverage?: number;
};

const getHealthInsurancesByUserId = async (
    userId: string,
    queryParams?: PaginationQuery
) => {
    const result = await healthInsuranceDao.getHealthInsurancesByUserId(
        userId,
        queryParams
    );
    if (result && result.data) {
        for (let i = 0; i < result.data.length; i++) {
            const benefitLevel = result.data[i]?.level_of_benefit || 0;
            (result.data[i] as HealthInsuranceWithCoverage).coverage =
                mapBenefitLevelToCoverage(benefitLevel);
        }
    }
    return result;
};

const createHealthInsurance = async (
    userId: string,
    data: HealthInsuranceDataDto
) => {
    return healthInsuranceDao.createHealthInsurance(userId, data);
};

const updateHealthInsurance = async (
    id: string,
    data: Partial<HealthInsuranceDataDto>
) => {
    return healthInsuranceDao.updateHealthInsurance(id, data);
};

const deleteHealthInsurance = async (id: string) => {
    return healthInsuranceDao.deleteHealthInsurance(id);
};

export default {
    getHealthInsuranceById,
    getHealthInsurancesByUserId,
    createHealthInsurance,
    updateHealthInsurance,
    deleteHealthInsurance,
};
