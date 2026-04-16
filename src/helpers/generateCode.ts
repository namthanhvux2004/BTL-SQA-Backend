import bcrypt from 'bcryptjs';

export const generateCode = (numberOfCharacters: number): string => {
    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charArray: string[] = [];
    for (let i = 0; i < numberOfCharacters; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        charArray.push(characters.charAt(randomIndex));
    }
    return charArray.join('');
};

export async function hashCode(
    text: string,
    saltRounds: number = 10
): Promise<string> {
    const hashedPassword = await bcrypt.hash(text, saltRounds);
    return hashedPassword;
}

export async function compareCode(
    code: string,
    hashedCode: string
): Promise<boolean> {
    return await bcrypt.compare(code, hashedCode);
}
