import slugify from 'slugify';

const generateId = (prefix: string, value: number): string => {
    return prefix + value.toString(16).padStart(3, '0');
};

const generateSlug = (name: string, model: any): string => {
    const baseSlug = slugify(name, {
        lower: true,
        strict: true,
        locale: 'vi',
    });
    let slug = baseSlug;
    let count = 1;
    while (model.findOne({ where: { slug } })) {
        slug = `${baseSlug}-${count}`;
        count++;
    }
    return slug;
};

const generateIdForModel = async (
    model: any,
    id: string,
    prefix: string
): Promise<string> => {
    const updatedCounter = await model.update({
        where: { id: id },
        data: { value: { increment: 1 } },
    });
    return generateId(prefix, updatedCounter.value);
};

export { generateId, generateSlug, generateIdForModel };
