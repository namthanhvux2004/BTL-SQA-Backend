import { SuccessResponse } from '@src/core/ApiResponse';
import doctorService from '@src/services/doctor.service';

const autoFillDoctor = async (req, res) => {
    const query = req.query as any;

    // Gọi Service lấy danh sách bác sĩ
    const result = await doctorService.getDoctors(query);
    const data = result.data.map((doctor) => ({
        id: doctor.id,
        name: doctor.user.name
            ? `${doctor.user.name.firstName} ${doctor.user.name.lastName}`
            : doctor.user.username,
        avatar: doctor.user.avatar,
    }));

    return new SuccessResponse(
        data,
        'Lấy danh sách bác sĩ thành công',
        result.metadata
    ).send(res);
};

export default {
    autoFillDoctor,
};
