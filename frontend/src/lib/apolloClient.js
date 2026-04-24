import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = createHttpLink({
  uri: `${process.env.NEXT_PUBLIC_BACKEND_URL}/graphql`,
});

const authLink = setContext((_, { headers }) => {
  let token;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// Subscription link setup
const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(createClient({
      url: process.env.NEXT_PUBLIC_BACKEND_URL 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL.startsWith('https') ? 'wss' : 'ws'}://${process.env.NEXT_PUBLIC_BACKEND_URL.split('://')[1]}/graphql`
        : 'ws://localhost:4000/graphql',
      lazy: true,
      retryAttempts: 5,
      connectionAckWaitTimeout: 30000,
      connectionParams: () => {
        const token = localStorage.getItem('token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
    }))
  : null;

const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      authLink.concat(httpLink),
    )
  : authLink.concat(httpLink);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});

export default client;
