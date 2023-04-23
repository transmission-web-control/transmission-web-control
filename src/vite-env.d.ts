import 'vite/client';

import { type Transmission } from './lib/transmission';
import { type System } from './type';
import type Semver from 'semver';

declare global {
  var APP_VERSION: string;
  var transmission: Transmission;
  var system: System;
  var semver: typeof Semver;
}

interface ImportMetaEnv {
  readonly __APP_VERSION__: string;
}
