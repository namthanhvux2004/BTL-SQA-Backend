export const cleanObject = (obj: object) => {
    if (Array.isArray(obj)) {
        const cleanedArray = obj
            .map(cleanObject)
            .filter((v) => v !== undefined);

        return cleanedArray.length > 0 ? cleanedArray : undefined;
    } else if (obj && typeof obj === 'object') {
        const cleanedObj = {};

        for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = cleanObject(value);
            if (cleanedValue !== undefined) {
                cleanedObj[key] = cleanedValue;
            }
        }

        return Object.keys(cleanedObj).length > 0 ? cleanedObj : undefined;
    } else {
        if (obj === null || obj === undefined) {
            return undefined;
        }
        return obj;
    }
};
