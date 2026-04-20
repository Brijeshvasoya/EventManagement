const { GraphQLError } = require('graphql');

exports.requireAuth = (user) => {
  if (!user) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  }
};

exports.requireRole = (user, roles) => {
  exports.requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new GraphQLError('Forbidden: insufficient permissions', { extensions: { code: 'FORBIDDEN' } });
  }
};
