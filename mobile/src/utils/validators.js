/**
 * Input validation utilities.
 */

/**
 * Basic email validation.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Password must be at least 6 characters.
 * @param {string} password
 * @returns {boolean}
 */
export const isValidPassword = (password) => {
    return password && password.length >= 6;
};

/**
 * Budget must be a positive number.
 * @param {string|number} budget
 * @returns {boolean}
 */
export const isValidBudget = (budget) => {
    const num = Number(budget);
    return !isNaN(num) && num > 0;
};

/**
 * Days must be between 1 and 14.
 * @param {string|number} days
 * @returns {boolean}
 */
export const isValidDays = (days) => {
    const num = Number(days);
    return Number.isInteger(num) && num >= 1 && num <= 14;
};
