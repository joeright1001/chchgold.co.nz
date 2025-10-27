const basicAuth = require('express-basic-auth');

// A custom authorizer function that gets users from environment variables
const adminAuthorizer = (username, password) => {
    const userMatches = basicAuth.safeCompare(username, process.env.ADMIN_USERNAME || 'admin');
    const passwordMatches = basicAuth.safeCompare(password, process.env.ADMIN_PASSWORD || 'password');
    return userMatches & passwordMatches;
};

const staffAuth = basicAuth({
    authorizer: adminAuthorizer,
    challenge: true,
    realm: 'ChchGoldAdmin',
});

module.exports = {
    staffAuth,
};
