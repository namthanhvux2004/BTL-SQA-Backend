import { SuccessResponse } from '@src/core/ApiResponse';
import medicineService from '@src/services/medicineService';
import { PaginationQuery } from '@src/types';
import { Request, Response } from 'express';

const getMedicines = async (
    req: Request<{}, {}, {}, PaginationQuery>,
    res: Response
) => {
    const result = await medicineService.getAllMedicines(req.query);
    return new SuccessResponse(
        result.data,
        'Lấy danh sách bệnh nhân thành công',
        result.metadata
    ).send(res);
};

export default {
    getMedicines,
};
