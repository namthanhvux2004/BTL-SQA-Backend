/**
 * Các hàm hỗ trợ quản lý slot thời gian
 */

/**
 * Chia slot thời gian từ một lịch Schedule dựa trên thời lượng khám (minutesPerSlot).
 * @param startTime Date - Thời gian bắt đầu
 * @param endTime Date - Thời gian kết thúc
 * @param minutesPerSlot number - Số phút mỗi slot
 * @returns Array<{ start: Date, end: Date }> - Danh sách các slot
 */
export function splitScheduleToSlots(
    startTime: Date,
    endTime: Date,
    minutesPerSlot: number
): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startTime);
    while (current < endTime) {
        const slotEnd = new Date(current.getTime() + minutesPerSlot * 60000);
        if (slotEnd > endTime) break;
        slots.push({ start: new Date(current), end: new Date(slotEnd) });
        current = slotEnd;
    }
    return slots;
}

/**
 * Loại bỏ các slot trùng với các khoảng thời gian nghỉ/block.
 * @param slots Array<{ start: Date, end: Date }> - Danh sách các slot
 * @param breaks Array<{ start: Date, end: Date }> - Danh sách các khoảng thời gian nghỉ
 * @returns Array<{ start: Date, end: Date }> - Danh sách các slot sau khi lọc
 */
export function filterSlotsByBreaks(
    slots: Array<{ start: Date; end: Date }>,
    breaks: Array<{ start: Date; end: Date }>
): Array<{ start: Date; end: Date }> {
    return slots.filter((slot) => {
        return !breaks.some(
            (breakTime) =>
                slot.start < breakTime.end && slot.end > breakTime.start
        );
    });
}

/**
 * Kiểm tra xem một slot có bị trùng với khoảng thời gian nào đó không
 * @param slotStart Date - Thời gian bắt đầu slot
 * @param slotEnd Date - Thời gian kết thúc slot
 * @param rangeStart Date - Thời gian bắt đầu khoảng kiểm tra
 * @param rangeEnd Date - Thời gian kết thúc khoảng kiểm tra
 * @returns boolean - true nếu có trùng lặp
 */
export function isSlotOverlapping(
    slotStart: Date,
    slotEnd: Date,
    rangeStart: Date,
    rangeEnd: Date
): boolean {
    return slotStart < rangeEnd && slotEnd > rangeStart;
}

/**
 * Gộp các slot liền kề thành một slot lớn hơn
 * @param slots Array<{ start: Date, end: Date }> - Danh sách các slot
 * @returns Array<{ start: Date, end: Date }> - Danh sách các slot đã gộp
 */
export function mergeAdjacentSlots(
    slots: Array<{ start: Date; end: Date }>
): Array<{ start: Date; end: Date }> {
    if (slots.length === 0) return [];

    // Sắp xếp theo thời gian bắt đầu
    const sortedSlots = [...slots].sort(
        (a, b) => a.start.getTime() - b.start.getTime()
    );

    const merged: Array<{ start: Date; end: Date }> = [{ ...sortedSlots[0]! }];

    for (let i = 1; i < sortedSlots.length; i++) {
        const current = sortedSlots[i]!;
        const lastMerged = merged[merged.length - 1]!;

        // Nếu slot hiện tại liền kề với slot cuối cùng đã gộp
        if (current.start.getTime() === lastMerged.end.getTime()) {
            lastMerged.end = current.end;
        } else {
            merged.push({ ...current });
        }
    }

    return merged;
}
