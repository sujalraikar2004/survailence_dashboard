/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/providers/AuthContext';
import { OperationalProvider } from './app/providers/OperationalContext';
import { AppRouter } from './app/router';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OperationalProvider>
          <AppRouter />
        </OperationalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
