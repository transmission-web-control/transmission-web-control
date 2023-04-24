import 'vite/client';

import type Semver from 'semver';

import { type Transmission } from './lib/transmission';
import { type System } from './type';

declare global {
  var transmission: Transmission;
  var system: System;
  var semver: typeof Semver;
}

interface ImportMetaEnv {
  readonly __APP_VERSION__: string;
}
