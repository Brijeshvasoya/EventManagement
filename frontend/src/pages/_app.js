import { ApolloProvider } from '@apollo/client/react';
import client from '@/lib/apolloClient';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/Layout';
import { GlobalActionsProvider } from '../components/GlobalActions';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <Toaster position="top-center" />
        <GlobalActionsProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </GlobalActionsProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
