export const mapBenefitLevelToCoverage = (benefitLevel: number): number => {
    switch (benefitLevel) {
        case 1:
            return 100;
        case 2:
            return 100;

        case 3:
            return 95;

        case 4:
            return 80;

        case 5:
            return 100;

        default:
            return 0;
    }
};
