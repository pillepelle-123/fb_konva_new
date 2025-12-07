/**
 * Themes data wrapper
 * Imports from shared if feature flag is enabled, otherwise uses local file
 */

import { FEATURE_FLAGS } from '../../utils/feature-flags';
import localThemes from './themes.json';
import sharedThemes from '../../../../shared/data/templates/themes.json';

// Import from shared if feature flag is enabled, otherwise use local
const themesData = FEATURE_FLAGS.USE_SHARED_THEMES 
  ? sharedThemes 
  : localThemes;

export default themesData;

