/**
 * Typed API clients for the 2026-04-17/18 sprint modules.
 *
 * Usage:
 *   import { parentPortal } from '@/services/modules';
 *   const children = await parentPortal.myChildren();
 */

export { default as parentPortal } from './parentPortal';
export * from './parentPortal';

export { default as therapistWorkbench } from './therapistWorkbench';
export * from './therapistWorkbench';

export { default as telehealth } from './telehealth';
export * from './telehealth';

export { default as chat } from './chat';
export * from './chat';

export { default as nafath } from './nafath';
export * from './nafath';

export { default as notify } from './notify';
export * from './notify';
