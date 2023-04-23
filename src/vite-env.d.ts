import 'vite/client';
import type { System } from './type';
import type { Transmission } from './lib/transmission.ts';

declare global {
  const transmission: Transmission;
  const system: System;
}
