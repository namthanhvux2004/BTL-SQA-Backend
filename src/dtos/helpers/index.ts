import { ZodTypeAny } from 'zod';

// Hàm dọn dẹp object (loại bỏ null và undefined)
function cleanObject<T extends Record<string, any>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v != null) // bỏ null và undefined
    ) as T;
}

// Helper wrap schema
function cleanObjectSchema<T extends ZodTypeAny>(schema: T) {
    return schema.transform((data) => {
        if (typeof data === 'object' && data !== null) {
            return cleanObject(data);
        }
        return data;
    });
}

function optionalToNull<T>(val: T | undefined): T | null {
    return val === undefined ? null : val;
}

export { cleanObject, cleanObjectSchema, optionalToNull };
