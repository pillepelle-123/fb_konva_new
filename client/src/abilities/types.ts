import type { PureAbility } from '@casl/ability';

export type Actions = 'view' | 'edit' | 'create' | 'delete' | 'manage' | 'use';

export type Subjects =
  | 'Page'
  | 'Element'
  | 'Tool'
  | 'ToolSettings'
  | 'BookSettings'
  | 'PageSettings'
  | 'Answer'
  | 'all';

export type AppAbility = PureAbility<[Actions, Subjects]>;
