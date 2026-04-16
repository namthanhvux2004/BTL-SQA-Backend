import { PaginationQuery } from '@src/types';
import medicineDao from '@src/daos/medicine.dao';

const getAllMedicines = async (query: PaginationQuery) => {
    return await medicineDao.getAllMedicines(query);
};

export default {
    getAllMedicines,
};
