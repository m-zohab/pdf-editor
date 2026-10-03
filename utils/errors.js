// Errors created here are safe to show to the user (expose = true).
exports.httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
